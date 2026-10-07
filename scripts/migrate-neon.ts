import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {unzipSync} from 'fflate';
import {GetObjectCommand,PutObjectCommand,PutBucketCorsCommand} from '@aws-sdk/client-s3';
import {database} from '../server/neon/database.js';
import {storage,bucket,objectInfo} from '../server/neon/storage.js';
import {readDump,inspectBackup} from './backup-data.js';
import {applySchema} from './neon-schema.js';

export async function migrate(folder:string,includeFiles=true){
 const text=readFileSync(folder+'/supabase-original.sql','utf8');const tables=readDump(text);
 const sourceHash=createHash('sha256').update(text).digest('hex');const marker='supabase-import-'+sourceHash;
 const names=['oc_members','oc_rooms','oc_history','oc_media','oc_settings','oc_reports','oc_invites','oc_audit'];
 await applySchema();const db=await database().connect();
 try{
  await db.query('begin');await db.query('select pg_advisory_xact_lock(71927262)');
  const done=await db.query('select 1 from oc_migrations where id=$1',[marker]);
  if(!done.rowCount){
   for(const name of [...names,'oc_auth_user'])if(Number((await db.query('select count(*)::int as count from '+name)).rows[0].count))throw new Error('Destination is not empty; refusing to overwrite existing records.');
   await db.query("select set_config('orden.import','true',true)");
   for(const [table,trigger] of [['oc_members','oc_audit_team'],['oc_rooms','oc_audit_spaces'],['oc_media','oc_audit_files'],['oc_settings','oc_audit_event'],['oc_reports','oc_audit_reports']])await db.query('alter table '+table+' disable trigger '+trigger);
   const users=tables.get('auth.users');if(!users)throw new Error('Missing auth backup');
   for(const row of users.rows){const user=Object.fromEntries(users.columns.map((c,i)=>[c,row[i]]));const metadata=JSON.parse(user.raw_user_meta_data??'{}');
    if(!user.email||!user.encrypted_password?.startsWith('$2'))throw new Error('Unsupported legacy account; migration stopped.');
    await db.query('insert into oc_auth_user(id,name,email,"emailVerified","createdAt","updatedAt") values($1,$2,$3,$4,$5,$6)',[user.id,metadata.name??'Encargado',user.email,!!user.email_confirmed_at,user.created_at,user.updated_at]);
    await db.query('insert into oc_auth_account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") values($1,$2::text,$3,$2::text::uuid,$4,$5,$6)',[randomUUID(),user.id,'credential',user.encrypted_password,user.created_at,user.updated_at]);
   }
   for(const name of names){const table=tables.get('public.'+name);if(!table)throw new Error('Missing table '+name);
    const allowed=new Set((await db.query('select column_name from information_schema.columns where table_schema=\'public\' and table_name=$1',[name])).rows.map(r=>r.column_name));
    if(table.columns.some(c=>!allowed.has(c)||!/^[a-z_]+$/.test(c)))throw new Error('Unknown backup column');
    for(const row of table.rows)await db.query('insert into '+name+' ('+table.columns.map(c=>'"'+c+'"').join(',')+')'+(name==='oc_audit'?' overriding system value':'')+' values ('+row.map((_,i)=>'$'+(i+1)).join(',')+')',row);
   }
   await db.query("select setval('oc_audit_id_seq',greatest(coalesce((select max(id) from oc_audit),0),1),exists(select 1 from oc_audit))");
   for(const [table,trigger] of [['oc_members','oc_audit_team'],['oc_rooms','oc_audit_spaces'],['oc_media','oc_audit_files'],['oc_settings','oc_audit_event'],['oc_reports','oc_audit_reports']])await db.query('alter table '+table+' enable trigger '+trigger);
   await db.query('insert into oc_migrations(id) values($1)',[marker]);
  }
  for(const name of names){const count=Number((await db.query('select count(*)::int as count from '+name)).rows[0].count);if(count!==tables.get('public.'+name)?.rows.length)throw new Error('Count mismatch '+name);}
  await db.query('commit');
 }catch(e){await db.query('rollback');throw e;}finally{db.release();}
 if(includeFiles){
  const manifest=inspectBackup(folder);const zip=unzipSync(new Uint8Array(readFileSync(folder+'/supabase-storage-original.zip')));
  const expected=new Map<string,string>();for(const row of (await database().query('select id,object_path,data from oc_media')).rows){expected.set(row.object_path,row.data.mime);if(row.data.thumbnailReady)expected.set('thumbnails/'+row.id+'.jpg','image/jpeg');}
  let copied=0;for(const file of manifest.files){const key=file.path.split('/').slice(2).join('/');if(!expected.has(key))throw new Error('Unrecognized source object');const bytes=zip[file.path];const prior=await objectInfo(key);
   if(!prior)await storage().send(new PutObjectCommand({Bucket:bucket(),Key:key,Body:bytes,ContentType:expected.get(key),Metadata:{sha256:file.sha256}}));
   const remote=await storage().send(new GetObjectCommand({Bucket:bucket(),Key:key}));const actual=await remote.Body!.transformToByteArray();if(createHash('sha256').update(actual).digest('hex')!==file.sha256)throw new Error('Original hash mismatch');copied++;console.log('Verified original or thumbnail '+copied+'/'+manifest.files.length);
  }
  if(copied!==expected.size)throw new Error('Missing original or thumbnail');
  await storage().send(new PutBucketCorsCommand({Bucket:bucket(),CORSConfiguration:{CORSRules:[{AllowedOrigins:['https://app-orden-colegio.vercel.app','http://127.0.0.1:5173'],AllowedMethods:['GET','HEAD','PUT'],AllowedHeaders:['content-type','content-length','x-amz-*'],ExposeHeaders:['ETag','Content-Length','Content-Range','Content-Type'],MaxAgeSeconds:3600}]}}));
  writeFileSync(folder+'/neon-verification.private.json',JSON.stringify({sourceHash,counts:manifest.counts,files:copied,bytes:manifest.bytes,sha256Verified:true,verifiedAt:new Date().toISOString()},null,2));
 }
 console.log('Records imported and checked.');
}
if(process.argv[1]?.endsWith('migrate-neon.ts')){try{await migrate(process.argv[2]??'work/migration',!process.argv.includes('--no-files'));}catch(e){console.error('Migration stopped:',e instanceof Error?e.message:'unknown');process.exitCode=1;}finally{await database().end();}}
