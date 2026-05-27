// ============ Entertainment Module ============
// Mini-game switcher and keyboard/touch routing

window.Entertainment = (function() {
  let mode = 'snake';
  let touchStartX = 0;
  let touchStartY = 0;

  function selectGame(game) {
    mode = game;
    document.querySelectorAll('.mini-game-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.game === game);
    });
    document.getElementById('snake-panel').style.display = game === 'snake' ? 'block' : 'none';
    document.getElementById('game2048-panel').style.display = game === '2048' ? 'block' : 'none';
    document.getElementById('minesweeper-panel').style.display = game === 'minesweeper' ? 'block' : 'none';
    document.getElementById('breakout-panel').style.display = game === 'breakout' ? 'block' : 'none';
    var infoMap = {
      snake: '休闲模式。方向键/WSAD控制贪吃蛇，吃到食物变长变快。',
      '2048': '休闲模式。方向键/WSAD合并数字方块，目标是2048！',
      minesweeper: '经典扫雷。左键翻开，右键/长按插旗，双击数字快速翻开周围。',
      breakout: '经典打砖块。鼠标/触屏移动挡板，反弹小球击碎所有砖块。'
    };
    document.getElementById('entertainment-info').innerText = infoMap[game] || '';
    // Reset game-specific state
    clearInterval(Snake.interval);
    clearInterval(MS.timerInterval);
    if (Breakout.animFrame) cancelAnimationFrame(Breakout.animFrame);
    Breakout.playing = false;
    if (game === 'snake') {
      Snake.reset();
    } else if (game === '2048') {
      if (Tile2048.isGridEmpty()) { Tile2048.start(); } else { Tile2048.render(); }
    } else if (game === 'minesweeper') {
      MS.init();
    } else if (game === 'breakout') {
      Breakout.initCanvas();
      if (Breakout.bricks.length === 0) Breakout.reset();
      else Breakout.drawIdle();
    }
    LB.fetchEntertainment(game);
  }

  function loadGameData() {
    Snake.bestScore = parseInt(localStorage.getItem('snake_best_score') || '0', 10) || 0;
    Tile2048.bestScore = parseInt(localStorage.getItem('2048_best_score') || '0', 10) || 0;
    MS.bests = JSON.parse(localStorage.getItem('minesweeper_bests') || '{}');
    Breakout.bestScore = parseInt(localStorage.getItem('breakout_best_score') || '0', 10) || 0;
    SpeedTest.best = parseFloat(localStorage.getItem('speedtest_best_cps') || '0') || 0;
    Snake.updateBestUI();
    MS.updateBestUI();
    SpeedTest.updateUI();
    SpeedTest.renderRecords();
    Tile2048.loadSaved();
  }

  function attachTouch() {
    var snakeEl = document.getElementById('snake-canvas');
    var tileEl = document.getElementById('grid-2048');
    var bkEl = document.getElementById('breakout-canvas');
    if (snakeEl) {
      snakeEl.addEventListener('touchstart', handleTouchStart, { passive: true });
      snakeEl.addEventListener('touchend', function(e) { handleTouchEnd(e, 'snake'); }, { passive: true });
    }
    if (tileEl) {
      tileEl.addEventListener('touchstart', handleTouchStart, { passive: true });
      tileEl.addEventListener('touchend', function(e) { handleTouchEnd(e, '2048'); }, { passive: true });
    }
    if (bkEl) {
      // Breakout uses touchmove on canvas directly (registered in initBreakoutCanvas)
    }
  }

  function handleTouchStart(event) {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(event, gameMode) {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    const direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    if (gameMode === 'snake') Snake.changeDir(direction);
    else Tile2048.move(direction);
  }

  function handleKey(code) {
    if (mode === 'snake') {
      var valid = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
      var next = valid[code];
      if (next) Snake.changeDir(next);
    } else if (mode === '2048') {
      var mapping = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
      var dir = mapping[code];
      if (dir) Tile2048.move(dir);
    } else if (mode === 'minesweeper') {
      // Keyboard flag: press F to toggle flag mode, then arrow keys to move
      // Simplified: just use mouse for minesweeper
    } else if (mode === 'breakout') {
      if (code === 'Space' || code === 'Spacebar') {
        if (!Breakout.playing && Breakout.lives > 0 && mode === 'breakout') { Breakout.start(); }
      }
    }
  }

  return {
    selectGame: selectGame,
    loadGameData: loadGameData,
    attachTouch: attachTouch,
    handleKey: handleKey,
    get mode() { return mode; }
  };
})();
