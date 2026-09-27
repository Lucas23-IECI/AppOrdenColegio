import {fileBlob} from './local-store';
import type {Media} from './model';
export async function thumbnailFor(file:File):Promise<{thumbnail?:Blob,duration?:number}>{
 const url=URL.createObjectURL(file);try{return await new Promise((resolve)=>{
  let done=false;const end=(value:{thumbnail?:Blob,duration?:number})=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>end({}),7000);
  const canvas=document.createElement('canvas');const draw=(image:CanvasImageSource,w:number,h:number,duration?:number)=>{if(!w||!h){end({duration});return;}canvas.width=Math.min(w,640);canvas.height=Math.max(1,Math.round(h/w*canvas.width));const ctx=canvas.getContext('2d');if(!ctx){end({duration});return;}ctx.drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>end({thumbnail:blob??undefined,duration}),'image/jpeg',.78);};
  if(file.type.startsWith('video/')){const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='metadata';video.onloadedmetadata=()=>{video.currentTime=Math.min(.15,video.duration/2||0);};video.onseeked=()=>{draw(video,video.videoWidth,video.videoHeight,Number.isFinite(video.duration)?video.duration:undefined);video.removeAttribute('src');video.load();};video.onerror=()=>end({});video.src=url;}else{const img=new Image();img.onload=()=>draw(img,img.naturalWidth,img.naturalHeight);img.onerror=()=>end({});img.src=url;}
 });}finally{URL.revokeObjectURL(url);}
}
export async function mediaUrl(m:Media,thumbnail=false){const local=await fileBlob(m.id+(thumbnail?':thumbnail':''));if(local)return {url:URL.createObjectURL(local),local:true};if(m.status==='ready'&&(!thumbnail||m.thumbnailReady))return {url:'/api/media/'+m.id+(thumbnail?'/thumbnail':''),local:false};return {url:'',local:false};}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
