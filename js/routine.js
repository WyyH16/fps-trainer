window.Routine = (function() {
  let state = { active: false, step: 0, scores: {} };

  function start() {
    state = { active: true, step: 1, scores: {} };
    document.getElementById('routine-result-card').style.display = 'none';
    // Step 1: Schulte 4x4
    switchView('schulte');
    document.getElementById('grid-size').value = 4;
    document.getElementById('countdown').value = 3;
    document.getElementById('mode-blind').checked = false;
    document.getElementById('mode-distract').checked = false;
    Schulte.prepare();
  }

  function next(module, result) {
    if(!state.active) return;
    state.scores[module] = result;
    state.step++;

    setTimeout(() => {
      if (state.step === 2) {
        switchView('aim');
        Aim.start();
      } else if (state.step === 3) {
        switchView('reaction');
        Reaction.state = 'idle'; // Reset reaction
        Reaction.handleClick(); // Auto start wait
      } else {
        finish();
      }
    }, 1000);
  }

  function finish() {
    state.active = false;
    switchView('overview');
    document.getElementById('routine-result-card').style.display = 'block';

    // 计算综合状态得分
    let s1 = Math.max(0, 100 - Math.max(0, state.scores.schulte - 10) * 5); // 4x4 基准 10s
    let s2 = Math.min(100, Math.max(0, state.scores.aim / 15 * 100)); // 15 命为优秀参考
    let s3 = Math.max(0, 100 - Math.max(0, state.scores.reaction - 150) * 0.85); // 150ms 基准
    let finalScore = Math.round((s1 + s2 + s3) / 3);
    let statusText = '';
    let statusColor = 'var(--text-main)';
    if (finalScore >= 90) {
      statusText = '当前状态极佳，适合直接参加排位竞技。';
      statusColor = '#10b981';
    } else if (finalScore >= 80) {
      statusText = '状态良好，可尝试排位，有一定竞技把握。';
      statusColor = '#3b82f6';
    } else if (finalScore >= 70) {
      statusText = '可适度参加排位，建议先再热身一局。';
      statusColor = '#f59e0b';
    } else {
      statusText = '建议继续训练再排位，当前状态尚不稳定。';
      statusColor = '#ef4444';
    }
    let readyTag = finalScore >= 80 ? '建议参加' : '建议暂缓';
    let readyBg = finalScore >= 80 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

    document.getElementById('routine-result-content').innerHTML = `
      <div style="font-size:36px; font-weight:900; color:var(--accent-color); text-align:center;">${finalScore} <span style="font-size:16px; color:var(--text-sub);">分</span></div>
      <div style="text-align:center; margin-top: 8px; margin-bottom: 16px; color: ${statusColor}; font-weight: 700;">${statusText}</div>
      <div style="text-align:center; margin-bottom: 15px;
        display:inline-flex; align-items:center; justify-content:center; padding:8px 14px; border-radius:999px; background:${readyBg}; color:${statusColor}; font-weight:700; font-size:14px;">
        ${readyTag} 排位竞技
      </div>
      <div class="stat-grid">
        <div class="stat-box"><div style="font-size:12px;">索敌(4x4)</div><div class="stat-val" style="color:var(--text-main); font-size:16px;">${state.scores.schulte}s</div></div>
        <div class="stat-box"><div style="font-size:12px;">甩枪命中</div><div class="stat-val" style="color:var(--text-main); font-size:16px;">${state.scores.aim}</div></div>
        <div class="stat-box" style="grid-column: 1 / -1;"><div style="font-size:12px;">平均反应</div><div class="stat-val" style="color:var(--text-main); font-size:16px;">${state.scores.reaction}ms</div></div>
      </div>
    `;
  }

  return {
    start: start,
    next: next,
    finish: finish,
    get active() { return state.active; }
  };
})();
