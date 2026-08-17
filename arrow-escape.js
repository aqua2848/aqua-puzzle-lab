const DIRS = [
  { name: 'right', dr: 0, dc: 1 },
  { name: 'down',  dr: 1, dc: 0 },
  { name: 'left',  dr: 0, dc: -1 },
  { name: 'up',    dr: -1, dc: 0 }
];

const board = document.getElementById('board');
const message = document.getElementById('message');
const levelNumber = document.getElementById('levelNumber');
const leftCount = document.getElementById('leftCount');
const restartButton = document.getElementById('restartButton');
const newButton = document.getElementById('newButton');
const nextButton = document.getElementById('nextButton');

let level = 0;
let size = 8;
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

function inBounds(r, c) {
  return r >= 0 && r < size && c >= 0 && c < size;
}

function dirByName(name) {
  return DIRS.find(d => d.name === name);
}

function difficultyForLevel(index) {
  const n = Math.min(10, 8 + Math.floor(index / 3));
  const count = Math.min(16, 10 + Math.floor(index / 2));
  const maxLength = Math.min(7, 5 + Math.floor(index / 3));
  return { n, count, maxLength };
}

// 長い矢印は「しっぽ → 頭」のセル列で持つ。
// まず頭と出口方向を決め、頭の後ろからランダムウォークで蛇行させる。
function buildSnakeCandidate(random, occupied, maxLength) {
  const dir = DIRS[Math.floor(random() * DIRS.length)];
  const head = { r: Math.floor(random() * size), c: Math.floor(random() * size) };
  const behind = { r: head.r - dir.dr, c: head.c - dir.dc };

  if (!inBounds(behind.r, behind.c)) return null;
  if (occupied.has(key(head.r, head.c)) || occupied.has(key(behind.r, behind.c))) return null;

  const cells = [behind, head];
  let tail = behind;
  let move = { dr: -dir.dr, dc: -dir.dc };
  const desiredLength = 2 + Math.floor(random() * Math.max(1, maxLength - 1));

  while (cells.length < desiredLength) {
    const { dr, dc } = move;
    const options = shuffle([
      { dr, dc },
      { dr: dc, dc: -dr },
      { dr: -dc, dc: dr }
    ], random);

    let extended = false;
    for (const nextDir of options) {
      const next = { r: tail.r + nextDir.dr, c: tail.c + nextDir.dc };
      if (!inBounds(next.r, next.c)) continue;
      if (occupied.has(key(next.r, next.c))) continue;
      if (cells.some(p => p.r === next.r && p.c === next.c)) continue;

      cells.unshift(next);
      tail = next;
      move = nextDir;
      extended = true;
      break;
    }
    if (!extended) break;
  }

  if (!sweepIsClear(cells, dir, occupied)) return null;
  return { dir: dir.name, cells };
}

// 矢印全体をその向きに平行移動したとき、途中で既存矢印へ当たらないか確認。
// これを生成時にも使うので、完成盤面には必ず少なくとも1つ解法が残る。
function sweepIsClear(cells, dir, occupied) {
  for (const cell of cells) {
    let r = cell.r + dir.dr;
    let c = cell.c + dir.dc;
    while (inBounds(r, c)) {
      if (occupied.has(key(r, c))) return false;
      r += dir.dr;
      c += dir.dc;
    }
  }
  return true;
}

function generatePuzzle(seed) {
  const random = rng(seed);
  const diff = difficultyForLevel(level);
  size = diff.n;
  board.style.setProperty('--n', size);

  const occupied = new Set();
  const placed = [];
  let attempts = 0;

  while (placed.length < diff.count && attempts < 6000) {
    attempts += 1;
    const candidate = buildSnakeCandidate(random, occupied, diff.maxLength);
    if (!candidate) continue;

    placed.push({
      id: placed.length,
      dir: candidate.dir,
      cells: candidate.cells,
      removed: false
    });
    candidate.cells.forEach(p => occupied.add(key(p.r, p.c)));
  }

  arrows = placed.map((a, i) => ({ ...a, id: i }));
  solved = false;
  nextButton.disabled = true;
  render();
}

function activeOccupied(exceptId = null) {
  const occupied = new Set();
  arrows.forEach(a => {
    if (a.removed || a.id === exceptId) return;
    a.cells.forEach(p => occupied.add(key(p.r, p.c)));
  });
  return occupied;
}

function canEscape(arrow) {
  return sweepIsClear(arrow.cells, dirByName(arrow.dir), activeOccupied(arrow.id));
}

