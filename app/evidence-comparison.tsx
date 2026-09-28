import {useEffect,useState} from 'react';
import {Columns2,Link2,Unlink,RotateCcw} from 'lucide-react';
import type {Media,User} from '../lib/model';
import {phaseTitle} from '../lib/model';
import {comparisonPairs,validateComparison,backupLabel} from '../lib/evidence';
import {mediaUrl} from '../lib/media-tools';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {canEditMedia,type MediaPatch} from './media-viewer';
import './evidence.css';
export function ComparisonImage({media}:{media:Media|null}){
 const [src,setSrc]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true,local='';setSrc('');setError('');if(media)void mediaUrl(media).then(r=>{if(!live){if(r.local)URL.revokeObjectURL(r.url);return;}if(r.local)local=r.url;setSrc(r.url);if(!r.url)setError('El original no está disponible en este equipo.');}).catch(()=>{if(live)setError('Conecta para abrir el original o reintenta la carga.');});return()=>{live=false;if(local)URL.revokeObjectURL(local);};},[media?.id,media?.status,attempt]);
 return <div className="comparison-image">{!media?<span>Elige una foto</span>:src&&!error?<img src={src} alt={media.name} onError={()=>setError('No se pudo mostrar el original. Conecta o reintenta.')}/>:<div><p>{error||'Abriendo foto…'}</p>{error&&<button className="button secondary" onClick={()=>setAttempt(n=>n+1)}><RotateCcw size={20}/>Reintentar</button>}</div>}</div>;
}
export function EvidenceComparison({roomId,roomName,media,user,onClose,onSave}:{roomId:string|null;roomName:string;media:Media[];user:User;onClose:()=>void;onSave:(media:Media,patch:MediaPatch)=>Promise<void>}){
 const photos=media.filter(m=>m.roomId===roomId&&!m.deleted&&m.mime.startsWith('image/')),before=photos.filter(m=>m.phase==='reception'),after=photos.filter(m=>m.phase==='return'),pairs=comparisonPairs(photos);
 const [beforeId,setBeforeId]=useState(''),[afterId,setAfterId]=useState(''),[side,setSide]=useState('reception'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{setBeforeId('');setAfterId('');setSide('reception');setError('');setNotice('');},[roomId]);
 const left=before.find(m=>m.id===beforeId)??null,right=after.find(m=>m.id===afterId)??null;
 async function save(clear=false){if(!right)return;setBusy(true);setError('');setNotice('');try{if(!clear&&left)validateComparison(right,left);await onSave(right,{comparisonId:clear?null:left!.id});setNotice(clear?'Vínculo quitado. Las fotos se conservan.':'Pareja guardada en este equipo. Aparecerá al elegir comparaciones para el informe.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Dialog open={!!roomId} onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="comparison-dialog"><DialogTitle>Comparar · {roomName}</DialogTitle><DialogDescription>Elige fotos del mismo lugar. Vincularlas no confirma que el espacio esté conforme.</DialogDescription>
 {pairs.length>0&&<label className="field"><span>Parejas guardadas</span><select aria-label="Parejas guardadas" value={pairs.some(p=>p.returned.id===afterId&&p.reception.id===beforeId)?afterId:''} onChange={e=>{const pair=pairs.find(p=>p.returned.id===e.target.value);if(pair){setBeforeId(pair.reception.id);setAfterId(pair.returned.id);setNotice('');}}}><option value="">Elegir otra pareja</option>{pairs.map(p=><option key={p.returned.id} value={p.returned.id}>{p.reception.name} / {p.returned.name}</option>)}</select></label>}
 <div className="comparison-choices"><label className="field"><span>Foto de recepción</span><select aria-label="Foto de recepción" value={beforeId} onChange={e=>{setBeforeId(e.target.value);setNotice('');}}><option value="">Selecciona una foto</option>{before.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Foto de devolución</span><select aria-label="Foto de devolución" value={afterId} onChange={e=>{setAfterId(e.target.value);setNotice('');}}><option value="">Selecciona una foto</option>{after.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div>
 {(!before.length||!after.length)&&<p className="reception-note">Falta al menos una foto de {!before.length?'recepción':'devolución'} en este espacio.</p>}
 <div className="comparison-side-switch"><button className="button secondary" aria-pressed={side==='reception'} onClick={()=>setSide('reception')}>Ver recepción</button><button className="button secondary" aria-pressed={side==='return'} onClick={()=>setSide('return')}>Ver devolución</button></div><div className="comparison-columns-photo" data-side={side}>{([['reception',left],['return',right]] as const).map(([phase,m])=><section key={phase} data-phase={phase}><h3>{phaseTitle(phase)}</h3><ComparisonImage media={m}/>{m&&<><strong>{m.name}</strong><p className="subtle">{m.note||'Sin nota'}</p><span className="fine-print">{backupLabel(m)}</span></>}</section>)}</div>
 {right&&canEditMedia(right,user)?<div className="actions"><button className="button primary" disabled={!left||busy||right.comparisonId===left?.id} onClick={()=>void save()}><Link2 size={22}/>Guardar pareja</button>{right.comparisonId&&<button className="button secondary" disabled={busy} onClick={()=>void save(true)}><Unlink size={22}/>Quitar vínculo</button>}</div>:right&&<p className="subtle">Su autor, coordinación o administración puede guardar esta pareja.</p>}
 {notice&&<p role="status" className="admin-message">{notice}</p>}{error&&<p role="alert" className="auth-error">{error}</p>}
 </DialogContent></Dialog>;
}
