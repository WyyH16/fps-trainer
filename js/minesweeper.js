window.MS = (function() {
  // ============ 扫雷状态 ============
  let msRows = 9, msCols = 9, msMines = 10;
  let msGrid = [], msRevealed = [], msFlagged = [];
  let msGameOver = false, msGameStarted = false, msFirstClick = true;
  let msTimerInterval = null, msTimerSec = 0;
  let bestMinesweeper = {};
  const MINESWEEPER_BEST_KEY = 'minesweeper_bests';

  // ============ 内部函数 ============

  function placeMines(safeR, safeC) {
    var placed = 0;
    while (placed < msMines) {
      var r = Math.floor(Math.random() * msRows);
      var c = Math.floor(Math.random() * msCols);
      if (msGrid[r][c] === -1) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      msGrid[r][c] = -1;
      placed++;
    }
    // Calculate numbers
    for (var r = 0; r < msRows; r++) {
      for (var c = 0; c < msCols; c++) {
        if (msGrid[r][c] === -1) continue;
        var count = 0;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            var nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < msRows && nc >= 0 && nc < msCols && msGrid[nr][nc] === -1) count++;
          }
        }
        msGrid[r][c] = count;
      }
    }
  }

  function revealMinesweeperCell(r, c) {
    if (msGameOver || r < 0 || r >= msRows || c < 0 || c >= msCols) return;
    if (msRevealed[r][c] || msFlagged[r][c]) return;
    msRevealed[r][c] = true;
    if (msGrid[r][c] === -1) {
      // BOOM
      msGameOver = true;
      clearInterval(msTimerInterval);
      document.getElementById('ms-smiley').innerText = '💀';
      // Reveal all mines
      for (var rr = 0; rr < msRows; rr++) {
        for (var cc = 0; cc < msCols; cc++) {
          if (msGrid[rr][cc] === -1) msRevealed[rr][cc] = true;
        }
      }
      renderMinesweeperGrid();
      showToast('踩到地雷了！坚持了 ' + msTimerSec + ' 秒');
      return;
    }
    // Flood fill empty cells
    if (msGrid[r][c] === 0) {
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          revealMinesweeperCell(r + dr, c + dc);
        }
      }
    }
    renderMinesweeperGrid();
    checkMinesweeperWin();
  }

  function chordReveal(r, c) {
    if (msGameOver || !msRevealed[r][c] || msGrid[r][c] <= 0) return;
    var flagCount = 0;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < msRows && nc >= 0 && nc < msCols && msFlagged[nr][nc]) flagCount++;
      }
    }
    if (flagCount !== msGrid[r][c]) return;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < msRows && nc >= 0 && nc < msCols && !msFlagged[nr][nc] && !msRevealed[nr][nc]) {
          revealMinesweeperCell(nr, nc);
        }
      }
    }
  }

  function toggleFlag(r, c) {
    if (msGameOver || msRevealed[r][c]) return;
    msFlagged[r][c] = !msFlagged[r][c];
    var flagged = msFlagged.flat().filter(Boolean).length;
    var remaining = msMines - flagged;
    document.getElementById('ms-mine-count').innerText = String(Math.abs(remaining)).padStart(3, '0');
    if (remaining < 0) document.getElementById('ms-mine-count').style.color = '#ef4444';
    else document.getElementById('ms-mine-count').style.color = '#ef4444';
    renderMinesweeperGrid();
  }

  function checkMinesweeperWin() {
    var allRevealed = true;
    for (var r = 0; r < msRows; r++) {
      for (var c = 0; c < msCols; c++) {
        if (msGrid[r][c] !== -1 && !msRevealed[r][c]) { allRevealed = false; break; }
      }
    }
    if (allRevealed) {
      msGameOver = true;
      clearInterval(msTimerInterval);
      document.getElementById('ms-smiley').innerText = '😎';
      // Flag remaining mines
      for (var r = 0; r < msRows; r++) {
        for (var c = 0; c < msCols; c++) {
          if (msGrid[r][c] === -1) msFlagged[r][c] = true;
        }
      }
      document.getElementById('ms-mine-count').innerText = '000';
      renderMinesweeperGrid();
      saveMinesweeperBest();
      showToast('扫雷成功！用时 ' + msTimerSec + ' 秒');
    }
  }

  function saveMinesweeperBest() {
    if (!msGameStarted) return;
    var diffKey = LB.msDiffKey();
    var bests = JSON.parse(localStorage.getItem(MINESWEEPER_BEST_KEY) || '{}');
    var existing = bests[diffKey];
    if (!existing || msTimerSec < parseFloat(existing.time)) {
      bests[diffKey] = { time: String(msTimerSec), date: Utils.formatDateStr(new Date().toISOString()) };
      Storage.syncSetItem(MINESWEEPER_BEST_KEY, JSON.stringify(bests));
      bestMinesweeper = bests;
      showToast('新纪录！扫雷 ' + diffKey + ' ' + msTimerSec + ' 秒');
    }
    updateBestUI();
    LB.fetchEntertainment('minesweeper');
  }

  function renderMinesweeperGrid() {
    var container = document.getElementById('minesweeper-grid');
    container.style.gridTemplateColumns = 'repeat(' + msCols + ', 1fr)';
    container.innerHTML = '';
    for (var r = 0; r < msRows; r++) {
      for (var c = 0; c < msCols; c++) {
        var cell = document.createElement('div');
        cell.className = 'mine-cell';
        if (msRevealed[r][c]) {
          cell.classList.add('revealed');
          if (msGrid[r][c] === -1) {
            cell.classList.add('mine-explode');
            cell.innerText = '💣';
          } else if (msGrid[r][c] > 0) {
            cell.classList.add('mine-n' + msGrid[r][c]);
            cell.innerText = msGrid[r][c];
          }
        } else if (msFlagged[r][c]) {
          cell.classList.add('flagged');
          cell.innerText = '🚩';
        }
        (function(rr, cc) {
          cell.addEventListener('click', function(e) {
            e.preventDefault();
            if (msFirstClick && !msGameOver) {
              msFirstClick = false;
              msGameStarted = true;
              placeMines(rr, cc);
              msTimerSec = 0;
              document.getElementById('ms-timer').innerText = '000';
              msTimerInterval = setInterval(function() {
                if (msGameOver) { clearInterval(msTimerInterval); return; }
                msTimerSec++;
                if (msTimerSec > 999) msTimerSec = 999;
                document.getElementById('ms-timer').innerText = String(msTimerSec).padStart(3, '0');
              }, 1000);
              revealMinesweeperCell(rr, cc);
            } else if (!msGameOver) {
              if (msRevealed[rr][cc] && msGrid[rr][cc] > 0) {
                chordReveal(rr, cc);
              } else {
                revealMinesweeperCell(rr, cc);
              }
            }
          });
          cell.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (!msGameStarted && !msGameOver) return;
            toggleFlag(rr, cc);
          });
          // Long press for flag on touch
          var longPressTimer;
          cell.addEventListener('touchstart', function(e) {
            longPressTimer = setTimeout(function() {
              if (!msGameStarted && !msGameOver) return;
              toggleFlag(rr, cc);
            }, 400);
          });
          cell.addEventListener('touchend', function(e) { clearTimeout(longPressTimer); });
          cell.addEventListener('touchmove', function(e) { clearTimeout(longPressTimer); });
        })(r, c);
        container.appendChild(cell);
      }
    }
  }

  // ============ 公开函数 ============

  function setDiff(diff) {
    if (msGameStarted && !msGameOver) {
      if (!confirm('确定要切换难度吗？当前游戏将丢失。')) return;
    }
    if (diff === 'beginner') { msRows = 9; msCols = 9; msMines = 10; }
    else if (diff === 'intermediate') { msRows = 16; msCols = 16; msMines = 40; }
    else if (diff === 'expert') { msRows = 16; msCols = 30; msMines = 99; }
    document.querySelectorAll('#ms-diff-btns button').forEach(function(b) { b.classList.toggle('active', b.dataset.diff === diff); });
    reset();
    LB.fetchEntertainment('minesweeper');
  }

  function reset() {
    clearInterval(msTimerInterval);
    msGameOver = false; msGameStarted = false; msFirstClick = true; msTimerSec = 0;
    msGrid = []; msRevealed = []; msFlagged = [];
    for (var r = 0; r < msRows; r++) {
      msGrid[r] = []; msRevealed[r] = []; msFlagged[r] = [];
      for (var c = 0; c < msCols; c++) {
        msGrid[r][c] = 0;
        msRevealed[r][c] = false;
        msFlagged[r][c] = false;
      }
    }
    document.getElementById('ms-smiley').innerText = '🙂';
    document.getElementById('ms-timer').innerText = '000';
    document.getElementById('ms-mine-count').innerText = String(msMines).padStart(3, '0');
    renderMinesweeperGrid();
  }

  function init() {
    var diffBtns = document.querySelectorAll('#ms-diff-btns button');
    diffBtns.forEach(function(b) {
      var isActive = (b.dataset.diff === 'beginner' && msCols === 9 && msRows === 9 && msMines === 10) ||
                     (b.dataset.diff === 'intermediate' && msCols === 16 && msRows === 16) ||
                     (b.dataset.diff === 'expert' && msCols === 30 && msRows === 16);
      b.classList.toggle('active', isActive);
    });
    reset();
  }

  function updateBestUI() {
    // Best times shown in the minesweeper panel via updateMSDifficultyUI (placeholder)
  }

  // ============ 公开 API ============

  return {
    init: init,
    reset: reset,
    setDiff: setDiff,
    updateBestUI: updateBestUI,
    get bests() { return bestMinesweeper; },
    set bests(v) { bestMinesweeper = v; },
    get isPlaying() { return msGameStarted && !msGameOver; },
    get timerInterval() { return msTimerInterval; }
  };
})();
