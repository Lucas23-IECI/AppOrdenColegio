import type {Phase} from './model';

export const PAGE_PATHS = {spaces:'espacios',media:'archivos',reports:'informes',backup:'respaldo',settings:'ajustes',audit:'auditoria'} as const;
export type Page = keyof typeof PAGE_PATHS;
export type Overlay = {kind:'viewer'|'editor'|'history'; id:string};
export type AppRoute = {page:Page; roomId:string|null; phase:Phase; reportScope:string; overlay:Overlay|null};
export const HOME:AppRoute = {page:'spaces',roomId:null,phase:'reception',reportScope:'all',overlay:null};
const validId = (value:string|null):value is string => !!value && /^[a-zA-Z0-9_-]{1,100}$/.test(value);

export function parseRoute(hash:string):AppRoute {
  const [path,query=''] = hash.replace(/^#\/?/, '').split('?');
  const [section,id,phase] = path.split('/');
  const page = (Object.keys(PAGE_PATHS) as Page[]).find(key=>PAGE_PATHS[key]===section);
  if(!page)return {...HOME};
  const params=new URLSearchParams(query);
  const roomId=page==='spaces'&&validId(id)?id:null;
  const scope=params.get('espacio');
  const route:AppRoute={page,roomId,phase:roomId&&phase==='devolucion'?'return':'reception',reportScope:page==='reports'&&validId(scope)?scope:'all',overlay:null};
  for(const [key,kind] of [['visor','viewer'],['editar','editor'],['historial','history']] as const){
    const value=params.get(key);
    if(validId(value)){route.overlay={kind,id:value};break;}
  }
  return route;
}

export function routeHash(route:AppRoute):string {
  let path='#/'+PAGE_PATHS[route.page];
  if(route.page==='spaces'&&route.roomId)path+='/'+encodeURIComponent(route.roomId)+'/'+(route.phase==='return'?'devolucion':'recepcion');
  const params=new URLSearchParams();
  if(route.page==='reports'&&route.reportScope!=='all')params.set('espacio',route.reportScope);
  if(route.overlay)params.set({viewer:'visor',editor:'editar',history:'historial'}[route.overlay.kind],route.overlay.id);
  return path+(params.size?'?'+params.toString():'');
}

export function parentRoute(route:AppRoute):AppRoute {
  if(route.overlay)return {...route,overlay:null};
  return {...HOME};
}
