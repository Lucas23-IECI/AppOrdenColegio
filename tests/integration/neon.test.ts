import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hash} from 'bcryptjs';
import {database} from '../../server/neon/database.js';
import {applySchema} from '../../scripts/neon-schema.js';
import {handleRequest} from '../../server/cloud.js';
import {newRoom} from '../../lib/model.js';

test('Neon local: registration, legacy passwords, permissions, conflicts and sessions', {timeout:90000},async()=>{
 const target=new URL(process.env.DATABASE_URL!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/orden_neon_tests','Dedicated disposable local QA database required');assert.equal(process.env.BACKEND_PROVIDER,'neon');
 await applySchema();const db=database();assert.equal((await db.query('select count(*)::int as n from oc_auth_user')).rows[0].n,0,'Use an empty QA database');
 const prefix=randomUUID(),password='Una-clave-de-prueba-'+randomUUID();
 async function call(path:string,cookie='',body?:unknown,origin='http://127.0.0.1:5173'){
  const response=await handleRequest(new Request('http://127.0.0.1:5173/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',origin,...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)}));
  return {status:response.status,data:await response.json(),cookie:response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),headers:response.headers};
 }
 try{
  assert.equal((await call('bootstrap')).status,401);
  assert.equal((await call('auth/register','',{name:'Test',email:prefix+'@example.com',password:'short'})).status,400);
  const accounts=await Promise.all([0,1].map(i=>call('auth/register','',{name:'Encargado '+i,email:prefix+i+'@example.com',password,role:'admin'})));
  for(const a of accounts){assert.equal(a.status,200,JSON.stringify(a.data));assert.ok(a.cookie);assert.match(a.headers.getSetCookie().join(' '),/HttpOnly/i);}
  const members=(await db.query('select * from oc_members order by role')).rows;assert.deepEqual(members.map(m=>m.role),['admin','viewer']);assert.equal(members.filter(m=>m.primary_admin).length,1);
  const views=await Promise.all(accounts.map(a=>call('bootstrap',a.cookie)));assert.ok(views.every(v=>v.status===200));const ownerIndex=views.findIndex(v=>v.data.user.role==='admin');const owner=accounts[ownerIndex],recorder=accounts[1-ownerIndex],ownerId=views[ownerIndex].data.user.id,recorderId=views[1-ownerIndex].data.user.id;
  assert.equal((await call('auth/login','',{email:prefix+'0@example.com',password:'incorrect'})).status,401);
  assert.equal((await call('auth/team',recorder.cookie)).status,403);
  for(const path of ['rooms','event','reports','uploads/init','uploads/'+randomUUID()+'/part','uploads/'+randomUUID()+'/complete','uploads/'+randomUUID()+'/thumbnail','media/'+randomUUID()+'/metadata'])assert.equal((await call(path,recorder.cookie,{})).status,403,'Viewer cannot write '+path);
  assert.equal((await call('auth/member',owner.cookie,{userId:ownerId,role:'recorder'})).status,409,'Last administrator must remain');
  assert.equal((await call('event',recorder.cookie,{name:'No permitido'})).status,403);
  assert.equal((await call('event',owner.cookie,{},'https://foreign.example')).status,403);
  const initial={...newRoom('QA sala'),mutationId:randomUUID()};const saved=await call('rooms',owner.cookie,initial);assert.equal(saved.status,200);assert.equal(saved.data.room.revision,1);
  assert.equal((await call('rooms',owner.cookie,initial)).data.room.revision,1);
  const changes=await Promise.all(['A','B'].map(name=>call('rooms',owner.cookie,{...saved.data.room,name,mutationId:randomUUID()})));assert.deepEqual(changes.map(r=>r.status).sort(),[200,409]);assert.equal((await call('history/'+initial.id,owner.cookie)).data.history.length,2);
  assert.equal((await call('history/'+initial.id,recorder.cookie)).status,200,'Viewer can read history');
  const corrected={...newRoom('Sala confirmada'),mutationId:randomUUID()};corrected.items=corrected.items.map(i=>({...i,reception:30,return:30}));corrected.reception={checks:Object.fromEntries(Object.keys(corrected.reception.checks).map(k=>[k,'ok'])),notes:'Recepción original',confirmedAt:new Date().toISOString(),confirmedBy:'Test'};corrected.return={...corrected.reception,notes:'Devolución original'};
  const received=await call('rooms',owner.cookie,corrected);assert.equal(received.status,200);
  const correction=await call('rooms',owner.cookie,{...received.data.room,items:received.data.room.items.map((i:any,index:number)=>({...i,reception:index===0?31:i.reception})),mutationId:randomUUID()});assert.equal(correction.status,200);assert.equal(correction.data.room.reception.confirmedAt,null);assert.equal(correction.data.room.return.confirmedAt,null);assert.equal(correction.data.room.return.notes,'Devolución original');assert.equal(correction.data.room.items[0].return,30);assert.equal((await call('history/'+corrected.id,owner.cookie)).data.history.length,2,'Original and correction retained');
  assert.equal((await call('reports',recorder.cookie)).status,200,'Viewer can read reports');
  assert.equal((await call('auth/member',owner.cookie,{userId:recorderId,role:'admin'})).status,200);
  assert.equal((await call('auth/member',recorder.cookie,{userId:ownerId,disabled:true})).status,409,'Secondary admin cannot disable principal');
  assert.equal((await call('auth/member',recorder.cookie,{userId:ownerId,role:'viewer'})).status,409,'Secondary admin cannot demote principal');
  assert.equal((await call('auth/member',owner.cookie,{userId:recorderId,role:'viewer'})).status,200);
  assert.equal((await call('rooms',recorder.cookie,initial)).status,403,'Existing session loses write access immediately');
  assert.equal((await call('audit',recorder.cookie)).status,403);assert.ok((await call('audit?category=spaces',owner.cookie)).data.entries.length>=2);
  assert.equal((await call('auth/member',owner.cookie,{userId:recorderId,disabled:true})).status,200);assert.equal((await call('bootstrap',recorder.cookie)).status,403);
  assert.equal((await call('auth/member',owner.cookie,{userId:recorderId,disabled:false,role:'coordinator'})).status,200);assert.equal((await call('bootstrap',recorder.cookie)).data.user.role,'coordinator');
  const legacyId=randomUUID(),legacyEmail=prefix+'-legacy@example.com',legacyHash=await hash(password,10);
  const transaction=await db.connect();try{await transaction.query('begin');await transaction.query("select set_config('orden.import','true',true)");await transaction.query('insert into oc_auth_user(id,name,email,"emailVerified") values($1,$2,$3,true)',[legacyId,'Cuenta anterior',legacyEmail]);await transaction.query('insert into oc_auth_account(id,"userId","accountId","providerId",password,"updatedAt") values($1,$2,$3,\'credential\',$4,now())',[randomUUID(),legacyId,legacyId,legacyHash]);await transaction.query("insert into oc_members(id,email,name,role) values($1,$2,'Cuenta anterior','recorder')",[legacyId,legacyEmail]);await transaction.query('commit');}catch(e){await transaction.query('rollback');throw e;}finally{transaction.release();}
  const legacy=await call('auth/login','',{email:legacyEmail,password});assert.equal(legacy.status,200);assert.equal((await call('bootstrap',legacy.cookie)).data.user.id,legacyId,'Offline user UUID preserved');
  const logout=await call('auth/logout',legacy.cookie,{});assert.equal(logout.status,200);assert.equal((await call('bootstrap',legacy.cookie)).status,401);
 }finally{await db.end();}
});
