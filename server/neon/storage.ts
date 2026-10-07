import {S3Client,HeadObjectCommand,GetObjectCommand,PutObjectCommand,CreateMultipartUploadCommand,ListPartsCommand,UploadPartCommand,CompleteMultipartUploadCommand,AbortMultipartUploadCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {database} from './database.js';
import type {User} from '../../lib/model.js';

let client:S3Client|undefined;
export const bucket=()=>process.env.S3_BUCKET??'evidence';
export const partSize=6*1024*1024;
export class StorageError extends Error{constructor(message:string,public status=409){super(message);}}
export function storage(){if(!process.env.AWS_ENDPOINT_URL_S3||!process.env.AWS_ACCESS_KEY_ID||!process.env.AWS_SECRET_ACCESS_KEY)throw new StorageError('Falta configurar el almacenamiento.',503);return client??=new S3Client({endpoint:process.env.AWS_ENDPOINT_URL_S3,region:process.env.AWS_REGION??'us-east-2',forcePathStyle:true,credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});}
export async function objectInfo(key:string){try{return await storage().send(new HeadObjectCommand({Bucket:bucket(),Key:key}));}catch(e){if((e as {name:string}).name==='NotFound'||(e as {$metadata?:{httpStatusCode:number}}).$metadata?.httpStatusCode===404)return null;throw e;}}
export async function signedFile(key:string,name?:string){return getSignedUrl(storage(),new GetObjectCommand({Bucket:bucket(),Key:key,...(name?{ResponseContentDisposition:'attachment; filename="'+name.replace(/["\r\n\\]/g,'_').replace(/[^\x20-\x7e]/g,'_')+'"; filename*=UTF-8\'\''+encodeURIComponent(name)}:{})}),{expiresIn:900});}
export async function putThumbnail(key:string,bytes:Buffer){await storage().send(new PutObjectCommand({Bucket:bucket(),Key:key,Body:bytes,ContentType:'image/jpeg'}));}
async function sessionFile(id:string,user:User){const result=await database().query('select m.*, u.upload_id from oc_media m left join oc_uploads u on u.media_id=m.id where m.id=$1',[id]);const file=result.rows[0];if(!file)throw new StorageError('Archivo no encontrado.',404);if(file.owner_id!==user.id)throw new StorageError('Archivo de otro encargado.',403);return file;}
export async function uploadedParts(file:any){if(!file.upload_id)return [];const result=await storage().send(new ListPartsCommand({Bucket:bucket(),Key:file.object_path,UploadId:file.upload_id}));return (result.Parts??[]).map(p=>({number:p.PartNumber!,size:p.Size!,etag:p.ETag!}));}
export async function beginUpload(input:any,user:User){
 const db=await database().connect();
 try{
  await db.query('begin');await db.query('select pg_advisory_xact_lock(71927263)');
  let file=(await db.query('select m.*,u.upload_id from oc_media m left join oc_uploads u on u.media_id=m.id where m.id=$1 for update of m',[input.id])).rows[0];
  if(file){if(file.owner_id!==user.id||file.room_id!==input.roomId||file.phase!==input.phase||file.data.size!==input.size||file.data.mime!==input.mime)throw new StorageError('El archivo pertenece a otra carga.');if(file.status==='ready'){await db.query('commit');return {ready:true};}}
  else{
   const usage=await db.query("select coalesce(sum((data->>'size')::bigint+1048576),0)::bigint as bytes from oc_media");
   if(Number(usage.rows[0].bytes)+input.size+1048576>4_800_000_000)throw new StorageError('El almacenamiento gratuito está lleno. El original queda en este teléfono.',507);
   await db.query('insert into oc_media(id,room_id,phase,owner_id,object_path,created_at,data) values($1,$2,$3,$4,$5,$6,$7)',[input.id,input.roomId,input.phase,user.id,'originals/'+input.id,input.createdAt,{...input,author:user.name,status:'pending'}]);
   file={id:input.id,data:input,object_path:'originals/'+input.id};
  }
  const original=await objectInfo(file.object_path);
  if(original?.ContentLength===input.size){await db.query('select oc_finish_media($1,$2)',[user.id,input.id]);await db.query('commit');return {ready:true};}
  if(!file.upload_id){const upload=await storage().send(new CreateMultipartUploadCommand({Bucket:bucket(),Key:file.object_path,ContentType:file.data.mime}));if(!upload.UploadId)throw new StorageError('No se pudo iniciar la carga.',503);file.upload_id=upload.UploadId;await db.query('insert into oc_uploads(media_id,upload_id) values($1,$2)',[input.id,upload.UploadId]);}
  let parts:{number:number,size:number,etag:string}[];
  try{parts=await uploadedParts(file);}catch(e){if((e as {name:string}).name!=='NoSuchUpload')throw e;await storage().send(new AbortMultipartUploadCommand({Bucket:bucket(),Key:file.object_path,UploadId:file.upload_id})).catch(()=>{});const upload=await storage().send(new CreateMultipartUploadCommand({Bucket:bucket(),Key:file.object_path,ContentType:file.data.mime}));file.upload_id=upload.UploadId;await db.query('update oc_uploads set upload_id=$2,created_at=now() where media_id=$1',[input.id,file.upload_id]);parts=[];}
  await db.query('commit');return {protocol:'s3-multipart',partSize,parts};
 }catch(e){await db.query('rollback');throw e;}finally{db.release();}
}
export async function signPart(id:string,number:number,user:User){const file=await sessionFile(id,user);const total=Math.ceil(file.data.size/partSize);if(!file.upload_id||!Number.isInteger(number)||number<1||number>total)throw new StorageError('Parte de carga inválida.',400);const size=Math.min(partSize,file.data.size-(number-1)*partSize);const url=await getSignedUrl(storage(),new UploadPartCommand({Bucket:bucket(),Key:file.object_path,UploadId:file.upload_id,PartNumber:number,ContentLength:size}),{expiresIn:900});return {url};}
export async function finishUpload(id:string,user:User){
 const file=await sessionFile(id,user);if(file.status==='ready')return {ready:true};
 let original=await objectInfo(file.object_path);
 if(!original){
  const parts=await uploadedParts(file);const total=Math.ceil(file.data.size/partSize);
  if(parts.length!==total||parts.some((p,i)=>p.number!==i+1||p.size!==Math.min(partSize,file.data.size-i*partSize)))throw new StorageError('El archivo aún no termina de subir.');
  await storage().send(new CompleteMultipartUploadCommand({Bucket:bucket(),Key:file.object_path,UploadId:file.upload_id,MultipartUpload:{Parts:parts.map(p=>({PartNumber:p.number,ETag:p.etag}))}}));original=await objectInfo(file.object_path);
 }
 if(original?.ContentLength!==file.data.size)throw new StorageError('El original no tiene el tamaño esperado.');
 await database().query('select oc_finish_media($1,$2)',[user.id,id]);return {ready:true};
}
