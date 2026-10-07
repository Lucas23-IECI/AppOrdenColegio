import {api,HttpError} from './http';

export type MultipartInit={protocol:'s3-multipart',partSize:number,parts:{number:number,size:number}[]};
function sendPart(url:string,blob:Blob,onProgress:(n:number)=>void){return new Promise<void>((resolve,reject)=>{
 const request=new XMLHttpRequest();request.open('PUT',url);request.timeout=180000;
 request.upload.onprogress=e=>onProgress(e.loaded);
 request.onload=()=>request.status>=200&&request.status<300?resolve():reject(new Error('La carga se interrumpió. El original se conserva para reintentar.'));
 request.onerror=()=>reject(new Error('Se perdió la conexión. El original sigue en este teléfono.'));request.ontimeout=()=>reject(new Error('La conexión tardó demasiado. Puedes reintentar el respaldo.'));request.onabort=()=>reject(new Error('Carga interrumpida.'));request.send(blob);
});}
export async function uploadMultipart(id:string,blob:Blob,init:MultipartInit,progress:(sent:number,total:number)=>void){
 const count=Math.ceil(blob.size/init.partSize);let sent=0;
 for(let number=1;number<=count;number++){
  const start=(number-1)*init.partSize;const part=blob.slice(start,Math.min(start+init.partSize,blob.size));
  if(init.parts.some(p=>p.number===number&&p.size===part.size)){sent+=part.size;progress(sent,blob.size);continue;}
  let succeeded=false;
  for(let attempt=0;attempt<3;attempt++){
   if(!navigator.onLine)throw new Error('Sin señal. El video queda en este teléfono; el respaldo continúa al volver la conexión.');
   try{const {url}=await api<{url:string}>('uploads/'+id+'/part',{number});await sendPart(url,part,n=>progress(sent+n,blob.size));succeeded=true;break;}catch(e){if(e instanceof HttpError&&(e.status===401||e.status===403)||attempt===2)throw e;}
  }
  if(succeeded){sent+=part.size;progress(sent,blob.size);}
 }
 await api('uploads/'+id+'/complete',{});
}
