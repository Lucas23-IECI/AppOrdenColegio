import {allRooms,allMedia,getRoomLocal,putRoom,putMedia,patchMedia,fileBlob,acceptSync,mergeServer,setMeta,type Bootstrap} from './local-store';
import {plainRoom,type LocalRoom,type Media} from './model';
export class HttpError extends Error{constructor(message:string,public status:number,public data:Record<string,unknown>={}){super(message);}}
export async function api<T>(path:string,body?:unknown):Promise<T>{const response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const data=await response.json().catch(()=>({error:response.status===401?'La sesión necesita reconectarse.':'Respuesta inesperada del servidor.'})) as Record<string,unknown>;if(!response.ok)throw new HttpError(String(data.error??'No se pudo conectar.'),response.status,data);return data as T;}
let syncing:Promise<void>|null=null;
export function syncAll(notify:()=>void,status:(value:string)=>void):Promise<void>{if(syncing)return syncing;syncing=performSync(notify,status).finally(()=>{syncing=null;});return syncing;}
async function performSync(notify:()=>void,status:(value:string)=>void){
 if(!navigator.onLine){status('Sin conexión · guardado en este teléfono');return;}
 status('Respaldando registros…');
 for(const original of await allRooms()){
  if(!original.dirty||original.conflict)continue;
  try{const result=await api<{room:LocalRoom}>('rooms',plainRoom(original));await acceptSync(original,result.room);}
  catch(e){if(e instanceof HttpError&&e.status===409&&e.data.conflict){const latest=await getRoomLocal(original.id);if(latest)await putRoom({...latest,conflict:e.data.conflict as LocalRoom});}else{throw e;}}
 }
 notify();
 for(const item of await allMedia()){
  if(item.status==='ready')continue;
  const parent=await getRoomLocal(item.roomId);if(!parent||parent.dirty||parent.conflict)continue;
  try{await uploadMedia(item,notify,status);}catch(e){await patchMedia(item.id,{status:'error',error:e instanceof Error?e.message:'Carga interrumpida'});notify();if(e instanceof HttpError&&(e.status===401||e.status===403))throw e;if(!navigator.onLine)break;}
 }
 for(const item of await allMedia()){if(item.status==='ready'&&item.metaDirty){await api('media/'+item.id+'/metadata',{note:item.note,category:item.category});const latest=(await allMedia()).find(m=>m.id===item.id);if(latest?.note===item.note&&latest?.category===item.category)await patchMedia(item.id,{metaDirty:false});}}
 const fresh=await api<Bootstrap>('bootstrap');await mergeServer(fresh.rooms,fresh.media);await setMeta('event',fresh.event);await setMeta('lastSync',new Date().toISOString());notify();
 const pending=(await allRooms()).filter(r=>r.dirty).length+(await allMedia()).filter(m=>m.status!=='ready').length;status(pending?pending+' pendiente(s) de respaldo':'Respaldo al día');
}
async function uploadMedia(item:Media,notify:()=>void,status:(s:string)=>void){
 const blob=await fileBlob(item.id);if(!blob)throw new Error('Este teléfono no tiene el original. Revisa el teléfono que lo registró.');
 const init=await api<{ready?:boolean,parts?:{partNumber:number,etag:string}[],partSize:number}>('uploads/init',{id:item.id,roomId:item.roomId,phase:item.phase,name:item.name,mime:item.mime,size:item.size,createdAt:item.createdAt,note:item.note,category:item.category,duration:item.duration});
 if(!init.ready){const parts=init.parts??[];const total=Math.ceil(blob.size/init.partSize);item.status='uploading';item.error=undefined;await patchMedia(item.id,{status:'uploading',error:undefined});notify();
  for(let n=1;n<=total;n++){if(parts.some(p=>p.partNumber===n))continue;status('Subiendo '+item.name+' · '+Math.round((n-1)/total*100)+'%');const chunk=blob.slice((n-1)*init.partSize,n*init.partSize);const res=await fetch('/api/uploads/'+item.id+'/part?number='+n,{method:'POST',body:chunk,headers:{'Content-Type':'application/octet-stream'}});if(!res.ok){const err=await res.json().catch(()=>({error:'Carga interrumpida.'})) as {error:string};throw new HttpError(err.error,res.status);}const part=await res.json() as {partNumber:number,etag:string};parts.push(part);item.parts=parts;item.progress=Math.round(n/total*100);await patchMedia(item.id,{parts,progress:item.progress,status:'uploading'});notify();}
  await api('uploads/'+item.id+'/complete',{});
 }
 const thumbnail=await fileBlob(item.id+':thumbnail');if(thumbnail&&!item.thumbnailReady){const res=await fetch('/api/uploads/'+item.id+'/thumbnail',{method:'POST',body:thumbnail,headers:{'Content-Type':'image/jpeg'}});if(res.ok)item.thumbnailReady=true;}
 await patchMedia(item.id,{status:'ready',progress:100,parts:undefined,error:undefined,thumbnailReady:item.thumbnailReady});notify();
}
