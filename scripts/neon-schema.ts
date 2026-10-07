import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {getMigrations} from 'better-auth/db/migration';
import {authOptions} from '../server/neon/auth.js';
import {database} from '../server/neon/database.js';

export async function applySchema(){
 const client=await database().connect();
 try{
  await client.query('begin');await client.query('select pg_advisory_xact_lock(71927262)');
  await client.query('create table if not exists oc_migrations (id text primary key, applied_at timestamptz not null default now())');
  const exists=await client.query("select 1 from oc_migrations where id='neon-v1'");if(exists.rowCount){await client.query('commit');return;}
  const authMigration=await getMigrations(authOptions());let authSql=await authMigration.compileMigrations();
  // UUIDs are essential: existing offline databases are keyed by the user UUID.
  authSql=authSql.replace(/"id" text/g,'"id" uuid').replace(/"userId" text/g,'"userId" uuid');
  await client.query(authSql);
  for(const file of readdirSync('supabase/migrations').sort()){
   if(file.includes('002_storage'))continue;
   let sql=readFileSync('supabase/migrations/'+file,'utf8').replace(/references auth\.users\(id\)/g,'references public.oc_auth_user(id)');
   sql=sql.replace(/^revoke [^;]+;/gm,'').replace(/^grant [^;]+;/gm,'').replace(/insert into storage\.buckets[\s\S]*?;/g,'');
   await client.query(sql);
  }
  await client.query(`
   create table oc_uploads (media_id uuid primary key references oc_media(id), upload_id text not null, created_at timestamptz not null default now());
   create function oc_join_account() returns trigger language plpgsql set search_path=public as $$
   begin
    if coalesce(current_setting('orden.import',true),'')<>'true' then perform oc_register_open_member(NEW.id,NEW.email,NEW.name); end if;
    return NEW;
   end $$;
   create trigger oc_join_account after insert on oc_auth_user for each row execute function oc_join_account();
   revoke all on all tables in schema public from public;
   revoke all on all functions in schema public from public;
   insert into oc_migrations(id) values('neon-v1');
  `);
  await client.query('commit');mkdirSync('work/migration',{recursive:true});writeFileSync('work/migration/auth-schema.sql',authSql);
 }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
if(process.argv[1]?.endsWith('neon-schema.ts')){try{await applySchema();console.log('Schema ready.');}catch(e){console.error('Schema failed:',e instanceof Error?e.message:'unknown');process.exitCode=1;}finally{await database().end();}}
