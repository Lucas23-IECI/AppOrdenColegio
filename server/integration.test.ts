import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
const directory=mkdtempSync(resolve(tmpdir(),'orden-test-'));
process.env.DATA_DIR=directory;
const {handleAuth}=await import('./auth');
const {GET,POST}=await import('../app/api/[...path]/route');
const {sqlite}=await import('./storage');
const {newRoom}=await import('../lib/model');
const origin='https://test.example';
async function call(path:string,body?:unknown,cookie='',customHeaders:Record<string,string>={}){const request=new Request(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{origin,cookie,...customHeaders},body:body===undefined?undefined:body instanceof Uint8Array?new Uint8Array(body):JSON.stringify(body)});return await handleAuth(request)??(body===undefined?GET(request):POST(request));}
test('Acceso propio, permisos, conflictos y video reanudable',async(t)=>{try{
 assert.equal((await call('bootstrap')).status,401);
 const setup=await call('auth/setup',{setupKey:readFileSync(resolve(directory,'setup-key.txt'),'utf8'),name:'Coordinador de prueba',username:'coordinador',password:'Solo-prueba-123456'});assert.equal(setup.status,200);const owner=setup.headers.get('set-cookie')!.split(';')[0];assert.match(setup.headers.get('set-cookie')!,/HttpOnly/);assert.match(setup.headers.get('set-cookie')!,/Secure/);
 await t.test('Instalación no repetible e invitación de un uso',async()=>{
  assert.equal((await call('auth/setup',{})).status,409);
  assert.equal((await call('auth/login',{username:'coordinador',password:'incorrecta'})).status,401);
  const access=await call('auth/invites',{name:'Ana'},owner);assert.equal(access.status,200);const {code}=await access.json();
  const account={code,name:'Ana',username:'ana',password:'Solo-prueba-654321'};const joined=await call('auth/join',account);assert.equal(joined.status,200);const member=joined.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await call('auth/join',{...account,username:'otra'})).status,403);
  assert.equal((await call('auth/invites',{name:'Otra'},member)).status,403);
  assert.equal((await call('event',{name:'Alterado'},member)).status,403);
  const info=await(await call('bootstrap',undefined,member)).json();assert.equal(info.user.name,'Ana');
  assert.equal((await call('auth/revoke',{userId:info.user.id},owner)).status,200);
  assert.equal((await call('bootstrap',undefined,member)).status,401);
 });
 const room=newRoom('Sala de prueba');room.mutationId=crypto.randomUUID();
 const first=await call('rooms',room,owner);assert.equal(first.status,200);const saved=(await first.json()).room;
 await t.test('Conflictos e idempotencia',async()=>{
  assert.equal((await call('rooms',room,owner)).status,200);
  assert.equal((await call('rooms',{...room,mutationId:crypto.randomUUID()},owner)).status,409);
  const history=await(await call('history/'+room.id,undefined,owner)).json();assert.equal(history.history.length,1);
  assert.equal((await call('rooms',saved,owner,{origin:'https://otro.example'})).status,403);
 });
 await t.test('Multipart, reanudación y rangos sin alterar el original',async()=>{
  const id=crypto.randomUUID();const bytes=Buffer.alloc(9*1024*1024+23);for(let n=0;n<bytes.length;n+=101)bytes[n]=n%251;
  const metadata={id,roomId:room.id,phase:'reception',name:'prueba.mp4',mime:'video/mp4',size:bytes.length,createdAt:new Date().toISOString(),note:'',category:'General'};
  const init=await call('uploads/init',metadata,owner);assert.equal(init.status,200);const {partSize}=await init.json();
  assert.equal((await call('uploads/'+id+'/part?number=1',bytes.subarray(0,partSize),owner)).status,200);
  const resumed=await(await call('uploads/init',metadata,owner)).json();assert.equal(resumed.parts.length,1);
  assert.equal((await call('uploads/'+id+'/complete',{},owner)).status,409);
  assert.equal((await call('uploads/'+id+'/part?number=2',bytes.subarray(partSize),owner)).status,200);
  assert.equal((await call('uploads/'+id+'/complete',{},owner)).status,200);
  assert.equal((await call('uploads/'+id+'/complete',{},owner)).status,200);
  assert.deepEqual(Buffer.from(await(await call('media/'+id,undefined,owner)).arrayBuffer()),bytes);
  const range=await call('media/'+id,undefined,owner,{range:'bytes=100-1099'});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(100,1100));
  assert.equal((await call('media/'+id,undefined,owner,{range:'bytes=999999999-'})).status,416);
  assert.equal((await call('media/'+id)).status,401);
 });
 assert.equal((await call('auth/logout',{},owner)).status,200);assert.equal((await call('bootstrap',undefined,owner)).status,401);
 }finally{sqlite.close();assert.equal(dirname(realpathSync(directory)),realpathSync(tmpdir()));rmSync(directory,{recursive:true,force:true});}});
