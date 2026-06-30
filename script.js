/** 보드 가로 칸 수 (CSS 변수 --cols와 동기화) */
const COLS = 10;

/** 보드 세로 칸 수 (CSS 변수 --rows와 동기화) */
const ROWS = 20;

/** 블록 자동 낙하 간격 (밀리초) */
const DROP_INTERVAL_MS = 800;

/** 라인 삭제 수별 점수 */
const LINE_SCORES = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

/**
 * 테트로미노 모양·색상 정의
 * colorClass는 style.css의 .piece-* 클래스와 대응한다.
 */
const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], colorClass: 'piece-i', color: '#00f0f0' },
  O: { shape: [[1, 1], [1, 1]], colorClass: 'piece-o', color: '#f0f000' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], colorClass: 'piece-t', color: '#a000f0' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], colorClass: 'piece-s', color: '#00f000' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], colorClass: 'piece-z', color: '#f00000' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], colorClass: 'piece-j', color: '#0000f0' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], colorClass: 'piece-l', color: '#f0a000' },
};

/** TETROMINOES 키 목록 */
const PIECE_TYPES = Object.keys(TETROMINOES);

/** 보드 DOM 요소 */
const boardElement = document.getElementById('game-board');

/** 점수 표시 요소 */
const scoreElement = document.getElementById('score');

/** 시작 버튼 */
const startBtn = document.getElementById('start-btn');

/** 재시작 버튼 */
const restartBtn = document.getElementById('restart-btn');

/** 게임 상태 메시지 요소 */
const gameStatusElement = document.getElementById('game-status');

/** 현재 점수 */
let score = 0;

/** 고정된 블록 보드 (null = 빈 칸, 문자 = 블록 종류) */
let board = createEmptyBoard();

/** 현재 떨어지는 블록 */
let currentPiece = null;

/** 보드 칸 DOM 요소 2차원 배열 */
let cellElements = null;

/** 자동 낙하 타이머 ID */
let dropTimerId = null;

/** 게임 진행 중 여부 */
let isPlaying = false;

/** 게임 오버 여부 */
let isGameOver = false;

/** 키보드 이벤트 등록 여부 */
let keyboardControlsBound = false;

/** 게임 세션 ID (지연된 tick 콜백 무시용) */
let gameId = 0;

document.documentElement.style.setProperty('--cols', String(COLS));
document.documentElement.style.setProperty('--rows', String(ROWS));

/**
 * 빈 보드 2차원 배열을 생성한다.
 * @returns {(string|null)[][]}
 */
function createEmptyBoard() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );
}

/**
 * 블록 종류에 대응하는 CSS 클래스명을 반환한다.
 * @param {string} type
 * @returns {string|null}
 */
function getCellClass(type) {
  return TETROMINOES[type]?.colorClass ?? null;
}

/**
 * 보드 칸 DOM의 외형을 갱신한다.
 * @param {number} row
 * @param {number} col
 * @param {string|null} pieceType
 */
function setCellAppearance(row, col, pieceType) {
  const cell = cellElements[row][col];
  cell.className = 'cell';

  if (pieceType) {
    const colorClass = getCellClass(pieceType);
    if (colorClass) {
      cell.classList.add(colorClass);
    }
  }
}

/**
 * 블록 모양의 가로 시작 열을 계산한다.
 * @param {number[][]} shape
 * @returns {number}
 */
function getStartCol(shape) {
  const width = shape[0].length;
  return Math.floor((COLS - width) / 2);
}

/**
 * 블록이 (dx, dy)만큼 이동할 수 있는지 검사한다.
 * @param {{ shape: number[][], row: number, col: number }} piece
 * @param {number} dx 가로 이동량
 * @param {number} dy 세로 이동량
 * @param {(string|null)[][]} matrix 고정 블록 보드
 * @returns {boolean}
 */
