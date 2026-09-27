import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {handleRequest} from '../../server/cloud';
import {newRoom} from '../../lib/model';

test('Supabase: permisos, invitación, conflictos, respaldo privado y revocación', {timeout:120000},async()=>{
 const url=process.env.SUPABASE_URL!,key=process.env.SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!;
 assert.ok(url&&key&&secret,'Configura .env.local para la prueba de integración.');
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const prefix='qa-integration-'+randomUUID(),password=randomUUID()+randomUUID(),name=prefix;
 const ids:string[]=[],roomId=randomUUID(),mediaId=randomUUID();let inviteHash='';
 async function call(path:string,token?:string,body?:unknown){const response=await handleRequest(new Request('https://example.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:response.status,data:await response.json()};}
 function checked(result:{error:unknown}){assert.equal(result.error,null);}
 try{
  const owner=await admin.auth.admin.createUser({email:prefix+'@example.com',password,email_confirm:true});checked(owner);ids.push(owner.data.user!.id);
  checked(await admin.from('oc_members').insert({id:ids[0],email:prefix+'@example.com',name,role:'coordinator'}));
  const login=await client().auth.signInWithPassword({email:prefix+'@example.com',password});checked(login);const token=login.data.session!.access_token;
  const anon=client();assert.ok((await anon.from('oc_rooms').select('*')).error);assert.ok((await anon.rpc('oc_save_room',{p_input:{},p_author:'anonymous'})).error);
  const invitation=await call('auth/invites',token,{name:'Encargado de prueba'});assert.equal(invitation.status,200);inviteHash=createHash('sha256').update(invitation.data.code).digest('hex');
  const join=await call('auth/join',undefined,{name:prefix+' encargado',email:prefix+'-recorder@example.com',password,code:invitation.data.code});assert.equal(join.status,200);const recorderToken=join.data.session.access_token;ids.push(join.data.session.user.id);
  assert.equal((await call('auth/join',undefined,{name:'Reintento',email:prefix+'-again@example.com',password,code:invitation.data.code})).status,403);
  assert.equal((await call('auth/invites',recorderToken,{name:'Prohibido'})).status,403);assert.equal((await call('event',recorderToken,{})).status,403);
  const initial={...newRoom(prefix),id:roomId,mutationId:randomUUID()};const saved=await call('rooms',token,initial);assert.equal(saved.status,200);assert.equal(saved.data.room.revision,1);
  assert.equal((await call('rooms',token,initial)).data.room.revision,1);
  const mutations=[{...saved.data.room,name:prefix+' A',mutationId:randomUUID()},{...saved.data.room,name:prefix+' B',mutationId:randomUUID()}];
  const changes=await Promise.all(mutations.map(room=>call('rooms',token,room)));assert.deepEqual(changes.map(r=>r.status).sort(),[200,409]);assert.equal((await call('history/'+roomId,token)).data.history.length,2);
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
  const init=await call('uploads/init',token,{id:mediaId,roomId,phase:'reception',name:'prueba.png',mime:'image/png',size:bytes.length,createdAt:new Date().toISOString(),note:'',category:'General'});assert.equal(init.status,200);
  assert.equal((await call('uploads/'+mediaId+'/complete',recorderToken,{})).status,403);
  const own=client();await own.auth.setSession({access_token:token,refresh_token:login.data.session!.refresh_token});
  assert.ok((await own.storage.from('evidence').upload('originals/'+randomUUID(),bytes,{contentType:'image/png'})).error,'No se puede subir a una ruta no registrada');
  const other=client();await other.auth.setSession(join.data.session);assert.ok((await other.storage.from('evidence').upload(init.data.objectPath,bytes,{contentType:'image/png'})).error,'Otro encargado no puede ocupar la ruta');
  checked(await own.storage.from('evidence').upload(init.data.objectPath,bytes,{contentType:'image/png'}));assert.equal((await call('uploads/'+mediaId+'/complete',token,{})).status,200);
  assert.ok((await anon.storage.from('evidence').download(init.data.objectPath)).error);
  const signed=await call('media/'+mediaId,recorderToken);assert.equal(signed.status,200);const download=await fetch(signed.data.url);assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes);
  assert.equal((await call('media/'+mediaId+'/metadata',recorderToken,{note:'No permitido',category:'General'})).status,403);
  assert.equal((await call('auth/revoke',token,{userId:ids[1]})).status,200);assert.equal((await call('bootstrap',recorderToken)).status,403);assert.ok((await other.storage.from('evidence').download(init.data.objectPath)).error);
 }finally{
  checked(await admin.storage.from('evidence').remove(['originals/'+mediaId,'thumbnails/'+mediaId+'.jpg']));
  checked(await admin.from('oc_media').delete().eq('id',mediaId));checked(await admin.from('oc_history').delete().eq('room_id',roomId));checked(await admin.from('oc_rooms').delete().eq('id',roomId));
  if(inviteHash)checked(await admin.from('oc_invites').delete().eq('code_hash',inviteHash));
  for(const id of ids)checked(await admin.auth.admin.deleteUser(id));
 }
});
