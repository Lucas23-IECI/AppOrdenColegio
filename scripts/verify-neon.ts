import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {database} from '../server/neon/database.js';
import {readDump} from './backup-data.js';

const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export async function verifyRecords(folder:string){
 const tables=readDump(readFileSync(folder+'/supabase-original.sql','utf8'));const result:Record<string,{rows:number,sha256:string}>={};
 for(const [source,table] of tables){if(!source.startsWith('public.oc_'))continue;const name=source.slice(7);const actual=(await database().query('select * from '+name)).rows;
  const types=Object.fromEntries((await database().query('select column_name,data_type from information_schema.columns where table_schema=\'public\' and table_name=$1',[name])).rows.map(r=>[r.column_name,r.data_type]));
  const normalize=(v:any,type:string)=>v===null?null:type==='jsonb'?canonical(typeof v==='string'?JSON.parse(v):v):type==='boolean'?typeof v==='boolean'?v:v==='t':type.includes('timestamp')?new Date(v).toISOString():String(v);
  const expected=table.rows.map(row=>table.columns.map((c,i)=>normalize(row[i],types[c])));
  const received=actual.map(row=>table.columns.map(c=>normalize(row[c],types[c])));
  const digest=(rows:any[])=>createHash('sha256').update(rows.map(row=>JSON.stringify(row)).sort().join('\n')).digest('hex');
  if(digest(expected)!==digest(received))throw new Error('Content mismatch in '+name);
  result[name]={rows:received.length,sha256:digest(received)};
 }
 const users=tables.get('auth.users')!;const accounts=(await database().query('select u.id,u.email,a.password from oc_auth_user u join oc_auth_account a on a."userId"=u.id where a."providerId"=\'credential\'')).rows;
 if(accounts.length!==users.rows.length)throw new Error('Account count mismatch');
 for(const row of users.rows){const expected=Object.fromEntries(users.columns.map((c,i)=>[c,row[i]]));const actual=accounts.find(a=>a.id===expected.id);if(actual?.email!==expected.email||actual?.password!==expected.encrypted_password)throw new Error('Account or password hash mismatch');}
 writeFileSync(folder+'/neon-record-verification.private.json',JSON.stringify({tables:result,accounts:accounts.length,accountsAndPasswordHashesMatch:true,verifiedAt:new Date().toISOString()},null,2));console.log({verifiedTables:Object.keys(result).length,verifiedRows:Object.values(result).reduce((n,r)=>n+r.rows,0),accounts:accounts.length});
}
if(process.argv[1]?.endsWith('verify-neon.ts')){try{await verifyRecords(process.argv[2]??'work/migration');}catch(e){console.error('Verification stopped:',e instanceof Error?e.message:'unknown');process.exitCode=1;}finally{await database().end();}}
