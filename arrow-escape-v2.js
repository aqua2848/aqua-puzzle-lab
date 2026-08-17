const DIRS={right:{dr:0,dc:1,angle:0},down:{dr:1,dc:0,angle:90},left:{dr:0,dc:-1,angle:180},up:{dr:-1,dc:0,angle:-90}};
const $=id=>document.getElementById(id);
const board=$('board'),message=$('message'),levelNumber=$('levelNumber'),leftCount=$('leftCount'),restartButton=$('restartButton'),newButton=$('newButton'),nextButton=$('nextButton');
let level=0,size=9,arrows=[],solved=false,animating=false,boardIndex=0;
const BOARDS=[
[
 {cells:[[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]],dir:'right'},
 {cells:[[0,4],[1,4],[1,5],[2,5],[3,5],[3,6]],dir:'right'},
 {cells:[[0,8],[1,8],[2,8],[2,7],[3,7],[4,7]],dir:'down'},
 {cells:[[4,0],[4,1],[5,1],[5,2],[6,2],[6,3]],dir:'right'},
 {cells:[[4,4],[5,4],[5,5],[6,5],[6,6],[7,6]],dir:'down'},
 {cells:[[8,0],[8,1],[7,1],[7,2],[8,2],[8,3]],dir:'right'},
 {cells:[[8,8],[8,7],[7,7],[7,8],[6,8],[5,8]],dir:'up'}
],
[
 {cells:[[0,1],[1,1],[1,0],[2,0],[3,0],[3,1]],dir:'right'},
 {cells:[[0,3],[0,4],[1,4],[1,3],[2,3],[2,4]],dir:'right'},
 {cells:[[0,7],[1,7],[1,6],[2,6],[3,6],[3,7]],dir:'right'},
 {cells:[[4,1],[4,2],[5,2],[5,3],[6,3],[6,4]],dir:'right'},
 {cells:[[4,8],[5,8],[5,7],[6,7],[7,7],[7,6]],dir:'left'},
 {cells:[[8,1],[7,1],[7,2],[8,2],[8,3],[8,4]],dir:'right'},
 {cells:[[8,8],[8,7],[7,7],[7,8],[6,8],[5,8]],dir:'up'}
],
[
 {cells:[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]],dir:'down'},
 {cells:[[0,5],[0,6],[1,6],[1,5],[2,5],[2,4]],dir:'left'},
 {cells:[[0,8],[1,8],[2,8],[2,7],[3,7],[3,6]],dir:'left'},
 {cells:[[4,0],[4,1],[5,1],[5,2],[4,2],[4,3]],dir:'right'},
 {cells:[[4,5],[5,5],[5,6],[6,6],[6,5],[7,5]],dir:'down'},
 {cells:[[8,0],[7,0],[7,1],[8,1],[8,2],[8,3]],dir:'right'},
 {cells:[[8,8],[7,8],[7,7],[6,7],[6,8],[5,8]],dir:'up'}
]
];
function key(r,c){return r+','+c}
function inside(r,c){return r>=0&&r<size&&c>=0&&c<size}
function loadBoard(index){boardIndex=((index%BOARDS.length)+BOARDS.length)%BOARDS.length;arrows=BOARDS[boardIndex].map((a,id)=>({id:id,cells:a.cells.map(p=>({r:p[0],c:p[1]})),dir:a.dir,removed:false}));solved=false;animating=false;nextButton.disabled=true;render()}
function occupancyExcept(id){const s=new Set();for(const a of arrows){if(a.removed||a.id===id)continue;for(const c of a.cells)s.add(key(c.r,c))}return s}
function collisionInfo(a){const d=DIRS[a.dir],head=a.cells[a.cells.length-1],occ=occupancyExcept(a.id);let r=head.r+d.dr,c=head.c+d.dc,steps=1;while(inside(r,c)){if(occ.has(key(r,c)))return{blocked:true,steps:steps};r+=d.dr;c+=d.dc;steps++}return{blocked:false,steps:steps}}
function center(c){const s=1000/size;return{x:(c.c+.5)*s,y:(c.r+.5)*s}}
function pathData(cells,extend,dir){const pts=cells.map(center);if(extend&&dir){const d=DIRS[dir],h=pts[pts.length-1];pts.push({x:h.x+d.dc*extend,y:h.y+d.dr*extend})}return pts.map((p,i)=>(i?'L':'M')+' '+p.x+' '+p.y).join(' ')}
function groupFor(a){const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.classList.add('snake-arrow');const d=pathData(a.cells,0,null);for(const cls of ['snake-halo','snake-line','snake-hit']){const p=document.createElementNS(ns,'path');p.classList.add(cls);p.setAttribute('d',d);g.appendChild(p)}const hh=document.createElementNS(ns,'polygon');hh.classList.add('snake-head-halo');hh.setAttribute('points','-50,-43 50,0 -50,43');const h=document.createElementNS(ns,'polygon');h.classList.add('snake-head');h.setAttribute('points','-39,-32 46,0 -39,32');const e=center(a.cells[a.cells.length-1]),tr='translate('+e.x+' '+e.y+') rotate('+DIRS[a.dir].angle+')';hh.setAttribute('transform',tr);h.setAttribute('transform',tr);const tap=()=>tapArrow(a,g);g.querySelector('.snake-hit').addEventListener('click',tap);hh.addEventListener('click',tap);h.addEventListener('click',tap);g.appendChild(hh);g.appendChild(h);return g}
function render(){board.innerHTML='';levelNumber.textContent=level+1;const active=arrows.filter(a=>!a.removed);leftCount.textContent=active.length;message.textContent='先が空いている矢印をタップ！';const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('arrow-canvas');svg.setAttribute('viewBox','0 0 1000 1000');for(const a of active)svg.appendChild(groupFor(a));board.appendChild(svg)}
function prepare(g,a,extend){const ns='http://www.w3.org/2000/svg',line=g.querySelector('.snake-line'),halo=g.querySelector('.snake-halo'),head=g.querySelector('.snake-head'),headHalo=g.querySelector('.snake-head-halo'),originalD=line.getAttribute('d'),rail=document.createElementNS(ns,'path');rail.setAttribute('d',pathData(a.cells,extend,a.dir));rail.setAttribute('fill','none');rail.setAttribute('stroke','none');g.appendChild(rail);const body=line.getTotalLength(),total=rail.getTotalLength();for(const el of [line,halo]){el.setAttribute('d',rail.getAttribute('d'));el.style.strokeDasharray=body+' '+(total+body);el.style.strokeDashoffset='0'}const hit=g.querySelector('.snake-hit');if(hit)hit.remove();return{rail,line,halo,head,headHalo,originalD,body,total}}
function setPos(p,m){for(const el of [p.line,p.halo])el.style.strokeDashoffset=String(-m);const front=Math.min(p.total,p.body+m),q=p.rail.getPointAtLength(front),q2=p.rail.getPointAtLength(Math.max(0,front-5)),ang=Math.atan2(q.y-q2.y,q.x-q2.x)*180/Math.PI,tr='translate('+q.x+' '+q.y+') rotate('+ang+')';p.head.setAttribute('transform',tr);p.headHalo.setAttribute('transform',tr)}
function tapArrow(a,g){if(solved||animating||a.removed)return;const info=collisionInfo(a);animating=true;g.classList.add('escaping');if(info.blocked){bump(g,a,info);return}a.removed=true;leftCount.textContent=arrows.filter(x=>!x.removed).length;message.textContent='スルルルッ… ➜';escape(g,a)}
function escape(g,a){const p=prepare(g,a,1650),travel=p.total-p.body,dur=1100+a.cells.length*55,st=performance.now();function f(now){const t=Math.min(1,(now-st)/dur),e=1-Math.pow(1-t,3);setPos(p,travel*e);if(t<1){requestAnimationFrame(f);return}g.remove();animating=false;if(arrows.every(x=>x.removed)){solved=true;message.textContent='🎉 CLEAR! 全部脱出！';nextButton.disabled=false}else message.textContent='次はどれ？'}requestAnimationFrame(f)}
function bump(g,a,info){message.textContent='スルスル…';const step=1000/size,extend=Math.max(8,(info.steps-.55)*step),p=prepare(g,a,extend),travel=p.total-p.body,fd=420+info.steps*90,bd=360+info.steps*65,st=performance.now();function fw(now){const t=Math.min(1,(now-st)/fd),e=1-Math.pow(1-t,2.2);setPos(p,travel*e);if(t<1){requestAnimationFrame(fw);return}message.textContent='ゴツン！ 💥';g.classList.add('impact');setTimeout(()=>{g.classList.remove('impact');const bs=performance.now();function bk(now2){const t2=Math.min(1,(now2-bs)/bd),e2=1-Math.pow(1-t2,2.1);setPos(p,travel*(1-e2));if(t2<1){requestAnimationFrame(bk);return}for(const el of [p.line,p.halo]){el.setAttribute('d',p.originalD);el.style.strokeDasharray='';el.style.strokeDashoffset=''}p.rail.remove();const e=center(a.cells[a.cells.length-1]),tr='translate('+e.x+' '+e.y+') rotate('+DIRS[a.dir].angle+')';p.head.setAttribute('transform',tr);p.headHalo.setAttribute('transform',tr);g.classList.remove('escaping');animating=false;message.textContent='戻った！ 別の矢印からほどこう'}requestAnimationFrame(bk)},160)}requestAnimationFrame(fw)}
restartButton.onclick=()=>{if(!animating)loadBoard(boardIndex)};
newButton.onclick=()=>{if(!animating)loadBoard(boardIndex+1)};
nextButton.onclick=()=>{if(!animating){level++;loadBoard(boardIndex+1)}};
board.style.setProperty('--n',size);
loadBoard(0);