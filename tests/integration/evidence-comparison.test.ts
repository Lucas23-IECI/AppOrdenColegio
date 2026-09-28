import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {handleRequest} from '../../server/cloud';
import {newRoom} from '../../lib/model';

test('Supabase: parejas del mismo espacio, permisos y recuperación de miniaturas sin alterar originales', {timeout:120000},async()=>{
 const url=process.env.SUPABASE_URL!,secret=process.env.SUPABASE_SECRET_KEY!,key=process.env.SUPABASE_PUBLISHABLE_KEY!;
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),users:string[]=[],rooms=[randomUUID(),randomUUID()],files=[randomUUID(),randomUUID(),randomUUID(),randomUUID()],prefix='qa-pairs-'+randomUUID(),password=randomUUID()+randomUUID();
 const checked=(result:{error:unknown})=>assert.equal(result.error,null);
 async function call(path:string,token:string,body?:unknown){const r=await handleRequest(new Request('https://example.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:r.status,data:await r.json()};}
 try{
  const tokens:string[]=[];
  for(const [index,role] of ['recorder','recorder','coordinator'].entries()){const email=prefix+'-'+index+'@example.com';const user=await db.auth.admin.createUser({email,password,email_confirm:true});checked(user);users.push(user.data.user!.id);checked(await db.from('oc_members').insert({id:users[index],email,name:prefix+' '+index,role}));const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),login=await client.auth.signInWithPassword({email,password});checked(login);tokens.push(login.data.session!.access_token);}
  for(const id of rooms){const result=await call('rooms',tokens[0],{...newRoom(prefix),id,mutationId:randomUUID()});assert.equal(result.status,200);}
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
  for(const [index,id] of files.entries()){const result=await call('uploads/init',tokens[0],{id,roomId:rooms[index===2?1:0],phase:index===1?'return':'reception',name:prefix+' '+index,mime:index===3?'video/mp4':'image/png',size:bytes.length,createdAt:new Date().toISOString(),category:'General',note:'Conservar nota'});assert.equal(result.status,200);checked(await db.storage.from('evidence').upload(result.data.objectPath,bytes,{contentType:index===3?'video/mp4':'image/png'}));assert.equal((await call('uploads/'+id+'/complete',tokens[0],{})).status,200);}
  const patch=(id:string,token:string,comparisonId:string|null)=>call('media/'+id+'/metadata',token,{comparisonId});
  assert.equal((await patch(files[1],tokens[1],files[0])).status,403,'Otro encargado no puede vincular una foto ajena');
  for(const [returned,before] of [[files[1],files[2]],[files[0],files[1]],[files[1],files[3]],[files[1],randomUUID()]])assert.notEqual((await patch(returned,tokens[0],before)).status,200,'La pareja exige fotos de etapas distintas y del mismo espacio');
  assert.equal((await patch(files[1],tokens[0],files[0])).status,200);
  let snapshot=(await call('bootstrap',tokens[2])).data;assert.equal(snapshot.media.find((m:{id:string})=>m.id===files[1]).comparisonId,files[0]);
  assert.equal((await call('uploads/'+files[0]+'/thumbnail',tokens[1],{base64:'/9j/2Q=='})).status,403);
  assert.equal((await call('uploads/'+files[0]+'/thumbnail',tokens[2],{base64:'/9j/2Q=='})).status,200,'Coordinación puede recuperar la miniatura de otro autor');
  assert.equal((await call('uploads/'+files[0]+'/complete',tokens[2],{})).status,403,'Recuperar miniatura no permite reemplazar el original');
  snapshot=(await call('bootstrap',tokens[2])).data;const photo=snapshot.media.find((m:{id:string})=>m.id===files[0]);assert.equal(photo.note,'Conservar nota');assert.equal(photo.thumbnailReady,true);const original=await db.storage.from('evidence').download('originals/'+files[0]);checked(original);assert.deepEqual(Buffer.from(await original.data!.arrayBuffer()),bytes);
  assert.equal((await patch(files[1],tokens[2],null)).status,200,'Coordinación puede quitar el vínculo');
  assert.equal((await call('media/'+files[0]+'/metadata',tokens[0],{deleted:true})).status,200);
  assert.notEqual((await patch(files[1],tokens[2],files[0])).status,200,'No se vincula una foto que está en papelera');
  const audit=await call('audit?category=files&search='+encodeURIComponent(prefix),tokens[2]);assert.equal(audit.status,200);assert.ok(audit.data.entries.some((entry:{entity_id:string;after_data:{comparisonId?:string}})=>entry.entity_id===files[1]&&entry.after_data?.comparisonId===files[0]));
 }finally{
  checked(await db.storage.from('evidence').remove(files.flatMap(id=>['originals/'+id,'thumbnails/'+id+'.jpg'])));
  checked(await db.from('oc_media').delete().in('id',files));checked(await db.from('oc_history').delete().in('room_id',rooms));checked(await db.from('oc_rooms').delete().in('id',rooms));for(const id of users)checked(await db.auth.admin.deleteUser(id));
 }
});
