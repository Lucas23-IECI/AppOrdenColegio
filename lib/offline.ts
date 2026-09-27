export async function cacheApplication(registration:ServiceWorkerRegistration){
 const worker=registration.active;if(!worker)throw new Error('La aplicación aún no termina de instalarse.');
 const urls=[...new Set(['/', '/manifest.webmanifest','/favicon.svg','/icon-192.png','/icon-512.png',...performance.getEntriesByType('resource').map(r=>r.name)])];
 await new Promise<void>((resolve,reject)=>{const channel=new MessageChannel();const timeout=setTimeout(()=>{channel.port1.close();reject(new Error('No se pudo confirmar el guardado sin señal. Vuelve a intentarlo.'));},30000);channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();if(event.data?.ok)resolve();else reject(new Error('Faltan archivos de la aplicación por descargar. Vuelve a intentarlo con señal.'));};worker.postMessage({type:'PREPARE',urls},[channel.port2]);});
}
