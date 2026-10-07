import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,type LocalRoom,type Media} from '../lib/model';
import {reviewReadiness} from '../lib/review-readiness';

function completeRoom():LocalRoom {
 const room=newRoom('Sala de prueba');
 room.items=room.items.map(item=>({...item,reception:0,return:0}));
 room.reception.checks=Object.fromEntries(Object.keys(room.reception.checks).map(key=>[key,'ok']));
 room.return.checks=Object.fromEntries(Object.keys(room.return.checks).map(key=>[key,'na']));
 return room;
}
const evidence=(room:LocalRoom,patch:Partial<Media>={}):Media=>({id:'foto',roomId:room.id,phase:'reception',name:'Foto',mime:'image/jpeg',size:1,createdAt:'2026-09-28T00:00:00Z',author:'Encargado',note:'',category:'General',status:'ready',...patch});

test('new inspection requires quantities and condition, with optional evidence and counted zero',()=>{
 const room=newRoom('Sala de prueba'),result=reviewReadiness(room,'reception',[]);
 assert.deepEqual(result.requirements.map(step=>step.section),['inventory','condition']);
 assert.equal(result.missingQuantities.length,2);
 assert.equal(result.pendingChecks.length,5);
 assert.equal(result.remainingSteps,2);
 assert.equal(result.ready,false);
 const complete=completeRoom();
 const withoutEvidence=reviewReadiness(complete,'reception',[]);
 assert.equal(withoutEvidence.ready,true);
 assert.equal(withoutEvidence.missingEvidence,true);
 assert.equal(withoutEvidence.remainingSteps,0);
 assert.equal(reviewReadiness(complete,'reception',[evidence(complete)]).ready,true);
});

test('an observation requires written notes; return also requires confirmed reception',()=>{
 const room=completeRoom();
 room.return.checks.Limpieza='issue';
 room.return.notes='  ';
 const files=[evidence(room,{phase:'return'})];
 assert.deepEqual(reviewReadiness(room,'return',files).requirements.map(step=>step.id),['notes','reception']);
 room.return.notes='Mancha visible al recibir.';
 room.reception.confirmedAt='2026-09-28T00:00:00Z';
 assert.equal(reviewReadiness(room,'return',files).ready,true);
});

test('evidence must belong to the current space and phase and remain outside the trash',()=>{
 const room=completeRoom();
 const files=[evidence(room,{roomId:'other'}),evidence(room,{phase:'return'}),evidence(room,{deleted:true})];
 assert.equal(reviewReadiness(room,'reception',files).missingEvidence,true);
 assert.equal(reviewReadiness(room,'reception',files).evidenceCount,0);
 assert.equal(reviewReadiness(room,'reception',files).ready,true,'Unrelated or removed evidence cannot block confirmation');
});

test('return can be confirmed without evidence after reception and checks are complete',()=>{
 const room=completeRoom();
 room.reception.confirmedAt='2026-10-07T00:00:00Z';
 const result=reviewReadiness(room,'return',[]);
 assert.equal(result.ready,true);
 assert.equal(result.missingEvidence,true);
 assert.equal(result.evidenceCount,0);
});

test('offline or failed backup is visible but does not block a complete inspection',()=>{
 const room={...completeRoom(),dirty:true};
 const result=reviewReadiness(room,'reception',[
  evidence(room,{status:'pending'}),evidence(room,{id:'video',mime:'video/mp4',status:'error'}),
  evidence(room,{id:'edit',metaDirty:true}),evidence(room,{id:'trash',deleted:true,metaDirty:true}),
 ]);
 assert.equal(result.ready,true);
 assert.equal(result.evidenceCount,3);
 assert.equal(result.pendingFiles,3);
 assert.equal(result.pendingRecord,true);
});

test('a team conflict blocks confirmation independently of otherwise complete data',()=>{
 const room=completeRoom();
 room.conflict=structuredClone(room);
 const result=reviewReadiness(room,'reception',[evidence(room)]);
 assert.equal(result.ready,false);
 assert.deepEqual(result.requirements.map(step=>step.section),['conflict']);
 room.reception.confirmedAt='2026-09-28T00:00:00Z';
 assert.equal(reviewReadiness(room,'reception',[evidence(room)]).confirmed,true);
});
