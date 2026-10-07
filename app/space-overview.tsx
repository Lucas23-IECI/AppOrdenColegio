import {useState, type ReactNode} from 'react';
import {Plus, Search, Building2, Image, Video, ArrowRight, CloudUpload, AlertTriangle, UserRound, ChevronDown, SlidersHorizontal} from 'lucide-react';
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
  readOnly?: boolean;
  onAdd: () => void;
  onBulk: () => void;
  onOpen: (id: string) => void;
  onBackup: () => void;
  renderCover: (media: Media) => ReactNode;
};

export function SpaceOverview({filters,onFiltersChange,rooms, media, event, pending, busy, readOnly=false, onAdd, onBulk, onOpen, onBackup, renderCover}: Props) {
  const {search,site,filter}=filters;
  const [filtersOpen,setFiltersOpen]=useState(false);
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
  const activeFilterCount=(site!=='all'?1:0)+(filter!=='all'?1:0);
  const resetFilters=()=>onFiltersChange({search:'',site:'all',filter:'all'});

  return <>
    <div className="section-heading overview-heading">
      <div><p className="overview-event">{event.name}</p><h1>Espacios <span className="heading-count" aria-label={`${rooms.length} espacios`}>{rooms.length}</span></h1></div>
      {!readOnly&&<button className="button secondary overview-add" aria-label="Añadir espacio" onClick={onAdd}><Plus size={20}/>Añadir</button>}
    </div>
    <details className="overview-summary" aria-label="Avance del recorrido">
      <summary><span>{received} de {rooms.length} recibidos</span><ChevronDown size={22} aria-hidden="true"/></summary>
      <div className="progress-summary-content">
        {[{label:'Recibidos',count:received},{label:'Devueltos',count:returned}].map(p=><div className="phase-progress" key={p.label}><div><span>{p.label}</span><strong>{p.count}<small> / {rooms.length}</small></strong></div><div className="phase-progress-track" role="progressbar" aria-label={p.label} aria-valuemin={0} aria-valuemax={Math.max(rooms.length,1)} aria-valuenow={p.count}><i style={{width:`${rooms.length?p.count/rooms.length*100:0}%`}}/></div></div>)}
        <button type="button" className="text-button overview-backup" onClick={onBackup}><CloudUpload size={17}/>{pending ? `${pending} pendientes de respaldo` : 'Sin pendientes de respaldo'}<ArrowRight size={16}/></button>
      </div>
    </details>
    {rooms.length === 0 && readOnly?<p className="empty-state">El equipo todavía no ha añadido espacios.</p>:rooms.length === 0 ? <section className="onboarding"><span className="big-index">01</span><div><h2>Arma la lista de espacios</h2><p>Salas, baños, biblioteca, patios y gimnasio. Puedes cambiar sus nombres y añadir otros cuando lo necesites.</p><div className="actions"><button className="button primary" disabled={busy} onClick={onBulk}>Crear 18 salas<ArrowRight size={18}/></button><button className="button secondary" onClick={onAdd}>Añadir una por una</button></div></div></section> : <>
      <div className="overview-search-toolbar"><label className="search-field"><Search size={20}/><input aria-label="Buscar espacio" placeholder="Buscar espacio" value={search} onChange={e => setSearch(e.target.value)}/></label><button type="button" className="button secondary overview-filter-toggle" aria-expanded={filtersOpen} aria-controls="overview-filter-panel" onClick={()=>setFiltersOpen(value=>!value)}><SlidersHorizontal size={19}/>Filtros{activeFilterCount>0&&<span className="filter-count" aria-label={`${activeFilterCount} filtros activos`}>{activeFilterCount}</span>}</button></div>
      <div id="overview-filter-panel" className="overview-filter-panel" hidden={!filtersOpen}><label className="filter-field"><span>Recinto</span><Select value={site} onValueChange={setSite}><SelectTrigger className="choice" aria-label="Recinto"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos los recintos</SelectItem>{Array.from(new Set(rooms.map(r => r.site))).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></label><div className="space-filters" role="group" aria-label="Filtrar espacios por estado">{filterOptions.map(f => <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}<span>{f.count}</span></button>)}</div>{activeFilterCount>0&&<button type="button" className="text-button" onClick={resetFilters}>Quitar filtros</button>}</div>
      <div className="room-grid">{visible.map(r => {
        const assets = media.filter(m => m.roomId === r.id && !m.deleted), photos = assets.filter(m => m.mime.startsWith('image/')), videos = assets.filter(m => m.mime.startsWith('video/'));
        const thumb = photos[0] || videos.find(m => m.thumbnailReady), filePending = assets.some(m => m.status !== 'ready' || m.metaDirty), issue = withIssues(r), status = roomStatus(r), evidenceSummary = assets.length ? `${assets.length} ${assets.length===1?'archivo':'archivos'}` : 'Sin evidencia';
        return <button className="room-tile" key={r.id} onClick={() => onOpen(r.id)}><div className="room-visual">{thumb ? renderCover(thumb) : <Building2 strokeWidth={1.5} size={34}/>}</div><div className="room-info"><h2>{r.name}</h2><p className="room-location">{r.site}{r.sector ? ' · ' + r.sector : ''}</p><span className={'room-badge ' + (r.return.confirmedAt ? 'done' : r.reception.confirmedAt ? 'received' : '')}>{status}</span><div className="room-counts"><span><Image size={15}/>{photos.length} fotos</span><span><Video size={15}/>{videos.length} videos</span></div></div><div className="room-bottom"><span className="room-responsible"><UserRound size={16}/>{r.responsible || 'Sin encargado'}</span><span className={issue ? 'room-observation' : 'room-evidence'}>{issue ? <><AlertTriangle size={16}/>Observación</> : evidenceSummary}</span><span className="room-sync" title={r.conflict ? 'Revisar conflicto' : filePending || r.dirty ? 'Pendiente de respaldo' : 'Sincronizado'}>{r.conflict ? <><AlertTriangle size={16}/>Conflicto</> : filePending || r.dirty ? <><CloudUpload size={16}/>Pendiente</> : 'Al día'}</span></div></button>;
      })}</div>
      {visible.length === 0 && <div className="empty-state"><Search size={30}/><h2>No hay espacios con estos filtros</h2><button className="text-button" onClick={resetFilters}>Mostrar todos los espacios<ArrowRight size={16}/></button></div>}
    </>}
  </>;
}
