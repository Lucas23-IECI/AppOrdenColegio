import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,differences} from '../lib/model';
import {addInventoryItem,reopenInspection} from '../lib/inspection';
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
