import {canWrite} from './permissions';
import {uploadThumbnail} from './media-tools';
import {uploadMultipart,type MultipartInit} from './multipart-upload';
import {getSupabase} from './supabase';
import {allRooms,allMedia,getRoomLocal,putRoom,putMedia,patchMedia,fileBlob,acceptSync,mergeServer,setMeta,type Bootstrap} from './local-store';
import {plainRoom,type LocalRoom,type Media} from './model';
import {api,HttpError} from './http';
import {editableMediaFields,mediaPending} from './media-state';
export {api,HttpError} from './http';
let syncing:Promise<void>|null=null;
export function syncAll(notify:()=>void,status:(value:string)=>void,onBootstrap?:(value:Bootstrap)=>void):Promise<void>{if(syncing)return syncing;syncing=performSync(notify,status,onBootstrap).finally(()=>{syncing=null;});return syncing;}
async function performSync(notify:()=>void,status:(value:string)=>void,onBootstrap?:(value:Bootstrap)=>void){
 if(!navigator.onLine){status('Sin conexión · guardado en este teléfono');return;}
 const permissions=await api<Bootstrap>('bootstrap');onBootstrap?.(permissions);
 if(!canWrite(permissions.user)){await mergeServer(permissions.rooms,permissions.media);await setMeta('event',permissions.event);await setMeta('lastSync',new Date().toISOString());notify();status('Solo lectura · registros actualizados');return;}
 status('Respaldando registros…');
 for(const original of await allRooms()){
  if(!original.dirty||original.conflict)continue;
  try{const result=await api<{room:LocalRoom}>('rooms',plainRoom(original));await acceptSync(original,result.room);}
  catch(e){if(e instanceof HttpError&&e.status===409&&e.data.conflict){const latest=await getRoomLocal(original.id);if(latest)await putRoom({...latest,conflict:e.data.conflict as LocalRoom});}else{throw e;}}
 }
 notify();
 for(const item of await allMedia()){
  if(item.status==='ready'||item.deleted)continue;
  const parent=await getRoomLocal(item.roomId);if(!parent||parent.dirty||parent.conflict)continue;
  try{await uploadMedia(item,notify,status);}catch(e){await patchMedia(item.id,{status:'error',error:e instanceof Error?e.message:'Carga interrumpida'});notify();if(e instanceof HttpError&&(e.status===401||e.status===403))throw e;if(!navigator.onLine)break;}
 }
 const metadataFiles=await allMedia();
 for(const item of metadataFiles){if((item.status==='ready'||item.deleted)&&item.metaDirty){if(item.comparisonId&&metadataFiles.find(m=>m.id===item.comparisonId)?.status!=='ready')continue;const sent=editableMediaFields(item);await api('media/'+item.id+'/metadata',sent);const latest=(await allMedia()).find(m=>m.id===item.id);if(latest&&JSON.stringify(editableMediaFields(latest))===JSON.stringify(sent))await patchMedia(item.id,{metaDirty:false});}}
 for(const item of await allMedia()){if(item.status==='ready'&&!item.deleted&&item.thumbnailDirty){try{await uploadThumbnail(item);}catch{/* La vista previa local y el original se conservan para otro intento. */}}}
 const fresh=await api<Bootstrap>('bootstrap');await mergeServer(fresh.rooms,fresh.media);await setMeta('event',fresh.event);await setMeta('lastSync',new Date().toISOString());onBootstrap?.(fresh);notify();
 const pending=(await allRooms()).filter(r=>r.dirty).length+(await allMedia()).filter(mediaPending).length;status(pending?pending+' pendiente(s) de respaldo':'Respaldo al día');
}
async function uploadMedia(item:Media,notify:()=>void,status:(s:string)=>void){
 const blob=await fileBlob(item.id);if(!blob)throw new Error('El original está en el teléfono que lo registró.');
 const init=await api<{ready?:boolean,protocol?:string,partSize?:number,parts?:MultipartInit['parts'],token:string,endpoint:string,bucket:string,objectPath:string}>('uploads/init',{id:item.id,roomId:item.roomId,phase:item.phase,name:item.name,mime:item.mime,size:item.size,createdAt:item.createdAt,note:item.note,category:item.category,duration:item.duration,derivedFrom:item.derivedFrom});
 if(!init.ready){
  await patchMedia(item.id,{status:'uploading',error:undefined});notify();
  if(init.protocol==='s3-multipart'){await uploadMultipart(item.id,blob,init as MultipartInit,(sent,total)=>{const progress=Math.round(sent/total*100);status('Subiendo '+item.name+' · '+progress+'%');void patchMedia(item.id,{progress,status:'uploading'}).then(notify);});}
  else{const {Upload}=await import('tus-js-client');const {data:{session}}=await getSupabase().auth.getSession();if(!session)throw new HttpError('Tu sesión venció.',401);
  await new Promise<void>((resolve,reject)=>{const upload=new Upload(blob,{endpoint:init.endpoint,headers:{authorization:'Bearer '+session.access_token},chunkSize:6*1024*1024,retryDelays:[0,1500,3000,5000],uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,fingerprint:async()=>['orden',init.bucket,init.objectPath,item.size].join(':'),metadata:{bucketName:init.bucket,objectName:init.objectPath,contentType:item.mime,cacheControl:'3600'},onError:reject,onProgress:(sent,total)=>{const progress=Math.round(sent/total*100);status('Subiendo '+item.name+' · '+progress+'%');void patchMedia(item.id,{progress,status:'uploading'}).then(notify);},onSuccess:()=>resolve()});upload.findPreviousUploads().then(previous=>{if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(reject);});
  await api('uploads/'+item.id+'/complete',{});
  }
 }
 const thumbnail=await fileBlob(item.id+':thumbnail');let thumbnailReady=item.thumbnailReady;
 if(thumbnail&&!thumbnailReady){const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(thumbnail);});try{await api('uploads/'+item.id+'/thumbnail',{base64:data});thumbnailReady=true;}catch{/* El original ya está respaldado; la miniatura se puede regenerar. */}}
 await patchMedia(item.id,{status:'ready',progress:100,parts:undefined,error:undefined,thumbnailReady,thumbnailDirty:!!thumbnail&&!thumbnailReady});notify();
}
