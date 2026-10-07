import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LABEL_OPTIONS,labelLayout,labelText,printableLabels} from '../lib/labels';
import {newRoom} from '../lib/model';
import {roomSchema} from '../lib/validation';
import {reopenChangedInspection} from '../lib/inspection';

test('small A4 labels keep margins, a cut gap and 48 labels per sheet',()=>{
 const layout=labelLayout(DEFAULT_LABEL_OPTIONS);assert.equal(layout.perPage,48);assert.equal(layout.columns,4);assert.equal(layout.rows,12);
 assert.ok(layout.margin+layout.columns*layout.width+(layout.columns-1)*layout.gap<=layout.paper.width-layout.margin);
 assert.ok(layout.margin+layout.rows*layout.height+(layout.rows-1)*layout.gap<=layout.paper.height-layout.margin);
 assert.equal(labelLayout({...DEFAULT_LABEL_OPTIONS,size:'medium'}).perPage,16);
 assert.equal(labelLayout({...DEFAULT_LABEL_OPTIONS,paper:'letter'}).perPage,44);
});
test('labels use custom room text and numbering continues across its inventory',()=>{
 const room=newRoom('Sala 1');assert.equal(labelText(room),'Sala 1');room.labelText='  Biblioteca Ñandú  ';assert.equal(labelText(room),'Biblioteca Ñandú');
 const batches=[{roomId:'1',text:'Sala 1',item:'Sillas',quantity:2},{roomId:'1',text:'Sala 1',item:'Mesas',quantity:1},{roomId:'2',text:'Sala 2',item:'Sillas',quantity:1}];
 assert.deepEqual(printableLabels(batches,DEFAULT_LABEL_OPTIONS),['Sala 1','Sala 1','Sala 1','Sala 2']);
 assert.deepEqual(printableLabels(batches,{...DEFAULT_LABEL_OPTIONS,numbered:true,includeItem:true}),['Sala 1\nSillas\n01','Sala 1\nSillas\n02','Sala 1\nMesas\n03','Sala 2\nSillas\n01']);
});
test('unsafe or invalid print requests do not generate misleading documents',()=>{
 const batch={roomId:'1',text:'Sala 1',item:'Sillas',quantity:1};
 for(const quantity of [0,-1,1.5,NaN,1001])assert.throws(()=>printableLabels([{...batch,quantity}],DEFAULT_LABEL_OPTIONS));
 assert.throws(()=>printableLabels([{...batch,quantity:1000},{...batch,quantity:1000},{...batch,quantity:1}],DEFAULT_LABEL_OPTIONS));
 assert.throws(()=>printableLabels([{...batch,text:'Sala 🪑'}],DEFAULT_LABEL_OPTIONS));
});
test('custom label text survives API validation without reopening confirmed inspections',()=>{
 const before={...newRoom('Sala 1'),mutationId:crypto.randomUUID()};before.reception.confirmedAt='2026-10-07';
 const next=roomSchema.parse({...before,labelText:'Biblioteca · Liceo'});assert.equal(next.labelText,'Biblioteca · Liceo');
 assert.equal(reopenChangedInspection(before,next).reception.confirmedAt,before.reception.confirmedAt);assert.deepEqual(next.items,before.items);
 assert.throws(()=>roomSchema.parse({...before,labelText:'x'.repeat(121)}));
});
