import {ArrowRight,Check,ChevronDown,FileText,Pencil} from 'lucide-react';
import {dateLabel,phaseTitle,type LocalRoom,type Media,type Phase} from '../lib/model';
import {reviewReadiness,type ReviewSection} from '../lib/review-readiness';

type ReviewCompletionProps={
 room:LocalRoom;
 phase:Phase;
 media:Media[];
 busy?:boolean;
 readOnly?:boolean;
 onConfirm:()=>void;
 onReopen:()=>void;
 onReport:()=>void;
 onGoTo:(section:ReviewSection)=>void;
};

export function ReviewCompletion({room,phase,media,busy,readOnly=false,onConfirm,onReopen,onReport,onGoTo}:ReviewCompletionProps){
 const readiness=reviewReadiness(room,phase,media),inspection=room[phase];
 const backup=[];
 if(readiness.pendingRecord)backup.push('Registro pendiente de respaldo');
 if(readiness.pendingFiles)backup.push(`${readiness.pendingFiles} ${readiness.pendingFiles===1?'archivo pendiente':'archivos pendientes'}`);
 return <section className={'review-completion'+(readiness.confirmed?' review-completion-confirmed':'')} aria-label={'Finalizar '+phaseTitle(phase).toLocaleLowerCase('es')}>
  <div className="review-heading">
   <h3>{readiness.confirmed?<><Check size={22} aria-hidden="true"/>Revisión confirmada</>:'Para terminar'}</h3>
   {!readiness.confirmed&&<p className="review-summary">{readiness.ready?'Revisión lista para confirmar.':`Faltan ${readiness.remainingSteps} ${readiness.remainingSteps===1?'paso':'pasos'} para confirmar.`}</p>}
  </div>
  {!readiness.confirmed&&!readiness.ready&&<details key={room.id+phase} className="review-requirements">
   <summary>Ver qué falta<ChevronDown size={20} aria-hidden="true"/></summary>
   <ul className="review-steps">{readiness.requirements.map(requirement=><li key={requirement.id}><button type="button" className="review-step" disabled={busy} onClick={()=>onGoTo(requirement.section)}><span>{requirement.label}</span><ArrowRight size={20} aria-hidden="true"/></button></li>)}</ul>
  </details>}
  {!readiness.confirmed&&readiness.missingEvidence&&<p className="fine-print">Fotos y videos opcionales. Puedes confirmar sin ellos.</p>}
  {!readOnly&&!readiness.confirmed&&<button type="button" className="button primary review-confirm" disabled={busy||!readiness.ready} onClick={onConfirm}><Check size={20} aria-hidden="true"/>Confirmar revisión</button>}
  {backup.length>0&&<p className="review-backup">{backup.join(' · ')}.</p>}
  {readiness.confirmed&&!readOnly&&<button type="button" className="button secondary correction-button" disabled={busy||readiness.conflict} onClick={onReopen}><Pencil size={20} aria-hidden="true"/>Editar esta {phaseTitle(phase).toLocaleLowerCase('es')}</button>}
  <details key={room.id+phase+readiness.confirmed} className="review-actions">
   <summary>{readiness.confirmed?'Detalles y acciones':'Informe de este espacio'}<ChevronDown size={20} aria-hidden="true"/></summary>
   {readiness.confirmed&&<p className="review-confirmed-by">{inspection.confirmedBy||'Revisión del equipo'} · {dateLabel(inspection.confirmedAt)}</p>}

   <button type="button" className="button secondary" disabled={busy} onClick={onReport}><FileText size={18} aria-hidden="true"/>Informe de este espacio</button>
   {readiness.confirmed&&readiness.conflict&&<button type="button" className="review-step" disabled={busy} onClick={()=>onGoTo('conflict')}>Resolver cambios del equipo<ArrowRight size={20} aria-hidden="true"/></button>}
  </details>
 </section>;
}
