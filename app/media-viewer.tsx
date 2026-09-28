import {useEffect,useState} from 'react';
import {Download,Pencil,Copy,Trash2,RotateCcw,ChevronDown} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {type Media,type User,phaseTitle,fileSize,dateLabel} from '../lib/model';
import {mediaUrl} from '../lib/media-tools';
import {remoteFile} from '../lib/http';
import {PhotoEditor} from './photo-editor';

export function canEditMedia(media:Media,user:User){return user.role!=='recorder'||media.ownerId===user.id||(!media.ownerId&&media.status!=='ready');}
export type MediaPatch={name?:string;note?:string;category?:string;deleted?:boolean};
export function MediaViewer({media,user,tool,onClose,onSave,onCopy}:{media:Media|null;user:User|null;tool?:'photo'|'details';onClose:()=>void;onSave:(media:Media,patch:MediaPatch)=>Promise<void>;onCopy:(media:Media,edited?:Blob)=>Promise<void>}){
 const [src,setSrc]=useState(''),[error,setError]=useState(''),[note,setNote]=useState(''),[name,setName]=useState(''),[category,setCategory]=useState('General'),[busy,setBusy]=useState(false),[editingPhoto,setEditingPhoto]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{setNote(media?.note??'');setName(media?.name??'');setCategory(media?.category??'General');setEditingPhoto(tool==='photo'&&!!media?.mime.startsWith('image/'));setNotice('');},[media?.id,tool]);
 useEffect(()=>{let local='';let cancelled=false;setSrc('');setError('');if(media)mediaUrl(media).then(r=>{if(cancelled){if(r.local)URL.revokeObjectURL(r.url);return;}local=r.local?r.url:'';setSrc(r.url);if(!r.url)setError('El original está en el teléfono que lo registró.');}).catch(e=>{if(!cancelled)setError((e as Error).message);});return()=>{cancelled=true;if(local)URL.revokeObjectURL(local);};},[media?.id,media?.status]);
 async function act(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const editable=!!media&&!!user&&canEditMedia(media,user);
 return <Dialog open={!!media} onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="media-dialog" onOpenAutoFocus={event=>{event.preventDefault();(event.currentTarget as HTMLElement).focus();}}>
 <DialogTitle>{media?.name}</DialogTitle><DialogDescription>{media?phaseTitle(media.phase)+' · '+fileSize(media.size)+' · '+dateLabel(media.createdAt):''}</DialogDescription>
 {media&&<>
 {editable&&!media.deleted&&!editingPhoto&&<div className="viewer-primary-actions">
  {media.mime.startsWith('image/')&&<button className="button primary" disabled={!src||busy} onClick={()=>setEditingPhoto(true)}><Pencil size={22}/>Editar foto</button>}
  <button className="button secondary danger-button" disabled={busy} onClick={()=>{if(confirm('¿Quitar “'+media.name+'”? Quedará en la papelera y podrás recuperarlo.'))void act(async()=>{await onSave(media,{deleted:true});onClose();});}}><Trash2 size={22}/>{media.mime.startsWith('image/')?'Quitar foto':'Quitar video'}</button>
 </div>}
 {editable&&media.deleted&&<button className="button primary" disabled={busy} onClick={()=>void act(async()=>{await onSave(media,{deleted:false});onClose();})}><RotateCcw size={22}/>Restaurar archivo</button>}
 {!editable&&<p className="reception-note">Registrado por {media.author}. Puede editarlo o quitarlo su autor, un coordinador o un administrador.</p>}
 {error&&<p role="alert" className="auth-error">{error}</p>}{notice&&<p role="status" className="admin-message">{notice}</p>}
 {editable&&!media.deleted&&editingPhoto?<PhotoEditor src={src} onCancel={()=>setEditingPhoto(false)} onSave={async blob=>{setBusy(true);try{await onCopy(media,blob);setEditingPhoto(false);setNotice('Copia editada guardada. El original se conserva.');}finally{setBusy(false);}}}/>:src&&(media.mime.startsWith('video/')?<video src={src} controls playsInline autoPlay preload="metadata" onError={()=>setError('Este navegador no reproduce el formato. Puedes descargar el original.')}/>:<img src={src} alt={media.note||media.name} onError={()=>setError('No se puede mostrar este formato aquí. Descarga el original.')}/>)}
 {editable&&!media.deleted&&!editingPhoto&&<>
  <div className="actions"><button className="button secondary" disabled={!src||busy} onClick={()=>void act(async()=>{await onCopy(media);setNotice('Copia guardada en este espacio.');})}><Copy size={22}/>Crear copia</button></div>
  <details key={media.id+tool} open={tool==='details'||undefined} className="compact-tools media-caption-form"><summary><Pencil size={22}/>Editar nombre y nota<ChevronDown size={22}/></summary><form onSubmit={e=>{e.preventDefault();void act(async()=>{await onSave(media,{name:name.trim(),note,category});setNotice('Datos guardados en este teléfono.');});}}><label className="field"><span>Nombre del archivo</span><input required maxLength={300} value={name} onChange={e=>setName(e.target.value)}/></label><label className="field"><span>Tipo de evidencia</span><select value={category} onChange={e=>setCategory(e.target.value)}>{['General','Distribución','Daño previo','Incidencia','Detalle'].map(c=><option key={c}>{c}</option>)}</select></label><label className="field"><span>Nota de este archivo</span><textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej.: rayón en la mesa junto a la ventana."/></label><button className="button primary spaced" disabled={busy}>Guardar datos del archivo</button></form></details>
 </>}
 <div className="viewer-footer"><span>{media.deleted?'En papelera':media.status==='ready'?'Original respaldado':'Original guardado en este teléfono'}</span><button className="button secondary" disabled={busy} onClick={()=>void act(async()=>{const url=src.startsWith('blob:')?src:await remoteFile(media.id,false,true);const a=document.createElement('a');a.href=url;a.download=media.name;a.target='_blank';a.rel='noopener';a.click();})}><Download size={22}/>Descargar original</button></div>
 {!editable&&media.note&&<p className="reception-note">{media.note}</p>}
 </>}
 </DialogContent></Dialog>;
}
