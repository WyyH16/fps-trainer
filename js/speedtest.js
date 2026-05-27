window.SpeedTest = (function() {
  let clicks = 0;
  let remaining = 5.00;
  let running = false;
  let interval = null;
  let best = 0;

  const BEST_KEY = 'speedtest_best_cps';
  const RECORDS_KEY = 'speedRecords';

  // Cached DOM refs
  const timeEl = document.getElementById('speed-time');
  const clicksEl = document.getElementById('speed-clicks');
  const cpsEl = document.getElementById('speed-cps');
  const bestEl = document.getElementById('speed-best');
  const bestRecordEl = document.getElementById('speed-best-record');
  const clickBtn = document.getElementById('speed-click-btn');

  function updateUI() {
    if (timeEl) timeEl.innerText = remaining.toFixed(2);
    if (clicksEl) clicksEl.innerText = clicks;
    const elapsed = Math.max(0.001, 5.00 - remaining);
    if (cpsEl) cpsEl.innerText = (clicks / elapsed).toFixed(2);
    if (bestEl) bestEl.innerText = best ? best.toFixed(2) : '--';
    if (bestRecordEl) bestRecordEl.innerText = best ? best.toFixed(2) : '--';
    if (clickBtn) clickBtn.disabled = !running;
  }

  function saveSpeedRecord(cps) {
    const date = new Date();
    const dateStr = (date.getMonth() + 1) + '-' + date.getDate() + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    let records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    records.unshift({ date: dateStr, cps: cps });
    if (records.length > 15) records.pop();
    Storage.syncSetItem(RECORDS_KEY, JSON.stringify(records));
    renderRecords();
  }

  function saveBest() {
    const cps = parseFloat((clicks / 5.00).toFixed(2));
    if (cps > best) {
      best = cps;
      Storage.syncSetItem(BEST_KEY, String(best));
      if (bestRecordEl) bestRecordEl.innerText = best.toFixed(2);
      showToast('已保存手速测试本地最高 CPS：' + best);
      updateUI();
    }
  }

  function startSpeedTest() {
    if (running) return;
    clearInterval(interval);
    clicks = 0;
    remaining = 5.00;
    running = true;
    updateUI();
    interval = setInterval(function() {
      remaining = Math.max(0, remaining - 0.05);
      updateUI();
      if (remaining <= 0) {
        stopSpeedTest();
      }
    }, 50);
  }

  function stopSpeedTest() {
    if (!running) return;
    running = false;
    clearInterval(interval);
    saveSpeedRecord(parseFloat((clicks / 5.00).toFixed(2)));
    saveBest();
    updateUI();
  }

  function resetSpeedTest() {
    clearInterval(interval);
    running = false;
    clicks = 0;
    remaining = 5.00;
    updateUI();
  }

  function registerSpeedClick() {
    if (!running) return;
    clicks += 1;
    updateUI();
  }

  function renderRecords() {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    const listEl = document.getElementById('speed-records');
    if (!listEl) return;
    if (!records.length) {
      listEl.innerHTML = '<div class="empty-records">暂无手速记录</div>';
      return;
    }
    let html = '<table><tr><th>时间</th><th>CPS</th></tr>';
    records.slice(0, 10).forEach(function(r) {
      html += '<tr><td style="color: var(--text-sub); font-size: 12px;">' + r.date + '</td><td style="font-weight:bold;">' + r.cps + '</td></tr>';
    });
    listEl.innerHTML = html + '</table>';
  }

  function clearRecords() {
    if (confirm('确定要清除手速测试记录吗？')) {
      localStorage.removeItem(RECORDS_KEY);
      renderRecords();
    }
  }

  return {
    updateUI: updateUI,
    start: startSpeedTest,
    stop: stopSpeedTest,
    reset: resetSpeedTest,
    registerClick: registerSpeedClick,
    renderRecords: renderRecords,
    clearRecords: clearRecords,
    get running() { return running; },
    get interval() { return interval; },
    get best() { return best; },
    set best(v) { best = v; }
  };
})();
