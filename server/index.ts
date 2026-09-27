import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve,extname,sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { GET,POST } from '../app/api/[...path]/route';
import { handleAuth } from './auth';
import { DATA_DIR } from './storage';
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'127.0.0.1';
const isDev=process.argv.includes('--dev');
const vite=isDev?await(await import('vite')).createServer({server:{middlewareMode:true},appType:'spa'}):null;
const publicDir=resolve('dist/client');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
 const protocol=req.headers['x-forwarded-proto']==='https'?'https':'http';
 const origin=protocol+'://'+(req.headers.host||'localhost:'+port);
 const url=new URL(req.url||'/',origin);
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 if(!isDev)res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(url.pathname.startsWith('/api/')){
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
  const max=url.pathname.includes('/part')?8*1024*1024:1024*1024;
  if(Number(req.headers['content-length']||0)>max){res.writeHead(413);res.end(JSON.stringify({error:'Contenido demasiado grande.'}));return;}
  let body:Buffer|undefined;if(req.method!=='GET'&&req.method!=='HEAD'){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max){res.writeHead(413);res.end(JSON.stringify({error:'Contenido demasiado grande.'}));return;}chunks.push(chunk);}body=Buffer.concat(chunks);}
  const request=new Request(url,{method:req.method,headers,body:body?.length?new Uint8Array(body):undefined});
  const response=await handleAuth(request)??(req.method==='GET'?await GET(request):req.method==='POST'?await POST(request):new Response(null,{status:405}));
  res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.setHeader('Cache-Control','no-store');
  if(response.body)await pipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),res);else res.end();return;
 }
 if(vite){vite.middlewares(req,res,()=>{res.statusCode=404;res.end();});return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 let path=resolve(publicDir,'.'+decodeURIComponent(url.pathname));if(path!==publicDir&&!path.startsWith(publicDir+sep)){res.writeHead(403);res.end();return;}
 let info=await stat(path).catch(()=>null);if(!info?.isFile()){if(extname(url.pathname)){res.writeHead(404);res.end();return;}path=resolve(publicDir,'index.html');info=await stat(path);}
 res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.setHeader('Content-Length',info.size);res.setHeader('Cache-Control',url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');
 if(req.method==='HEAD')res.end();else await pipeline(createReadStream(path),res);
 }catch(error){if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'No se pudo completar la solicitud.'}));}else res.destroy();if((error as NodeJS.ErrnoException).code!=='ERR_STREAM_PREMATURE_CLOSE')console.error(error);}
});
server.requestTimeout=120000;server.headersTimeout=30000;
server.listen(port,host,()=>{console.log(`Orden Colegio: http://${host}:${port}`);console.log(`Datos persistentes: ${DATA_DIR}`);console.log('Primera instalación: la clave está en data/setup-key.txt.');});
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>process.exit(0)));
