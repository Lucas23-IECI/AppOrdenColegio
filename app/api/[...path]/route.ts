import { db,bucket,identity,coordinator,sameOrigin,responseError,ApiError,roomSchema,getRoom,eventInfo,PART_SIZE,boundedBytes } from '@/lib/server';
import { type Media,MEDIA_TYPE } from '@/lib/model';
import { z } from 'zod';
export const dynamic='force-dynamic';
type Row={id:string,room_id:string,phase:string,data:string,status:string,upload_id:string|null,owner_id:string};
async function asset(id:string){const row=await db().prepare('SELECT * FROM media WHERE id=?').bind(id).first<Row>();if(!row)throw new ApiError('Archivo no encontrado.',404);return row;}
const key=(id:string)=>'originals/'+id;
export async function GET(request:Request){try{
 const user=await identity();const url=new URL(request.url);const p=url.pathname.slice(5).split('/');
 if(p[0]==='bootstrap'){
  const [rr,mm,team,info]=await Promise.all([db().prepare('SELECT data FROM rooms ORDER BY updated_at').all<{data:string}>(),db().prepare("SELECT data,status FROM media WHERE status='ready' ORDER BY created_at").all<{data:string,status:string}>(),db().prepare('SELECT id,name,email,role FROM members').all(),eventInfo()]);
  return Response.json({user,rooms:rr.results.map(r=>JSON.parse(r.data)),media:mm.results.map(r=>({...JSON.parse(r.data),status:r.status})),team:team.results,event:info},{headers:{'Cache-Control':'no-store'}});
 }
 if(p[0]==='history'&&p[1]){const rows=await db().prepare('SELECT revision,data,author,created_at FROM history WHERE room_id=? ORDER BY revision DESC LIMIT 60').bind(p[1]).all();return Response.json({history:rows.results});}
 if(p[0]==='media'&&p[1]){
  const row=await asset(p[1]);if(row.status!=='ready')throw new ApiError('El archivo aún no termina de subir.',409);
  const meta=JSON.parse(row.data) as Media;const thumb=p[2]==='thumbnail';const objectKey=thumb?'thumbnails/'+row.id:key(row.id);
  const range=request.headers.get('range');const head=await bucket().head(objectKey);if(!head)throw new ApiError('Archivo no disponible.',404);
  let bounds:{offset:number,length:number}|undefined;
  if(range&&!thumb){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`}});let start=match[1]?Number(match[1]):Math.max(0,head.size-Number(match[2]));let end=match[1]?(match[2]?Math.min(Number(match[2]),head.size-1):head.size-1):head.size-1;if(start>=head.size||end<start||!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`}});bounds={offset:start,length:end-start+1};}
  const object=await bucket().get(objectKey,bounds?{range:bounds}:undefined);if(!object)throw new ApiError('Archivo no encontrado.',404);
  const headers=new Headers({'Content-Type':thumb?'image/jpeg':meta.mime,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Length':String(bounds?.length??head.size)});
  if(bounds)headers.set('Content-Range',`bytes ${bounds.offset}-${bounds.offset+bounds.length-1}/${head.size}`);
  if(url.searchParams.has('download'))headers.set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`);
  return new Response(object.body,{status:bounds?206:200,headers});
 }
 if(p[0]==='reports'){const rows=await db().prepare('SELECT id,created_at,author,data FROM reports ORDER BY created_at DESC LIMIT 30').all();return Response.json({reports:rows.results});}
 throw new ApiError('Ruta no encontrada.',404);
 }catch(e){return responseError(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const user=await identity();const p=new URL(request.url).pathname.slice(5).split('/');
 if(p[0]==='rooms'){
  const raw=await request.json();const input=roomSchema.parse(raw);const existing=await getRoom(input.id);
  if(existing?.mutation_id===input.mutationId)return Response.json({room:existing.room});
  if(existing&&existing.revision!==input.revision)return Response.json({error:'Este espacio cambió en otro dispositivo.',conflict:existing.room},{status:409});
  if(!existing&&input.revision!==0)throw new ApiError('El registro original no se encontró.',409);
  if(existing&&existing.room.archived!==input.archived)coordinator(user);
  for(const phase of ['reception','return'] as const){if(input[phase].confirmedAt&&(input.items.some(i=>i[phase]===null)||Object.values(input[phase].checks).some(v=>v==='pending')||(Object.values(input[phase].checks).includes('issue')&&!input[phase].notes.trim())))throw new ApiError('La revisión confirmada tiene datos incompletos.');}
  const now=new Date().toISOString();const updated={...input,revision:input.revision+1,updatedAt:now,updatedBy:user.name};const json=JSON.stringify(updated);
  const mutation=existing?db().prepare('UPDATE rooms SET data=?,revision=?,mutation_id=?,updated_at=? WHERE id=? AND revision=? RETURNING id').bind(json,updated.revision,input.mutationId,now,input.id,input.revision):db().prepare('INSERT OR IGNORE INTO rooms (id,data,revision,mutation_id,updated_at) VALUES (?,?,?,?,?) RETURNING id').bind(input.id,json,1,input.mutationId,now);
  const results=await db().batch([mutation,db().prepare('INSERT OR IGNORE INTO history (id,room_id,revision,data,author,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM rooms WHERE id=? AND mutation_id=?)').bind(input.mutationId,input.id,updated.revision,json,user.name,now,input.id,input.mutationId)]);
  if(!results[0].results.length){const latest=await getRoom(input.id);return Response.json({error:'Registro actualizado por otro encargado.',conflict:latest?.room},{status:409});}
  return Response.json({room:updated});
 }
 if(p[0]==='event'){coordinator(user);const data=z.object({name:z.string().min(1).max(150),institution:z.string().max(150),location:z.string().max(100),coordinator:z.string().max(100)}).parse(await request.json());await db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('event',JSON.stringify(data)).run();return Response.json({event:data});}
 if(p[0]==='team'){coordinator(user);const data=z.object({email:z.string().email(),name:z.string().min(1).max(100),role:z.enum(['recorder','coordinator'])}).parse(await request.json());await db().prepare('INSERT INTO members (id,email,name,role) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role').bind(crypto.randomUUID(),data.email.toLowerCase(),data.name,data.role).run();return Response.json({ok:true});}
 if(p[0]==='uploads'&&p[1]==='init'){
  const data=z.object({id:z.string().uuid(),roomId:z.string().uuid(),phase:z.enum(['reception','return']),name:z.string().min(1).max(300),mime:z.string().regex(MEDIA_TYPE),size:z.number().int().positive().max(2*1024**3),createdAt:z.string().datetime(),note:z.string().max(2000),category:z.string().max(60),duration:z.number().optional()}).parse(await request.json());
  if(!await getRoom(data.roomId))throw new ApiError('Primero respalda el espacio al que pertenece este archivo.',409);
  let row=await db().prepare('SELECT * FROM media WHERE id=?').bind(data.id).first<Row>();
  if(row){const stored=JSON.parse(row.data);if(stored.size!==data.size||stored.roomId!==data.roomId||stored.phase!==data.phase||row.owner_id!==user.id)throw new ApiError('El identificador pertenece a otro archivo.',409);if(row.status==='ready')return Response.json({ready:true});}
  if(!row){const upload=await bucket().createMultipartUpload(key(data.id),{httpMetadata:{contentType:data.mime}});const meta={...data,author:user.name,status:'pending'};const inserted=await db().prepare('INSERT OR IGNORE INTO media (id,room_id,phase,data,status,upload_id,owner_id,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(data.id,data.roomId,data.phase,JSON.stringify(meta),'pending',upload.uploadId,user.id,data.createdAt).run();if(!inserted.meta.changes)await upload.abort();row=await asset(data.id);}
  const existingParts=await db().prepare('SELECT part_number AS partNumber,etag FROM upload_parts WHERE media_id=? ORDER BY part_number').bind(data.id).all();return Response.json({parts:existingParts.results,partSize:PART_SIZE});
 }
 if(p[0]==='uploads'&&p[1]&&p[2]==='part'){
  const row=await asset(p[1]);if(row.owner_id!==user.id)throw new ApiError('No puedes cambiar esta carga.',403);if(row.status==='ready')return Response.json({ready:true});
  const partNumber=Number(new URL(request.url).searchParams.get('number'));const meta=JSON.parse(row.data);const total=Math.ceil(meta.size/PART_SIZE);if(!Number.isInteger(partNumber)||partNumber<1||partNumber>total)throw new ApiError('Parte de archivo inválida.');
  const expected=Math.min(PART_SIZE,meta.size-(partNumber-1)*PART_SIZE);const bytes=await boundedBytes(request,PART_SIZE);if(bytes.byteLength!==expected)throw new ApiError('El tamaño del bloque no coincide.');
  if(!row.upload_id)throw new ApiError('Carga no inicializada.',409);const upload=bucket().resumeMultipartUpload(key(row.id),row.upload_id);const part=await upload.uploadPart(partNumber,bytes);
  await db().prepare('INSERT INTO upload_parts (id,media_id,part_number,etag) VALUES (?,?,?,?) ON CONFLICT(media_id,part_number) DO UPDATE SET etag=excluded.etag').bind(row.id+':'+partNumber,row.id,partNumber,part.etag).run();return Response.json(part);
 }
 if(p[0]==='uploads'&&p[1]&&p[2]==='complete'){
  const row=await asset(p[1]);if(row.owner_id!==user.id)throw new ApiError('No puedes completar esta carga.',403);if(row.status==='ready')return Response.json({ready:true});const meta=JSON.parse(row.data);
  let head=await bucket().head(key(row.id));
  if(!head){const pp=await db().prepare('SELECT part_number AS partNumber,etag FROM upload_parts WHERE media_id=? ORDER BY part_number').bind(row.id).all<{partNumber:number,etag:string}>();if(pp.results.length!==Math.ceil(meta.size/PART_SIZE))throw new ApiError('Todavía faltan partes del archivo.',409);await bucket().resumeMultipartUpload(key(row.id),row.upload_id!).complete(pp.results);head=await bucket().head(key(row.id));}
  if(!head||head.size!==meta.size)throw new ApiError('No se pudo verificar el archivo completo.',409);
  await db().prepare("UPDATE media SET status='ready',data=? WHERE id=?").bind(JSON.stringify({...meta,status:'ready'}),row.id).run();return Response.json({ready:true});
 }
 if(p[0]==='uploads'&&p[1]&&p[2]==='thumbnail'){
  const row=await asset(p[1]);if(row.owner_id!==user.id)throw new ApiError('Archivo de otro encargado.',403);const bytes=await boundedBytes(request,1024*1024);await bucket().put('thumbnails/'+row.id,bytes,{httpMetadata:{contentType:'image/jpeg'}});const meta={...JSON.parse(row.data),thumbnailReady:true};await db().prepare('UPDATE media SET data=? WHERE id=?').bind(JSON.stringify(meta),row.id).run();return Response.json({ok:true});
 }
 if(p[0]==='media'&&p[1]&&p[2]==='metadata'){const row=await asset(p[1]);if(row.owner_id!==user.id&&user.role!=='coordinator')throw new ApiError('Solo el autor o coordinador puede editar esta nota.',403);const data=z.object({note:z.string().max(2000),category:z.string().max(60)}).parse(await request.json());await db().prepare('UPDATE media SET data=? WHERE id=?').bind(JSON.stringify({...JSON.parse(row.data),...data}),row.id).run();return Response.json({ok:true});}
 if(p[0]==='reports'){const data=z.object({title:z.string().max(200),text:z.string().max(300000),roomIds:z.array(z.string().uuid()).max(500),kind:z.string().max(30)}).parse(await request.json());const id=crypto.randomUUID();await db().prepare('INSERT INTO reports (id,data,created_at,author) VALUES (?,?,?,?)').bind(id,JSON.stringify(data),new Date().toISOString(),user.name).run();return Response.json({id});}
 throw new ApiError('Acción no encontrada.',404);
 }catch(e){return responseError(e);}}
