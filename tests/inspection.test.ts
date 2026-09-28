import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,differences} from '../lib/model';
import {addInventoryItem,reopenInspection,renameInventoryItem,removeInventoryItem,duplicateInventoryItem,copyInventoryNames,toggleCondition} from '../lib/inspection';
import {roomSchema} from '../lib/validation';
import {handleRequest} from '../server/cloud';

test('corregir recepción exige revisar la devolución conservando evidencia escrita',()=>{
 const room=newRoom('Sala 1');room.reception.confirmedAt=room.return.confirmedAt=new Date().toISOString();room.return.notes='Dos sillas con marcas';room.items[0].return=30;
 const correction=reopenInspection(room,'reception');
 assert.equal(correction.reception.confirmedAt,null);assert.equal(correction.return.confirmedAt,null);
 assert.equal(correction.return.notes,room.return.notes);assert.equal(correction.items[0].return,30);assert.ok(room.return.confirmedAt);
});
test('elemento nuevo invalida confirmaciones y rechaza nombres duplicados',()=>{
 const room=newRoom('Biblioteca');room.reception.confirmedAt=room.return.confirmedAt=new Date().toISOString();
 const result=addInventoryItem(room,'  Estantes  ');assert.equal(result.items.at(-1)?.name,'Estantes');assert.equal(result.items.at(-1)?.reception,null);assert.equal(result.return.confirmedAt,null);assert.equal(result.reception.confirmedAt,null);
 assert.throws(()=>addInventoryItem(result,'ESTANTES'));assert.throws(()=>addInventoryItem(result,' '));
});
test('cantidades vacías no equivalen a cero y no se admiten negativos o decimales',()=>{
 const room={...newRoom('Sala 2'),mutationId:crypto.randomUUID()};assert.ok(roomSchema.safeParse(room).success);
 room.items[0].reception=0;room.items[0].return=null;assert.equal(differences(room).length,0);
 room.items[0].return=2;assert.equal(differences(room).length,1);
 for(const invalid of [-1,1.5,1000001]){room.items[0].return=invalid;assert.equal(roomSchema.safeParse(room).success,false);}
});
test('API privada rechaza usuarios sin sesión y escrituras desde otro origen',async()=>{
 assert.equal((await handleRequest(new Request('https://example.test/api/bootstrap'))).status,401);
 const external=new Request('https://example.test/api/rooms',{method:'POST',headers:{origin:'https://other.test','content-type':'application/json'},body:'{}'});
 assert.equal((await handleRequest(external)).status,403);
});

test('editar y quitar inventario conserva lo demás y exige volver a confirmar',()=>{
 const room=newRoom('Sala');room.items[0].reception=30;room.items[1].return=10;room.reception.confirmedAt=room.return.confirmedAt='2026-01-01';
 const renamed=renameInventoryItem(room,room.items[0].id,'Sillas blancas');assert.equal(renamed.items[0].reception,30);assert.equal(renamed.reception.confirmedAt,null);assert.equal(renamed.return.confirmedAt,null);assert.equal(room.items[0].name,'Sillas');
 assert.throws(()=>renameInventoryItem(room,room.items[0].id,'Mesas'));assert.throws(()=>addInventoryItem(room,'X'.repeat(101)));
 const removed=removeInventoryItem(renamed,room.items[0].id);assert.equal(removed.items.length,1);assert.equal(removed.items[0].return,10);
});
test('copiar elementos y listas nunca copia cantidades ni repite identificadores',()=>{
 const room=newRoom('Sala');room.items[0].reception=35;const copy=duplicateInventoryItem(room,room.items[0].id);assert.equal(copy.items[2].reception,null);assert.equal(copy.items[2].return,null);assert.notEqual(copy.items[2].id,room.items[0].id);
 const again=duplicateInventoryItem(copy,room.items[0].id);assert.equal(new Set(again.items.map(i=>i.name)).size,4);
 const source=addInventoryItem(newRoom('Biblioteca'),'Estantes');source.items[2].reception=8;const merged=copyInventoryNames(room,source);assert.equal(merged.items.length,3);assert.equal(merged.items[0].reception,35);assert.equal(merged.items[2].reception,null);assert.throws(()=>copyInventoryNames(merged,source));
});
test('tocar un estado por segunda vez lo deja pendiente sin borrar observaciones',()=>{
 const room=newRoom('Sala');room.reception.notes='Detalle';const field=Object.keys(room.reception.checks)[0];
 for(const state of ['ok','issue','na'] as const){const checked=toggleCondition(room,'reception',field,state);assert.equal(checked.reception.checks[field],state);const clear=toggleCondition(checked,'reception',field,state);assert.equal(clear.reception.checks[field],'pending');assert.equal(clear.reception.notes,'Detalle');}
 room.reception.confirmedAt='2026-01-01';assert.throws(()=>toggleCondition(room,'reception',field,'ok'));
});
