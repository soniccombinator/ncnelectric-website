// Static server for the NCN Generator website. Works locally and on Railway.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'website');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
const server=http.createServer((request,response)=>{let name;try{name=decodeURIComponent(new URL(request.url,'http://localhost').pathname)}catch{response.writeHead(400);return response.end('Bad request')}
if(name==='/healthz'){response.writeHead(200,{'Content-Type':'text/plain'});return response.end('ok')}
const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end('Forbidden')}
fs.readFile(file,(error,data)=>{if(error){response.writeHead(404);return response.end('Not found')}response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');response.end(data)});
});
// Railway sets PORT and needs 0.0.0.0; locally defaults to 127.0.0.1:8080.
const port=Number(process.env.PORT)||8080, host=process.env.PORT?'0.0.0.0':'127.0.0.1';
if(require.main===module)server.listen(port,host,()=>console.log(`NCN site: http://${host}:${port}`));
module.exports=server;
