import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';

export type DumpTable={columns:string[],rows:(string|null)[][]};
export function readDump(text:string){
 const tables=new Map<string,DumpTable>();let current:DumpTable|undefined;
 for(const line of text.split(/\r?\n/)){
  if(current){if(line==='\\.'){current=undefined;continue;}current.rows.push(line.split('\t').map(v=>v==='\\N'?null:v.replace(/\\([0-7]{1,3}|x[0-9a-f]{1,2}|.)/gi,(_,x:string)=>({b:'\b',f:'\f',n:'\n',r:'\r',t:'\t',v:'\v','\\':'\\'}[x]??(/^x/.test(x)?String.fromCharCode(parseInt(x.slice(1),16)):/^[0-7]/.test(x)?String.fromCharCode(parseInt(x,8)):x)))));continue;}
  const m=/^COPY (auth\.users|public\.oc_\w+|storage\.objects) \(([^)]+)\) FROM stdin;$/.exec(line);
  if(m){current={columns:m[2].split(', '),rows:[]};tables.set(m[1],current);}
 }return tables;
}
export function inspectBackup(folder:string){
 const tables=readDump(readFileSync(folder+'/supabase-original.sql','utf8'));
 const objects=unzipSync(new Uint8Array(readFileSync(folder+'/supabase-storage-original.zip')));
 const files=Object.entries(objects).filter(([name])=>!name.endsWith('/')).map(([path,bytes])=>({path,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
 const manifest={counts:Object.fromEntries([...tables].map(([name,t])=>[name,t.rows.length])),files,bytes:files.reduce((n,f)=>n+f.size,0)};
 mkdirSync(folder,{recursive:true});writeFileSync(folder+'/manifest.private.json',JSON.stringify(manifest,null,2));
 return manifest;
}
if(process.argv[1]?.endsWith('backup-data.ts')){const result=inspectBackup(process.argv[2]??'work/migration');console.log({counts:result.counts,files:result.files.length,bytes:result.bytes});}
