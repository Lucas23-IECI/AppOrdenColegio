import {type ReactNode} from 'react';
import {Plus, Search, Building2, Image, Video, Check, Circle, ArrowRight, ArrowUpRight, CloudUpload, AlertTriangle, UserRound} from 'lucide-react';
import {type LocalRoom, type Media, type EventInfo, differences, roomStatus} from '../lib/model';
import {Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from '@/components/ui/select';

type Props = {
  filters: {search:string;site:string;filter:string};
  onFiltersChange: (value:{search:string;site:string;filter:string})=>void;
  rooms: LocalRoom[];
  media: Media[];
  event: EventInfo;
  pending: number;
  busy: boolean;
  onAdd: () => void;
  onBulk: () => void;
  onOpen: (id: string) => void;
  onBackup: () => void;
  renderCover: (media: Media) => ReactNode;
};

export function SpaceOverview({filters,onFiltersChange,rooms, media, event, pending, busy, onAdd, onBulk, onOpen, onBackup, renderCover}: Props) {
  const {search,site,filter}=filters;
  const setSearch=(search:string)=>onFiltersChange({...filters,search});
  const setSite=(site:string)=>onFiltersChange({...filters,site});
  const setFilter=(filter:string)=>onFiltersChange({...filters,filter});
  const received = rooms.filter(r => r.reception.confirmedAt).length;
  const returned = rooms.filter(r => r.return.confirmedAt).length;
  const withIssues = (r: LocalRoom) => differences(r).length > 0 || Object.values(r.reception.checks).includes('issue') || Object.values(r.return.checks).includes('issue');
  const filterMatch = (r: LocalRoom) => filter === 'all' || filter === 'receive' && !r.reception.confirmedAt || filter === 'return' && !!r.reception.confirmedAt && !r.return.confirmedAt || filter === 'issues' && withIssues(r);
  const scoped = rooms.filter(r => (site === 'all' || r.site === site) && [r.name, r.type, r.sector, r.responsible].join(' ').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  const visible = scoped.filter(filterMatch);
  const filterOptions = [
    {id: 'all', label: 'Todos', count: scoped.length},
    {id: 'receive', label: 'Por recibir', count: scoped.filter(r => !r.reception.confirmedAt).length},
    {id: 'return', label: 'Por devolver', count: scoped.filter(r => r.reception.confirmedAt && !r.return.confirmedAt).length},
    {id: 'issues', label: 'Observaciones', count: scoped.filter(withIssues).length},
  ];

  return <>
    <div className="section-heading overview-heading">
      <div><p className="eyebrow">{event.name}</p><h1>El recorrido<span className="heading-count">{rooms.length} espacios</span></h1><p className="subtle">Abre un espacio para registrar cómo se recibe o se devuelve.</p></div>
      <button className="button primary" onClick={onAdd}><Plus size={18}/>Añadir espacio</button>
    </div>
    <section className="event-overview" aria-label="Avance del recorrido">
      <div className="overview-copy"><p className="eyebrow">AVANCE DEL EQUIPO</p><h2>{rooms.length ? returned === rooms.length ? 'Todo el recorrido completado' : received === rooms.length ? 'Recepción completa' : `${rooms.length - received} espacios por recibir` : 'Prepara el primer recorrido'}</h2><button className="text-button" onClick={onBackup}><CloudUpload size={16}/>{pending ? `${pending} pendientes de respaldo aquí` : 'Sin pendientes en este dispositivo'}<ArrowRight size={15}/></button></div>
      <div className="overview-progress">{[{label: 'Recepción', count: received}, {label: 'Devolución', count: returned}].map(p => <div className="phase-progress" key={p.label}><div><span>{p.label}</span><strong>{p.count}<small> / {rooms.length}</small></strong></div><div className="phase-progress-track" role="progressbar" aria-label={p.label} aria-valuemin={0} aria-valuemax={Math.max(rooms.length, 1)} aria-valuenow={p.count}><i style={{width: `${rooms.length ? p.count / rooms.length * 100 : 0}%`}}/></div></div>)}</div>
    </section>
    {rooms.length === 0 ? <section className="onboarding"><span className="big-index">01</span><div><h2>Arma la lista de espacios</h2><p>Salas, baños, biblioteca, patios y gimnasio. Puedes cambiar sus nombres y añadir otros cuando lo necesites.</p><div className="actions"><button className="button primary" disabled={busy} onClick={onBulk}>Crear 18 salas<ArrowRight size={18}/></button><button className="button secondary" onClick={onAdd}>Añadir una por una</button></div></div></section> : <>
      <div className="filter-bar"><label className="search-field"><Search size={19}/><input aria-label="Buscar espacio" placeholder="Buscar por nombre, sector o encargado" value={search} onChange={e => setSearch(e.target.value)}/></label><Select value={site} onValueChange={setSite}><SelectTrigger className="choice" aria-label="Recinto"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos los recintos</SelectItem>{Array.from(new Set(rooms.map(r => r.site))).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-filters" role="group" aria-label="Filtrar espacios por estado">{filterOptions.map(f => <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}<span>{f.count}</span></button>)}</div>
      <div className="room-grid">{visible.map(r => {
        const assets = media.filter(m => m.roomId === r.id);
        const photos = assets.filter(m => m.mime.startsWith('image/'));
        const videos = assets.filter(m => m.mime.startsWith('video/'));
        const thumb = photos[0] || videos.find(m => m.thumbnailReady);
        const filePending = assets.some(m => m.status !== 'ready' || m.metaDirty);
        return <button className="room-tile" key={r.id} onClick={() => onOpen(r.id)}>
          <div className="room-tile-top"><span className="room-index">{r.type}</span><span className={'room-badge ' + (r.return.confirmedAt ? 'done' : r.reception.confirmedAt ? 'received' : '')}>{roomStatus(r)}</span></div>
          <div className="room-visual">{thumb ? renderCover(thumb) : <Building2 strokeWidth={1.5} size={32}/>}</div>
          <div className="room-info"><p className="eyebrow">{r.site}{r.sector ? ' / ' + r.sector : ''}</p><h2>{r.name}</h2><div className="room-counts"><span><Image size={14}/>{photos.length} fotos</span><span><Video size={14}/>{videos.length} videos</span></div></div>
          <div className="room-stage"><span className={r.reception.confirmedAt ? 'completed' : ''}>{r.reception.confirmedAt?<Check size={20}/>:<Circle size={18}/>}Recepción</span><span className={r.return.confirmedAt ? 'completed' : ''}>{r.return.confirmedAt?<Check size={20}/>:<Circle size={18}/>}Devolución</span>{withIssues(r) && <span className="has-issue" title="Este espacio tiene observaciones"><AlertTriangle size={20}/></span>}</div>
          <div className="room-bottom"><span><UserRound size={14}/>{r.responsible || 'Sin encargado'}</span>{r.conflict ? <span className="room-sync" title="Revisar conflicto"><AlertTriangle size={16}/>Revisar</span> : r.dirty || filePending ? <span className="room-sync" title="Pendiente de respaldo"><CloudUpload size={16}/>Pendiente</span> : <ArrowUpRight size={18}/>}</div>
        </button>;
      })}</div>
      {visible.length === 0 && <div className="empty-state"><Search size={30}/><h2>No hay espacios con estos filtros</h2><button className="text-button" onClick={() => onFiltersChange({search:'',site:'all',filter:'all'})}>Mostrar todos los espacios<ArrowRight size={16}/></button></div>}
    </>}
  </>;
}
