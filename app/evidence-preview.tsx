import {useEffect,useRef,useState} from 'react';
import {Image as ImageIcon,Video,RefreshCw} from 'lucide-react';
import {LoadingSkeleton} from './loading-skeleton';
import type {Media} from '../lib/model';
import {ensureThumbnail} from '../lib/media-tools';
export function EvidencePreview({media,alt='',className=''}:{media:Media;alt?:string;className?:string}){
 const element=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState(false);
 useEffect(()=>{if(!element.current)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'150px'});observer.observe(element.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!visible)return;let disposed=false,local='';setLoaded(false);setUrl('');setError('');void ensureThumbnail(media,attempt>0).then(blob=>{if(disposed)return;local=URL.createObjectURL(blob);setUrl(local);}).catch(e=>{if(!disposed)setError((e as Error).message);});return()=>{disposed=true;if(local)URL.revokeObjectURL(local);};},[media.id,media.status,media.thumbnailReady,visible,attempt]);
 return <div ref={element} className={'evidence-preview '+className}>{!loaded&&!error&&<LoadingSkeleton kind="media" label={'Cargando vista previa de '+media.name}/>}<img hidden={!url} className={!loaded?'preview-loading-image':''} src={url||undefined} alt={alt} onLoad={()=>setLoaded(true)} onError={()=>{setUrl('');setError('No se pudo mostrar la vista previa.');}}/>{error&&<><div className="preview-placeholder">{media.mime.startsWith('video/')?<Video size={32}/>:<ImageIcon size={32}/>}<span>Vista previa no disponible</span></div><button type="button" className="preview-retry" aria-label={'Reintentar vista previa de '+media.name} onClick={e=>{e.stopPropagation();setAttempt(n=>n+1);}}><RefreshCw size={20}/>Reintentar</button></>}</div>;
}
