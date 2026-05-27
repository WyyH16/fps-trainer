window.Schulte = (function() {
  let currentTarget, step, finalTarget, maxNumber;
  let timerInterval = null, startTime = 0;
  let isPlaying = false, isCountingDown = false;
  let currentSize = 5;
  let modeReverse, modeBlind, modeDistract, modeSound;
  let cellTimes = [], lastClickTime = 0, comboCount = 0;

  function prepare() {
    clearInterval(timerInterval);
    isPlaying = false; isCountingDown = false;
    document.getElementById('timer-display').innerText = "0.00";
    document.getElementById('post-game-panel').style.display = "none";
    cellTimes = []; comboCount = 0;

    modeReverse = document.getElementById('mode-reverse').checked;
    modeBlind = document.getElementById('mode-blind').checked;
    modeDistract = document.getElementById('mode-distract').checked;
    modeSound = document.getElementById('mode-sound').checked;
    if(modeSound) Utils.initAudio();

    let inputSize = parseInt(document.getElementById('grid-size').value);
    currentSize = Math.max(2, Math.min(10, inputSize));
    document.getElementById('grid-size').value = currentSize;

    document.documentElement.style.setProperty('--grid-size', currentSize);
    document.documentElement.style.setProperty('--grid-bg', document.getElementById('color-bg').value);
    document.documentElement.style.setProperty('--text-color', document.getElementById('color-text').value);

    maxNumber = currentSize * currentSize;
    if (modeReverse) { currentTarget = maxNumber; finalTarget = 1; step = -1; }
    else { currentTarget = 1; finalTarget = maxNumber; step = 1; }
    document.getElementById('target-display').innerText = currentTarget;

    generateGrid(maxNumber);

    const countdownSeconds = parseInt(document.getElementById('countdown').value);
    const gridEl = document.getElementById('schulte-grid');

    if (countdownSeconds > 0) {
      if (modeBlind) gridEl.classList.remove('hide-text'); else gridEl.classList.add('hide-text');
      startCountdown(countdownSeconds);
    } else {
      if (modeBlind) gridEl.classList.add('hide-text'); else gridEl.classList.remove('hide-text');
      start();
    }
  }

  function startCountdown(seconds) {
    isCountingDown = true;
    const overlay = document.getElementById('overlay');
    const cdText = document.getElementById('countdown-text');

    // 盲记模式透明遮罩逻辑
    if (modeBlind) {
      overlay.style.background = 'transparent';
      overlay.style.backdropFilter = 'none';
      cdText.style.textShadow = '0 0 10px rgba(255,255,255,1), 0 0 20px rgba(0,0,0,0.8)';
    } else {
      overlay.style.background = '';
      overlay.style.backdropFilter = '';
      cdText.style.textShadow = '0 4px 10px rgba(0,0,0,0.2)';
    }

    overlay.style.display = 'flex';
    let currentSecond = seconds; cdText.innerText = currentSecond;
    gsap.fromTo(cdText, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' });

    const countInterval = setInterval(() => {
      currentSecond--;
      if (currentSecond > 0) {
        cdText.innerText = currentSecond;
        gsap.fromTo(cdText, { scale: 0.5, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
      } else if (currentSecond === 0) {
        cdText.innerText = "GO!";
        gsap.fromTo(cdText, { scale: 0.3 }, { scale: 1.4, duration: 0.25, ease: 'power2.out' });
      } else {
        clearInterval(countInterval); overlay.style.display = 'none'; isCountingDown = false;
        const gridEl = document.getElementById('schulte-grid');
        if (modeBlind) gridEl.classList.add('hide-text');
        else gridEl.classList.remove('hide-text');
        start();
      }
    }, 1000);
  }

  function generateGrid(max) {
    const gridEl = document.getElementById('schulte-grid');
    gridEl.innerHTML = '';
    let numbers = Array.from({length: max}, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    numbers.forEach((num, index) => {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell'); cell.dataset.index = index;
      const span = document.createElement('span'); span.innerText = num;

      if (modeDistract) {
        const rotations = [0, 90, 180, -90, 45, -45];
        const scales = [0.75, 0.9, 1, 1.15, 1.3];
        span.style.transform = `rotate(${rotations[Math.floor(Math.random()*6)]}deg) scale(${scales[Math.floor(Math.random()*5)]})`;
      }
      cell.appendChild(span);
      const clickHandler = (e) => { e.preventDefault(); handleClick(cell, num); };
      cell.addEventListener('mousedown', clickHandler);
      cell.addEventListener('touchstart', clickHandler, {passive: false});
      gridEl.appendChild(cell);
    });
  }

  function start() {
    isPlaying = true; startTime = Date.now(); lastClickTime = startTime;
    timerInterval = setInterval(() => {
      document.getElementById('timer-display').innerText = ((Date.now() - startTime) / 1000).toFixed(2);
    }, 10);
  }

  function handleClick(cell, num) {
    if (!isPlaying) return;
    if (num === currentTarget) {
      comboCount++; Utils.playSound('hit', comboCount, modeSound); cell.classList.add('clicked');
      const now = Date.now(); cellTimes[cell.dataset.index] = now - lastClickTime; lastClickTime = now;
      if (currentTarget === finalTarget) end();
      else { currentTarget += step; document.getElementById('target-display').innerText = currentTarget; }
    } else if (!cell.classList.contains('clicked')) {
      comboCount = 0; Utils.playSound('error', comboCount, modeSound); cell.classList.add('wrong-click');
      setTimeout(() => cell.classList.remove('wrong-click'), 300);
    }
  }

  function end() {
    isPlaying = false; clearInterval(timerInterval);
    document.getElementById('schulte-grid').classList.remove('hide-text');
    document.getElementById('target-display').innerText = "完成!";
    const finalTime = document.getElementById('timer-display').innerText;

    const timePerCell = parseFloat(finalTime) / maxNumber;
    let rank, color;
    if (timePerCell <= 0.6) { rank = "S级"; color = "#8b5cf6"; }
    else if (timePerCell <= 1.0) { rank = "A级"; color = "#3b82f6"; }
    else if (timePerCell <= 1.4) { rank = "B级"; color = "#10b981"; }
    else if (timePerCell <= 1.8) { rank = "C级"; color = "#f59e0b"; }
    else { rank = "D级"; color = "#6b7280"; }

    document.getElementById('post-game-panel').style.display = "block";
    let extraTags = [];
    if(modeReverse) extraTags.push("逆向"); if(modeBlind) extraTags.push("盲记"); if(modeDistract) extraTags.push("干扰");
    let tagStr = extraTags.length > 0 ? ` [${extraTags.join("+")}]` : "";

    document.getElementById('eval-msg').innerHTML = `
      <div style="font-size: 20px; font-weight: 900; color: ${color}; font-family: monospace;">
        ${finalTime}s <span style="font-size: 14px; background: ${color}20; padding: 2px 8px; border-radius: 12px; margin-left: 5px;">${rank}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-sub); margin-top: 4px;">当前规格: ${currentSize}x${currentSize} ${tagStr}</div>
    `;
    saveRecord(finalTime, rank, tagStr); renderHeatmap();

    // TODO: 后续由 Routine 模块接管
    if(Routine.active) Routine.next('schulte', parseFloat(finalTime));
  }

  function saveRecord(timeStr, rank, tagStr) {
    const time = parseFloat(timeStr), date = new Date();
    const dateStr = Utils.formatDateStr(date.toISOString());
    const sizeStr = `${currentSize}x${currentSize}`;

    let records = JSON.parse(localStorage.getItem('schulteRecords') || '[]');
    records.unshift({ date: dateStr, size: sizeStr, numSize: currentSize, time: timeStr, rank: rank, tags: tagStr });
    if (records.length > 15) records.pop();
    Storage.syncSetItem('schulteRecords', JSON.stringify(records));

    let bests = JSON.parse(localStorage.getItem('schulteBests') || '{}');
    if (!bests[sizeStr] || time < parseFloat(bests[sizeStr].time)) {
      bests[sizeStr] = { time: timeStr, rank: rank, date: dateStr, tags: tagStr };
      Storage.syncSetItem('schulteBests', JSON.stringify(bests));
      // TODO: 后续由 Radar 模块接管
      if(typeof Radar !== 'undefined') Radar.update();
    }
    renderRecords(); drawChart();
  }

  function renderRecords() {
    const bests = JSON.parse(localStorage.getItem('schulteBests') || '{}');
    let bestHtml = '';
    for (let i = 2; i <= 9; i++) {
      const s = `${i}x${i}`, r = bests[s];
      if (r) {
        let rankColor = r.rank === 'S级' ? '#8b5cf6' : (r.rank === 'A级' ? '#3b82f6' : (r.rank === 'B级' ? '#10b981' : (r.rank === 'C级' ? '#f59e0b' : '#6b7280')));
        let tagText = r.tags ? `<div style="font-size:10px; color:#ef4444; margin-top:-2px;">${r.tags}</div>` : '';
        bestHtml += `<div class="pb-card"><div class="pb-size">${s}</div><div class="pb-time">${r.time}s</div>${tagText}<div class="pb-rank" style="color: ${rankColor}; background-color: ${rankColor}20;">${r.rank}</div><div class="pb-date">${r.date}</div></div>`;
      } else {
        bestHtml += `<div class="pb-card unchallenged"><div class="pb-size">${s}</div><div class="pb-time">--</div><div class="pb-rank" style="color: #9ca3af; background-color: rgba(156, 163, 175, 0.2);">未挑战</div></div>`;
      }
    }
    document.getElementById('schulte-bests').innerHTML = bestHtml;

    const records = JSON.parse(localStorage.getItem('schulteRecords') || '[]');
    const listEl = document.getElementById('schulte-records');
    if (records.length === 0) { listEl.innerHTML = '<div class="empty-records">暂无数据记录</div>'; return; }
    let html = '<table><tr><th>时间</th><th>规格</th><th>模式</th><th>用时</th><th>评级</th></tr>';
    records.slice(0, 10).forEach(r => {
      let rankColor = r.rank === 'S级' ? '#8b5cf6' : (r.rank === 'A级' ? '#3b82f6' : (r.rank === 'B级' ? '#10b981' : (r.rank === 'C级' ? '#f59e0b' : '#6b7280')));
      html += `<tr><td style="color: var(--text-sub); font-size: 11px;">${r.date}</td><td><b>${r.size}</b></td><td style="font-size: 12px; color: ${r.tags?"#ef4444":"var(--text-sub)"};">${r.tags?"极":"普"}</td><td style="font-weight:bold; font-family: monospace;">${r.time}</td><td style="color: ${rankColor}; font-weight:bold; font-size:12px;">${r.rank}</td></tr>`;
    });
    listEl.innerHTML = html + '</table>';
  }

  function clearRecords() {
    if(confirm("确定要清空索敌模式所有记录吗？")) {
      localStorage.removeItem('schulteRecords'); localStorage.removeItem('schulteBests'); renderRecords();
      // TODO: 后续由 Radar 模块接管
      if(typeof Radar !== 'undefined') Radar.update();
    }
  }

  function renderHeatmap() {
    const container = document.getElementById('heatmap');
    container.style.setProperty('--grid-size', currentSize); container.innerHTML = '';
    if(cellTimes.length === 0) return;
    const valid = cellTimes.filter(t => t > 0), minT = Math.min(...valid), maxT = Math.max(...valid);
    cellTimes.forEach(t => {
      const cell = document.createElement('div'); cell.classList.add('heat-cell');
      if(!t) cell.style.backgroundColor = 'var(--bg-color)';
      else {
        let ratio = (t - minT) / (maxT - minT || 1);
        cell.style.backgroundColor = `hsl(${(1 - ratio) * 120}, 80%, 65%)`;
        cell.innerText = (t/1000).toFixed(1);
      }
      container.appendChild(cell);
    });
  }

  function drawChart() {
    const canvas = document.getElementById('progress-chart'), ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
    let records = JSON.parse(localStorage.getItem('schulteRecords') || '[]');
    let sameSize = records.filter(r => r.numSize === currentSize).map(r => parseFloat(r.time)).reverse();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sameSize.length < 2) { ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center'; ctx.font = "12px sans-serif"; ctx.fillText('需2局以上同规格生成折线', canvas.width/2, canvas.height/2); return; }
    const maxT = Math.max(...sameSize), minT = Math.min(...sameSize), p = 15, w = canvas.width - p*2, h = canvas.height - p*2;
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
    sameSize.forEach((t, i) => { const x = p + (i / (sameSize.length - 1)) * w, y = p + h - ((t - minT) / ((maxT - minT)||1)) * h; if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    sameSize.forEach((t, i) => { const x = p + (i / (sameSize.length - 1)) * w, y = p + h - ((t - minT) / ((maxT - minT)||1)) * h; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); });
  }

  return {
    prepare: prepare,
    start: start,
    end: end,
    handleClick: handleClick,
    get isPlaying() { return isPlaying; },
    set isPlaying(v) { isPlaying = v; },
    get isCountingDown() { return isCountingDown; },
    get timerInterval() { return timerInterval; },
    renderRecords: renderRecords,
    clearRecords: clearRecords
  };
})();
