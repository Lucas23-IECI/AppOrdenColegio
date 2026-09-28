import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {handleRequest} from '../../server/cloud';
import {newRoom} from '../../lib/model';

test('Supabase: registro sin código, elección atómica del coordinador y cuentas privadas', {timeout:120000},async()=>{
 const url=process.env.SUPABASE_URL!,key=process.env.SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!;
 assert.ok(url&&key&&secret,'Configura .env.local para la prueba de integración.');
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const publicClient=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const prefix='qa-signup-'+randomUUID(),password=randomUUID()+randomUUID();
 const emails=[prefix+'-one@example.com',prefix+'-two@example.com'],ids=new Set<string>();
 async function call(path:string,token?:string,body?:unknown){const response=await handleRequest(new Request('https://example.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:response.status,data:await response.json()};}
 function checked(result:{error:unknown}){assert.equal(result.error,null);}
 try{
  const before=await admin.from('oc_members').select('id',{count:'exact',head:true}).eq('role','admin');checked(before);
  assert.equal((await call('auth/register',undefined,{name:'Encargado',email:emails[0],password:'corta'})).status,400);
  assert.equal((await call('auth/register',undefined,{name:'Encargado',email:'correo-invalido',password})).status,400);
  assert.equal((await call('auth/register',undefined,{name:'X',email:emails[0],password})).status,400);
  const accounts=await Promise.all(emails.map((email,index)=>call('auth/register',undefined,{name:'  Encargado '+index+'  ',email:email.toUpperCase(),password,role:'admin',p_owner:true})));
  for(const result of accounts){if(result.data.session?.user?.id)ids.add(result.data.session.user.id);assert.equal(result.status,200,JSON.stringify(result.data));assert.ok(result.data.session?.access_token);}
  const members=await admin.from('oc_members').select('id,email,name,role').in('id',[...ids]);checked(members);
  assert.equal(members.data!.length,2);
  const roles=members.data!.map(member=>member.role).sort();assert.deepEqual(roles,before.count?['recorder','recorder']:['admin','recorder'],'Solo la primera cuenta recibe coordinación; el cuerpo no puede elegir un rol');
  for(const [index,result] of accounts.entries()){
   const bootstrap=await call('bootstrap',result.data.session.access_token);assert.equal(bootstrap.status,200);assert.equal(bootstrap.data.user.email,emails[index]);assert.equal(bootstrap.data.user.name,'Encargado '+index);
  }
  const duplicate=await call('auth/register',undefined,{name:'Duplicado',email:emails[0],password});assert.equal(duplicate.status,409);
  const afterDuplicate=await admin.from('oc_members').select('id').in('email',emails);checked(afterDuplicate);assert.equal(afterDuplicate.data!.length,2,'Un correo duplicado conserva su cuenta original');
  const login=await publicClient().auth.signInWithPassword({email:emails[0],password});checked(login);assert.equal(login.data.user!.id,accounts[0].data.session.user.id);
  const recorder=accounts.find(result=>members.data!.find(member=>member.id===result.data.session.user.id)!.role==='recorder')!;
  assert.equal((await call('event',recorder.data.session.access_token,{})).status,403);
  const anon=publicClient();assert.equal((await call('bootstrap')).status,401);assert.ok((await anon.from('oc_members').select('*')).error);assert.ok((await anon.from('oc_rooms').select('*')).error);
  const rpcArgs={p_user:randomUUID(),p_email:prefix+'-forbidden@example.com',p_name:'Sin permiso'};
  assert.ok((await anon.rpc('oc_register_open_member',rpcArgs)).error,'El registro de miembros no se expone directamente al cliente');
  const signed=publicClient();checked(await signed.auth.setSession(recorder.data.session));assert.ok((await signed.rpc('oc_register_open_member',rpcArgs)).error);
 }finally{
  // Match only this test's random addresses, including a membership whose
  // session response failed; never remove existing accounts or event records.
  const fixtures=await admin.from('oc_members').select('id').in('email',emails);checked(fixtures);for(const row of fixtures.data??[])ids.add(row.id);
  for(const id of ids)checked(await admin.auth.admin.deleteUser(id));
 }
});

test('Supabase: permisos, invitación, conflictos, respaldo privado y revocación', {timeout:120000},async()=>{
 const url=process.env.SUPABASE_URL!,key=process.env.SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!;
 assert.ok(url&&key&&secret,'Configura .env.local para la prueba de integración.');
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const prefix='qa-integration-'+randomUUID(),password=randomUUID()+randomUUID(),name=prefix;
 const ids:string[]=[],roomId=randomUUID(),mediaId=randomUUID();let inviteHash='',reportId='';
 async function call(path:string,token?:string,body?:unknown){const response=await handleRequest(new Request('https://example.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:response.status,data:await response.json()};}
 function checked(result:{error:unknown}){assert.equal(result.error,null);}
 try{
  const owner=await admin.auth.admin.createUser({email:prefix+'@example.com',password,email_confirm:true});checked(owner);ids.push(owner.data.user!.id);
  checked(await admin.from('oc_members').insert({id:ids[0],email:prefix+'@example.com',name,role:'admin'}));
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
  assert.equal((await call('audit',recorderToken)).status,403);
  assert.equal((await call('media/'+mediaId+'/metadata',recorderToken,{deleted:true})).status,403);
  const latestRoom=changes.find(result=>result.status===200)!.data.room;
  const confirmed={...latestRoom,mutationId:randomUUID(),items:latestRoom.items.map((item:Record<string,unknown>)=>({...item,reception:0,return:0})),reception:{...latestRoom.reception,checks:Object.fromEntries(Object.keys(latestRoom.reception.checks).map(key=>[key,'ok'])),confirmedAt:new Date().toISOString(),confirmedBy:name},return:{...latestRoom.return,checks:Object.fromEntries(Object.keys(latestRoom.return.checks).map(key=>[key,'ok'])),confirmedAt:new Date().toISOString(),confirmedBy:name}};
  assert.equal((await call('rooms',token,confirmed)).status,200);
  assert.equal((await call('media/'+mediaId+'/metadata',token,{name:prefix+' evidencia',note:'Detalle actualizado',deleted:true})).status,200);
  const afterTrash=(await call('bootstrap',token)).data;
  const trashed=afterTrash.media.find((m:{id:string})=>m.id===mediaId);assert.equal(trashed.deleted,true);assert.equal(trashed.name,prefix+' evidencia');
  const reopened=afterTrash.rooms.find((room:{id:string})=>room.id===roomId);assert.equal(reopened.reception.confirmedAt,null);assert.equal(reopened.return.confirmedAt,null);assert.equal(reopened.revision,confirmed.revision+2,'Confirmar y quitar evidencia crean revisiones separadas');
  assert.equal((await call('uploads/'+mediaId+'/thumbnail',token,{base64:'/9j/2Q=='})).status,200);
  const afterThumbnail=(await call('bootstrap',token)).data.media.find((m:{id:string})=>m.id===mediaId);assert.equal(afterThumbnail.deleted,true);assert.equal(afterThumbnail.note,'Detalle actualizado');
  assert.equal((await call('media/'+mediaId+'/metadata',token,{deleted:false})).status,200);
  const audit=await call('audit?category=files&search='+encodeURIComponent(prefix+' evidencia'),token);assert.equal(audit.status,200);assert.ok(audit.data.entries.some((e:{action:string})=>e.action==='trashed'));assert.ok(audit.data.entries.some((e:{action:string})=>e.action==='restored'));assert.ok(audit.data.entries.every((e:{actor_id:string})=>e.actor_id===ids[0]));
  assert.ok((await anon.from('oc_audit').select('*')).error);assert.ok((await other.from('oc_audit').insert({category:'files'})).error);
  assert.equal((await call('auth/team',recorderToken)).status,403);
  assert.equal((await call('auth/member',recorderToken,{userId:ids[1],role:'admin'})).status,403);
  assert.equal((await call('auth/member',token,{userId:ids[1],role:'superadmin'})).status,400);
  assert.equal((await call('auth/member',token,{userId:ids[1],role:'coordinator'})).status,200);
  assert.equal((await call('bootstrap',recorderToken)).data.user.role,'coordinator');
  const roleAudit=await call('audit?category=team&search='+encodeURIComponent(prefix),recorderToken);assert.equal(roleAudit.status,200);assert.ok(roleAudit.data.entries.some((entry:{action:string;entity_id:string;actor_id:string})=>entry.action==='role'&&entry.entity_id===ids[1]&&entry.actor_id===ids[0]));
  assert.equal((await call('auth/member',recorderToken,{userId:ids[1],role:'admin'})).status,403);
  assert.equal((await call('auth/revoke',recorderToken,{userId:ids[0]})).status,403);
  assert.equal((await call('media/'+mediaId+'/metadata',recorderToken,{note:'Revisado por coordinación',category:'General'})).status,200);
  const coordinatorAudit=await call('audit?category=files&search='+encodeURIComponent(prefix+' evidencia'),token);assert.ok(coordinatorAudit.data.entries.some((entry:{entity_id:string;actor_id:string;after_data:{note:string}})=>entry.entity_id===mediaId&&entry.actor_id===ids[1]&&entry.after_data.note==='Revisado por coordinación'));
  const report=await call('reports',recorderToken,{title:prefix+' informe',text:'Registro temporal de prueba',roomIds:[roomId],kind:'comparison'});assert.equal(report.status,200);reportId=report.data.id;
  const reportAudit=await call('audit?category=reports&search='+encodeURIComponent(prefix),token);assert.ok(reportAudit.data.entries.some((entry:{entity_id:string;actor_id:string})=>entry.entity_id===reportId&&entry.actor_id===ids[1]));
  assert.equal((await call('auth/member',token,{userId:ids[1],role:'admin'})).status,200);
  assert.equal((await call('auth/team',recorderToken)).status,200);
  assert.equal((await call('auth/member',recorderToken,{userId:ids[0],role:'recorder'})).status,200);
  assert.equal((await call('auth/member',token,{userId:ids[0],role:'admin'})).status,403,'Un token anterior no conserva permisos de administrador');
  assert.equal((await call('auth/member',recorderToken,{userId:ids[0],role:'admin'})).status,200);
  assert.equal((await call('auth/revoke',token,{userId:ids[1]})).status,200);assert.equal((await call('bootstrap',recorderToken)).status,403);assert.ok((await other.storage.from('evidence').download(init.data.objectPath)).error);
  const management=await call('auth/team',token);assert.equal(management.status,200);assert.equal(management.data.team.find((m:{id:string})=>m.id===ids[1]).disabled,true);
  assert.equal((await call('auth/member',token,{userId:ids[1],disabled:false,role:'recorder'})).status,200);
  assert.equal((await call('bootstrap',recorderToken)).status,200);
  assert.ok((await anon.rpc('oc_manage_member',{p_actor:ids[0],p_target:ids[1],p_role:'admin'})).error);
 }finally{
  if(reportId)checked(await admin.from('oc_reports').delete().eq('id',reportId));
  checked(await admin.storage.from('evidence').remove(['originals/'+mediaId,'thumbnails/'+mediaId+'.jpg']));
  checked(await admin.from('oc_media').delete().eq('id',mediaId));checked(await admin.from('oc_history').delete().eq('room_id',roomId));checked(await admin.from('oc_rooms').delete().eq('id',roomId));
  if(inviteHash)checked(await admin.from('oc_invites').delete().eq('code_hash',inviteHash));
  for(const id of ids)checked(await admin.auth.admin.deleteUser(id));
 }
});
