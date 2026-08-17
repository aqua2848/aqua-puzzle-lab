const SIZE=5;
const REGION_COLORS=['#f9a8d4','#93c5fd','#86efac','#fde68a','#c4b5fd'];
const LEVELS=[
 {regions:[[0,0,1,1,1],[0,2,2,1,3],[0,2,4,3,3],[4,2,4,4,3],[4,4,4,3,3]]},
 {regions:[[0,0,0,1,1],[2,0,3,3,1],[2,2,3,1,1],[2,4,3,4,4],[2,4,4,4,4]]},
 {regions:[[0,0,1,2,2],[0,0,1,2,2],[3,0,4,4,2],[3,0,0,4,2],[3,3,4,4,4]]}
];
let level=0,state=[];
const board=document.getElementById('board'),message=document.getElementById('message'),levelNumber=document.getElementById('levelNumber'),nextButton=document.getElementById('nextButton');
function reset(){state=Array(SIZE*SIZE).fill(0);nextButton.disabled=true;message.textContent='マスをクリック：空白 → 🐱 → ×';render()}
function render(){board.innerHTML='';levelNumber.textContent=level+1;LEVELS[level].regions.flat().forEach((region,i)=>{const b=document.createElement('button');b.className='cell';b.style.background=REGION_COLORS[region];if(state[i]===1){b.textContent='🐱';b.classList.add('cat')}else if(state[i]===2){b.innerHTML='<span class="mark-x">×</span>'}b.onclick=()=>{state[i]=(state[i]+1)%3;nextButton.disabled=true;render()};board.appendChild(b)})}
function cats(){return state.map((v,i)=>v===1?i:-1).filter(i=>i>=0)}
function conflicts(){const cs=cats(),bad=new Set(),regs=LEVELS[level].regions;for(let a=0;a<cs.length;a++)for(let b=a+1;b<cs.length;b++){const i=cs[a],j=cs[b],r1=Math.floor(i/SIZE),c1=i%SIZE,r2=Math.floor(j/SIZE),c2=j%SIZE;if(r1===r2||c1===c2||regs[r1][c1]===regs[r2][c2]||(Math.abs(r1-r2)<=1&&Math.abs(c1-c2)<=1)){bad.add(i);bad.add(j)}}return bad}
function check(){document.querySelectorAll('.cell').forEach(c=>c.classList.remove('bad'));const cs=cats(),bad=conflicts();if(bad.size){bad.forEach(i=>board.children[i].classList.add('bad'));message.textContent='⚠️ その猫たち、ルール違反してる！';return}if(cs.length!==SIZE){message.textContent=`猫は全部で${SIZE}匹必要だよ（いま${cs.length}匹）`;return}const rows=new Set(),cols=new Set(),regions=new Set(),map=LEVELS[level].regions;cs.forEach(i=>{const r=Math.floor(i/SIZE),c=i%SIZE;rows.add(r);cols.add(c);regions.add(map[r][c])});if(rows.size===SIZE&&cols.size===SIZE&&regions.size===SIZE){message.textContent='🎉 CLEAR! 猫たちの配置、完璧！';nextButton.disabled=false;celebrate()}else message.textContent='あと少し！ 行・列・色エリアを見直してみよう'}
function celebrate(){const el=document.getElementById('celebration');el.innerHTML='';for(let i=0;i<36;i++){const s=document.createElement('span');s.className='confetti';s.textContent=['🐱','✨','🐾'][Math.floor(Math.random()*3)];s.style.left=Math.random()*100+'%';s.style.setProperty('--x',(Math.random()-.5)*260+'px');s.style.animationDelay=Math.random()*.4+'s';el.appendChild(s)}setTimeout(()=>el.innerHTML='',2300)}
document.getElementById('resetButton').onclick=reset;document.getElementById('checkButton').onclick=check;nextButton.onclick=()=>{level=(level+1)%LEVELS.length;reset()};reset();