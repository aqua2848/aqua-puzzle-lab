const DIRS = {
  right: { dr: 0, dc: 1, angle: 0 },
  down:  { dr: 1, dc: 0, angle: 90 },
  left:  { dr: 0, dc: -1, angle: 180 },
  up:    { dr: -1, dc: 0, angle: -90 }
};

const board = document.getElementById('board');
const message = document.getElementById('message');
const levelNumber = document.getElementById('levelNumber');
const leftCount = document.getElementById('leftCount');
const restartButton = document.getElementById('restartButton');
const newButton = document.getElementById('newButton');
const nextButton = document.getElementById('nextButton');

let level = 0;
let size = 9;
let arrows = [];
let currentSeed = 1931;
let solved = false;
let animating = false;

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function key(r, c) {
  return `${r},${c}`;
}

function difficultyForLevel(index) {
  const n = Math.min(12, 9 + Math.floor(index / 2));
  const minLen = Math.min(9, 6 + Math.floor(index / 3));
  const maxLen = Math.min(15, 10 + Math.floor(index / 2));
  return { n, minLen, maxLen };
}

function buildSerpentineCells(n) {
  const cells = [];
  for (let r = 0; r < n; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < n; c++) cells.push({ r, c });
    } else {
      for (let c = n - 1; c >= 0; c--) cells.push({ r, c });
    }
  }
  return cells;
}

function splitIntoLongArrows(cells, random, minLen, maxLen) {
  const chunks = [];
  let i = 0;

  while (i < cells.length) {
    const remaining = cells.length - i;
    let len;

    if (remaining <= maxLen) {
      len = remaining;
    } else {
      len = minLen + Math.floor(random() * (maxLen - minLen + 1));
      const after = remaining - len;
      if (after > 0 && after < minLen) len -= (minLen - after);
    }

    len = Math.max(2, Math.min(len, remaining));
    chunks.push(cells.slice(i, i + len));
    i += len;
  }

  // 末尾に極端に短い矢印ができた場合は前の矢印へ吸収。
  if (chunks.length > 1 && chunks[chunks.length - 1].length < 4) {
    chunks[chunks.length - 2].push(...chunks.pop());
  }

  return chunks;
}

function directionFromLastStep(cells) {
  const a = cells[cells.length - 2];
  const b = cells[cells.length - 1];
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  if (dc === 1) return 'right';
  if (dc === -1) return 'left';
  if (dr === 1) return 'down';
  return 'up';
}

// 盤面全体を1本の蛇行経路で埋め、それを長い矢印へ分割する。
// 蛇行順の後ろ側から消せば必ず解けるため、密度100%でも解法が存在する。
function generatePuzzle(seed) {
  const random = rng(seed);
  const diff = difficultyForLevel(level);
  size = diff.n;
  board.style.setProperty('--n', size);

  const allCells = buildSerpentineCells(size);
  const chunks = splitIntoLongArrows(allCells, random, diff.minLen, diff.maxLen);

  arrows = chunks.map((cells, id) => ({
    id,
    cells,
    dir: directionFromLastStep(cells),
    removed: false
  }));

  solved = false;
  animating = false;
  nextButton.disabled = true;
  render();
}

function activeOccupancy(exceptId = null) {
  const occupied = new Set();
  arrows.forEach(arrow => {
    if (arrow.removed || arrow.id === exceptId) return;
    arrow.cells.forEach(cell => occupied.add(key(cell.r, cell.c)));
  });
  return occupied;
}

function canEscape(arrow) {
  const head = arrow.cells[arrow.cells.length - 1];
  const d = DIRS[arrow.dir];
  const occupied = activeOccupancy(arrow.id);
  let r = head.r + d.dr;
  let c = head.c + d.dc;

  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (occupied.has(key(r, c))) return false;
    r += d.dr;
    c += d.dc;
  }
  return true;
}

function cellCenter(cell) {
  const step = 1000 / size;
  return {
    x: (cell.c + .5) * step,
    y: (cell.r + .5) * step
  };
}

