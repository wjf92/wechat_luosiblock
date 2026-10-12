// pages/game/game.js
const { Tetris, PIECES, COLORS } = require('../../utils/tetris.js');

Page({
  data: {
    score: 0,
    lines: 0,
    level: 1,
    paused: false,
    gameOver: false,
    highScore: 0,
    canvasW: 0,
    canvasH: 0,
    nextW: 0,
    nextH: 0
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    // 单元格尺寸：在屏幕宽度内自适应，10 列
    const cell = Math.floor((sys.windowWidth - 70) / 10);
    this.cellSize = cell;
    this.canvasW = cell * 10;
    this.canvasH = cell * 20;
    this.nextW = cell * 4;
    this.nextH = cell * 4;
    this.setData({
      canvasW: this.canvasW,
      canvasH: this.canvasH,
      nextW: this.nextW,
      nextH: this.nextH,
      highScore: wx.getStorageSync('tetris_high_score') || 0
    });
  },

  onReady() {
    this.initCanvas();
  },

  onHide() {
    if (this.running && !this.data.gameOver) this.onPause();
  },

  onUnload() {
    this.running = false;
    if (this.rafId && this.canvas) this.canvas.cancelAnimationFrame(this.rafId);
  },

  initCanvas() {
    wx.createSelectorQuery()
      .select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = this.canvasW * dpr;
        canvas.height = this.canvasH * dpr;
        ctx.scale(dpr, dpr);
        this.canvas = canvas;
        this.ctx = ctx;

        wx.createSelectorQuery()
          .select('#nextCanvas')
          .fields({ node: true, size: true })
          .exec((res2) => {
            if (!res2[0]) return;
            const ncanvas = res2[0].node;
            const nctx = ncanvas.getContext('2d');
            ncanvas.width = this.nextW * dpr;
            ncanvas.height = this.nextH * dpr;
            nctx.scale(dpr, dpr);
            this.nextCanvas = ncanvas;
            this.nextCtx = nctx;
            this.startGame();
          });
      });
  },

  startGame() {
    this.tetris = new Tetris(10, 20);
    this.running = true;
    this.paused = false;
    this.lastTime = null;
    this.updateDropInterval();
    this.setData({ score: 0, lines: 0, level: 1, gameOver: false, paused: false });
    this.loop();
  },

  updateDropInterval() {
    // 等级越高下落越快，最快 120ms
    this.dropInterval = Math.max(120, 800 - (this.tetris.level - 1) * 70);
  },

  loop(timestamp) {
    if (!this.running) return;
    const now = timestamp || 0;
    if (this.paused) {
      this.rafId = this.canvas.requestAnimationFrame(this.loop.bind(this));
      return;
    }
    if (this.lastTime === null) {
      this.lastTime = now;
    } else if (now - this.lastTime > this.dropInterval) {
      this.tetris.step();
      this.lastTime = now;
      if (this.tetris.gameOver) {
        this.endGame();
        return;
      }
      this.syncData();
    }
    this.render();
    this.renderNext();
    this.rafId = this.canvas.requestAnimationFrame(this.loop.bind(this));
  },

  syncData() {
    this.updateDropInterval();
    this.setData({
      score: this.tetris.score,
      lines: this.tetris.lines,
      level: this.tetris.level
    });
  },

  endGame() {
    this.running = false;
    this.setData({ gameOver: true });
    // 更新最高分
    let hs = wx.getStorageSync('tetris_high_score') || 0;
    if (this.tetris.score > hs) {
      hs = this.tetris.score;
      wx.setStorageSync('tetris_high_score', hs);
    }
    this.setData({ highScore: hs });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'heavy' });
  },

  // ---------- 渲染 ----------
  drawCell(ctx, x, y, size, color, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);
    // 顶部高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x * size, y * size, size, size * 0.18);
    // 底部阴影
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x * size, y * size + size * 0.82, size, size * 0.18);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
  },

  // 落地提示块：中性浅灰、扁平无高光，明显区别于真实彩色块
  drawGhost(ctx, x, y, size) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8a8aa0';
    ctx.fillRect(x * size, y * size, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
  },

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cell = this.cellSize;
    const t = this.tetris;
    // 背景
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    // 网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= t.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cell, 0);
      ctx.lineTo(c * cell, this.canvasH);
      ctx.stroke();
    }
    for (let r = 0; r <= t.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cell);
      ctx.lineTo(this.canvasW, r * cell);
      ctx.stroke();
    }
    // 已固定方块
    for (let r = 0; r < t.rows; r++) {
      for (let c = 0; c < t.cols; c++) {
        if (t.board[r][c]) this.drawCell(ctx, c, r, cell, t.board[r][c]);
      }
    }
    if (!t.gameOver && t.current) {
      // 幽灵落点
      const gy = t.getGhostY();
      const m = t.current.matrix;
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c]) {
            const y = gy + r;
            const x = t.current.x + c;
            if (y >= 0) this.drawGhost(ctx, x, y, cell);
          }
        }
      }
      // 当前方块
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c]) {
            const y = t.current.y + r;
            const x = t.current.x + c;
            if (y >= 0) this.drawCell(ctx, x, y, cell, COLORS[t.current.type]);
          }
        }
      }
    }
  },

  renderNext() {
    if (!this.nextCtx) return;
    const ctx = this.nextCtx;
    const cell = this.cellSize;
    ctx.clearRect(0, 0, this.nextW, this.nextH);
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, 0, this.nextW, this.nextH);
    const type = this.tetris.nextType;
    const matrix = PIECES[type];
    const color = COLORS[type];
    const size = cell * 0.8;
    const offsetX = (this.nextW - matrix[0].length * size) / 2;
    const offsetY = (this.nextH - matrix.length * size) / 2;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const x = (offsetX + c * size) / 1;
          const y = (offsetY + r * size) / 1;
          ctx.fillStyle = color;
          ctx.fillRect(x, y, size, size);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(x, y, size, size * 0.18);
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(x, y + size * 0.82, size, size * 0.18);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        }
      }
    }
  },

  // ---------- 控制 ----------
  canOperate() {
    return this.running && !this.paused && !this.data.gameOver;
  },

  onLeft() {
    if (!this.canOperate()) return;
    this.tetris.move(-1, 0);
    this.render();
  },

  onRight() {
    if (!this.canOperate()) return;
    this.tetris.move(1, 0);
    this.render();
  },

  onRotate() {
    if (!this.canOperate()) return;
    this.tetris.rotate();
    this.render();
  },

  onDown() {
    if (!this.canOperate()) return;
    this.tetris.softDrop();
    this.lastTime = null;
    this.syncData();
    this.render();
    if (this.tetris.gameOver) this.endGame();
  },

  onDrop() {
    if (!this.canOperate()) return;
    this.tetris.hardDrop();
    this.lastTime = null;
    this.syncData();
    this.render();
    if (this.tetris.gameOver) this.endGame();
  },

  onPause() {
    if (this.data.gameOver || !this.running) return;
    this.paused = !this.paused;
    if (!this.paused) this.lastTime = null; // 恢复时避免瞬间下落
    this.setData({ paused: this.paused });
  },

  onRestart() {
    if (this.rafId && this.canvas) this.canvas.cancelAnimationFrame(this.rafId);
    this.startGame();
  },

  // ---------- 滑动手势 ----------
  onTouchStart(e) {
    const t = e.touches[0];
    this.touchX = t.clientX;
    this.touchY = t.clientY;
  },

  onTouchEnd(e) {
    if (!this.canOperate()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchX;
    const dy = t.clientY - this.touchY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 20 && absY < 20) {
      this.onRotate(); // 轻点旋转
      return;
    }
    if (absX > absY) {
      if (dx > 0) this.onRight();
      else this.onLeft();
    } else if (dy > 0) {
      this.onDrop(); // 下滑硬降
    }
  }
});
