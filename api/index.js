import worker from '../worker.mjs';
export default {fetch(request){
 const url=new URL(request.url);const route=url.searchParams.get('route');
 if(route){url.pathname='/api/'+route;url.searchParams.delete('route');request=new Request(url,request)}
 return worker.fetch(request,process.env);
}};