function pathDataForCells(cells, extend = false, dirName = null) {
  const points = cells.map(cellCenter);
  if (extend && dirName) {
    const d = DIRS[dirName];
    const head = points[points.length - 1];
    const escapeDistance = 1500;
    points.push({ x: head.x + d.dc * escapeDistance, y: head.y + d.dr * escapeDistance });
  }
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function createArrowGroup(arrow) {
  const ns = 'http://www.w3.org/2000/svg';
  const group = document.createElementNS(ns, 'g');
  group.classList.add('snake-arrow');
  group.dataset.id = arrow.id;

  const path = document.createElementNS(ns, 'path');
  path.classList.add('snake-line');
  path.setAttribute('d', pathDataForCells(arrow.cells));

  const hit = document.createElementNS(ns, 'path');
  hit.classList.add('snake-hit');
  hit.setAttribute('d', pathDataForCells(arrow.cells));

  const head = document.createElementNS(ns, 'polygon');
  head.classList.add('snake-head');
  head.setAttribute('points', '-25,-20 22,0 -25,20');

  const end = cellCenter(arrow.cells[arrow.cells.length - 1]);
  head.setAttribute('transform', `translate(${end.x} ${end.y}) rotate(${DIRS[arrow.dir].angle})`);

  hit.addEventListener('click', () => tapArrow(arrow, group));
  head.addEventListener('click', () => tapArrow(arrow, group));

  group.append(path, hit, head);
  return group;
}

function render() {
  board.innerHTML = '';
  levelNumber.textContent = level + 1;
  const active = arrows.filter(a => !a.removed);
  leftCount.textContent = active.length;
  message.textContent = '先が空いている長い矢印をタップ！';

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('arrow-canvas');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('aria-label', '蛇行する矢印脱出パズル');

  active.forEach(arrow => svg.appendChild(createArrowGroup(arrow)));
  board.appendChild(svg);
}

function tapArrow(arrow, group) {
  if (solved || animating || arrow.removed || group.classList.contains('escaping')) return;

  if (!canEscape(arrow)) {
    message.textContent = 'ガツン！ その先は別の矢印がふさいでる';
    group.classList.remove('blocked');
    void group.getBBox();
    group.classList.add('blocked');
    setTimeout(() => group.classList.remove('blocked'), 380);
    return;
  }

  arrow.removed = true;
  animating = true;
  group.classList.add('escaping');
  message.textContent = 'スルルルッ… ➜';
  leftCount.textContent = arrows.filter(a => !a.removed).length;
  escapeLikeTrain(group, arrow);
}

function escapeLikeTrain(group, arrow) {
  const ns = 'http://www.w3.org/2000/svg';
  const originalPath = group.querySelector('.snake-line');
  const originalHead = group.querySelector('.snake-head');

  // 頭の先に盤外まで直線を足した「レール」を作る。
  const rail = document.createElementNS(ns, 'path');
  rail.classList.add('escape-rail');
  rail.setAttribute('d', pathDataForCells(arrow.cells, true, arrow.dir));
  rail.setAttribute('fill', 'none');
  rail.setAttribute('stroke', 'none');
  group.appendChild(rail);

  const bodyLength = originalPath.getTotalLength();
  const railLength = rail.getTotalLength();
  const travel = railLength - bodyLength;

  // 描画する線そのものも、盤外まで伸ばしたレールへ差し替える。
  originalPath.setAttribute('d', rail.getAttribute('d'));
  originalPath.style.strokeDasharray = `${bodyLength} ${railLength + bodyLength}`;
  originalPath.style.strokeDashoffset = '0';

  const hit = group.querySelector('.snake-hit');
  if (hit) hit.remove();

  const duration = Math.min(1900, 800 + arrow.cells.length * 70);
  const start = performance.now();

  function frame(now) {
    const raw = Math.min(1, (now - start) / duration);
    // 最初は少しタメて、後半ほど気持ちよく加速。
    const eased = raw < .12
      ? (raw / .12) * .035
      : .035 + .965 * (1 - Math.pow(1 - (raw - .12) / .88, 3));

    const moved = travel * eased;
    originalPath.style.strokeDashoffset = `${-moved}`;

    const frontLength = Math.min(railLength, bodyLength + moved);
    const p = rail.getPointAtLength(frontLength);
    const p2 = rail.getPointAtLength(Math.max(0, frontLength - 3));
    const angle = Math.atan2(p.y - p2.y, p.x - p2.x) * 180 / Math.PI;
    originalHead.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${angle})`);

    if (raw < 1) {
      requestAnimationFrame(frame);
    } else {
      group.remove();
      animating = false;
      if (arrows.every(a => a.removed)) finishLevel();
      else message.textContent = 'いい感じ！ 次に抜ける矢印はどれ？';
    }
  }

  requestAnimationFrame(frame);
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
  if (animating) return;
  generatePuzzle(currentSeed);
}

function newPuzzle() {
  if (animating) return;
  currentSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  generatePuzzle(currentSeed);
}

function nextLevel() {
  if (animating) return;
  level += 1;
  currentSeed = (1931 + level * 7919) >>> 0;
  generatePuzzle(currentSeed);
}

restartButton.addEventListener('click', restart);
newButton.addEventListener('click', newPuzzle);
nextButton.addEventListener('click', nextLevel);

generatePuzzle(currentSeed);
