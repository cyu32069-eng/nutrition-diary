const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'dist');
let html=fs.readFileSync(path.join(dir,'index.html'),'utf8').replaceAll('src="/_expo/','src="./_expo/');
fs.writeFileSync(path.join(dir,'.nojekyll'),'');
html=html.replace(/<html[^>]*>/,'<html lang="zh-CN">').replace(/<title>.*?<\/title>/,'<title>饮食记录</title>');
html=html.replace('</head>',`<meta name="theme-color" content="#183457"><meta name="description" content="记录每餐食物与营养，保存在你的设备。"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="饮食记录"><link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" href="./icon-192.png"><style>html,body,#root{height:100%;min-height:100%;background:#f3f6fa}body{margin:0}#root{display:flex;flex-direction:column}input{font-size:16px}button,input{touch-action:manipulation}</style></head>`);
html=html.replace('</body>',`<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}</script></body>`);
fs.writeFileSync(path.join(dir,'index.html'),html);
fs.writeFileSync(path.join(dir,'manifest.webmanifest'),JSON.stringify({id:'./',name:'饮食记录',short_name:'饮食记录',lang:'zh-CN',start_url:'./',scope:'./',display:'standalone',background_color:'#f3f6fa',theme_color:'#183457',icons:[{src:'./icon-192.png',sizes:'192x192',type:'image/png'},{src:'./icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},null,2));
for(const size of [192,512])fs.copyFileSync(path.join(__dirname,`icon-${size}.png`),path.join(dir,`icon-${size}.png`));
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const files=walk(dir).filter(p=>!p.endsWith('sw.js')).map(p=>'./'+path.relative(dir,p).split(path.sep).join('/'));
const revision=crypto.createHash('sha256').update(files.map(f=>fs.readFileSync(path.join(dir,f))).reduce((a,b)=>Buffer.concat([a,b]),Buffer.alloc(0))).digest('hex').slice(0,12);
fs.writeFileSync(path.join(dir,'sw.js'),`const CACHE='nutrition-web-${revision}',FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('nutrition-web-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>r.ok?r:caches.match('./index.html')).catch(()=>caches.match('./index.html')));return;}
e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});`);
console.log('PWA prepared:',files.length,'assets, revision',revision);
