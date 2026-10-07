import {LoadingSkeleton} from './loading-skeleton';
import {canWrite} from '../lib/permissions';
import {useEffect,useState} from 'react';
import {Download,Pencil,Copy,Trash2,RotateCcw,ChevronDown,ChevronLeft,ChevronRight,Maximize,Minimize,Smartphone,Check} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {type Media,type User,phaseTitle,fileSize,dateLabel} from '../lib/model';
import {mediaUrl,cacheMediaForOffline} from '../lib/media-tools';
import {remoteFile} from '../lib/http';
import {PhotoEditor} from './photo-editor';
import {ZoomImage} from './zoom-image';
import {fileBlob} from '../lib/local-store';
import {backupLabel} from '../lib/evidence';
import './evidence.css';

export function canEditMedia(media:Media,user:User){return canWrite(user)&&(user.role!=='recorder'||media.ownerId===user.id||(!media.ownerId&&media.status!=='ready'));}
export type MediaPatch={name?:string;note?:string;category?:string;deleted?:boolean;comparisonId?:string|null};
export function MediaViewer({media,user,tool,items=[],onNavigate,onClose,onSave,onCopy}:{media:Media|null;user:User|null;tool?:'photo'|'details';items?:Media[];onNavigate?:(media:Media)=>void;onClose:()=>void;onSave:(media:Media,patch:MediaPatch)=>Promise<void>;onCopy:(media:Media,edited?:Blob)=>Promise<void>}){
 const [src,setSrc]=useState(''),[error,setError]=useState(''),[note,setNote]=useState(''),[name,setName]=useState(''),[category,setCategory]=useState('General'),[busy,setBusy]=useState(false),[editingPhoto,setEditingPhoto]=useState(false),[notice,setNotice]=useState('');
 const [contentReady,setContentReady]=useState(false);
 const [expanded,setExpanded]=useState(false),[cached,setCached]=useState(false),[downloadProgress,setDownloadProgress]=useState(0),[sourceAttempt,setSourceAttempt]=useState(0);
 useEffect(()=>{setNote(media?.note??'');setName(media?.name??'');setCategory(media?.category??'General');setEditingPhoto(tool==='photo'&&!!media?.mime.startsWith('image/'));setNotice('');},[media?.id,tool]);
 useEffect(()=>{let local='';let cancelled=false;setSrc('');setError('');setContentReady(false);if(media)mediaUrl(media).then(r=>{if(cancelled){if(r.local)URL.revokeObjectURL(r.url);return;}local=r.local?r.url:'';setSrc(r.url);if(!r.url)setError('El original está en el teléfono que lo registró.');}).catch(e=>{if(!cancelled)setError((e as Error).message);});return()=>{cancelled=true;if(local)URL.revokeObjectURL(local);};},[media?.id,media?.status,sourceAttempt]);
 async function act(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const index=items.findIndex(m=>m.id===media?.id),previous=index>0?items[index-1]:undefined,next=index>=0?items[index+1]:undefined;
 const move=(item:Media|undefined)=>{if(item&&!busy&&!editingPhoto)onNavigate?.(item);};
 useEffect(()=>{let alive=true;setCached(false);if(media)void fileBlob(media.id).then(blob=>{if(alive)setCached(!!blob);});return()=>{alive=false;};},[media?.id]);
 useEffect(()=>{if(!media)return;const key=(event:KeyboardEvent)=>{const el=event.target as HTMLElement;if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||el.closest('input,textarea,select,button,[contenteditable="true"]')||busy||editingPhoto)return;if(event.key==='ArrowLeft'&&previous){event.preventDefault();onNavigate?.(previous);}if(event.key==='ArrowRight'&&next){event.preventDefault();onNavigate?.(next);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[media?.id,previous,next,busy,editingPhoto,onNavigate]);
 useEffect(()=>{const change=()=>setExpanded(!!document.fullscreenElement);document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);
 useEffect(()=>{if(!media){setExpanded(false);if(document.fullscreenElement?.classList.contains('media-dialog'))void document.exitFullscreen?.().catch(()=>{});}},[!!media]);
 const editable=!!media&&!!user&&canEditMedia(media,user);
 return <Dialog open={!!media} onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className={"media-dialog "+(expanded?"media-expanded":"")} onOpenAutoFocus={event=>{event.preventDefault();(event.currentTarget as HTMLElement).focus();}}>
 <div className="viewer-top"><DialogTitle>{media?.name}</DialogTitle><button className="button secondary" aria-label={expanded?"Reducir visor":"Pantalla completa"} onClick={async e=>{const target=e.currentTarget.closest('[role="dialog"]') as HTMLElement;if(expanded){if(document.fullscreenElement)await document.exitFullscreen?.();setExpanded(false);}else{setExpanded(true);try{await target.requestFullscreen?.();}catch{/* El visor ampliado funciona también sin Fullscreen API. */}}}}>{expanded?<Minimize size={22}/>:<Maximize size={22}/>}</button></div><DialogDescription>{media?phaseTitle(media.phase)+' · '+fileSize(media.size)+' · '+dateLabel(media.createdAt):''}</DialogDescription>
 {media&&<>
 {editable&&!media.deleted&&!editingPhoto&&<div className="viewer-primary-actions">
  {media.mime.startsWith('image/')&&<button className="button primary" disabled={!src||busy} onClick={()=>setEditingPhoto(true)}><Pencil size={22}/>Editar foto</button>}
  <button className="button secondary danger-button" disabled={busy} onClick={()=>{if(confirm('¿Quitar “'+media.name+'”? Quedará en la papelera y podrás recuperarlo.'))void act(async()=>{await onSave(media,{deleted:true});onClose();});}}><Trash2 size={22}/>{media.mime.startsWith('image/')?'Quitar foto':'Quitar video'}</button>
 </div>}
 {editable&&media.deleted&&<button className="button primary" disabled={busy} onClick={()=>void act(async()=>{await onSave(media,{deleted:false});onClose();})}><RotateCcw size={22}/>Restaurar archivo</button>}
 {!editable&&<p className="fine-print">{user?.role==='viewer'?'Acceso de solo lectura · ':'Registrado por '}{media.author}</p>}
 {error&&<div role="alert" className="auth-error">{error}<button className="button secondary spaced" onClick={()=>setSourceAttempt(n=>n+1)}>Reintentar archivo</button></div>}{notice&&<p role="status" className="admin-message">{notice}</p>}
 {!editingPhoto&&!contentReady&&!error&&<LoadingSkeleton kind="media" label="Abriendo archivo…"/>}
 <div className={!editingPhoto&&!contentReady?'viewer-content viewer-content-loading':'viewer-content'}>
 {editable&&!media.deleted&&editingPhoto?<PhotoEditor src={src} onCancel={()=>setEditingPhoto(false)} onSave={async blob=>{setBusy(true);try{await onCopy(media,blob);setEditingPhoto(false);setNotice('Copia editada guardada. El original se conserva.');}finally{setBusy(false);}}}/>:src&&(media.mime.startsWith('video/')?<video src={src} controls playsInline preload="metadata" onLoadedMetadata={()=>setContentReady(true)} onLoadedData={()=>setContentReady(true)} onCanPlay={()=>setContentReady(true)} onError={()=>setError('Este navegador no reproduce el formato. Puedes descargar el original.')}/>:<ZoomImage src={src} onLoad={()=>setContentReady(true)} alt={media.note||media.name} onPrevious={previous?()=>move(previous):undefined} onNext={next?()=>move(next):undefined} onError={()=>setError('No se puede mostrar este formato aquí. Descarga el original o reintenta.')}/>)}
 </div>
 {!editingPhoto&&index>=0&&items.length>1&&<div className="viewer-navigation"><button className="button secondary" disabled={!previous||busy} onClick={()=>move(previous)}><ChevronLeft size={24}/>Anterior</button><span>{index+1} de {items.length}</span><button className="button secondary" disabled={!next||busy} onClick={()=>move(next)}>Siguiente<ChevronRight size={24}/></button></div>}
 {editable&&!media.deleted&&!editingPhoto&&<>
  <div className="actions"><button className="button secondary" disabled={!src||busy} onClick={()=>void act(async()=>{await onCopy(media);setNotice('Copia guardada en este espacio.');})}><Copy size={22}/>Crear copia</button></div>
  <details key={media.id+tool} open={tool==='details'||undefined} className="compact-tools media-caption-form"><summary><Pencil size={22}/>Editar nombre y nota<ChevronDown size={22}/></summary><form onSubmit={e=>{e.preventDefault();void act(async()=>{await onSave(media,{name:name.trim(),note,category});setNotice('Datos guardados en este teléfono.');});}}><label className="field"><span>Nombre del archivo</span><input required maxLength={300} value={name} onChange={e=>setName(e.target.value)}/></label><label className="field"><span>Tipo de evidencia</span><select value={category} onChange={e=>setCategory(e.target.value)}>{['General','Distribución','Daño previo','Incidencia','Detalle'].map(c=><option key={c}>{c}</option>)}</select></label><label className="field"><span>Nota de este archivo</span><textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej.: rayón en la mesa junto a la ventana."/></label><button className="button primary spaced" disabled={busy}>Guardar datos del archivo</button></form></details>
 </>}
 <section className="viewer-offline"><span>{cached?<><Check size={20}/>Disponible sin señal en este equipo</>:<><Smartphone size={22}/>Este original necesita conexión</>}</span>{!cached&&<button className="button secondary" disabled={busy||media.status!=='ready'} onClick={()=>void act(async()=>{setDownloadProgress(0);await cacheMediaForOffline(media,setDownloadProgress);setCached(true);setSourceAttempt(n=>n+1);setNotice('Original descargado. Puedes abrirlo sin señal en este equipo.');})}><Download size={22}/>{busy&&downloadProgress?'Descargando '+downloadProgress+'%':'Guardar para usar sin señal'}</button>}</section>
 <div className="viewer-footer"><span>{media.deleted?'En papelera':backupLabel(media)}</span><button className="button secondary" disabled={busy} onClick={()=>void act(async()=>{const url=src.startsWith('blob:')?src:await remoteFile(media.id,false,true);const a=document.createElement('a');a.href=url;a.download=media.name;a.target='_blank';a.rel='noopener';a.click();})}><Download size={22}/>Descargar original</button></div>
 {!editable&&media.note&&<p className="reception-note">{media.note}</p>}
 </>}
 </DialogContent></Dialog>;
}
