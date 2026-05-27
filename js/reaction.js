window.Reaction = (function() {
  let rtState = 'idle';
  let rtTimeout = null;
  let rtStartTime = 0;
  let rtResults = [];

  var rtPad = null, rtIcon = null, rtMsg = null, rtSub = null, rtTriesDisplay = null;

  function resetRt() {
    clearTimeout(rtTimeout); rtState = 'idle'; rtResults = [];
    setRtUI('idle', '⚡', '点击此处开始测试', '测试为 5 次取平均值', false);
  }

  function setRtUI(stateClass, icon, msg, sub, showTries) {
    if (!rtPad) {
      rtPad = document.getElementById('reaction-pad');
      rtIcon = document.getElementById('reaction-icon');
      rtMsg = document.getElementById('reaction-msg');
      rtSub = document.getElementById('reaction-sub');
      rtTriesDisplay = document.getElementById('reaction-tries');
    }
    rtPad.className = ''; rtPad.classList.add('rt-' + stateClass);
    rtIcon.innerText = icon; rtMsg.innerText = msg; rtSub.innerText = sub;
    rtTriesDisplay.style.display = showTries ? 'block' : 'none';
    if (showTries) rtTriesDisplay.innerText = '进度: ' + rtResults.length + ' / 5';

    // Punch animation on state transitions
    if (stateClass === 'ready') {
      gsap.fromTo(rtPad, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
    }
    if (stateClass === 'waiting') {
      gsap.fromTo(rtPad, { scale: 1.02 }, { scale: 1, duration: 0.25, ease: 'power2.out' });
    }
    // Pop the result number
    if (icon === '⏱️' || icon === '🎯') {
      gsap.fromTo(rtMsg, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
    }
  }

  function handleRtClick(e) {
    if (e) e.preventDefault();
    if (App.currentView !== 'reaction' && !Routine.active) return;
    if (rtState === 'idle') {
      startRtWaiting();
    } else if (rtState === 'waiting') {
      clearTimeout(rtTimeout);
      setRtUI('idle', '⚠️', '太急了！抢跑无效', '点击重试当前轮次', true);
      rtState = 'idle';
    } else if (rtState === 'ready') {
      let reactionTime = Date.now() - rtStartTime;
      rtResults.push(reactionTime);
      if (rtResults.length < 5) {
        setRtUI('idle', '⏱️', reactionTime + ' ms', '点击继续下一次', true);
        rtState = 'idle';
        if (Routine.active) setTimeout(handleRtClick, 1000);
      } else {
        let sum = rtResults.reduce((a, b) => a + b, 0), avg = Math.round(sum / 5);
        let rankDesc = getRtRank(avg);
        setRtUI('idle', '🎯', '平均: ' + avg + ' ms', '评价: ' + rankDesc.name + '。点击重新开始', true);
        rtTriesDisplay.innerText = '测试完成'; rtState = 'idle';
        saveRtRecord(avg, rankDesc); rtResults = [];

        if (Routine.active) Routine.next('reaction', avg);
      }
    }
  }

  function startRtWaiting() {
    rtState = 'waiting';
    setRtUI('waiting', '🔴', '等待绿色...', '专注，不要提前抢跑', true);
    let delay = Math.floor(Math.random() * 2500) + 1500;
    rtTimeout = setTimeout(function() {
      rtState = 'ready';
      setRtUI('ready', '🟢', '点击！', '', true);
      rtStartTime = Date.now();
    }, delay);
  }

  function getRtRank(ms) {
    if (ms <= 160) return { name: '外星神经', color: '#8b5cf6' };
    if (ms <= 200) return { name: '电竞选手', color: '#3b82f6' };
    if (ms <= 250) return { name: '眼疾手快', color: '#10b981' };
    if (ms <= 300) return { name: '普通路人', color: '#f59e0b' };
    return { name: '老年反应', color: '#6b7280' };
  }

  function saveRtRecord(avgMs, rankDesc) {
    const date = new Date();
    const dateStr = (date.getMonth() + 1) + '-' + date.getDate() + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    let records = JSON.parse(localStorage.getItem('rtRecords') || '[]');
    records.unshift({ date: dateStr, ms: avgMs, rank: rankDesc.name, color: rankDesc.color });
    if (records.length > 10) records.pop();
    Storage.syncSetItem('rtRecords', JSON.stringify(records));

    let best = JSON.parse(localStorage.getItem('rtBest') || 'null');
    if (!best || avgMs < best.ms) {
      best = { ms: avgMs, date: dateStr, rank: rankDesc.name, color: rankDesc.color };
      Storage.syncSetItem('rtBest', JSON.stringify(best));
      Radar.update();
    }
    renderRtRecords();
  }

  function renderRtRecords() {
    const best = JSON.parse(localStorage.getItem('rtBest') || 'null');
    const bestTimeEl = document.getElementById('rt-best-time'), bestRankEl = document.getElementById('rt-best-rank'), bestDateEl = document.getElementById('rt-best-date');

    if (best) {
      bestTimeEl.innerText = best.ms + ' ms'; bestRankEl.innerText = best.rank;
      bestRankEl.style.color = best.color; bestRankEl.style.backgroundColor = best.color + '20';
      bestDateEl.innerText = best.date;
    } else {
      bestTimeEl.innerText = '-- ms'; bestRankEl.innerText = '未挑战';
      bestRankEl.style.color = '#9ca3af'; bestRankEl.style.backgroundColor = 'rgba(156,163,175,0.2)';
      bestDateEl.innerText = '--';
    }

    const records = JSON.parse(localStorage.getItem('rtRecords') || '[]');
    const listEl = document.getElementById('rt-records');
    if (records.length === 0) { listEl.innerHTML = '<div class="empty-records">暂无反应测试记录</div>'; return; }

    let html = '<table><tr><th>时间</th><th>平均反应</th><th>评级</th></tr>';
    records.forEach(function(r) {
      html += '<tr><td style="color: var(--text-sub); font-size: 11px;">' + r.date + '</td><td style="font-weight:bold; font-family: monospace; font-size:16px;">' + r.ms + ' ms</td><td style="color: ' + r.color + '; font-weight:bold; font-size:12px;">' + r.rank + '</td></tr>';
    });
    listEl.innerHTML = html + '</table>';
  }

  function clearRtRecords() {
    if (confirm('确定要清空极限反应的生涯数据吗？')) {
      localStorage.removeItem('rtRecords'); localStorage.removeItem('rtBest'); renderRtRecords();
      Radar.update();
    }
  }

  return {
    handleClick: handleRtClick,
    renderRecords: renderRtRecords,
    clearRecords: clearRtRecords,
    reset: resetRt,
    get state() { return rtState; },
    set state(v) { rtState = v; },
    get timeout() { return rtTimeout; },
    set timeout(v) { rtTimeout = v; },
    get results() { return rtResults; }
  };
})();
