import {useEffect,useState} from 'react';
import {Building2,Images,FileText,CloudUpload,Settings2,History,Menu,ChevronRight} from 'lucide-react';
import {TabsList,TabsTrigger} from '@/components/ui/tabs';
import type {Page} from '../lib/navigation';
import type {User} from '../lib/model';

const destinations=[
 {page:'spaces',label:'Espacios',icon:Building2},
 {page:'media',label:'Archivos',icon:Images},
 {page:'reports',label:'Informes',icon:FileText,description:'Preparar el documento para el colegio'},
 {page:'backup',label:'Respaldo',icon:CloudUpload,description:'Revisar archivos pendientes y uso sin señal'},
 {page:'settings',label:'Ajustes',icon:Settings2,description:'Apariencia, equipo y datos del evento'},
 {page:'audit',label:'Auditoría',icon:History,description:'Consultar quién cambió cada registro'},
] as const;
export function AppNavigation({page,user,onPage}:{page:Page;user:User;onPage:(page:Page)=>void}){
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width:700px)').matches);
 useEffect(()=>{const query=window.matchMedia('(max-width:700px)'),change=()=>setMobile(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 if(mobile)return <nav className="mobile-navigation" aria-label="Navegación principal">{[{page:'spaces',label:'Espacios',icon:Building2},{page:'media',label:'Archivos',icon:Images},{page:'more',label:'Más',icon:Menu}].map(item=>{const active=item.page==='more'?!['spaces','media'].includes(page):page===item.page;return <button key={item.page} type="button" aria-current={active?'page':undefined} onClick={()=>onPage(item.page as Page)}><item.icon size={24}/><span>{item.label}</span></button>;})}</nav>;
 return <TabsList className={'main-nav '+(user.role!=='recorder'?'with-audit':'')} aria-label="Navegación principal">{destinations.filter(d=>d.page!=='audit'||user.role!=='recorder').map(item=><TabsTrigger key={item.page} value={item.page}><item.icon/>{item.label}</TabsTrigger>)}</TabsList>;
}
export function MorePage({user,pending,onPage}:{user:User;pending:number;onPage:(page:Page)=>void}){
 return <main className="workspace more-page"><div className="section-heading"><h1>Más opciones</h1></div><div className="more-destinations">{destinations.filter(d=>!['spaces','media'].includes(d.page)&&(d.page!=='audit'||user.role!=='recorder')).map(item=><button key={item.page} onClick={()=>onPage(item.page)} className="more-destination"><item.icon size={26}/><span><strong>{item.label}{item.page==='backup'&&pending>0&&<span className="more-pending">{pending} pendiente(s)</span>}</strong><small>{'description'in item?item.description:''}</small></span><ChevronRight size={22}/></button>)}</div></main>;
}
