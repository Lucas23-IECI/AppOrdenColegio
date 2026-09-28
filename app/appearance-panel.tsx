import {useState} from 'react';
import {Check,Type} from 'lucide-react';

export const THEMES=[
  {id:'green',name:'Bosque',color:'#18634e'},
  {id:'blue',name:'Azul',color:'#335eac'},
  {id:'orange',name:'Naranjo',color:'#a94c2c'},
  {id:'purple',name:'Ciruela',color:'#70417e'},
  {id:'teal',name:'Océano',color:'#146271'},
  {id:'sand',name:'Arena',color:'#74542d'},
  {id:'dark',name:'Noche',color:'#1d2b28'},
  {id:'contrast',name:'Contraste',color:'#111111'},
];

export function AppearancePanel({theme,onThemeChange}:{theme:string;onThemeChange:(id:string)=>void}){
  const [reading,setReading]=useState(()=>localStorage.getItem('orden-reading')==='extra'?'extra':'large');
  function changeReading(value:string){setReading(value);document.documentElement.dataset.reading=value;localStorage.setItem('orden-reading',value);}
  return <section className="panel appearance-panel"><h2>Cómo quieres ver la app</h2><p className="subtle">Se guarda en este dispositivo. Elige lo que te resulte más fácil de leer.</p>
    <h3 className="spaced"><Type size={24}/>Tamaño del texto</h3><div className="reading-options" role="group" aria-label="Tamaño del texto">
      {[{id:'large',name:'Grande'},{id:'extra',name:'Muy grande'}].map(size=><button key={size.id} className="button secondary" aria-pressed={reading===size.id} onClick={()=>changeReading(size.id)}>{size.name}{reading===size.id&&<Check size={22}/>}</button>)}
    </div>
    <h3 className="spaced">Color de la aplicación</h3><div className="theme-options" role="group" aria-label="Apariencia">{THEMES.map(t=><button key={t.id} onClick={()=>onThemeChange(t.id)} aria-pressed={theme===t.id} className="theme-option"><span aria-hidden="true" style={{background:t.color}}/><strong>{t.name}</strong>{theme===t.id&&<Check size={22}/>}</button>)}</div>
    <p className="fine-print">Contraste usa texto negro, fondo blanco y bordes marcados. Noche usa un fondo oscuro.</p>
    <div className="reading-preview"><strong>Así se verá el registro</strong><p>Sala 1 · Recepción</p><span>Fotos, videos y cantidades fáciles de encontrar.</span></div>
    <h3 className="spaced">Instalar en el celular</h3><p className="subtle">iPhone: abre en Safari, toca Compartir y “Añadir a pantalla de inicio”. Android: abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.</p>
  </section>;
}
