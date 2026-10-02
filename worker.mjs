import page from './page.mjs';
const json = (data, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const decode = s => s.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const tag = (xml,name) => decode(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml)?.[1] || '');
async function sas(env,name,permission,attachment=false){
 const version='2023-11-03', start=new Date(Date.now()-300000).toISOString().split('.')[0]+'Z', end=new Date(Date.now()+3600000).toISOString().split('.')[0]+'Z';
 const resource=name?'b':'c', canonical=`/blob/${env.AZURE_STORAGE_ACCOUNT}/${env.AZURE_STORAGE_CONTAINER}${name?'/'+name:''}`;
 const disposition=attachment?`attachment; filename*=UTF-8''${encodeURIComponent(name.split('/').pop())}`:'';
 const string=[permission,start,end,canonical,'','','https',version,resource,'','','',disposition,'','',''].join('\n');
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(env.AZURE_STORAGE_KEY),c=>c.charCodeAt(0)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(string)))));
 const query=new URLSearchParams({sp:permission,st:start,se:end,spr:'https',sv:version,sr:resource,sig:signature});
 if(disposition)query.set('rscd',disposition);
 return `https://${env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${env.AZURE_STORAGE_CONTAINER}${name?'/'+name.split('/').map(encodeURIComponent).join('/'):''}?${query}`;
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 try{
  if(url.pathname==='/')return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src https://*.blob.core.windows.net; connect-src 'self' https://*.blob.core.windows.net; img-src 'self' data:; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",'X-Content-Type-Options':'nosniff'}});
  if(!url.pathname.startsWith('/api/'))return new Response('Not found',{status:404});
  if(!env.AZURE_STORAGE_KEY)return json({error:'Video storage has not been connected yet.'},503);
  if(url.pathname==='/api/videos'&&request.method==='GET'){
   const list=new URL(await sas(env,'','l'));list.searchParams.set('restype','container');list.searchParams.set('comp','list');list.searchParams.set('maxresults','100');
   if(url.searchParams.get('marker'))list.searchParams.set('marker',url.searchParams.get('marker'));
   const response=await fetch(list);if(!response.ok)throw new Error('Storage list failed');
   const xml=await response.text();const videos=[];
   for(const match of xml.matchAll(/<Blob>([\s\S]*?)<\/Blob>/g)){
    const name=tag(match[1],'Name');if(!/\.(mp4|webm|mov|m4v|ogv)$/i.test(name))continue;
    videos.push({name,size:Number(tag(match[1],'Content-Length')),modified:tag(match[1],'Last-Modified')});
   }
   return json({videos,marker:tag(xml,'NextMarker')});
  }
  if(url.pathname==='/api/media'&&request.method==='GET'){
   const name=url.searchParams.get('name');if(!name||name.length>1024)return json({error:'Invalid video.'},400);
   return json({url:await sas(env,name,'r',url.searchParams.get('download')==='1')});
  }
  if(['/api/upload','/api/import'].includes(url.pathname)&&request.method==='POST'){
   if(request.headers.get('Origin')!==url.origin)return json({error:'Request not allowed.'},403);
   if(!env.UPLOAD_PASSWORD||request.headers.get('X-Upload-Password')!==env.UPLOAD_PASSWORD)return json({error:'Incorrect upload password.'},401);
   let data;try{data=await request.json()}catch{return json({error:'Invalid upload request.'},400)}
   let source;
   if(url.pathname==='/api/import'){
    try{source=new URL(data.source)}catch{return json({error:'Enter a direct HTTPS video file link.'},400)}
    const host=source.hostname.toLowerCase();
    if(source.protocol!=='https:'||source.username||source.password||source.port||source.href.length>2048||!host.includes('.')||host.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)||/\.(local|internal|localhost)$/.test(host))return json({error:'Use a public HTTPS video file link without login credentials.'},400);
    if(!data.name){try{data.name=decodeURIComponent(source.pathname.split('/').pop())}catch{return json({error:'Enter a video filename such as holiday.mp4.'},400)}}
   }
   if(typeof data.name!=='string'||! /\.(mp4|webm|mov|m4v|ogv)$/i.test(data.name))return json({error:'Enter a filename ending in MP4, WebM, MOV, M4V or OGV.'},400);
   const name=crypto.randomUUID()+'/'+data.name.replace(/[^\p{L}\p{N} ._()-]/gu,'_').slice(-180);
   const contentType={mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/mp4',ogv:'video/ogg'}[name.split('.').pop().toLowerCase()];
   return json({url:await sas(env,name,'cw'),name,...(source?{source:source.href,contentType}:{})});
  }
  return json({error:'Not found'},404);
 }catch(error){console.error(error.message);return json({error:'We could not reach video storage. Please try again.'},502);}
}};
