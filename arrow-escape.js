const DIRS = [
  { name: 'right', dr: 0, dc: 1, angle: 0 },
  { name: 'down',  dr: 1, dc: 0, angle: 90 },
  { name: 'left',  dr: 0, dc: -1, angle: 180 },
  { name: 'up',    dr: -1, dc: 0, angle: -90 }
];

const board = document.getElementById('board');
const message = document.getElementById('message');
const levelNumber = document.getElementById('levelNumber');
const leftCount = document.getElementById('leftCount');
const restartButton = document.getElementById('restartButton');
const newButton = document.getElementById('newButton');
const nextButton = document.getElementById('nextButton');

let level = 0;
let size = 7;
let arrows = [];
let currentSeed = 1931;
let solved = false;

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function key(r, c) {
  return `${r},${c}`;
}

function rayIsClear(r, c, dir, occupied) {
  let rr = r + dir.dr;
  let cc = c + dir.dc;
  while (rr >= 0 && rr < size && cc >= 0 && cc < size) {
    if (occupied.has(key(rr, cc))) return false;
    rr += dir.dr;
    cc += dir.dc;
  }
  return true;
}

function difficultyForLevel(index) {
  const n = Math.min(10, 7 + Math.floor(index / 2));
  const density = Math.min(0.56, 0.38 + index * 0.025);
  return { n, count: Math.max(16, Math.round(n * n * density)) };
}

// 解ける順番を先に作り、その逆順に矢印を置く。
// 置いた時点で出口が空いている向きを選ぶので、必ず少なくとも1つの解法が残る。
function generatePuzzle(seed) {
  const random = rng(seed);
  const diff = difficultyForLevel(level);
  size = diff.n;
  board.style.setProperty('--n', size);

  const allCells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) allCells.push({ r, c });
  }

  const occupied = new Set();
  const placed = [];
  const candidates = shuffle(allCells, random);

  for (const cell of candidates) {
    if (placed.length >= diff.count) break;
    const validDirs = shuffle(DIRS, random).filter(d => rayIsClear(cell.r, cell.c, d, occupied));
    if (!validDirs.length) continue;

    // 端向きばかりになると簡単すぎるので、出口まで長い向きを少し優先。
    validDirs.sort((a, b) => {
      const da = distanceToEdge(cell.r, cell.c, a);
      const db = distanceToEdge(cell.r, cell.c, b);
      return db - da + (random() - .5) * 1.8;
    });

    const dir = validDirs[0];
    placed.push({ id: placed.length, row: cell.r, col: cell.c, dir: dir.name, removed: false });
    occupied.add(key(cell.r, cell.c));
  }

  // placed は「最後に消すもの→最初に消すもの」の順で作られている。
  // 表示IDだけシャッフル感を持たせる。
  arrows = placed.map((a, i) => ({ ...a, id: i }));
  solved = false;
  nextButton.disabled = true;
  render();
}

function distanceToEdge(r, c, d) {
  if (d.name === 'right') return size - 1 - c;
  if (d.name === 'left') return c;
  if (d.name === 'down') return size - 1 - r;
  return r;
}

function dirByName(name) {
  return DIRS.find(d => d.name === name);
}

function activeAt(r, c, exceptId = null) {
  return arrows.some(a => !a.removed && a.id !== exceptId && a.row === r && a.col === c);
}

function canEscape(arrow) {
  const d = dirByName(arrow.dir);
  let r = arrow.row + d.dr;
  let c = arrow.col + d.dc;
  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (activeAt(r, c, arrow.id)) return false;
    r += d.dr;
    c += d.dc;
  }
  return true;
}

function arrowSvg(angle) {
  return `
    <svg viewBox="0 0 100 100" aria-hidden="true" style="transform:rotate(${angle}deg)">
      <line class="shaft" x1="18" y1="50" x2="70" y2="50"></line>
      <path class="head" d="M62 31 L88 50 L62 69 Z"></path>
    </svg>`;
}

