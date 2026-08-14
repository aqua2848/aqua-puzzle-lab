const CAPACITY = 4;

const COLORS = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#facc15',
  purple: '#a855f7', pink: '#ec4899', cyan: '#06b6d4', orange: '#f97316'
};

// 配列の先頭が試験管の底、末尾が一番上。
// 各レベルは「各色4個 + 空き試験管2本」。事前に解ける盤面であることを確認済み。
const LEVELS = [
  [
    ['blue', 'blue', 'blue', 'red'],
    ['green', 'green', 'red', 'green'],
    ['red', 'blue', 'red', 'green'],
    [], []
  ],
  [
    ['red', 'green', 'red', 'blue'],
    ['yellow', 'blue', 'yellow', 'blue'],
    ['green', 'blue', 'green', 'green'],
    ['red', 'yellow', 'red', 'yellow'],
    [], []
  ],
  [
    ['red', 'purple', 'purple', 'yellow'],
    ['green', 'blue', 'blue', 'green'],
    ['green', 'red', 'blue', 'yellow'],
    ['purple', 'purple', 'blue', 'red'],
    ['yellow', 'red', 'green', 'yellow'],
    [], []
  ],
  [
    ['purple', 'yellow', 'blue', 'yellow'],
    ['green', 'pink', 'purple', 'green'],
    ['red', 'purple', 'blue', 'purple'],
    ['red', 'blue', 'green', 'yellow'],
    ['red', 'yellow', 'pink', 'pink'],
    ['pink', 'blue', 'green', 'red'],
    [], []
  ]
];

const boardEl = document.getElementById('board');
const moveCountEl = document.getElementById('moveCount');
const levelNumberEl = document.getElementById('levelNumber');
const messageEl = document.getElementById('message');
const undoButton = document.getElementById('undoButton');
const restartButton = document.getElementById('restartButton');
const nextButton = document.getElementById('nextButton');
const celebrationEl = document.getElementById('celebration');

let currentLevel = 0;
let tubes = [];
let selectedTube = null;
let moves = 0;
let history = [];
let solved = false;

function cloneTubes(source) { return source.map(tube => [...tube]); }

function loadLevel(index) {
  currentLevel = index % LEVELS.length;
  tubes = cloneTubes(LEVELS[currentLevel]);
  selectedTube = null;
  moves = 0;
  history = [];
  solved = false;
  messageEl.textContent = '同じ色をそろえよう！';
  nextButton.disabled = true;
  render();
}

function render() {
  boardEl.innerHTML = '';
  levelNumberEl.textContent = currentLevel + 1;
  moveCountEl.textContent = moves;
  undoButton.disabled = history.length === 0 || solved;

  tubes.forEach((tube, index) => {
    const button = document.createElement('button');
    button.className = 'tube-button';
    button.type = 'button';
    button.setAttribute('aria-label', `試験管 ${index + 1}`);
    if (selectedTube === index) button.classList.add('selected');

    const tubeEl = document.createElement('div');
    tubeEl.className = 'tube';

    tube.forEach((color, layerIndex) => {
      const layer = document.createElement('div');
      layer.className = 'layer';
      layer.style.bottom = `${layerIndex * 25}%`;
      layer.style.background = COLORS[color];
      tubeEl.appendChild(layer);
    });

    button.appendChild(tubeEl);
    button.addEventListener('click', () => handleTubeClick(index, button));
    boardEl.appendChild(button);
  });
}

function handleTubeClick(index, button) {
  if (solved) return;

  if (selectedTube === null) {
    if (tubes[index].length === 0) {
      flashInvalid(button, '空の試験管からは注げないよ');
      return;
    }
    selectedTube = index;
    messageEl.textContent = '注ぎ先を選んでね';
    render();
    return;
  }

  if (selectedTube === index) {
    selectedTube = null;
    messageEl.textContent = '選択を解除しました';
    render();
    return;
  }

  const source = selectedTube;
  if (canPour(source, index)) {
    history.push({ tubes: cloneTubes(tubes), moves });
    pour(source, index);
    moves += 1;
    selectedTube = null;

    if (isSolved()) {
      solved = true;
      messageEl.textContent = `🎉 CLEAR! ${moves}手で完成！`;
      nextButton.disabled = false;
      celebrate();
    } else {
      messageEl.textContent = 'ナイス！次いこう';
    }
    render();
  } else {
    selectedTube = null;
    messageEl.textContent = 'そこには注げないよ';
    render();
    flashInvalid(boardEl.children[index]);
  }
}

function canPour(from, to) {
  const source = tubes[from];
  const target = tubes[to];
  if (!source.length || target.length >= CAPACITY) return false;
  const color = source[source.length - 1];
  const targetTop = target[target.length - 1];
  return target.length === 0 || targetTop === color;
}

function pour(from, to) {
  const source = tubes[from];
  const target = tubes[to];
  const color = source[source.length - 1];
  let sameColorCount = 0;
  for (let i = source.length - 1; i >= 0; i--) {
    if (source[i] !== color) break;
    sameColorCount += 1;
  }
  const amount = Math.min(sameColorCount, CAPACITY - target.length);
  for (let i = 0; i < amount; i++) target.push(source.pop());
}

function isSolved() {
  return tubes.every(tube =>
    tube.length === 0 ||
    (tube.length === CAPACITY && tube.every(color => color === tube[0]))
  );
}

function undo() {
  if (!history.length || solved) return;
  const previous = history.pop();
  tubes = cloneTubes(previous.tubes);
  moves = previous.moves;
  selectedTube = null;
  messageEl.textContent = '1手戻したよ';
  render();
}

function restart() { loadLevel(currentLevel); }
function nextLevel() { loadLevel((currentLevel + 1) % LEVELS.length); }

function flashInvalid(button, message) {
  if (!button) return;
  if (message) messageEl.textContent = message;
  button.classList.remove('invalid');
  void button.offsetWidth;
  button.classList.add('invalid');
}

function celebrate() {
  celebrationEl.innerHTML = '';
  const palette = Object.values(COLORS);
  for (let i = 0; i < 70; i++) {
    const confetti = document.createElement('span');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.background = palette[Math.floor(Math.random() * palette.length)];
    confetti.style.animationDelay = `${Math.random() * 0.45}s`;
    confetti.style.setProperty('--drift', `${(Math.random() - 0.5) * 220}px`);
    celebrationEl.appendChild(confetti);
  }
  setTimeout(() => { celebrationEl.innerHTML = ''; }, 2400);
}

undoButton.addEventListener('click', undo);
restartButton.addEventListener('click', restart);
nextButton.addEventListener('click', nextLevel);

loadLevel(0);
