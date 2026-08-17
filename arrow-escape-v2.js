const DIRS={right:{dr:0,dc:1,angle:0},down:{dr:1,dc:0,angle:90},left:{dr:0,dc:-1,angle:180},up:{dr:-1,dc:0,angle:-90}};
const $=id=>document.getElementById(id);
const board=$('board'),message=$('message'),levelNumber=$('levelNumber'),leftCount=$('leftCount'),restartButton=$('restartButton'),newButton=$('newButton'),nextButton=$('nextButton');
let level=0,size=9,arrows=[],solved=false,animating=false,boardIndex=0;

const LEVELS=[
  {
    size:9,
    arrows:[
      {cells:[[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]],dir:'right'},
      {cells:[[0,4],[1,4],[1,5],[2,5],[3,5],[3,6]],dir:'right'},
      {cells:[[4,7],[3,7],[2,7],[2,8],[1,8],[0,8]],dir:'up'},
      {cells:[[4,0],[4,1],[5,1],[5,2],[6,2],[6,3]],dir:'right'},
      {cells:[[4,4],[5,4],[5,5],[6,5],[6,6],[7,6]],dir:'down'},
      {cells:[[8,0],[8,1],[7,1],[7,2],[8,2],[8,3]],dir:'right'},
      {cells:[[8,8],[8,7],[7,7],[7,8],[6,8],[5,8]],dir:'up'}
    ]
  },
  {
    size:10,
    arrows:[
      {cells:[[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]],dir:'right'},
      {cells:[[0,6],[1,6],[2,6],[3,6],[4,6],[5,6]],dir:'down'},
      {cells:[[8,4],[8,5],[8,6],[8,7],[8,8]],dir:'right'},
      {cells:[[3,0],[3,1],[4,1],[4,2],[5,2]],dir:'down'},
      {cells:[[7,0],[7,1],[7,2],[7,3]],dir:'right'},
      {cells:[[4,9],[3,9],[3,8],[2,8],[1,8],[0,8]],dir:'up'},
      {cells:[[9,4],[9,3],[9,2],[9,1],[9,0]],dir:'left'},
      {cells:[[6,4],[5,4],[5,5],[4,5],[4,4],[3,4]],dir:'up'},
      {cells:[[6,9],[7,9],[8,9],[9,9]],dir:'down'}
    ]
  },
  {
    size:11,
    arrows:[
      {cells:[[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]],dir:'right'},
      {cells:[[0,6],[1,6],[2,6],[3,6],[4,6],[5,6]],dir:'down'},
      {cells:[[8,4],[8,5],[8,6],[8,7],[8,8]],dir:'right'},
      {cells:[[6,10],[7,10],[8,10],[9,10],[10,10]],dir:'down'},
      {cells:[[3,0],[3,1],[4,1],[4,2],[5,2]],dir:'down'},
      {cells:[[7,0],[7,1],[7,2],[7,3],[7,4]],dir:'right'},
      {cells:[[0,9],[1,9],[1,8],[2,8],[3,8],[3,9]],dir:'right'},
      {cells:[[10,5],[10,4],[10,3],[10,2],[10,1],[10,0]],dir:'left'},
      {cells:[[6,4],[5,4],[5,5],[4,5],[4,4],[3,4]],dir:'up'},
      {cells:[[10,7],[9,7],[9,8],[10,8],[10,9]],dir:'right'},
      {cells:[[5,9],[5,8],[6,8],[6,7],[5,7],[4,7]],dir:'up'},
      {cells:[[0,10],[1,10],[2,10],[3,10],[4,10]],dir:'down'}
    ]
  }
];

function inside(r,c){return r>=0&&r<size&&c>=0&&c<size}
function cellKey(r,c){return r+','+c}
function validateBoard(def,n){
  const seen=new Set();
  for(const a of def){
    if(a.cells.length<2)return false;
    for(let i=0;i<a.cells.length;i++){
      const [r,c]=a.cells[i],k=cellKey(r,c);
      if(r<0||r>=n||c<0||c>=n||seen.has(k))return false;
      seen.add(k);
      if(i>0){const [pr,pc]=a.cells[i-1];if(Math.abs(r-pr)+Math.abs(c-pc)!==1)return false}
    }
    const p=a.cells[a.cells.length-2],h=a.cells[a.cells.length-1],dr=h[0]-p[0],dc=h[1]-p[1],d=DIRS[a.dir];
    if(!d||dr!==d.dr||dc!==d.dc)return false;
  }
  return true;
}
function loadBoard(index){
  boardIndex=((index%LEVELS.length)+LEVELS.length)%LEVELS.length;
  const cfg=LEVELS[boardIndex];
  size=cfg.size;board.style.setProperty('--n',size);
  if(!validateBoard(cfg.arrows,size)){message.textContent='盤面データエラー';console.error('Invalid level',boardIndex+1);return}
  arrows=cfg.arrows.map((a,id)=>({id,cells:a.cells.map(p=>({r:p[0],c:p[1]})),dir:a.dir,removed:false}));
  if(!isCurrentBoardSolvable())console.warn('Level may be unsolvable',boardIndex+1);
  solved=false;animating=false;nextButton.disabled=true;render();
}

