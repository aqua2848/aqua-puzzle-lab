const DIRS={
  right:{dr:0,dc:1,angle:0},down:{dr:1,dc:0,angle:90},
  left:{dr:0,dc:-1,angle:180},up:{dr:-1,dc:0,angle:-90}
};
const DIR_LIST=Object.values(DIRS);
const board=document.getElementById('board');
const message=document.getElementById('message');
const levelNumber=document.getElementById('levelNumber');
const leftCount=document.getElementById('leftCount');
const restartButton=document.getElementById('restartButton');
const newButton=document.getElementById('newButton');
const nextButton=document.getElementById('nextButton');
let level=0,size=9,arrows=[],currentSeed=1931,solved=false,animating=false;

function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function key(r,c){return `${r},${c}`}
function inside(r,c,n=size){return r>=0&&r<n&&c>=0&&c<n}
function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function difficultyForLevel(index){const n=Math.min(12,9+Math.floor(index/2));return{n,target:Math.min(.91,.82+index*.012),minLen:Math.min(7,5+Math.floor(index/4)),maxLen:Math.min(17,12+Math.floor(index/2))}}

function rayClearFrom(head,d,occupied,n){let r=head.r+d.dr,c=head.c+d.dc;while(inside(r,c,n)){if(occupied.has(key(r,c)))return false;r+=d.dr;c+=d.dc}return true}
function growRandomArrow(available,occupied,n,random,minLen,maxLen){
  const starts=shuffle(available,random);
  for(const start of starts.slice(0,Math.min(90,starts.length))){
    const path=[start],used=new Set([key(start.r,start.c)]),target=minLen+Math.floor(random()*(maxLen-minLen+1));
    let lastDir=null;
    while(path.length<target){
      const tail=path[path.length-1],opts=[];
      for(const d of DIR_LIST){
        const nr=tail.r+d.dr,nc=tail.c+d.dc,k=key(nr,nc);
        if(!inside(nr,nc,n)||!available.has(k)||used.has(k))continue;
        let onward=0;for(const d2 of DIR_LIST){const rr=nr+d2.dr,cc=nc+d2.dc,kk=key(rr,cc);if(inside(rr,cc,n)&&available.has(kk)&&!used.has(kk))onward++}
        let weight=1+onward*.22;
        if(lastDir&&(lastDir.dr!==d.dr||lastDir.dc!==d.dc))weight*=2.8;
        if(nr===0||nc===0||nr===n-1||nc===n-1)weight*=1.18;
        opts.push({cell:{r:nr,c:nc},d,weight});
      }
      if(!opts.length)break;
      const total=opts.reduce((s,o)=>s+o.weight,0);let pick=random()*total,chosen=opts[opts.length-1];
      for(const o of opts){pick-=o.weight;if(pick<=0){chosen=o;break}}
      path.push(chosen.cell);used.add(key(chosen.cell.r,chosen.cell.c));lastDir=chosen.d;
    }
    if(path.length<minLen)continue;
    for(let cut=path.length;cut>=minLen;cut--){
      const cells=path.slice(0,cut),a=cells[cells.length-2],b=cells[cells.length-1];
      const d={dr:b.r-a.r,dc:b.c-a.c};
      if(rayClearFrom(b,d,occupied,n))return{cells,dir:dirName(d)};
    }
  }
  return null;
}
function dirName(d){if(d.dc===1)return'right';if(d.dc===-1)return'left';if(d.dr===1)return'down';return'up'}
function buildCandidate(seed,diff){
  const random=rng(seed),available=new Map(),occupied=new Set(),placed=[];
  for(let r=0;r<diff.n;r++)for(let c=0;c<diff.n;c++)available.set(key(r,c),{r,c});
  const targetCells=Math.floor(diff.n*diff.n*diff.target);let misses=0;
  while(occupied.size<targetCells&&available.size>=3&&misses<150){
    const minLen=misses>30?3:diff.minLen,maxLen=misses>30?Math.max(6,diff.maxLen-4):diff.maxLen;
    const arrow=growRandomArrow([...available.values()],occupied,diff.n,random,minLen,maxLen);
    if(!arrow){misses++;continue}
    arrow.id=placed.length;arrow.removed=false;placed.push(arrow);
    arrow.cells.forEach(c=>{const k=key(c.r,c);available.delete(k);occupied.add(k)});misses=0;
  }
  if(placed.length<6||occupied.size<diff.n*diff.n*.68)return null;
  return placed;
}
function generatePuzzle(seed){
  const diff=difficultyForLevel(level);size=diff.n;board.style.setProperty('--n',size);
  let candidate=null;
  for(let attempt=0;attempt<18&&!candidate;attempt++)candidate=buildCandidate((seed+attempt*104729)>>>0,diff);
  arrows=candidate||buildFallback(diff);
  solved=false;animating=false;nextButton.disabled=true;render();
}
function buildFallback(diff){
  const random=rng(currentSeed^0x9e3779b9),list=[];let id=0;
  for(let r=0;r<diff.n;r+=2){for(let c=0;c<diff.n-3;c+=4){const cells=[0,1,2,3].map(x=>({r,c:c+x}));if(random()>.5)cells.reverse();list.push({id:id++,cells,dir:cells[1].c>cells[0].c?'right':'left',removed:false})}}
  return list;
}

