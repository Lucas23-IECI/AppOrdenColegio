import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {DEFAULT_EVENT,MEDIA_TYPE,type User,type Room,type Media} from '../lib/model.js';
import {roomSchema} from '../lib/validation.js';
let service:SupabaseClient|undefined;
function admin(){if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)throw new ApiError('Falta configurar el servidor de respaldo.',503);return service??=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
function publicAuth(){return createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});}
class ApiError extends Error{constructor(message:string,public status=400){super(message);}}
function check(result:{error:unknown}){if(result.error){console.error('Supabase operation failed',result.error);throw new ApiError('No se pudo guardar en Supabase. Tus cambios locales se conservan.',503);}}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const maxFileBytes=50*1024*1024;
async function identity(request:Request):Promise<User>{const token=request.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)throw new ApiError('Ingresa para abrir el registro.',401);const auth=await admin().auth.getUser(token);if(auth.error||!auth.data.user)throw new ApiError('Tu sesión venció. Vuelve a ingresar.',401);const member=await admin().from('oc_members').select('id,email,name,role').eq('id',auth.data.user.id).eq('disabled',false).maybeSingle();check(member);if(!member.data)throw new ApiError('Tu usuario no tiene acceso a este evento.',403);return member.data as User;}
function coordinator(user:User){if(user.role!=='coordinator')throw new ApiError('Esta acción corresponde al coordinador.',403);}
async function asset(id:string){const r=await admin().from('oc_media').select('*').eq('id',id).maybeSingle();check(r);if(!r.data)throw new ApiError('Archivo no encontrado.',404);return r.data;}
async function rows(table:string,selection='*'){const list:Record<string,any>[]=[];for(let offset=0;;offset+=1000){const result=await admin().from(table).select(selection).range(offset,offset+999);check(result);list.push(...result.data??[]);if(!result.data||result.data.length<1000)return list;}}
const account=z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().toLowerCase(),password:z.string().min(12).max(200)});
async function authRoute(request:Request,path:string[]){const action=path[1];if(action==='status'&&request.method==='GET'){const result=await admin().from('oc_members').select('id',{count:'exact',head:true}).eq('role','coordinator');check(result);return {needsSetup:!result.count};}
 if(request.method!=='POST')throw new ApiError('Método no permitido.',405);const body=await request.json();
 if(action==='setup'||action==='join'){
  const input=account.extend({setupKey:z.string().optional(),code:z.string().optional()}).parse(body);
  if(action==='setup'){const expected=process.env.INITIAL_SETUP_KEY;if(!expected||!timingSafeEqual(Buffer.from(hash(input.setupKey??'')),Buffer.from(hash(expected))))throw new ApiError('El enlace de instalación no es correcto.',403);const count=await admin().from('oc_members').select('id',{count:'exact',head:true}).eq('role','coordinator');check(count);if(count.count)throw new ApiError('El coordinador ya está creado. Ingresa con tu correo.',409);}
  else{const invite=await admin().from('oc_invites').select('code_hash').eq('code_hash',hash(input.code??'')).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();check(invite);if(!invite.data)throw new ApiError('La invitación venció o ya fue utilizada.',403);}
  const created=await admin().auth.admin.createUser({email:input.email,password:input.password,email_confirm:true,user_metadata:{name:input.name}});if(created.error||!created.data.user)throw new ApiError('No se pudo crear el acceso. Ese correo puede estar registrado.',409);
  const member=await admin().rpc('oc_register_member',{p_user:created.data.user.id,p_email:input.email,p_name:input.name,p_invite_hash:action==='join'?hash(input.code??''):null,p_owner:action==='setup'});
  if(member.error){await admin().auth.admin.deleteUser(created.data.user.id);throw new ApiError('No se pudo utilizar ese acceso: ya fue usado o expiró.',409);}
  const signed=await publicAuth().auth.signInWithPassword({email:input.email,password:input.password});if(signed.error)throw new ApiError('El usuario se creó. Ingresa con tu correo y contraseña.',401);return {session:signed.data.session};
 }
 const user=await identity(request);coordinator(user);
 if(action==='invites'){const {name}=z.object({name:z.string().trim().min(2).max(100)}).parse(body);const code=randomBytes(24).toString('base64url');const expiresAt=new Date(Date.now()+48*3600000).toISOString();check(await admin().from('oc_invites').insert({code_hash:hash(code),name,expires_at:expiresAt}));return {code,expiresAt,name};}
 if(action==='revoke'){const {userId}=z.object({userId:z.string().uuid()}).parse(body);if(userId===user.id)throw new ApiError('No puedes quitar tu propio acceso.');check(await admin().from('oc_members').update({disabled:true}).eq('id',userId));return {ok:true};}
 throw new ApiError('Acción no encontrada.',404);
}
async function dispatch(request:Request){const url=new URL(request.url);const route=url.searchParams.get('route')??url.pathname.replace(/^\/api\/?/,'');const path=route.split('/').filter(Boolean);
 const origin=request.headers.get('origin');if(request.method!=='GET'&&origin&&origin!==url.origin)throw new ApiError('Origen no permitido.',403);
 if(path[0]==='auth')return authRoute(request,path);
 const user=await identity(request);
 if(request.method==='GET'){
  if(path[0]==='bootstrap'){const [rooms,media,team,event]=await Promise.all([rows('oc_rooms','data'),rows('oc_media','data,status'),admin().from('oc_members').select('id,name,email,role').eq('disabled',false),admin().from('oc_settings').select('value').eq('key','event').maybeSingle()]);check(team);check(event);return {user,rooms:rooms.map(r=>r.data),media:media.filter(r=>r.status==='ready').map(r=>({...r.data,status:'ready'})),team:team.data,event:event.data?.value??DEFAULT_EVENT,limits:{maxFileBytes}};}
  if(path[0]==='history'){const r=await admin().from('oc_history').select('revision,data,author,created_at').eq('room_id',path[1]).order('revision',{ascending:false}).limit(60);check(r);return {history:r.data?.map(v=>({...v,data:JSON.stringify(v.data)}))};}
  if(path[0]==='reports'){const r=await admin().from('oc_reports').select('*').order('created_at',{ascending:false}).limit(30);check(r);return {reports:r.data};}
  if(path[0]==='media'&&path[1]){const file=await asset(path[1]);if(file.status!=='ready')throw new ApiError('El archivo todavía está subiendo.',409);const thumbnail=path[2]==='thumbnail';const key=thumbnail?'thumbnails/'+file.id+'.jpg':file.object_path;const signed=await admin().storage.from('evidence').createSignedUrl(key,900,url.searchParams.has('download')?{download:file.data.name}:undefined);check(signed);return {url:signed.data!.signedUrl};}
 }
 if(request.method!=='POST')throw new ApiError('Método no permitido.',405);
 const body=await request.json();
 if(path[0]==='rooms'){
  const input=roomSchema.parse(body);const existing=await admin().from('oc_rooms').select('data').eq('id',input.id).maybeSingle();check(existing);if(existing.data?.data.archived!==undefined&&existing.data.data.archived!==input.archived)coordinator(user);
  for(const stage of ['reception','return'] as const){if(input[stage].confirmedAt){if(input.items.some(i=>i[stage]===null)||Object.values(input[stage].checks).some(v=>v==='pending')||(Object.values(input[stage].checks).includes('issue')&&!input[stage].notes.trim()))throw new ApiError('Completa cantidades y revisión antes de confirmar.');if(stage==='return'&&!input.reception.confirmedAt)throw new ApiError('Confirma primero la recepción.');}}
  const r=await admin().rpc('oc_save_room',{p_input:input,p_author:user.name});check(r);if(r.data.conflict)return Response.json({error:'El espacio cambió en otro dispositivo.',conflict:r.data.conflict},{status:409});return r.data;
 }
 if(path[0]==='event'){coordinator(user);const event=z.object({name:z.string().min(1).max(150),institution:z.string().max(150),location:z.string().max(100),coordinator:z.string().max(100)}).parse(body);check(await admin().from('oc_settings').upsert({key:'event',value:event}));return {event};}
 if(path[0]==='uploads'&&path[1]==='init'){
  const input=z.object({id:z.string().uuid(),roomId:z.string().uuid(),phase:z.enum(['reception','return']),name:z.string().min(1).max(300),mime:z.string().regex(MEDIA_TYPE),size:z.number().int().positive().max(maxFileBytes),createdAt:z.string().datetime(),note:z.string().max(2000),category:z.string().max(60),duration:z.number().optional()}).parse(body);
  const prior=await admin().from('oc_media').select('*').eq('id',input.id).maybeSingle();check(prior);
  if(prior.data){if(prior.data.owner_id!==user.id||prior.data.data.size!==input.size||prior.data.room_id!==input.roomId||prior.data.phase!==input.phase)throw new ApiError('El archivo pertenece a otra carga.',409);if(prior.data.status==='ready')return {ready:true};}
  const objectPath='originals/'+input.id;
  if(!prior.data){const r=await admin().from('oc_media').insert({id:input.id,room_id:input.roomId,phase:input.phase,owner_id:user.id,object_path:objectPath,created_at:input.createdAt,data:{...input,author:user.name,status:'pending'}});if(r.error&&r.error.code!=='23505')check(r);}
  if(prior.data){const existingFile=await admin().storage.from('evidence').info(objectPath);if(!existingFile.error&&Number(existingFile.data?.size)===input.size){check(await admin().from('oc_media').update({status:'ready',data:{...prior.data.data,status:'ready'}}).eq('id',input.id));return {ready:true};}}
  return {objectPath,bucket:'evidence',endpoint:process.env.SUPABASE_URL!.replace('.supabase.co','.storage.supabase.co')+'/storage/v1/upload/resumable'};
 }
 if(path[0]==='uploads'&&path[2]==='complete'){
  const file=await asset(path[1]);if(file.owner_id!==user.id)throw new ApiError('Archivo de otro encargado.',403);if(file.status==='ready')return {ready:true};
  const info=await admin().storage.from('evidence').info(file.object_path);check(info);if(Number(info.data?.size)!==file.data.size)throw new ApiError('El archivo aún no termina de subir.',409);
  check(await admin().from('oc_media').update({status:'ready',data:{...file.data,status:'ready'}}).eq('id',file.id));return {ready:true};
 }
 if(path[0]==='uploads'&&path[2]==='thumbnail'){
  const file=await asset(path[1]);if(file.owner_id!==user.id)throw new ApiError('Archivo de otro encargado.',403);
  const input=z.object({base64:z.string().max(1400000)}).parse(body);const bytes=Buffer.from(input.base64,'base64');if(bytes.length>1024*1024||bytes[0]!==255||bytes[1]!==216)throw new ApiError('Miniatura inválida.');
  const r=await admin().storage.from('evidence').upload('thumbnails/'+file.id+'.jpg',bytes,{contentType:'image/jpeg',upsert:true});check(r);check(await admin().from('oc_media').update({data:{...file.data,thumbnailReady:true}}).eq('id',file.id));return {ok:true};
 }
 if(path[0]==='media'&&path[2]==='metadata'){const file=await asset(path[1]);if(file.owner_id!==user.id&&user.role!=='coordinator')throw new ApiError('Solo el autor o coordinador puede editar.',403);const data=z.object({note:z.string().max(2000),category:z.string().max(60)}).parse(body);check(await admin().from('oc_media').update({data:{...file.data,...data}}).eq('id',file.id));return {ok:true};}
 if(path[0]==='reports'){const data=z.object({title:z.string().max(200),text:z.string().max(300000),roomIds:z.array(z.string().uuid()).max(1000),kind:z.string().max(30)}).parse(body);const result=await admin().from('oc_reports').insert({data,author:user.name}).select('id').single();check(result);return result.data;}
 throw new ApiError('Acción no encontrada.',404);
}
export async function handleRequest(request:Request){try{if(Number(request.headers.get('content-length')||0)>2*1024*1024)throw new ApiError('Solicitud demasiado grande.',413);const result=await dispatch(request);const response=result instanceof Response?result:Response.json(result);response.headers.set('Cache-Control','no-store');response.headers.set('X-Content-Type-Options','nosniff');return response;}catch(e){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:'Revisa los datos: '+e.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')},{status:400});console.error(e);return Response.json({error:'No se pudo completar la operación. Tus cambios locales se conservan.'},{status:503});}}