function center(cell) {
  return { x: cell.c * 100 + 50, y: cell.r * 100 + 50 };
}

function pathData(cells) {
  return cells.map((cell, i) => {
    const p = center(cell);
    return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }).join(' ');
}

function headPolygon(arrow) {
  const d = dirByName(arrow.dir);
  const h = center(arrow.cells[arrow.cells.length - 1]);
  const perp = { x: -d.dr, y: d.dc };
  const tip = { x: h.x + d.dc * 34, y: h.y + d.dr * 34 };
  const back = { x: h.x - d.dc * 12, y: h.y - d.dr * 12 };
  const p1 = { x: back.x + perp.x * 21, y: back.y + perp.y * 21 };
  const p2 = { x: back.x - perp.x * 21, y: back.y - perp.y * 21 };
  return `${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
}

function render() {
  board.innerHTML = '';
  levelNumber.textContent = level + 1;
  const active = arrows.filter(a => !a.removed);
  leftCount.textContent = active.length;
  message.textContent = '先が空いている矢印をタップ！';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('arrow-layer');
  svg.setAttribute('viewBox', `0 0 ${size * 100} ${size * 100}`);
  svg.setAttribute('aria-hidden', 'true');
  board.appendChild(svg);

  active.forEach(arrow => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('snake-arrow');
    group.dataset.id = arrow.id;
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', `${arrow.dir} 向きの長い矢印`);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('snake-line');
    path.setAttribute('d', pathData(arrow.cells));

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.classList.add('snake-head');
    head.setAttribute('points', headPolygon(arrow));

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.classList.add('snake-hit');
    hit.setAttribute('d', pathData(arrow.cells));

    const click = () => tapArrow(arrow, group);
    group.addEventListener('click', click);
    group.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        click();
      }
    });

    group.append(path, head, hit);
    svg.appendChild(group);
  });
}

function tapArrow(arrow, element) {
  if (solved || arrow.removed || element.dataset.busy === '1') return;

  if (!canEscape(arrow)) {
    message.textContent = 'ガツン！ その向きだと途中でぶつかる';
    element.classList.remove('blocked');
    void element.getBBox();
    element.classList.add('blocked');
    setTimeout(() => element.classList.remove('blocked'), 380);
    return;
  }

  arrow.removed = true;
  element.dataset.busy = '1';
  message.textContent = 'スルルルッ！ ➜';
  const remaining = arrows.filter(a => !a.removed).length;
  leftCount.textContent = remaining;
  escapeAnimation(element, arrow, remaining === 0);
}

function escapeAnimation(element, arrow, isLast) {
  const d = dirByName(arrow.dir);
  const rect = board.getBoundingClientRect();
  const travel = Math.max(rect.width, rect.height) * 1.6;
  const dx = d.dc * travel;
  const dy = d.dr * travel;
  const tuckX = -d.dc * 7;
  const tuckY = -d.dr * 7;
  const duration = 700 + Math.min(220, Math.max(0, arrow.cells.length - 2) * 55);

  // 長い矢印は残像があると「蛇が抜けていく」感じがかなり出る。
  [75, 145].forEach((delay, i) => {
    const ghost = element.cloneNode(true);
    ghost.classList.add('escape-shadow');
    ghost.removeAttribute('tabindex');
    ghost.removeAttribute('role');
    element.parentNode.insertBefore(ghost, element);
    ghost.animate([
      { transform: 'translate(0,0)', opacity: .16 },
      { transform: `translate(${dx}px,${dy}px)`, opacity: 0 }
    ], {
      duration: duration + 110,
      delay,
      easing: 'cubic-bezier(.18,.72,.2,1)',
      fill: 'forwards'
    }).finished.finally(() => ghost.remove());
  });

  const anim = element.animate([
    { offset: 0, transform: 'translate(0,0)', opacity: 1 },
    { offset: .10, transform: `translate(${tuckX}px,${tuckY}px)`, opacity: 1 },
    { offset: .22, transform: `translate(${d.dc * 14}px,${d.dr * 14}px)`, opacity: 1 },
    { offset: .64, transform: `translate(${dx * .50}px,${dy * .50}px)`, opacity: 1 },
    { offset: .88, transform: `translate(${dx * .84}px,${dy * .84}px)`, opacity: .82 },
    { offset: 1, transform: `translate(${dx}px,${dy}px)`, opacity: 0 }
  ], {
    duration,
    easing: 'cubic-bezier(.12,.68,.18,1)',
    fill: 'forwards'
  });

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