function canMove(piece, dx, dy, matrix) {
  const { shape, row, col } = piece;
  const newRow = row + dy;
  const newCol = col + dx;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) {
        continue;
      }

      const boardRow = newRow + r;
      const boardCol = newCol + c;

      if (
        boardRow < 0 ||
        boardRow >= ROWS ||
        boardCol < 0 ||
        boardCol >= COLS
      ) {
        return false;
      }

      if (matrix[boardRow][boardCol]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 블록을 지정 위치에 놓을 수 있는지 검사한다.
 * @param {{ shape: number[][], type: string }} piece
 * @param {number} row
 * @param {number} col
 * @param {(string|null)[][]} [matrix]
 * @returns {boolean}
 */
function canPlace(piece, row, col, matrix = board) {
  return canMove({ ...piece, row, col }, 0, 0, matrix);
}

/**
 * 새 테트로미노를 생성한다.
 * @param {string} [type] 블록 종류 (미지정 시 무작위)
 * @returns {{ type: string, shape: number[][], row: number, col: number }}
 */
function createPiece(type) {
  let pieceType = type;

  if (pieceType && !TETROMINOES[pieceType]) {
    console.warn(
      `알 수 없는 블록 종류: ${pieceType}. 무작위 블록을 사용합니다.`
    );
    pieceType = undefined;
  }

  if (!pieceType) {
    pieceType = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  }

  const template = TETROMINOES[pieceType];

  return {
    type: pieceType,
    shape: template.shape.map((row) => [...row]),
    row: 0,
    col: getStartCol(template.shape),
  };
}

/**
 * 보드 칸 DOM 요소를 최초 1회 생성한다.
 */
function ensureBoardElements() {
  if (cellElements) {
    return;
  }

  cellElements = [];

  for (let row = 0; row < ROWS; row++) {
    cellElements[row] = [];

    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      boardElement.appendChild(cell);
      cellElements[row][col] = cell;
    }
  }
}

/**
 * 현재 블록을 보드 위에 그린다.
 */
function drawPiece() {
  if (!currentPiece) {
    return;
  }

  const { shape, row: pieceRow, col: pieceCol, type } = currentPiece;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) {
        continue;
      }

      const boardRow = pieceRow + row;
      const boardCol = pieceCol + col;

      if (
        boardRow >= 0 &&
        boardRow < ROWS &&
        boardCol >= 0 &&
        boardCol < COLS
      ) {
        setCellAppearance(boardRow, boardCol, type);
      }
    }
  }
}

/**
 * 게임 상태를 화면에 반영한다. (상태 변경 후 이 함수만 호출)
 */
function renderBoard() {
  ensureBoardElements();

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      setCellAppearance(row, col, board[row][col]);
    }
  }

  drawPiece();
}

/**
 * 점수 UI를 갱신한다.
 */
function updateScoreDisplay() {
  scoreElement.textContent = String(score);
}

/**
 * 게임 오버 UI를 갱신한다.
 * @param {boolean} show
 */
function updateGameOverDisplay(show) {
  gameStatusElement.classList.toggle('hidden', !show);
}

/**
 * 삭제된 라인 수에 따라 점수를 증가시킨다.
 * @param {number} linesCleared
 */
function addScoreForLines(linesCleared) {
  if (linesCleared <= 0) {
    return;
  }

  const cappedLines = Math.min(linesCleared, 4);
  const points = LINE_SCORES[cappedLines] ?? cappedLines * LINE_SCORES[1];
  score += points;
  updateScoreDisplay();
}

/**
 * 가득 찬 행을 삭제하고 위 블록을 내린다.
 * @returns {number} 삭제된 줄 수
 */
function clearLines() {
  const remaining = board.filter((row) => {
    if (row.length !== COLS) {
      return true;
    }

    return !row.every((cell) => cell !== null);
  });
  const linesCleared = ROWS - remaining.length;

  while (remaining.length < ROWS) {
    remaining.unshift(Array.from({ length: COLS }, () => null));
  }

  board = remaining;
  return linesCleared;
}

/**
 * 현재 블록을 보드에 고정한다.
 */
function lockPiece() {
  if (!currentPiece) {
    return;
  }

  const { shape, row, col, type } = currentPiece;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) {
        continue;
      }

      const boardRow = row + r;
      const boardCol = col + c;

      if (
        boardRow < 0 ||
        boardRow >= ROWS ||
        boardCol < 0 ||
        boardCol >= COLS
      ) {
        console.warn(
          `보드 범위 밖 고정 시도 무시: (${boardRow}, ${boardCol})`
        );
        continue;
      }

      board[boardRow][boardCol] = type;
    }
  }
}

/**
 * 새 블록을 생성한다. 생성 위치가 막혀 있으면 게임 오버가 된다.
 * @returns {boolean} 새 블록 생성 성공 여부
 */
function spawnNewPiece() {
  currentPiece = createPiece();

  if (!canMove(currentPiece, 0, 0, board)) {
    currentPiece = null;
    triggerGameOver();
    return false;
  }

  return true;
}

/**
 * 게임 오버 상태로 전환한다.
 */
function triggerGameOver() {
  isGameOver = true;
  stopGameLoop();
  updateGameOverDisplay(true);
}

/**
 * 블록을 고정하고 라인 삭제·점수 반영·새 블록 생성을 처리한다.
 */
function settlePiece() {
  lockPiece();
  const linesCleared = clearLines();
  addScoreForLines(linesCleared);
  spawnNewPiece();
}

/**
 * 블록 모양을 시계 방향으로 90도 회전한다.
 * @param {number[][]} shape
 * @returns {number[][]}
 */