function render() {
  board.innerHTML = '';
  levelNumber.textContent = level + 1;
  const active = arrows.filter(a => !a.removed);
  leftCount.textContent = active.length;
  message.textContent = '先が空いている矢印をタップ！';

  active.forEach(arrow => {
    const d = dirByName(arrow.dir);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arrow';
    button.dataset.id = arrow.id;
    button.style.left = `${arrow.col * 100 / size}%`;
    button.style.top = `${arrow.row * 100 / size}%`;
    button.setAttribute('aria-label', `${arrow.dir} 向きの矢印`);
    button.innerHTML = arrowSvg(d.angle);
    button.addEventListener('click', () => tapArrow(arrow, button));
    board.appendChild(button);
  });
}

function tapArrow(arrow, element) {
  if (solved || arrow.removed || element.dataset.busy === '1') return;

  if (!canEscape(arrow)) {
    message.textContent = 'ガツン！ その先は別の矢印がふさいでる';
    element.classList.remove('blocked');
    void element.offsetWidth;
    element.classList.add('blocked');
    setTimeout(() => element.classList.remove('blocked'), 360);
    return;
  }

  arrow.removed = true;
  element.dataset.busy = '1';
  message.textContent = 'スルッ！ ➜';
  const remaining = arrows.filter(a => !a.removed).length;
  leftCount.textContent = remaining;
  escapeAnimation(element, arrow, remaining === 0);
}

function escapeAnimation(element, arrow, isLast) {
  const d = dirByName(arrow.dir);
  const rect = board.getBoundingClientRect();
  const travel = Math.max(rect.width, rect.height) * 1.45;
  const dx = d.dc * travel;
  const dy = d.dr * travel;
  const tuckX = -d.dc * 5;
  const tuckY = -d.dr * 5;

  // うっすら残像を2枚。少し遅れて追いかける。
  [46, 88].forEach((delay, i) => {
    const ghost = element.cloneNode(true);
    ghost.classList.add('escape-shadow');
    ghost.removeAttribute('data-busy');
    ghost.style.zIndex = String(1 - i);
    board.appendChild(ghost);
    ghost.animate([
      { transform: 'translate(0,0)', opacity: .20 },
      { transform: `translate(${dx}px,${dy}px)`, opacity: 0 }
    ], { duration: 520, delay, easing: 'cubic-bezier(.2,.72,.25,1)', fill: 'forwards' })
      .finished.finally(() => ghost.remove());
  });

  const anim = element.animate([
    { offset: 0, transform: 'translate(0,0) scale(1)', opacity: 1 },
    { offset: .10, transform: `translate(${tuckX}px,${tuckY}px) scale(.96)`, opacity: 1, easing: 'ease-out' },
    { offset: .22, transform: `translate(${d.dc * 12}px,${d.dr * 12}px) scale(1.035)`, opacity: 1, easing: 'cubic-bezier(.16,.8,.3,1)' },
    { offset: .72, transform: `translate(${dx * .66}px,${dy * .66}px) scale(1.02)`, opacity: .96 },
    { offset: 1, transform: `translate(${dx}px,${dy}px) scale(.94)`, opacity: 0 }
  ], { duration: 480, easing: 'cubic-bezier(.18,.78,.22,1)', fill: 'forwards' });

  anim.finished.then(() => {
    element.remove();
    if (isLast) finishLevel();
  });
}

function finishLevel() {
  solved = true;
  message.textContent = '🎉 CLEAR! 全部の矢印が脱出した！';
  nextButton.disabled = false;
  celebrate();
}

function celebrate() {
  const layer = document.getElementById('celebration');
  layer.innerHTML = '';
  const marks = ['➜','↑','←','↓','✨'];
  for (let i = 0; i < 44; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = marks[Math.floor(Math.random() * marks.length)];
    s.style.left = `${Math.random() * 100}%`;
    s.style.setProperty('--drift', `${(Math.random() - .5) * 240}px`);
    s.style.animationDelay = `${Math.random() * .38}s`;
    layer.appendChild(s);
  }
  setTimeout(() => layer.innerHTML = '', 2400);
}

function restart() {
  generatePuzzle(currentSeed);
}

function newPuzzle() {
  currentSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  generatePuzzle(currentSeed);
}

function nextLevel() {
  level += 1;
  currentSeed = (1931 + level * 7919) >>> 0;
  generatePuzzle(currentSeed);
}

restartButton.addEventListener('click', restart);
newButton.addEventListener('click', newPuzzle);
nextButton.addEventListener('click', nextLevel);

generatePuzzle(currentSeed);
