window.LB = (function() {
  let leaderboardModule = 'schulte';
  let leaderboardSubKey = '5x5';
  let schulteSubKey = '5x5';

  const LEADERBOARD_MODULES = [
    { module: 'schulte', sub: '5x5', label: '方格5x5', sort: 'asc', key: 'time' },
    { module: 'schulte', sub: '4x4', label: '方格4x4', sort: 'asc', key: 'time' },
    { module: 'reaction', sub: '', label: '反应速度', sort: 'asc', key: 'ms' },
    { module: 'aim', sub: '', label: '甩枪命中', sort: 'desc', key: 'hits' },
    { module: 'stroop', sub: '', label: '抗压决策', sort: 'asc', key: 'time' },
    { module: 'moving', sub: '', label: '飞靶拦截', sort: 'desc', key: 'score' },
    { module: 'speedtest', sub: '', label: '手速CPS', sort: 'desc', key: 'cps' },
    { module: 'snake', sub: '', label: '贪吃蛇', sort: 'desc', key: 'score' },
    { module: '2048', sub: '', label: '2048', sort: 'desc', key: 'score' },
    { module: 'minesweeper', sub: '9x9', label: '扫雷9x9', sort: 'asc', key: 'time' },
    { module: 'breakout', sub: '', label: '打砖块', sort: 'desc', key: 'score' },
  ];

  const MODULE_LB_MAP = {
    schulte:   { container: 'lb-schulte',   module: 'schulte',   sub: '5x5' },
    reaction:  { container: 'lb-reaction',  module: 'reaction',  sub: '' },
    aim:       { container: 'lb-aim',       module: 'aim',       sub: '' },
    stroop:    { container: 'lb-stroop',    module: 'stroop',    sub: '' },
    moving:    { container: 'lb-moving',    module: 'moving',    sub: '' },
    speedtest: { container: 'lb-speedtest',  module: 'speedtest',  sub: '' },
  };

  const ENT_LB_MAP = {
    snake:       { module: 'snake',       sub: '' },
    '2048':      { module: '2048',        sub: '' },
    minesweeper: { module: 'minesweeper', sub: '9x9' },
    breakout:    { module: 'breakout',    sub: '' },
  };

  function renderLeaderboardFilter(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = LEADERBOARD_MODULES.map(m => {
      const active = (leaderboardModule === m.module && leaderboardSubKey === m.sub) ? ' active' : '';
      return `<button class="${active}" onclick="LB.switchModule('${m.module}','${m.sub}')">${m.label}</button>`;
    }).join('');
  }

  async function switchLeaderboard(mod, sub) {
    leaderboardModule = mod;
    leaderboardSubKey = sub;
    renderLeaderboardFilter('lb-filter');
    await fetchLeaderboard('lb-content');
    await fetchMiniLeaderboard();
  }

  async function openLeaderboard() {
    renderLeaderboardFilter('lb-filter');
    await fetchLeaderboard('lb-content');
    document.getElementById('leaderboard-overlay').classList.add('open');
  }

  function closeLeaderboard() {
    document.getElementById('leaderboard-overlay').classList.remove('open');
  }

  async function fetchLeaderboard(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-sub);">加载中...</div>';
    const client = Storage.getSupabase();
    if (!client) {
      el.innerHTML = '<div class="empty-records">云端未连接</div>';
      return;
    }
    try {
      const { data, error } = await client.rpc('get_leaderboard', {
        p_module: leaderboardModule,
        p_sub_key: leaderboardSubKey
      });
      if (error) throw error;
      if (!data || data.length === 0) {
        el.innerHTML = '<div class="empty-records">暂无排行数据，快去训练吧！</div>';
        return;
      }
      const rows = data.slice(0, 10);
      let html = '<table class="leaderboard-table"><tr><th>排名</th><th>玩家</th><th>成绩</th><th>评级</th></tr>';
      rows.forEach((row, i) => {
        const rankClass = i === 0 ? 'rank-1' : (i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : ''));
        const isMe = Auth.currentUser && row.user_id === Auth.currentUser.id;
        const rowClass = isMe ? 'me-highlight' : '';
        var flag = Utils.countryToFlag(row.country);
        html += `<tr class="${rowClass}"><td class="${rankClass}">${i + 1}</td><td>${flag} ${row.username}${isMe ? ' ⭐' : ''}</td><td style="font-weight:bold;font-family:monospace;">${Utils.formatScore(leaderboardModule, row.score_data)}</td><td style="font-size:12px;">${row.rank || '-'}</td></tr>`;
      });
      html += '</table>';
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<div class="empty-records">加载排行榜失败: ' + (e.message || '未知错误') + '</div>';
      console.warn('Leaderboard fetch error:', e.message);
    }
  }

  async function fetchMiniLeaderboard() {
    await fetchLeaderboard('mini-leaderboard');
  }

  function refreshRelevantLB(module) {
    if (currentView === 'overview') { fetchMiniLeaderboard(); }
    if (MODULE_LB_MAP[module] && currentView === module) { fetchModuleLB(module); }
  }

  async function fetchModuleLB(view) {
    var cfg = MODULE_LB_MAP[view];
    if (!cfg) return;
    var el = document.getElementById(cfg.container);
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:10px;color:var(--text-sub);font-size:12px;">加载中...</div>';
    var client = Storage.getSupabase();
    if (!client) { el.innerHTML = '<div class="empty-records">云端未连接</div>'; return; }
    try {
      var subKey = (view === 'schulte') ? schulteSubKey : cfg.sub;
      var _r = await client.rpc('get_leaderboard', { p_module: cfg.module, p_sub_key: subKey });
      if (_r.error) throw _r.error;
      if (!_r.data || _r.data.length === 0) {
        el.innerHTML = '<div class="empty-records">暂无排行</div>';
        return;
      }
      var rows = _r.data.slice(0, 5);
      var html = '<table class="leaderboard-table"><tr><th>#</th><th>玩家</th><th>成绩</th></tr>';
      rows.forEach(function(row, i) {
        var rc = i === 0 ? 'rank-1' : (i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : ''));
        var isMe = Auth.currentUser && row.user_id === Auth.currentUser.id;
        var rowClass = isMe ? 'me-highlight' : '';
        var flag = Utils.countryToFlag(row.country);
        html += '<tr class="' + rowClass + '"><td class="' + rc + '">' + (i + 1) + '</td><td>' + flag + ' ' + row.username + (isMe ? ' ⭐' : '') + '</td><td style="font-weight:bold;font-family:monospace;font-size:12px;">' + Utils.formatScore(cfg.module, row.score_data) + '</td></tr>';
      });
      html += '</table>';
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<div class="empty-records">加载失败: ' + (e.message || '未知错误') + '</div>';
      console.warn('Module LB error:', e.message);
    }
  }

  function switchSchulteLBGrid(grid) {
    schulteSubKey = grid;
    MODULE_LB_MAP.schulte.sub = grid;
    var btns = document.querySelectorAll('#schulte-lb-grid-btns .lb-grid-btn');
    btns.forEach(function(b) { b.classList.toggle('active', b.dataset.grid === grid); });
    if (currentView === 'schulte') { fetchModuleLB('schulte'); }
  }

  async function fetchEntertainmentLB(game) {
    var el = document.getElementById('lb-entertainment');
    var titleEl = document.getElementById('ent-lb-title');
    var cfg = ENT_LB_MAP[game];
    if (!cfg || !el) return;
    if (titleEl) {
      var titles = { snake: '贪吃蛇排行榜', '2048': '2048排行榜', minesweeper: '扫雷排行榜', breakout: '打砖块排行榜' };
      titleEl.innerText = titles[game] || '';
    }
    var client = Storage.getSupabase();
    if (!client) { el.innerHTML = '<div class="empty-records">云端未连接</div>'; return; }
    try {
      var subKey = cfg.sub;
      if (game === 'minesweeper') { subKey = msDiffKey(); }
      var _r = await client.rpc('get_leaderboard', { p_module: cfg.module, p_sub_key: subKey });
      if (_r.error) throw _r.error;
      if (!_r.data || _r.data.length === 0) { el.innerHTML = '<div class="empty-records">暂无排行</div>'; return; }
      var rows = _r.data.slice(0, 5);
      var html = '<table class="leaderboard-table"><tr><th>#</th><th>玩家</th><th>成绩</th></tr>';
      rows.forEach(function(row, i) {
        var rc = i === 0 ? 'rank-1' : (i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : ''));
        var isMe = Auth.currentUser && row.user_id === Auth.currentUser.id;
        var rowClass = isMe ? 'me-highlight' : '';
        var flag = Utils.countryToFlag(row.country);
        html += '<tr class="' + rowClass + '"><td class="' + rc + '">' + (i + 1) + '</td><td>' + flag + ' ' + row.username + (isMe ? ' ⭐' : '') + '</td><td style="font-weight:bold;font-family:monospace;font-size:12px;">' + Utils.formatScore(cfg.module, row.score_data) + '</td></tr>';
      });
      html += '</table>';
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<div class="empty-records">加载失败</div>';
    }
  }

  function msDiffKey() {
    return msCols + 'x' + msRows;
  }

  return {
    MODULES: LEADERBOARD_MODULES,
    MODULE_MAP: MODULE_LB_MAP,
    ENT_MAP: ENT_LB_MAP,
    get schulteSubKey() { return schulteSubKey; },
    set schulteSubKey(v) { schulteSubKey = v; },
    open: openLeaderboard,
    close: closeLeaderboard,
    fetch: fetchLeaderboard,
    fetchMini: fetchMiniLeaderboard,
    fetchModule: fetchModuleLB,
    fetchEntertainment: fetchEntertainmentLB,
    switchModule: switchLeaderboard,
    switchSchulteGrid: switchSchulteLBGrid,
    refresh: refreshRelevantLB,
    renderFilter: renderLeaderboardFilter,
    msDiffKey: msDiffKey
  };
})();
