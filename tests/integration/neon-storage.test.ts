import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {DeleteObjectCommand} from '@aws-sdk/client-s3';
import {database} from '../../server/neon/database.js';
import {storage,bucket} from '../../server/neon/storage.js';
import {applySchema} from '../../scripts/neon-schema.js';
import {handleRequest} from '../../server/cloud.js';
import {newRoom} from '../../lib/model.js';

test('Neon Storage: private originals, browser CORS, resumed multipart upload and exact download', {skip:process.env.RUN_NEON_STORAGE_QA!=='1',timeout:180000},async()=>{
 const target=new URL(process.env.DATABASE_URL!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/orden_neon_tests');await applySchema();
 const id=randomUUID(),email='qa-storage-'+randomUUID()+'@example.com',password='Clave-QA-'+randomUUID();
 async function call(path:string,cookie='',body?:unknown){const response=await handleRequest(new Request('http://127.0.0.1:5173/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',origin:'http://127.0.0.1:5173',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)}));return {status:response.status,data:await response.json(),cookie:response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')};}
 try{
  const account=await call('auth/register','',{name:'QA archivos',email,password});assert.equal(account.status,200);const cookie=account.cookie;
  const room={...newRoom('QA archivo temporal'),mutationId:randomUUID()};assert.equal((await call('rooms',cookie,room)).status,200);
  const bytes=Buffer.alloc(7*1024*1024+137,0x5a);const input={id,roomId:room.id,phase:'reception',name:'prueba.mp4',mime:'video/mp4',size:bytes.length,createdAt:new Date().toISOString(),note:'Prueba temporal',category:'General'};
  const init=await call('uploads/init',cookie,input);assert.equal(init.status,200);assert.equal(init.data.protocol,'s3-multipart');assert.deepEqual(init.data.parts,[]);
  assert.equal((await call('uploads/'+id+'/complete',cookie,{})).status,409,'Incomplete originals cannot be marked backed up');
  assert.equal((await call('uploads/init',cookie,{...input,size:input.size+1})).status,409);
  const first=await call('uploads/'+id+'/part',cookie,{number:1});assert.equal(first.status,200);
  const preflight=await fetch(first.data.url,{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:5173','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type'}});assert.equal(preflight.status,200);assert.equal(preflight.headers.get('access-control-allow-origin'),'http://127.0.0.1:5173');
  assert.equal((await fetch(first.data.url,{method:'PUT',body:bytes.subarray(0,init.data.partSize)})).status,200);
  const resumed=await call('uploads/init',cookie,input);assert.equal(resumed.status,200);assert.equal(resumed.data.parts.length,1);assert.equal(resumed.data.parts[0].size,init.data.partSize);
  assert.equal((await call('uploads/'+id+'/part',cookie,{number:3})).status,400);
  const second=await call('uploads/'+id+'/part',cookie,{number:2});assert.equal((await fetch(second.data.url,{method:'PUT',body:bytes.subarray(init.data.partSize)})).status,200);
  assert.equal((await call('uploads/'+id+'/complete',cookie,{})).status,200);assert.equal((await call('uploads/init',cookie,input)).data.ready,true);
  const signed=await call('media/'+id,cookie);assert.equal(signed.status,200);const response=await fetch(signed.data.url);assert.equal(response.status,200);const received=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(received).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
  const ranged=await fetch(signed.data.url,{headers:{Range:'bytes=0-63'}});assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,64,'Videos support seeking');
  const publicURL=new URL(signed.data.url);publicURL.search='';assert.ok([401,403].includes((await fetch(publicURL)).status),'Bucket must remain private');assert.equal((await call('media/'+id)).status,401);
 }finally{await storage().send(new DeleteObjectCommand({Bucket:bucket(),Key:'originals/'+id}));await database().end();}
});
