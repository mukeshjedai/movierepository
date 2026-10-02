import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const html=await readFile('index.html','utf8');
await writeFile('page.mjs','export default '+JSON.stringify(html)+';\n');
await mkdir('public',{recursive:true});
await copyFile('index.html','public/index.html');
console.log('Video Vault built for Vercel');
