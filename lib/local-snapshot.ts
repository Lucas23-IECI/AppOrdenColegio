/** A read that overlaps a new local write must be repeated before updating the UI. */
export async function readStableSnapshot<T>(writes:()=>Promise<unknown>,read:()=>Promise<T>):Promise<T>{
 for(;;){
  const pending=writes();
  await pending.catch(()=>{});
  const snapshot=await read();
  if(pending===writes())return snapshot;
 }
}