function pointSegmentDistance(px,py,a,b){
  const vx=b.c-a.c,vy=b.r-a.r,wx=px-a.c,wy=py-a.r,den=vx*vx+vy*vy;
  const t=den?Math.max(0,Math.min(1,(wx*vx+wy*vy)/den)):0;
  const x=a.c+vx*t,y=a.r+vy*t;
  return Math.hypot(px-x,py-y);
}
function rotateLocal(x,y,dir){
  if(dir==='right')return{x,y};if(dir==='left')return{x:-x,y:-y};if(dir==='down')return{x:-y,y:x};return{x:y,y:-x};
}
function movingHeadSamples(head,dir,dist){
  const d=DIRS[dir],cx=head.c+d.dc*dist,cy=head.r+d.dr*dist;
  const local=[{x:.43,y:0},{x:-.15,y:-.29},{x:-.15,y:.29},{x:.08,y:-.20},{x:.08,y:.20},{x:0,y:0}];
  return local.map(p=>{const q=rotateLocal(p.x,p.y,dir);return{x:cx+q.x,y:cy+q.y}});
}
function sampleHitsOther(sample,other){
  const bodyRadius=.15;
  for(let i=0;i<other.cells.length-1;i++)if(pointSegmentDistance(sample.x,sample.y,other.cells[i],other.cells[i+1])<=bodyRadius)return true;
  const h=other.cells[other.cells.length-1];
  return Math.hypot(sample.x-h.c,sample.y-h.r)<=.46;
}
function collisionInfo(a){
  const d=DIRS[a.dir],head=a.cells[a.cells.length-1],active=arrows.filter(x=>!x.removed&&x.id!==a.id);
  const maxDist=d.dc>0?(size-1-head.c):d.dc<0?head.c:d.dr>0?(size-1-head.r):head.r;
  for(let dist=.02;dist<=maxDist+.55;dist+=.018){
    const samples=movingHeadSamples(head,a.dir,dist);
    for(const other of active)for(const sample of samples)if(sampleHitsOther(sample,other))return{blocked:true,distance:Math.max(.02,dist-.05)};
  }
  return{blocked:false,distance:maxDist+1.6};
}
function isCurrentBoardSolvable(){
  const saved=arrows.map(a=>a.removed);for(const a of arrows)a.removed=false;
  let remaining=arrows.length,guard=0;
  while(remaining>0&&guard++<arrows.length+2){
    let progress=false;
    for(const a of arrows){if(a.removed)continue;if(!collisionInfo(a).blocked){a.removed=true;remaining--;progress=true}}
    if(!progress)break;
  }
  arrows.forEach((a,i)=>a.removed=saved[i]);
  return remaining===0;
}

