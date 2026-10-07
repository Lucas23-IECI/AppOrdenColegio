import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HOME,parseRoute,routeHash,parentRoute,type AppRoute} from '../lib/navigation';
test('etiquetas conserva el espacio y Atrás vuelve a su sala',()=>{
 const labels:AppRoute={...HOME,page:'labels',reportScope:'sala-1'};
 assert.deepEqual(parseRoute(routeHash(labels)),labels);
 assert.equal(routeHash(labels),'#/etiquetas?espacio=sala-1');
 assert.deepEqual(parentRoute(labels),{...HOME,roomId:'sala-1'});
 assert.deepEqual(parseRoute('#/etiquetas'),{...HOME,page:'labels'});
});

test('los enlaces conservan pantalla, fase y visor al recargar o avanzar',()=>{
  const room:AppRoute={...HOME,roomId:'sala-1',phase:'return'};
  for(const route of [HOME,room,{...room,overlay:{kind:'viewer' as const,id:'video-2'}},{...HOME,page:'reports' as const,reportScope:'sala-1'},{...HOME,page:'settings' as const},{...room,overlay:{kind:'history' as const,id:'sala-1'}},{...HOME,overlay:{kind:'editor' as const,id:'new'}}])assert.deepEqual(parseRoute(routeHash(route)),route);
});
test('volver desde un visor conserva el espacio y después vuelve al recorrido',()=>{
  const room:AppRoute={...HOME,roomId:'sala-1',phase:'return'};
  assert.deepEqual(parentRoute({...room,overlay:{kind:'viewer',id:'video-2'}}),room);
  assert.deepEqual(parentRoute(room),HOME);
});
test('la comparación conserva el espacio al recargar y cerrar',()=>{
 const room:AppRoute={...HOME,roomId:'sala-1',phase:'return'},route:AppRoute={...room,overlay:{kind:'comparison',id:'sala-1'}};
 assert.deepEqual(parseRoute(routeHash(route)),route);assert.deepEqual(parentRoute(route),room);
});
test('el álbum y su etapa se conservan en la ruta y volver lleva a los álbumes',()=>{
 const album:AppRoute={...HOME,page:'media',roomId:'sala-1',phase:'return'};
 assert.deepEqual(parseRoute(routeHash(album)),album);assert.deepEqual(parentRoute(album),{...HOME,page:'media'});
});
test('la edición directa de una foto se conserva al recargar y vuelve al espacio',()=>{
 const room:AppRoute={...HOME,roomId:'sala-1'};
 for(const tool of ['photo','details'] as const){const route:AppRoute={...room,overlay:{kind:'viewer',id:'foto-1',tool}};assert.deepEqual(parseRoute(routeHash(route)),route);assert.deepEqual(parentRoute(route),room);}
 assert.deepEqual(parseRoute('#/espacios?editar=new&herramienta=photo').overlay,{kind:'editor',id:'new'});
});
test('enlaces desconocidos o parámetros de acceso no se convierten en rutas de datos',()=>{
  for(const hash of ['#login','#setup=private','#register','#/fuera','#/espacios/<script>/devolucion?visor=%3Cscript%3E'])assert.deepEqual(parseRoute(hash),HOME);
  assert.equal(routeHash(parseRoute('#/ajustes?setup=secret')).includes('secret'),false);
});

test('Más tiene ruta propia y las secciones del espacio sobreviven al visor y recarga',()=>{
 const more:AppRoute={...HOME,page:'more'};
 assert.equal(routeHash(more),'#/mas');assert.deepEqual(parseRoute('#/mas'),more);
 assert.deepEqual(parentRoute(more),HOME);
 for(const section of ['inventory','condition'] as const){
  const room:AppRoute={...HOME,roomId:'sala-1',phase:'return',section};
  const viewer:AppRoute={...room,overlay:{kind:'viewer',id:'foto-1'}};
  assert.deepEqual(parseRoute(routeHash(room)),room);
  assert.deepEqual(parseRoute(routeHash(viewer)),viewer);
  assert.deepEqual(parentRoute(viewer),room);
  assert.deepEqual(parentRoute(room),HOME);
 }
 assert.equal(parseRoute('#/archivos/sala-1/recepcion?vista=inventario').section,undefined);
 assert.equal(parseRoute('#/espacios/sala-1/recepcion?vista=desconocida').section,undefined);
});