function pointSegmentDistance(px,py,a,b){
  const vx=b.c-a.c,vy=b.r-a.r,wx=px-a.c,wy=py-a.r,den=vx*vx+vy*vy;
  let t=den?Math.max(0,Math.min(1,(wx*vx+wy*vy)/den)):0;
  const x=a.c+vx*t,y=a.r+vy*t;return Math.hypot(px-x,py-y);
}
function collisionInfo(arrow){
  const active=arrows.filter(a=>!a.removed&&a.id!==arrow.id),head=arrow.cells[arrow.cells.length-1],d=DIRS[arrow.dir];
  const maxSteps=d.dc>0?size-.5-(head.c+.5):d.dc<0?(head.c+.5):d.dr>0?size-.5-(head.r+.5):(head.r+.5);
  const radius=.39;
  for(let dist=.08;dist<=maxSteps+.001;dist+=.045){
    const px=head.c+d.dc*dist,py=head.r+d.dr*dist;
    for(const other of active){
      for(let i=0;i<other.cells.length-1;i++){
        if(pointSegmentDistance(px,py,other.cells[i],other.cells[i+1])<=radius)return{blocked:true,distance:dist,hitArrowId:other.id};
      }
      for(const p of [other.cells[0],other.cells[other.cells.length-1]])if(Math.hypot(px-p.c,py-p.r)<=radius)return{blocked:true,distance:dist,hitArrowId:other.id};
    }
  }
  return{blocked:false,distance:maxSteps+1.6};
}

