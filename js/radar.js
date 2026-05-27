window.Radar = (function() {
  function update() {
    const cvs = document.getElementById('radarChart');
    if(!cvs) return;
    const container = cvs.parentElement;

    const size = container.clientWidth || 300;
    const dpr = window.devicePixelRatio || 1;

    cvs.width = size * dpr;
    cvs.height = size * dpr;
    cvs.style.width = size + 'px';
    cvs.style.height = size + 'px';

    const ctx = cvs.getContext('2d');
    ctx.scale(dpr, dpr);

    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? '#4b5563' : '#d1d5db';
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    const fillColor = 'rgba(59, 130, 246, 0.4)';
    const strokeColor = '#3b82f6';

    // 6 个维度
    let scores = [50, 50, 50, 50, 50, 50];

    let scBests = JSON.parse(localStorage.getItem('schulteBests') || '{}');
    let scT = scBests['5x5'] ? parseFloat(scBests['5x5'].time) : 50;
    scores[0] = Math.max(5, Math.min(100, 100 - (scT - 15) * 4));

    let rtBest = JSON.parse(localStorage.getItem('rtBest') || 'null');
    let rtT = rtBest ? parseInt(rtBest.ms) : 400;
    scores[1] = Math.max(5, Math.min(100, 100 - (rtT - 160) * 0.625));

    let aimBest = JSON.parse(localStorage.getItem('aim_best') || '{}');
    let aimH = parseInt(aimBest.hits || 0);
    scores[2] = Math.max(5, Math.min(100, (aimH - 10) * 2.85));

    let mvBest = JSON.parse(localStorage.getItem('mv_best') || '{}');
    let mvScore = parseInt(mvBest.score || 0);
    scores[3] = Math.max(5, Math.min(100, (mvScore / 40) * 100)); // 设定40分为100%

    let stBest = JSON.parse(localStorage.getItem('st_best') || '{}');
    let stT = parseFloat(stBest.time || 40);
    scores[4] = Math.max(5, Math.min(100, 100 - (stT - 12) * 5.5));

    scores[5] = (scores[0]+scores[1]+scores[2]+scores[3]+scores[4]) / 5;

    const labels = ['视野索敌(方格)', '反射神经(反应)', '定位准度(甩枪)', '动态跟枪(飞靶)', '抗压决策(颜色)', '综合潜能'];
    const sides = 6;
    const cx = size / 2, cy = size / 2;
    const radius = Math.min(cx, cy) - 45;

    ctx.lineWidth = 1; ctx.strokeStyle = gridColor;
    for (let level = 1; level <= 5; level++) {
      let r = radius * (level / 5);
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        let angle = i * 2 * Math.PI / sides - Math.PI / 2;
        let x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }

    ctx.font = "bold 11px sans-serif"; ctx.fillStyle = textColor; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < sides; i++) {
      let angle = i * 2 * Math.PI / sides - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)); ctx.stroke();
      let lx = cx + (radius + 25) * Math.cos(angle), ly = cy + (radius + 20) * Math.sin(angle);
      ctx.fillText(labels[i], lx, ly);
    }

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      let angle = i * 2 * Math.PI / sides - Math.PI / 2;
      let valR = radius * (scores[i] / 100);
      let x = cx + valR * Math.cos(angle), y = cy + valR * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = strokeColor; ctx.stroke();

    ctx.fillStyle = strokeColor;
    for (let i = 0; i < sides; i++) {
      let angle = i * 2 * Math.PI / sides - Math.PI / 2;
      let valR = radius * (scores[i] / 100);
      ctx.beginPath(); ctx.arc(cx + valR * Math.cos(angle), cy + valR * Math.sin(angle), 4, 0, Math.PI*2); ctx.fill();
    }
  }

  return { update: update };
})();