function rotateShape(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rotated[col][rows - 1 - row] = shape[row][col];
    }
  }

  return rotated;
}

/**
 * 현재 블록을 이동한다. 충돌 판정을 통과할 때만 적용한다.
 * @param {number} dx
 * @param {number} dy
 * @returns {boolean}
 */
function tryMovePiece(dx, dy) {
  if (!currentPiece || !isPlaying || isGameOver) {
    return false;
  }

  if (!canMove(currentPiece, dx, dy, board)) {
    return false;
  }

  currentPiece.col += dx;
  currentPiece.row += dy;
  renderBoard();
  return true;
}

/**
 * 현재 블록을 한 칸 아래로 소프트 드롭한다.
 * @returns {boolean}
 */
function trySoftDrop() {
  return tryMovePiece(0, 1);
}

/**
 * 현재 블록을 시계 방향으로 회전한다. 충돌 시 회전을 취소한다.
 * @returns {boolean}
 */
function tryRotatePiece() {
  if (!currentPiece || !isPlaying || isGameOver) {
    return false;
  }

  const rotatedShape = rotateShape(currentPiece.shape);
  const kickOffsets = [0, -1, 1, -2, 2];

  for (const offset of kickOffsets) {
    const testPiece = {
      ...currentPiece,
      shape: rotatedShape,
      col: currentPiece.col + offset,
    };

    if (!canMove(testPiece, 0, 0, board)) {
      continue;
    }

    currentPiece.shape = rotatedShape;
    currentPiece.col += offset;
    renderBoard();
    return true;
  }

  return false;
}

/**
 * 현재 블록을 바닥까지 즉시 낙하(hard drop)시킨다.
 */
function hardDrop() {
  if (!currentPiece || !isPlaying || isGameOver) {
    return;
  }

  while (canMove(currentPiece, 0, 1, board)) {
    currentPiece.row += 1;
  }

  settlePiece();
  renderBoard();
}

/**
 * 현재 블록을 한 칸 아래로 이동하거나, 불가능하면 고정한다.
 */
function movePieceDown() {
  if (!currentPiece || !isPlaying || isGameOver) {
    return;
  }

  if (canMove(currentPiece, 0, 1, board)) {
    currentPiece.row += 1;
    return;
  }

  settlePiece();
}

/**
 * 게임 조작 키 입력이 버튼 등 UI 요소에서 발생했는지 확인한다.
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
function isGameKeyBlockedTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('button, input, textarea, select, a'));
}

/**
 * 키보드 입력을 처리한다.
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
  if (isGameKeyBlockedTarget(event.target)) {
    return;
  }

  if (!isPlaying || !currentPiece || isGameOver) {
    return;
  }

  switch (event.code) {
    case 'ArrowLeft':
      event.preventDefault();
      tryMovePiece(-1, 0);
      break;
    case 'ArrowRight':
      event.preventDefault();
      tryMovePiece(1, 0);
      break;
    case 'ArrowDown':
      event.preventDefault();
      trySoftDrop();
      break;
    case 'ArrowUp':
      event.preventDefault();
      tryRotatePiece();
      break;
    case 'Space':
      event.preventDefault();
      hardDrop();
      break;
    default:
      break;
  }
}

/**
 * 키보드 조작을 등록한다. (최초 1회만)
 */
function setupKeyboardControls() {
  if (keyboardControlsBound) {
    return;
  }

  document.addEventListener('keydown', handleKeyDown);
  keyboardControlsBound = true;
}

/**
 * 자동 낙하 틱을 처리한다.
 * @param {number} expectedGameId
 */
function tick(expectedGameId) {
  if (expectedGameId !== gameId || !isPlaying || isGameOver) {
    return;
  }

  movePieceDown();
  renderBoard();
}

/**
 * 자동 낙하 타이머를 시작한다.
 */
function startGameLoop() {
  stopGameLoop();
  isPlaying = true;
  const activeGameId = gameId;
  dropTimerId = setInterval(() => tick(activeGameId), DROP_INTERVAL_MS);
}

/**
 * 자동 낙하 타이머를 중지한다.
 */
function stopGameLoop() {
  if (dropTimerId !== null) {
    clearInterval(dropTimerId);
    dropTimerId = null;
  }

  isPlaying = false;
}

/**
 * 게임을 처음부터 다시 시작한다.
 */
function resetGame() {
  gameId += 1;
  stopGameLoop();
  isGameOver = false;
  score = 0;
  board = createEmptyBoard();
  currentPiece = null;

  updateGameOverDisplay(false);
  updateScoreDisplay();
  spawnNewPiece();
  renderBoard();
  startGameLoop();
}

startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);

setupKeyboardControls();
resetGame();