function center(c){const s=1000/size;return{x:(c.c+.5)*s,y:(c.r+.5)*s}}
function pathData(cells,extend,dir){const pts=cells.map(center);if(extend&&dir){const d=DIRS[dir],h=pts[pts.length-1];pts.push({x:h.x+d.dc*extend,y:h.y+d.dr*extend})}return pts.map((p,i)=>(i?'L':'M')+' '+p.x+' '+p.y).join(' ')}
function groupFor(a){
  const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.classList.add('snake-arrow');const d=pathData(a.cells,0,null);
  for(const cls of ['snake-halo','snake-line','snake-hit']){const p=document.createElementNS(ns,'path');p.classList.add(cls);p.setAttribute('d',d);g.appendChild(p)}
  const hh=document.createElementNS(ns,'polygon');hh.classList.add('snake-head-halo');hh.setAttribute('points','-50,-43 50,0 -50,43');
  const h=document.createElementNS(ns,'polygon');h.classList.add('snake-head');h.setAttribute('points','-39,-32 46,0 -39,32');
  const e=center(a.cells[a.cells.length-1]),tr='translate('+e.x+' '+e.y+') rotate('+DIRS[a.dir].angle+')';hh.setAttribute('transform',tr);h.setAttribute('transform',tr);
  const tap=()=>tapArrow(a,g);g.querySelector('.snake-hit').addEventListener('click',tap);hh.addEventListener('click',tap);h.addEventListener('click',tap);g.appendChild(hh);g.appendChild(h);return g;
}
function render(){
  board.innerHTML='';levelNumber.textContent=boardIndex+1;const active=arrows.filter(a=>!a.removed);leftCount.textContent=active.length;message.textContent='先が空いている矢印をタップ！';
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('arrow-canvas');svg.setAttribute('viewBox','0 0 1000 1000');for(const a of active)svg.appendChild(groupFor(a));board.appendChild(svg);
}
function prepare(g,a,extend){
  const ns='http://www.w3.org/2000/svg',line=g.querySelector('.snake-line'),halo=g.querySelector('.snake-halo'),head=g.querySelector('.snake-head'),headHalo=g.querySelector('.snake-head-halo'),originalD=line.getAttribute('d'),rail=document.createElementNS(ns,'path');
  rail.setAttribute('d',pathData(a.cells,extend,a.dir));rail.setAttribute('fill','none');rail.setAttribute('stroke','none');g.appendChild(rail);
  const body=line.getTotalLength(),total=rail.getTotalLength();for(const el of [line,halo]){el.setAttribute('d',rail.getAttribute('d'));el.style.strokeDasharray=body+' '+(total+body);el.style.strokeDashoffset='0'}
  const hit=g.querySelector('.snake-hit');if(hit)hit.remove();return{rail,line,halo,head,headHalo,originalD,body,total};
}
function setPos(p,m){for(const el of [p.line,p.halo])el.style.strokeDashoffset=String(-m);const front=Math.min(p.total,p.body+m),q=p.rail.getPointAtLength(front),q2=p.rail.getPointAtLength(Math.max(0,front-5)),ang=Math.atan2(q.y-q2.y,q.x-q2.x)*180/Math.PI,tr='translate('+q.x+' '+q.y+') rotate('+ang+')';p.head.setAttribute('transform',tr);p.headHalo.setAttribute('transform',tr)}
function tapArrow(a,g){if(solved||animating||a.removed)return;const info=collisionInfo(a);animating=true;g.classList.add('escaping');if(info.blocked){bump(g,a,info);return}a.removed=true;leftCount.textContent=arrows.filter(x=>!x.removed).length;message.textContent='スルルルッ… ➜';escape(g,a)}
function escape(g,a){const p=prepare(g,a,1650),travel=p.total-p.body,dur=1100+a.cells.length*55,st=performance.now();function f(now){const t=Math.min(1,(now-st)/dur),e=1-Math.pow(1-t,3);setPos(p,travel*e);if(t<1){requestAnimationFrame(f);return}g.remove();animating=false;if(arrows.every(x=>x.removed)){solved=true;message.textContent='🎉 CLEAR! 全部脱出！';nextButton.disabled=false}else message.textContent='次はどれ？'}requestAnimationFrame(f)}
function bump(g,a,info){message.textContent='スルスル…';const step=1000/size,extend=Math.max(8,info.distance*step),p=prepare(g,a,extend),travel=p.total-p.body,fd=420+info.distance*95,bd=360+info.distance*70,st=performance.now();function fw(now){const t=Math.min(1,(now-st)/fd),e=1-Math.pow(1-t,2.2);setPos(p,travel*e);if(t<1){requestAnimationFrame(fw);return}message.textContent='ゴツン！ 💥';g.classList.add('impact');if(navigator.vibrate)navigator.vibrate(35);setTimeout(()=>{g.classList.remove('impact');const bs=performance.now();function bk(now2){const t2=Math.min(1,(now2-bs)/bd),e2=1-Math.pow(1-t2,2.1);setPos(p,travel*(1-e2));if(t2<1){requestAnimationFrame(bk);return}for(const el of [p.line,p.halo]){el.setAttribute('d',p.originalD);el.style.strokeDasharray='';el.style.strokeDashoffset=''}p.rail.remove();const e=center(a.cells[a.cells.length-1]),tr='translate('+e.x+' '+e.y+') rotate('+DIRS[a.dir].angle+')';p.head.setAttribute('transform',tr);p.headHalo.setAttribute('transform',tr);g.classList.remove('escaping');animating=false;message.textContent='戻った！ 別の矢印からほどこう'}requestAnimationFrame(bk)},160)}requestAnimationFrame(fw)}
restartButton.onclick=()=>{if(!animating)loadBoard(boardIndex)};
newButton.onclick=()=>{if(!animating)loadBoard(boardIndex+1)};
nextButton.onclick=()=>{if(!animating){level++;loadBoard(boardIndex+1)}};
loadBoard(0);
