import {remoteFile,api} from './http';
import {fileBlob,cacheFile,patchMedia,localIdentity} from './local-store';
import type {Media} from './model';

export function mediaCacheChanged(){window.dispatchEvent(new Event('orden-media-cache'));}
async function thumbnailFromUrl(url:string,mime:string):Promise<{thumbnail?:Blob;duration?:number}>{
 return new Promise(resolve=>{
  let done=false;let video:HTMLVideoElement|undefined;let img:HTMLImageElement|undefined;
  const end=(result:{thumbnail?:Blob;duration?:number})=>{if(done)return;done=true;clearTimeout(timer);if(video){video.onloadedmetadata=null;video.onseeked=null;video.onerror=null;video.pause();video.removeAttribute('src');video.load();}if(img){img.onload=null;img.onerror=null;}resolve(result);};
  const timer=setTimeout(()=>end({}),12000);
  const draw=(source:CanvasImageSource,w:number,h:number,duration?:number)=>{try{if(!w||!h)return end({duration});const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));const ctx=canvas.getContext('2d');if(!ctx)return end({duration});ctx.drawImage(source,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>end({thumbnail:blob??undefined,duration}),'image/jpeg',.8);}catch{end({duration});}};
  if(mime.startsWith('video/')){video=document.createElement('video');video.crossOrigin='anonymous';video.muted=true;video.playsInline=true;video.preload='metadata';video.onloadedmetadata=()=>{if(video)video.currentTime=Math.min(.2,video.duration/2||0);};video.onseeked=()=>{if(video)draw(video,video.videoWidth,video.videoHeight,Number.isFinite(video.duration)?video.duration:undefined);};video.onerror=()=>end({});video.src=url;}else{img=new Image();img.crossOrigin='anonymous';img.onload=()=>{if(img)draw(img,img.naturalWidth,img.naturalHeight);};img.onerror=()=>end({});img.src=url;}
 });
}
export async function thumbnailFor(file:File){const url=URL.createObjectURL(file);try{return await thumbnailFromUrl(url,file.type);}finally{URL.revokeObjectURL(url);}}
export async function mediaUrl(m:Media,thumbnail=false){const local=await fileBlob(m.id+(thumbnail?':thumbnail':''))??(thumbnail&&m.mime.startsWith('image/')?await fileBlob(m.id):undefined);if(local)return {url:URL.createObjectURL(local),local:true};if(m.status==='ready'&&(!thumbnail||m.thumbnailReady))return {url:await remoteFile(m.id,thumbnail),local:false};return {url:'',local:false};}
const previews=new Map<string,Promise<Blob>>();let activePreviews=0;const previewQueue:Array<()=>void>=[];
async function withPreviewSlot<T>(fn:()=>Promise<T>){if(activePreviews>=2)await new Promise<void>(resolve=>previewQueue.push(resolve));activePreviews++;try{return await fn();}finally{activePreviews--;previewQueue.shift()?.();}}
export async function ensureThumbnail(media:Media,force=false):Promise<Blob>{
 const cached=await fileBlob(media.id+':thumbnail');if(cached&&!force)return cached;
 const running=previews.get(media.id);if(running)return running;
 const operation=withPreviewSlot(async()=>{
  if(!force&&media.status==='ready'&&media.thumbnailReady&&navigator.onLine){try{const response=await fetch(await remoteFile(media.id,true));if(response.ok){const blob=await response.blob();if(blob.size&&blob.type.startsWith('image/')){await cacheFile(media.id+':thumbnail',blob);return blob;}}}catch{/* Recover from the original below. */}}
  const original=await fileBlob(media.id);let local='';
  if(!original&&(media.status!=='ready'||!navigator.onLine))throw new Error('Conecta para cargar la vista previa de este archivo.');
  if(!force&&media.thumbnailAttemptAt&&Date.now()-media.thumbnailAttemptAt<600000)throw new Error('No se pudo mostrar la vista previa. Puedes reintentar o abrir el original.');
  await patchMedia(media.id,{thumbnailAttemptAt:Date.now()});
  try{const source=original?(local=URL.createObjectURL(original)):await remoteFile(media.id);const result=await thumbnailFromUrl(source,media.mime);if(!result.thumbnail)throw new Error('Este formato no permite crear una vista previa aquí. Puedes abrir o descargar el original.');await cacheFile(media.id+':thumbnail',result.thumbnail);const user=localIdentity();const allowed=!!user&&(user.role!=='recorder'||media.ownerId===user.id);await patchMedia(media.id,{thumbnailDirty:allowed,...(result.duration?{duration:result.duration}:{})});mediaCacheChanged();return result.thumbnail;}finally{if(local)URL.revokeObjectURL(local);}
 });previews.set(media.id,operation);try{return await operation;}finally{previews.delete(media.id);}
}
export async function uploadThumbnail(media:Media){
 const blob=await fileBlob(media.id+':thumbnail');if(!blob)return;
 const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
 await api('uploads/'+media.id+'/thumbnail',{base64});await patchMedia(media.id,{thumbnailReady:true,thumbnailDirty:false});
}
const offlineDownloads=new Map<string,Promise<void>>();
export async function cacheMediaForOffline(media:Media,onProgress?:(percent:number)=>void):Promise<void>{
 if(await fileBlob(media.id)){onProgress?.(100);return;}
 const running=offlineDownloads.get(media.id);if(running)return running;
 const operation=(async()=>{
  if(!navigator.onLine)throw new Error('Conecta para descargar el archivo por primera vez.');if(media.status!=='ready')throw new Error('El original todavía no está respaldado.');
  const estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.usage!==undefined&&estimate.quota-estimate.usage<media.size+1048576)throw new Error('No queda espacio suficiente en este equipo.');
  const response=await fetch(await remoteFile(media.id));if(!response.ok)throw new Error('No se pudo descargar el original. Inténtalo nuevamente.');
  let blob:Blob;if(response.body){const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>50*1024**2||size>media.size)throw new Error('El tamaño del archivo no coincide con el original.');chunks.push(value);onProgress?.(Math.min(99,Math.round(size/media.size*100)));}}catch(e){await reader.cancel();throw e;}blob=new Blob(chunks as BlobPart[],{type:media.mime});}else blob=await response.blob();
  if(blob.size!==media.size)throw new Error('La descarga quedó incompleta. El original sigue respaldado; vuelve a intentarlo.');await cacheFile(media.id,blob);onProgress?.(100);mediaCacheChanged();
 })();offlineDownloads.set(media.id,operation);try{await operation;}finally{offlineDownloads.delete(media.id);}
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