function cellCenter(cell){const step=1000/size;return{x:(cell.c+.5)*step,y:(cell.r+.5)*step}}
function pathDataForCells(cells,extend=false,dirName=null,extendDistance=1500){
  const points=cells.map(cellCenter);
  if(extend&&dirName){const d=DIRS[dirName],head=points[points.length-1];points.push({x:head.x+d.dc*extendDistance,y:head.y+d.dr*extendDistance})}
  return points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')
}
function createArrowGroup(arrow){
  const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.classList.add('snake-arrow');group.dataset.id=arrow.id;
  const d=pathDataForCells(arrow.cells);
  const halo=document.createElementNS(ns,'path');halo.classList.add('snake-halo');halo.setAttribute('d',d);
  const line=document.createElementNS(ns,'path');line.classList.add('snake-line');line.setAttribute('d',d);
  const hit=document.createElementNS(ns,'path');hit.classList.add('snake-hit');hit.setAttribute('d',d);
  const headHalo=document.createElementNS(ns,'polygon');headHalo.classList.add('snake-head-halo');headHalo.setAttribute('points','-47,-41 48,0 -47,41');
  const head=document.createElementNS(ns,'polygon');head.classList.add('snake-head');head.setAttribute('points','-38,-32 43,0 -38,32');
  const end=cellCenter(arrow.cells[arrow.cells.length-1]),tr=`translate(${end.x} ${end.y}) rotate(${DIRS[arrow.dir].angle})`;
  headHalo.setAttribute('transform',tr);head.setAttribute('transform',tr);
  const tap=()=>tapArrow(arrow,group);hit.addEventListener('click',tap);head.addEventListener('click',tap);headHalo.addEventListener('click',tap);
  group.append(halo,line,hit,headHalo,head);return group;
}
function render(){
  board.innerHTML='';levelNumber.textContent=level+1;const active=arrows.filter(a=>!a.removed);leftCount.textContent=active.length;message.textContent='先が空いている長い矢印をタップ！';
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('arrow-canvas');svg.setAttribute('viewBox','0 0 1000 1000');
  active.forEach(a=>svg.appendChild(createArrowGroup(a)));board.appendChild(svg);
}
function tapArrow(arrow,group){
  if(solved||animating||arrow.removed||group.classList.contains('escaping'))return;
  const info=collisionInfo(arrow);animating=true;group.classList.add('escaping');
  if(info.blocked){message.textContent='スルスル…';blockedLikeTrain(group,arrow,info);return}
  arrow.removed=true;message.textContent='スルルルッ… ➜';leftCount.textContent=arrows.filter(a=>!a.removed).length;escapeLikeTrain(group,arrow);
}
function prepareRail(group,arrow,extendDistance){
  const ns='http://www.w3.org/2000/svg',line=group.querySelector('.snake-line'),halo=group.querySelector('.snake-halo'),head=group.querySelector('.snake-head'),headHalo=group.querySelector('.snake-head-halo'),originalD=line.getAttribute('d'),rail=document.createElementNS(ns,'path');
  rail.classList.add('escape-rail');rail.setAttribute('d',pathDataForCells(arrow.cells,true,arrow.dir,extendDistance));rail.setAttribute('fill','none');rail.setAttribute('stroke','none');group.appendChild(rail);
  const bodyLength=line.getTotalLength(),railLength=rail.getTotalLength();[line,halo].forEach(el=>{el.setAttribute('d',rail.getAttribute('d'));el.style.strokeDasharray=`${bodyLength} ${railLength+bodyLength}`;el.style.strokeDashoffset='0'});
  group.querySelector('.snake-hit')?.remove();return{rail,line,halo,head,headHalo,originalD,bodyLength,railLength};
}
function setTrainPosition(parts,moved){
  [parts.line,parts.halo].forEach(el=>el.style.strokeDashoffset=`${-moved}`);
  const front=Math.min(parts.railLength,parts.bodyLength+moved),p=parts.rail.getPointAtLength(front),p2=parts.rail.getPointAtLength(Math.max(0,front-5)),angle=Math.atan2(p.y-p2.y,p.x-p2.x)*180/Math.PI,tr=`translate(${p.x} ${p.y}) rotate(${angle})`;
  parts.head.setAttribute('transform',tr);parts.headHalo.setAttribute('transform',tr);
}
function escapeLikeTrain(group,arrow){
  const parts=prepareRail(group,arrow,1600),travel=parts.railLength-parts.bodyLength,duration=Math.min(2400,1050+arrow.cells.length*78),start=performance.now();
  function frame(now){const raw=Math.min(1,(now-start)/duration),eased=raw<.1?(raw/.1)*.025:.025+.975*(1-Math.pow(1-(raw-.1)/.9,3));setTrainPosition(parts,travel*eased);if(raw<1)return requestAnimationFrame(frame);group.remove();animating=false;if(arrows.every(a=>a.removed))finishLevel();else message.textContent='いい感じ！ 次に抜ける矢印はどれ？'}
  requestAnimationFrame(frame);
}
function blockedLikeTrain(group,arrow,info){
  const step=1000/size,approach=Math.max(step*.05,(info.distance-.43)*step),parts=prepareRail(group,arrow,approach),travel=parts.railLength-parts.bodyLength,forwardDuration=Math.min(1200,430+info.distance*105),backDuration=Math.min(950,380+info.distance*75),start=performance.now();
  function forward(now){const raw=Math.min(1,(now-start)/forwardDuration),eased=1-Math.pow(1-raw,2.1);setTrainPosition(parts,travel*eased);if(raw<1)return requestAnimationFrame(forward);impact()}
  function impact(){message.textContent='ゴツン！ 💥';group.classList.add('impact');if(navigator.vibrate)navigator.vibrate(35);setTimeout(()=>{group.classList.remove('impact');const backStart=performance.now();function back(now){const raw=Math.min(1,(now-backStart)/backDuration),eased=1-Math.pow(1-raw,2.15);setTrainPosition(parts,travel*(1-eased));if(raw<1)return requestAnimationFrame(back);restore()}requestAnimationFrame(back)},190)}
  function restore(){[parts.line,parts.halo].forEach(el=>{el.setAttribute('d',parts.originalD);el.style.strokeDasharray='';el.style.strokeDashoffset=''});parts.rail.remove();const end=cellCenter(arrow.cells[arrow.cells.length-1]),tr=`translate(${end.x} ${end.y}) rotate(${DIRS[arrow.dir].angle})`;parts.head.setAttribute('transform',tr);parts.headHalo.setAttribute('transform',tr);group.classList.remove('escaping');animating=false;message.textContent='戻った！ 別の矢印からほどいてみよう'}
  requestAnimationFrame(forward);
}
function finishLevel(){solved=true;message.textContent='🎉 CLEAR! 全部の矢印が脱出した！';nextButton.disabled=false;celebrate()}
function celebrate(){const layer=document.getElementById('celebration');layer.innerHTML='';const marks=['➜','↑','←','↓','✨'];for(let i=0;i<44;i++){const s=document.createElement('span');s.className='confetti';s.textContent=marks[Math.floor(Math.random()*marks.length)];s.style.left=`${Math.random()*100}%`;s.style.setProperty('--drift',`${(Math.random()-.5)*240}px`);s.style.animationDelay=`${Math.random()*.38}s`;layer.appendChild(s)}setTimeout(()=>layer.innerHTML='',2400)}
function restart(){if(animating)return;generatePuzzle(currentSeed)}
function newPuzzle(){if(animating)return;currentSeed=(Date.now()^Math.floor(Math.random()*0x7fffffff))>>>0;generatePuzzle(currentSeed)}
function nextLevel(){if(animating)return;level++;currentSeed=(1931+level*7919)>>>0;generatePuzzle(currentSeed)}
restartButton.addEventListener('click',restart);newButton.addEventListener('click',newPuzzle);nextButton.addEventListener('click',nextLevel);generatePuzzle(currentSeed);
