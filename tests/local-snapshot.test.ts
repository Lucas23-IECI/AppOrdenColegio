import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readStableSnapshot} from '../lib/local-snapshot';

test('refresh discards an old inventory read when a local edit arrives during that read',async()=>{
 let writes:Promise<unknown>=Promise.resolve(),quantity:number|null=null,reads=0;
 let finishRead!:()=>void;
 const pausedRead=new Promise<void>(resolve=>{finishRead=resolve;});
 const refresh=readStableSnapshot(()=>writes,async()=>{
  const snapshot=quantity;
  if(++reads===1)await pausedRead;
  return snapshot;
 });
 await new Promise(resolve=>setImmediate(resolve));
 writes=Promise.resolve().then(()=>{quantity=32;});
 finishRead();
 assert.equal(await refresh,32);
 assert.equal(reads,2);
});

test('a failed earlier write does not prevent reading the last saved record',async()=>{
 const writes=Promise.reject(new Error('Storage full'));
 assert.equal(await readStableSnapshot(()=>writes,async()=>14),14);
});
