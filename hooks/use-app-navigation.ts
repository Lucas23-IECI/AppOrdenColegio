import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {HOME,parentRoute,parseRoute,routeHash,type AppRoute} from '../lib/navigation';

const KEY='ordenNavigation';
type Entry={version:1;index:number;scrollY:number};
const entry=():Entry|undefined=>window.history.state?.[KEY]?.version===1?window.history.state[KEY]:undefined;
const state=(index:number,scrollY:number)=>({...window.history.state,[KEY]:{version:1,index,scrollY}});

export function useAppNavigation(enabled:boolean){
  const [route,setRoute]=useState<AppRoute>(()=>parseRoute(location.hash));
  const [index,setIndex]=useState(0);
  const routeRef=useRef(route);
  const restoredScroll=useRef<number|null>(null);
  const navigatingBack=useRef(false);
  routeRef.current=route;

  useEffect(()=>{
    if(!enabled)return;
    const requested=parseRoute(location.hash);
    const existing=entry();
    if(!existing){
      // A direct link gets its parent screen and home behind it as real entries.
      window.history.replaceState(state(0,0),'',routeHash(HOME));
      const parent=parentRoute(requested);
      let nextIndex=0;
      if(routeHash(parent)!==routeHash(HOME))window.history.pushState(state(++nextIndex,0),'',routeHash(parent));
      if(routeHash(requested)!==routeHash(HOME))window.history.pushState(state(++nextIndex,0),'',routeHash(requested));
    }else window.history.replaceState(state(existing.index,existing.scrollY),'',routeHash(requested));
    setRoute(requested);setIndex(entry()?.index??0);
    const previous=window.history.scrollRestoration;window.history.scrollRestoration='manual';
    const pop=()=>{
      navigatingBack.current=false;
      const next=parseRoute(location.hash);
      setIndex(entry()?.index??0);
      restoredScroll.current=entry()?.scrollY??0;
      routeRef.current=next;setRoute(next);
    };
    let lastSaved=0;
    const remember=()=>{
      if(performance.now()-lastSaved<200)return;
      lastSaved=performance.now();
      const current=entry();
      // A dialog temporarily locks the document scroll; keep its parent position.
      if(current&&!routeRef.current.overlay)window.history.replaceState(state(current.index,window.scrollY),'');
    };
    window.addEventListener('popstate',pop);
    window.addEventListener('scroll',remember,{passive:true});
    return()=>{window.removeEventListener('popstate',pop);window.removeEventListener('scroll',remember);window.history.scrollRestoration=previous;};
  },[enabled]);

  useLayoutEffect(()=>{
    if(restoredScroll.current===null)return;
    const y=restoredScroll.current;restoredScroll.current=null;
    const frame=requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'}));
    return()=>cancelAnimationFrame(frame);
  },[route]);

  const navigate=useCallback((next:AppRoute,options:{replace?:boolean;keepScroll?:boolean}={})=>{
    if(routeHash(next)===routeHash(routeRef.current))return;
    const current=entry()??{version:1,index:0,scrollY:window.scrollY};
    window.history.replaceState(state(current.index,window.scrollY),'');
    const newIndex=current.index+(options.replace?0:1);
    const keepScroll=options.keepScroll||!!next.overlay;
    const y=keepScroll?window.scrollY:0;
    window.history[options.replace?'replaceState':'pushState'](state(newIndex,y),'',routeHash(next));
    navigatingBack.current=false;routeRef.current=next;restoredScroll.current=y;
    setIndex(newIndex);setRoute(next);
  },[]);

  const back=useCallback(()=>{
    if(navigatingBack.current)return;
    if((entry()?.index??0)>0){navigatingBack.current=true;window.history.back();}
    else navigate(parentRoute(routeRef.current),{replace:true});
  },[navigate]);

  const closeOverlay=useCallback(()=>{if(routeRef.current.overlay)back();},[back]);
  return {route,navigate,back,closeOverlay,canGoBack:index>0||routeHash(route)!==routeHash(HOME)};
}
