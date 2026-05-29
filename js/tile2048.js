window.Tile2048 = (function() {
  // ---- 2048 State ----
  var grid2048 = [];
  var score2048 = 0;
  var lastAdded2048Tile = null;
  var merged2048Tiles = [];
  var prevGrid2048 = null;
  var best2048Score = 0;
  var GAME_2048_BEST_KEY = '2048_best_score';
  var GAME_2048_STATE_KEY = '2048_state';

  // ---- Internal helpers ----
  function update2048BestUI() {
    var el = document.getElementById('tile-best');
    if (el) el.innerText = '🏆 最高: ' + (best2048Score || '--');
  }

  function add2048Tile() {
    var empties = [];
    grid2048.forEach(function(row, r) {
      row.forEach(function(val, c) {
        if (val === 0) empties.push({ r: r, c: c });
      });
    });
    if (!empties.length) return;
    var choice = empties[Math.floor(Math.random() * empties.length)];
    grid2048[choice.r][choice.c] = Math.random() < 0.9 ? 2 : 4;
    lastAdded2048Tile = choice;
  }

  function slideRow(row, rowIdx) {
    var arr = row.filter(function(v) { return v !== 0; });
    var merged = [];
    for (var i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score2048 += arr[i];
        merged.push(i);
        arr[i + 1] = 0;
        i++;
      }
    }
    var result = arr.filter(function(v) { return v !== 0; });
    while (result.length < 4) result.push(0);
    return { result: result, merged: merged };
  }

  function transpose(matrix) {
    return matrix[0].map(function(_, i) { return matrix.map(function(row) { return row[i]; }); });
  }

  function check2048Win() {
    return grid2048.some(function(row) { return row.some(function(val) { return val >= 2048; }); });
  }

  function checkGameOver2048() {
    if (grid2048.some(function(row) { return row.includes(0); })) return false;
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var val = grid2048[r][c];
        if ((c < 3 && val === grid2048[r][c + 1]) || (r < 3 && val === grid2048[r + 1][c])) return false;
      }
    }
    return true;
  }

  function save2048Best() {
    if (score2048 > best2048Score) {
      best2048Score = score2048;
      Storage.syncSetItem(GAME_2048_BEST_KEY, String(best2048Score));
      update2048BestUI();
      showToast('已保存2048本地最高分：' + best2048Score);
      App.celebratePB('tile-best');
      if (entertainmentMode === '2048') LB.fetchEntertainment('2048');
    }
  }

  function save2048State() {
    var state = { grid: grid2048, score: score2048, lastAdded: lastAdded2048Tile };
    localStorage.setItem(GAME_2048_STATE_KEY, JSON.stringify(state));
  }

  // ---- Public API ----
  function start() {
    grid2048 = Array.from({ length: 4 }, function() { return Array(4).fill(0); });
    score2048 = 0;
    lastAdded2048Tile = null;
    merged2048Tiles = [];
    prevGrid2048 = null;
    add2048Tile();
    add2048Tile();
    render();
    document.getElementById('tile-score').innerText = '🔢 得分: 0';
    document.getElementById('tile-best').innerText = '🏆 最高: ' + (best2048Score || '--');
    document.getElementById('tile-status').style.display = 'flex';
    update2048BestUI();
    save2048State();
  }

  function reset() {
    start();
  }

  function render() {
    var container = document.getElementById('grid-2048');
    container.innerHTML = '';
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var val = grid2048[r][c];
        var cell = document.createElement('div');
        var tileClass = 'tile-cell tile-' + (val > 2048 ? '4096' : val);
        cell.className = tileClass;
        var isNew = lastAdded2048Tile && lastAdded2048Tile.r === r && lastAdded2048Tile.c === c;
        var isMerged = merged2048Tiles && merged2048Tiles.some(function(m) { return m.r === r && m.c === c; });
        if (val) cell.innerText = val;
        container.appendChild(cell);

        // GSAP animations replace CSS pop/merged keyframes
        if (isNew) {
          gsap.fromTo(cell, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'back.out(1.7)' });
        }
        if (isMerged) {
          gsap.fromTo(cell, { scale: 0.6 }, { scale: 1, duration: 0.28, ease: 'elastic.out(1, 0.45)' });
        }
      }
    }
    var scoreEl = document.getElementById('tile-score');
    scoreEl.innerText = '🔢 得分: ' + score2048;
    lastAdded2048Tile = null;
    merged2048Tiles = [];
  }

  function move(direction) {
    prevGrid2048 = grid2048.map(function(row) { return row.slice(); });
    var before = JSON.stringify(grid2048);
    var mergeData = [];
    if (direction === 'left') {
      for (var r = 0; r < 4; r++) {
        var res = slideRow(grid2048[r], r);
        grid2048[r] = res.result;
        for (var m = 0; m < res.merged.length; m++) { mergeData.push({ r: r, c: res.merged[m] }); }
      }
    } else if (direction === 'right') {
      for (var r = 0; r < 4; r++) {
        var rev = grid2048[r].slice().reverse();
        var res = slideRow(rev, r);
        grid2048[r] = res.result.reverse();
        for (var m = 0; m < res.merged.length; m++) { mergeData.push({ r: r, c: 3 - res.merged[m] }); }
      }
    } else if (direction === 'up') {
      var t = transpose(grid2048);
      for (var c = 0; c < 4; c++) {
        var res = slideRow(t[c], c);
        t[c] = res.result;
        for (var m = 0; m < res.merged.length; m++) { mergeData.push({ r: res.merged[m], c: c }); }
      }
      grid2048 = transpose(t);
    } else if (direction === 'down') {
      var t = transpose(grid2048);
      for (var c = 0; c < 4; c++) {
        var rev = t[c].slice().reverse();
        var res = slideRow(rev, c);
        t[c] = res.result.reverse();
        for (var m = 0; m < res.merged.length; m++) { mergeData.push({ r: 3 - res.merged[m], c: c }); }
      }
      grid2048 = transpose(t);
    }
    if (JSON.stringify(grid2048) !== before) {
      merged2048Tiles = mergeData;
      add2048Tile();
      render();
      save2048Best();
      save2048State();
      var scoreEl = document.getElementById('tile-score');
      scoreEl.classList.remove('score-bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-bump');
      if (check2048Win()) showToast('你已达到 2048！继续挑战更高分！');
      if (checkGameOver2048()) showToast('2048 已结束，按新游戏再来一局。');
    }
  }

  function loadSaved() {
    var raw = localStorage.getItem(GAME_2048_STATE_KEY);
    if (!raw) return;
    try {
      var state = JSON.parse(raw);
      if (Array.isArray(state.grid) && state.grid.length === 4) {
        grid2048 = state.grid;
        score2048 = state.score || 0;
        lastAdded2048Tile = state.lastAdded || null;
        render();
        document.getElementById('tile-status').style.display = 'flex';
        document.getElementById('tile-score').innerText = '得分: ' + score2048;
        update2048BestUI();
      }
    } catch (e) {
      console.warn('加载2048本地状态失败', e);
    }
  }

  function isGridEmpty() {
    return grid2048.length === 0;
  }

  return {
    start: start,
    move: move,
    reset: reset,
    render: render,
    loadSaved: loadSaved,
    isGridEmpty: isGridEmpty,
    get bestScore() { return best2048Score; },
    set bestScore(v) { best2048Score = v; update2048BestUI(); }
  };
})();
