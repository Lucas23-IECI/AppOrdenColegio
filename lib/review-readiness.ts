import type {LocalRoom,Media,Phase} from './model';
import {mediaPending} from './media-state';

export type ReviewSection = 'inventory'|'condition'|'evidence'|'reception'|'conflict';
export type ReviewRequirement = {
 id:'quantities'|'checks'|'notes'|'evidence'|'reception'|'conflict';
 section:ReviewSection;
 label:string;
 count:number;
};

/** Inspection completeness is separate from cloud backup, so offline work can finish. */
export function reviewReadiness(room:LocalRoom,phase:Phase,media:Media[]){
 const inspection=room[phase];
 const missingQuantities=room.items.filter(item=>item[phase]===null);
 const pendingChecks=Object.entries(inspection.checks).filter(([,state])=>state==='pending').map(([name])=>name);
 const issueWithoutNotes=Object.values(inspection.checks).includes('issue')&&!inspection.notes.trim();
 const evidence=media.filter(file=>file.roomId===room.id&&file.phase===phase&&!file.deleted);
 const missingEvidence=evidence.length===0;
 const receptionNeeded=phase==='return'&&!room.reception.confirmedAt;
 const conflict=!!room.conflict;
 const requirements:ReviewRequirement[]=[];
 if(conflict)requirements.push({id:'conflict',section:'conflict',label:'Resolver cambios del equipo',count:1});
 if(missingQuantities.length)requirements.push({id:'quantities',section:'inventory',label:`Completar ${missingQuantities.length} ${missingQuantities.length===1?'cantidad':'cantidades'}`,count:missingQuantities.length});
 if(pendingChecks.length)requirements.push({id:'checks',section:'condition',label:`Revisar ${pendingChecks.length} ${pendingChecks.length===1?'estado':'estados'} del espacio`,count:pendingChecks.length});
 if(issueWithoutNotes)requirements.push({id:'notes',section:'condition',label:'Describir las observaciones',count:1});
 if(receptionNeeded)requirements.push({id:'reception',section:'reception',label:'Confirmar primero la recepción',count:1});
 if(missingEvidence)requirements.push({id:'evidence',section:'evidence',label:'Añadir una foto o un video',count:1});
 return {
  missingQuantities,pendingChecks,issueWithoutNotes,missingEvidence,receptionNeeded,conflict,
  requirements,remainingSteps:requirements.length,ready:requirements.length===0,
  confirmed:!!inspection.confirmedAt,evidenceCount:evidence.length,
  pendingFiles:evidence.filter(mediaPending).length,pendingRecord:!!room.dirty,
 };
}
