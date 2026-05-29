window.Snake = (function() {
  let interval = null, direction = 'right', nextDirection = 'right';
  let segments = [], food = null, score = 0, particles = [], foodPulse = 0;
  const cols = 22, rows = 22;
  let canvas = null, ctx = null, speed = 110;
  let bestScore = 0;
  const BEST_KEY = 'snake_best_score';

  function initCanvas() {
    if (canvas) return;
    canvas = document.getElementById('snake-canvas');
    ctx = canvas.getContext('2d');
  }

  function start() {
    initCanvas();
    reset();
    clearInterval(interval);
    speed = 110;
    interval = setInterval(stepSnake, speed);
    document.getElementById('snake-status').style.display = 'flex';
  }

  function reset() {
    initCanvas();
    clearInterval(interval);
    direction = 'right';
    nextDirection = 'right';
    segments = [
      { x: 10, y: 11 },
      { x: 9, y: 11 },
      { x: 8, y: 11 }
    ];
    score = 0;
    particles = [];
    spawnFood();
    render();
    document.getElementById('snake-score').innerText = '🐍 得分: 0';
    document.getElementById('snake-best').innerText = '🏆 最高: ' + (bestScore || '--');
    document.getElementById('snake-status').style.display = 'flex';
  }

  function spawnFood() {
    var pos;
    do {
      pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (segments.some(function(seg) { return seg.x === pos.x && seg.y === pos.y; }));
    food = pos;
  }

  function stepSnake() {
    direction = nextDirection;
    var head = segments[0];
    var delta = { left: {x:-1,y:0}, right: {x:1,y:0}, up: {x:0,y:-1}, down: {x:0,y:1} }[direction] || {x:0,y:0};
    var next = { x: head.x + delta.x, y: head.y + delta.y };
    var hitWall = next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows;
    var hitSelf = segments.some(function(seg) { return seg.x === next.x && seg.y === next.y; });
    if (hitWall || hitSelf) {
      clearInterval(interval);
      // death particles
      for (var i = 0; i < segments.length; i++) {
        var seg = segments[i];
        for (var j = 0; j < 3; j++) {
          particles.push({ x: (seg.x + 0.5) * (canvas.width / cols), y: (seg.y + 0.5) * (canvas.height / rows), vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 1, color: 'hsl(' + (140 - i * 3) + ',70%,50%)' });
        }
      }
      render();
      saveBest();
      showToast('贪吃蛇结束，得分 ' + score);
      return;
    }
    segments.unshift(next);
    if (next.x === food.x && next.y === food.y) {
      score += 10;
      // eat particles
      var fx = (food.x + 0.5) * (canvas.width / cols);
      var fy = (food.y + 0.5) * (canvas.height / rows);
      for (var k = 0; k < 8; k++) {
        particles.push({ x: fx, y: fy, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 1, color: '#facc15' });
      }
      // score pop
      showScorePop(fx, fy);
      spawnFood();
      // speed up every 50 points
      if (score % 50 === 0 && speed > 50) {
        speed -= 8;
        clearInterval(interval);
        interval = setInterval(stepSnake, speed);
      }
    } else {
      segments.pop();
    }
    // decay particles
    particles = particles.filter(function(p) { p.life -= 0.04; return p.life > 0; });
    document.getElementById('snake-score').innerText = '🐍 得分: ' + score;
    render();
  }

  function showScorePop(x, y) {
    var wrap = document.getElementById('snake-canvas-wrap');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'snake-score-pop';
    el.innerText = '+10';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    wrap.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.remove(); }, 700);
  }

  function render() {
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    var cell = w / cols;

    // background with subtle grid
    ctx.fillStyle = '#080d13';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(26, 42, 58, 0.6)';
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= cols; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke();
    }
    for (var j = 0; j <= rows; j++) {
      ctx.beginPath(); ctx.moveTo(0, j * cell); ctx.lineTo(w, j * cell); ctx.stroke();
    }

    // border wall glow
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

    // draw snake segments with gradient
    var len = segments.length;
    for (var s = len - 1; s >= 0; s--) {
      var seg = segments[s];
      var ratio = s / Math.max(len - 1, 1);
      var r = Math.round(16 + ratio * 30);
      var g = Math.round(185 - ratio * 100);
      var b = Math.round(129 - ratio * 70);
      var alpha = 1 - ratio * 0.3;
      var pad = s === 0 ? 1 : 2;
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.shadowColor = s === 0 ? 'rgba(16,185,129,0.6)' : 'transparent';
      ctx.shadowBlur = s === 0 ? 8 : 0;
      Utils.roundRect(ctx, seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, s === 0 ? 6 : 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // eyes on head
    var head = segments[0];
    var hx = head.x * cell, hy = head.y * cell;
    var eyeR = cell * 0.15;
    var dirMap = { right: [0.65, 0.3, 0.65, 0.7], left: [0.35, 0.3, 0.35, 0.7], up: [0.3, 0.35, 0.7, 0.35], down: [0.3, 0.65, 0.7, 0.65] };
    var ep = dirMap[direction] || dirMap['right'];
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(hx + cell * ep[0], hy + cell * ep[1], eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + cell * ep[2], hy + cell * ep[3], eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(hx + cell * ep[0], hy + cell * ep[1], eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + cell * ep[2], hy + cell * ep[3], eyeR * 0.55, 0, Math.PI * 2); ctx.fill();

    // food with pulse glow
    if (food) {
      foodPulse += 0.08;
      var glow = Math.sin(foodPulse) * 0.4 + 0.6;
      var fcx = (food.x + 0.5) * cell;
      var fcy = (food.y + 0.5) * cell;
      var fr = cell * 0.38;
      ctx.shadowColor = 'rgba(250,204,21,' + glow + ')';
      ctx.shadowBlur = 10 + glow * 6;
      var grad = ctx.createRadialGradient(fcx, fcy, fr * 0.2, fcx, fcy, fr);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.6, '#facc15');
      grad.addColorStop(1, '#eab308');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(fcx, fcy, fr, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // particles
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.fillStyle = pt.color.replace(')', ',' + pt.life + ')').replace('hsl', 'hsla');
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 3 * pt.life, 0, Math.PI * 2); ctx.fill();
    }
  }

  function saveBest() {
    if (score > bestScore) {
      bestScore = score;
      Storage.syncSetItem(BEST_KEY, String(bestScore));
      updateBestUI();
      showToast('已保存贪吃蛇本地最高分：' + bestScore);
      App.celebratePB('snake-best');
      if (typeof entertainmentMode !== 'undefined' && entertainmentMode === 'snake') LB.fetchEntertainment('snake');
    }
  }

  function updateBestUI() {
    var el = document.getElementById('snake-best');
    if (el) el.innerText = '🏆 最高: ' + (bestScore || '--');
  }

  function changeDir(dir) {
    const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (opposites[dir] !== direction) {
      nextDirection = dir;
    }
  }

  return {
    start: start,
    reset: reset,
    changeDir: changeDir,
    get interval() { return interval; },
    set interval(v) { interval = v; },
    get bestScore() { return bestScore; },
    set bestScore(v) { bestScore = v; },
    get score() { return score; },
    initCanvas: initCanvas,
    updateBestUI: updateBestUI
  };
})();
