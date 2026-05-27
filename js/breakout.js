window.Breakout = (function() {
  // ============ 打砖块状态 ============
  let bkPaddleX = 280, bkPaddleW = 100, bkPaddleH = 12;
  let bkBallX = 310, bkBallY = 350, bkBallDX = 3, bkBallDY = -3, bkBallR = 7;
  let bkBricks = [], bkScore = 0, bkLives = 3, bkLevel = 1;
  let bkPlaying = false, bkParticles = [];
  let bkAnimFrame = null;
  let bkCanvas = null, bkCtx = null;
  let bkPowerUp = null; // {type, x, y, dy}
  let bestBreakoutScore = 0;
  const BREAKOUT_BEST_KEY = 'breakout_best_score';

  // ============ 内部函数 ============

  function resetBreakoutBall() {
    bkBallX = bkPaddleX + bkPaddleW / 2;
    bkBallY = (bkCanvas ? bkCanvas.height : 420) - 40;
    // Random horizontal angle within ±35 degrees from vertical
    var angle = (Math.random() - 0.5) * 1.0; // ~ ±28 degrees
    var targetSpd = 3.2 + bkLevel * 0.15;
    bkBallDX = Math.sin(angle) * targetSpd;
    bkBallDY = -Math.cos(angle) * targetSpd;
  }

  function buildBreakoutBricks() {
    bkBricks = [];
    var rows = 5 + Math.min(bkLevel, 3);
    var cols = 10;
    var bw = bkCanvas.width / cols;
    var bh = 22;
    var colors = ['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ef4444'];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        bkBricks.push({
          x: c * bw + 2, y: r * bh + 40,
          w: bw - 4, h: bh - 3,
          color: colors[r % colors.length],
          hits: 1 + Math.floor(r / 3)
        });
      }
    }
  }

  function spawnBreakoutDeathParticles() {
    for (var i = 0; i < 20; i++) {
      bkParticles.push({ x: bkBallX, y: bkBallY, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 1, color: '#ef4444' });
    }
  }

  function saveBreakoutBest() {
    if (bkScore > bestBreakoutScore) {
      bestBreakoutScore = bkScore;
      Storage.syncSetItem(BREAKOUT_BEST_KEY, String(bestBreakoutScore));
      showToast('新纪录！打砖块最高分：' + bestBreakoutScore);
      LB.fetchEntertainment('breakout');
    }
  }

  function endBreakout() {
    bkPlaying = false;
    if (bkAnimFrame) cancelAnimationFrame(bkAnimFrame);
    saveBreakoutBest();
    drawBreakout();
    updateBreakoutUI();
  }

  function updateBreakout() {
    if (!bkPlaying) return;
    // Move ball
    bkBallX += bkBallDX;
    bkBallY += bkBallDY;
    // Wall bounces
    if (bkBallX - bkBallR <= 0) { bkBallX = bkBallR; bkBallDX = Math.abs(bkBallDX); }
    if (bkBallX + bkBallR >= bkCanvas.width) { bkBallX = bkCanvas.width - bkBallR; bkBallDX = -Math.abs(bkBallDX); }
    if (bkBallY - bkBallR <= 0) { bkBallY = bkBallR; bkBallDY = Math.abs(bkBallDY); }
    // Bottom / paddle
    if (bkBallY + bkBallR >= bkCanvas.height - 20) {
      if (bkBallX > bkPaddleX - bkBallR && bkBallX < bkPaddleX + bkPaddleW + bkBallR) {
        // Hit paddle - angle depends on where it hits
        var hitPos = (bkBallX - bkPaddleX) / bkPaddleW;
        var angle = (hitPos - 0.5) * Math.PI * 0.7;
        var spd = Math.sqrt(bkBallDX * bkBallDX + bkBallDY * bkBallDY);
        bkBallDX = Math.sin(angle) * spd;
        bkBallDY = -Math.cos(angle) * spd;
        bkBallY = bkCanvas.height - 20 - bkBallR;
        // Paddle hit particles
        for (var i = 0; i < 4; i++) {
          bkParticles.push({ x: bkBallX, y: bkBallY, vx: (Math.random()-0.5)*2, vy: -Math.random()*3, life: 0.6, color: '#f8fafc' });
        }
      } else {
        // Lose life
        bkLives--;
        spawnBreakoutDeathParticles();
        updateBreakoutUI();
        if (bkLives <= 0) {
          endBreakout();
          return;
        }
        bkPlaying = false;
        resetBreakoutBall();
        updateBreakoutUI();
        drawBreakout();
        // Auto-restart after delay
        setTimeout(function() {
          if (entertainmentMode !== 'breakout') return;
          bkPlaying = true;
          breakOutLoop();
        }, 1000);
        return;
      }
    }
    // Brick collision
    for (var i = bkBricks.length - 1; i >= 0; i--) {
      var br = bkBricks[i];
      if (bkBallX + bkBallR > br.x && bkBallX - bkBallR < br.x + br.w &&
          bkBallY + bkBallR > br.y && bkBallY - bkBallR < br.y + br.h) {
        // Determine which side was hit
        var overlapX = Math.min(bkBallX + bkBallR - br.x, br.x + br.w - bkBallX + bkBallR);
        var overlapY = Math.min(bkBallY + bkBallR - br.y, br.y + br.h - bkBallY + bkBallR);
        if (overlapX < overlapY) bkBallDX = -bkBallDX;
        else bkBallDY = -bkBallDY;
        br.hits--;
        bkScore += 10 * bkLevel;
        // Brick break particles
        for (var j = 0; j < 5; j++) {
          bkParticles.push({ x: br.x + br.w/2, y: br.y + br.h/2, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 0.8, color: br.color });
        }
        if (br.hits <= 0) {
          // Chance to spawn power-up
          if (Math.random() < 0.12 && !bkPowerUp) {
            bkPowerUp = { type: Math.random() < 0.5 ? 'wide' : 'slow', x: br.x + br.w/2, y: br.y + br.h/2, dy: 1.5 };
          }
          bkBricks.splice(i, 1);
        }
        updateBreakoutUI();
        break; // Only one collision per frame
      }
    }
    // Power-up fall
    if (bkPowerUp) {
      bkPowerUp.y += bkPowerUp.dy;
      if (bkPowerUp.y > bkCanvas.height - 20 && bkPowerUp.x > bkPaddleX && bkPowerUp.x < bkPaddleX + bkPaddleW) {
        // Caught!
        if (bkPowerUp.type === 'wide') {
          bkPaddleW = Math.min(180, bkPaddleW + 30);
          setTimeout(function() { bkPaddleW = Math.max(80, bkPaddleW - 30); }, 10000);
        } else if (bkPowerUp.type === 'slow') {
          var sp = Math.sqrt(bkBallDX*bkBallDX+bkBallDY*bkBallDY);
          var factor = 0.6;
          bkBallDX *= factor; bkBallDY *= factor;
        }
        showToast(bkPowerUp.type === 'wide' ? '挡板加宽！' : '球速减缓！');
        bkPowerUp = null;
      } else if (bkPowerUp.y > bkCanvas.height) {
        bkPowerUp = null;
      }
    }
    // Decay particles
    bkParticles = bkParticles.filter(function(p) { p.life -= 0.03; return p.life > 0; });
    // Level complete?
    if (bkBricks.length === 0) {
      bkLevel++;
      bkPaddleW = Math.max(80, bkPaddleW - 5);
      buildBreakoutBricks();
      resetBreakoutBall();
      updateBreakoutUI();
      showToast('第 ' + bkLevel + ' 关！');
    }
  }

  function breakOutLoop() {
    if (!bkPlaying) return;
    bkAnimFrame = requestAnimationFrame(breakOutLoop);
    updateBreakout();
    drawBreakout();
  }

  function drawBreakout() {
    if (!bkCtx) return;
    var w = bkCanvas.width, h = bkCanvas.height;
    bkCtx.fillStyle = '#080d13';
    bkCtx.fillRect(0, 0, w, h);
    // Draw bricks
    for (var i = 0; i < bkBricks.length; i++) {
      var br = bkBricks[i];
      var grad = bkCtx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
      grad.addColorStop(0, br.color);
      grad.addColorStop(1, 'rgba(0,0,0,0.3)');
      bkCtx.fillStyle = grad;
      bkCtx.shadowColor = br.color;
      bkCtx.shadowBlur = 3;
      Utils.roundRect(bkCtx, br.x, br.y, br.w, br.h, 3);
      bkCtx.fill();
      bkCtx.shadowBlur = 0;
      // highlight
      bkCtx.fillStyle = 'rgba(255,255,255,0.25)';
      bkCtx.fillRect(br.x + 2, br.y + 1, br.w - 4, br.h * 0.4);
    }
    // Draw paddle
    var pGrad = bkCtx.createLinearGradient(bkPaddleX, h - 28, bkPaddleX, h - 28 + bkPaddleH);
    pGrad.addColorStop(0, '#e2e8f0');
    pGrad.addColorStop(1, '#94a3b8');
    bkCtx.fillStyle = pGrad;
    bkCtx.shadowColor = 'rgba(148,163,184,0.5)';
    bkCtx.shadowBlur = 10;
    Utils.roundRect(bkCtx, bkPaddleX, h - 28, bkPaddleW, bkPaddleH, 6);
    bkCtx.fill();
    bkCtx.shadowBlur = 0;
    // Draw ball
    var bGrad = bkCtx.createRadialGradient(bkBallX - 2, bkBallY - 2, 0, bkBallX, bkBallY, bkBallR);
    bGrad.addColorStop(0, '#fff');
    bGrad.addColorStop(1, '#e2e8f0');
    bkCtx.fillStyle = bGrad;
    bkCtx.shadowColor = 'rgba(248,250,252,0.4)';
    bkCtx.shadowBlur = 8;
    bkCtx.beginPath();
    bkCtx.arc(bkBallX, bkBallY, bkBallR, 0, Math.PI * 2);
    bkCtx.fill();
    bkCtx.shadowBlur = 0;
    // Power-up
    if (bkPowerUp) {
      bkCtx.fillStyle = bkPowerUp.type === 'wide' ? '#22c55e' : '#3b82f6';
      bkCtx.shadowColor = bkPowerUp.type === 'wide' ? '#22c55e' : '#3b82f6';
      bkCtx.shadowBlur = 6;
      bkCtx.beginPath();
      bkCtx.arc(bkPowerUp.x, bkPowerUp.y, 7, 0, Math.PI * 2);
      bkCtx.fill();
      bkCtx.shadowBlur = 0;
      bkCtx.fillStyle = '#fff';
      bkCtx.font = 'bold 9px sans-serif';
      bkCtx.textAlign = 'center';
      bkCtx.fillText(bkPowerUp.type === 'wide' ? 'W' : 'S', bkPowerUp.x, bkPowerUp.y + 3);
    }
    // Particles
    for (var i = 0; i < bkParticles.length; i++) {
      var p = bkParticles[i];
      bkCtx.fillStyle = p.color.replace(')', ',' + p.life + ')').replace('rgb', 'rgba');
      if (p.color.startsWith('#')) {
        bkCtx.globalAlpha = p.life;
        bkCtx.fillStyle = p.color;
      }
      bkCtx.beginPath();
      bkCtx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
      bkCtx.fill();
    }
    bkCtx.globalAlpha = 1;
    if (!bkPlaying && bkLives <= 0) {
      bkCtx.fillStyle = 'rgba(8, 13, 19, 0.85)';
      bkCtx.fillRect(0, 0, w, h);
      bkCtx.fillStyle = '#f0a500';
      bkCtx.font = 'bold 28px "Rajdhani", sans-serif';
      bkCtx.textAlign = 'center';
      bkCtx.fillText('MISSION FAILED', w / 2, h / 2 - 10);
      bkCtx.fillStyle = '#dce3ea';
      bkCtx.font = '14px "Share Tech Mono", monospace';
      bkCtx.fillText('SCORE: ' + bkScore + ' | PRESS RESET TO REDEPLOY', w / 2, h / 2 + 30);
    }
  }

  function updateBreakoutUI() {
    var scoreEl = document.getElementById('bk-score');
    var livesEl = document.getElementById('bk-lives');
    var levelEl = document.getElementById('bk-level');
    if (scoreEl) scoreEl.innerText = bkScore;
    if (livesEl) {
      var hearts = '';
      for (var i = 0; i < bkLives; i++) hearts += '❤️';
      for (var i = bkLives; i < 3; i++) hearts += '🖤';
      livesEl.innerText = hearts || '💀';
    }
    if (levelEl) levelEl.innerText = bkLevel;
  }

  // ============ 公开函数 ============

  function initCanvas() {
    if (bkCanvas) return;
    bkCanvas = document.getElementById('breakout-canvas');
    bkCtx = bkCanvas.getContext('2d');
    // Mouse/touch tracking on canvas
    bkCanvas.addEventListener('mousemove', function(e) {
      var rect = bkCanvas.getBoundingClientRect();
      var scaleX = bkCanvas.width / rect.width;
      bkPaddleX = (e.clientX - rect.left) * scaleX - bkPaddleW / 2;
      bkPaddleX = Math.max(0, Math.min(bkCanvas.width - bkPaddleW, bkPaddleX));
    });
    bkCanvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var rect = bkCanvas.getBoundingClientRect();
      var scaleX = bkCanvas.width / rect.width;
      bkPaddleX = (e.touches[0].clientX - rect.left) * scaleX - bkPaddleW / 2;
      bkPaddleX = Math.max(0, Math.min(bkCanvas.width - bkPaddleW, bkPaddleX));
    }, { passive: false });
  }

  function reset() {
    initCanvas();
    if (bkAnimFrame) cancelAnimationFrame(bkAnimFrame);
    bkPlaying = false;
    bkLives = 3;
    bkScore = 0;
    bkLevel = 1;
    bkPaddleX = bkCanvas.width / 2 - 50;
    bkPaddleW = 100;
    bkParticles = [];
    bkPowerUp = null;
    resetBreakoutBall();
    buildBreakoutBricks();
    updateBreakoutUI();
    drawIdle();
  }

  function start() {
    initCanvas();
    if (bkPlaying) return;
    if (bkLives <= 0) { reset(); }
    bkPlaying = true;
    updateBreakoutUI();
    breakOutLoop();
  }

  function drawIdle() {
    if (!bkCtx) return;
    var w = bkCanvas.width, h = bkCanvas.height;
    bkCtx.fillStyle = '#080d13';
    bkCtx.fillRect(0, 0, w, h);
    // Draw bricks
    for (var i = 0; i < bkBricks.length; i++) {
      var br = bkBricks[i];
      bkCtx.fillStyle = br.color;
      bkCtx.fillRect(br.x, br.y, br.w, br.h);
    }
    // Draw paddle
    bkCtx.fillStyle = '#f8fafc';
    Utils.roundRect(bkCtx, bkPaddleX, h - 28, bkPaddleW, bkPaddleH, 6);
    bkCtx.fill();
    // Draw ball
    bkCtx.fillStyle = '#f8fafc';
    bkCtx.beginPath();
    bkCtx.arc(bkBallX, bkBallY, bkBallR, 0, Math.PI * 2);
    bkCtx.fill();
    // Message
    bkCtx.fillStyle = 'rgba(220, 227, 234, 0.5)';
    bkCtx.font = 'bold 16px "Share Tech Mono", monospace';
    bkCtx.textAlign = 'center';
    bkCtx.fillText('[ PRESS START OR SPACE TO DEPLOY ]', w / 2, h / 2 + 40);
  }

  // ============ 公开 API ============

  return {
    initCanvas: initCanvas,
    reset: reset,
    start: start,
    drawIdle: drawIdle,
    get playing() { return bkPlaying; },
    set playing(v) { bkPlaying = v; },
    get bricks() { return bkBricks; },
    get lives() { return bkLives; },
    get bestScore() { return bestBreakoutScore; },
    set bestScore(v) { bestBreakoutScore = v; },
    get animFrame() { return bkAnimFrame; },
    set animFrame(v) { bkAnimFrame = v; }
  };
})();
