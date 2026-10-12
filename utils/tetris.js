// utils/tetris.js
// 俄罗斯方块核心引擎（与框架无关，纯逻辑）

// 7 种方块的形状矩阵（均为方阵，便于旋转）
const PIECES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
};

// 方块颜色
const COLORS = {
  I: '#00e5ff',
  O: '#ffd600',
  T: '#aa00ff',
  S: '#00e676',
  Z: '#ff1744',
  J: '#2979ff',
  L: '#ff9100'
};

class Tetris {
  constructor(cols = 10, rows = 20) {
    this.cols = cols;
    this.rows = rows;
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.nextType = this.randomType();
    this.spawn();
  }

  randomType() {
    const types = Object.keys(PIECES);
    return types[Math.floor(Math.random() * types.length)];
  }

  spawn() {
    const type = this.nextType;
    this.nextType = this.randomType();
    const matrix = PIECES[type].map((row) => row.slice());
    const x = Math.floor((this.cols - matrix[0].length) / 2);
    const y = 0;
    this.current = { type, matrix, x, y };
    // 出生即碰撞 = 游戏结束
    if (this.collide(matrix, x, y)) {
      this.gameOver = true;
    }
  }

  // 检测给定矩阵在 (x, y) 是否发生碰撞
  collide(matrix, x, y) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const nx = x + c;
          const ny = y + r;
          if (nx < 0 || nx >= this.cols || ny >= this.rows) return true;
          if (ny >= 0 && this.board[ny][nx]) return true;
        }
      }
    }
    return false;
  }

  move(dx, dy) {
    if (this.gameOver || !this.current) return false;
    if (!this.collide(this.current.matrix, this.current.x + dx, this.current.y + dy)) {
      this.current.x += dx;
      this.current.y += dy;
      return true;
    }
    return false;
  }

  rotate() {
    if (this.gameOver || !this.current) return;
    const m = this.current.matrix;
    const rotated = m[0].map((_, i) => m.map((row) => row[i]).reverse());
    // 简单踢墙：依次尝试原位、左、右、左2、右2
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!this.collide(rotated, this.current.x + k, this.current.y)) {
        this.current.matrix = rotated;
        this.current.x += k;
        return;
      }
    }
  }

  // 当前方块直接落到底部的纵坐标
  getGhostY() {
    if (!this.current) return 0;
    let gy = this.current.y;
    while (!this.collide(this.current.matrix, this.current.x, gy + 1)) gy++;
    return gy;
  }

  // 锁定当前方块到棋盘
  lock() {
    const { matrix, x, y, type } = this.current;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const ny = y + r;
          const nx = x + c;
          if (ny >= 0) this.board[ny][nx] = COLORS[type];
        }
      }
    }
    this.clearLines();
    this.spawn();
  }

  clearLines() {
    let cleared = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.board[r].every((cell) => cell)) {
        this.board.splice(r, 1);
        this.board.unshift(Array(this.cols).fill(null));
        cleared++;
        r++; // 重新检查同一行
      }
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      this.score += (points[cleared] || 800) * this.level;
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
    }
  }

  softDrop() {
    if (!this.move(0, 1)) {
      this.lock();
    } else {
      this.score += 1;
    }
  }

  hardDrop() {
    let dropped = 0;
    while (this.move(0, 1)) dropped++;
    this.score += dropped * 2;
    this.lock();
  }

  // 重力步进（由一个计时器按等级速度调用）
  step() {
    if (!this.move(0, 1)) {
      this.lock();
    }
  }
}

module.exports = { Tetris, PIECES, COLORS };
