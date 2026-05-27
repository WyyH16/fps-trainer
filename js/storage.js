window.Storage = (function() {
  const SUPABASE_CONFIG = {
    cloudSyncEnabled: true,
    localOnlyKeys: ['weather_cache', '2048_state'],
    keyToModule: {
      'schulteRecords':      { module: 'schulte',   isRecords: true },
      'schulteBests':        { module: 'schulte',   isRecords: false },
      'rtRecords':           { module: 'reaction',  isRecords: true },
      'rtBest':              { module: 'reaction',  isRecords: false },
      'aim_best':            { module: 'aim',       isRecords: false },
      'st_best':             { module: 'stroop',    isRecords: false },
      'mv_best':             { module: 'moving',    isRecords: false },
      'speedRecords':        { module: 'speedtest', isRecords: true },
      'speedtest_best_cps':  { module: 'speedtest', isRecords: false },
      'snake_best_score':    { module: 'snake',     isRecords: false },
      '2048_best_score':     { module: '2048',      isRecords: false },
      'minesweeper_bests':   { module: 'minesweeper', isRecords: false },
      'breakout_best_score': { module: 'breakout',  isRecords: false },
    }
  };

  function sb() { return window.__supabase || null; }

  // ---- syncSetItem: write localStorage + cloud sync ----
  async function syncSetItem(key, value) {
    localStorage.setItem(key, value);
    if (SUPABASE_CONFIG.localOnlyKeys.includes(key) || !SUPABASE_CONFIG.cloudSyncEnabled) return;
    const client = sb();
    if (!client) return;
    let session;
    try {
      var _s = await client.auth.getSession();
      if (_s.error) throw _s.error;
      session = _s.data.session;
    } catch (e) { console.warn('getSession error:', e.message); return; }
    if (!session) {
      if (currentUser) { showToast('登录已过期，请重新登录'); currentUser = null; updateAuthButton(); }
      return;
    }
    const mapping = SUPABASE_CONFIG.keyToModule[key];
    if (!mapping) return;
    try {
      if (mapping.isRecords) {
        const records = JSON.parse(value);
        if (!Array.isArray(records) || records.length === 0) return;
        await pushRecordToCloud(session.user.id, mapping.module, records[0]);
      } else {
        const data = JSON.parse(value);
        await pushBestToCloud(session.user.id, mapping.module, data);
      }
      // auto-refresh relevant leaderboard
      refreshRelevantLB(mapping.module);
    } catch (e) {
      console.warn('Cloud sync skipped:', e.message);
      showToast('云端同步失败，数据保留在本地');
    }
  }

  async function pushRecordToCloud(userId, module, record) {
    const client = sb();
    if (!client) return;
    let subKey = '';
    let scoreData = {};
    let rank = record.rank || null;
    let tags = record.tags || null;
    switch (module) {
      case 'schulte':
        subKey = record.size || '';
        scoreData = { time: record.time };
        break;
      case 'reaction':
        scoreData = { ms: record.ms };
        rank = record.rank;
        break;
      case 'speedtest':
        scoreData = { cps: record.cps };
        break;
    }
    if (!Object.keys(scoreData).length) return;
    await client.from('training_records').insert({
      user_id: userId, module: module, sub_key: subKey,
      score_data: scoreData, rank: rank, tags: tags
    });
    await client.rpc('upsert_personal_best', {
      p_user_id: userId, p_module: module, p_sub_key: subKey,
      p_score_data: scoreData, p_rank: rank, p_tags: tags
    });
  }

  async function pushBestToCloud(userId, module, data) {
    const client = sb();
    if (!client) return;
    let subKey = '';
    let scoreData = {};
    switch (module) {
      case 'schulte':
        for (const [size, best] of Object.entries(data)) {
          if (!best || !best.time) continue;
          await client.rpc('upsert_personal_best', {
            p_user_id: userId, p_module: 'schulte', p_sub_key: size,
            p_score_data: { time: best.time }, p_rank: best.rank, p_tags: best.tags
          });
        }
        return;
      case 'reaction':
        scoreData = { ms: data.ms };
        break;
      case 'aim':
        scoreData = { hits: data.hits || 0 };
        break;
      case 'stroop':
        scoreData = { time: data.time };
        break;
      case 'moving':
        scoreData = { score: data.score || 0 };
        break;
      case 'speedtest':
        scoreData = { cps: parseFloat(data) || 0 };
        if (!scoreData.cps) return;
        break;
      case 'snake':
        scoreData = { score: parseInt(data) || 0 };
        if (!scoreData.score) return;
        break;
      case '2048':
        scoreData = { score: parseInt(data) || 0 };
        if (!scoreData.score) return;
        break;
      case 'minesweeper':
        // data is { '9x9': {time:...}, '16x16': {time:...}, ... }
        for (const [diff, best] of Object.entries(data)) {
          if (!best || !best.time) continue;
          await client.rpc('upsert_personal_best', {
            p_user_id: userId, p_module: 'minesweeper', p_sub_key: diff,
            p_score_data: { time: best.time }, p_rank: null, p_tags: null
          });
        }
        return;
      case 'breakout':
        scoreData = { score: parseInt(data) || 0 };
        if (!scoreData.score) return;
        break;
    }
    if (!Object.keys(scoreData).length) return;
    await client.rpc('upsert_personal_best', {
      p_user_id: userId, p_module: module, p_sub_key: subKey,
      p_score_data: scoreData, p_rank: null, p_tags: null
    });
  }

  // ---- syncPullAll: pull from cloud after login and merge ----
  async function syncPullAll() {
    const client = sb();
    if (!client) return;
    let session;
    try {
      var _s = await client.auth.getSession();
      if (_s.error) throw _s.error;
      session = _s.data.session;
    } catch (e) { console.warn('syncPullAll session error:', e.message); return; }
    if (!session) return;
    const userId = session.user.id;
    try {
      const { data: bests, error } = await client
        .from('personal_bests').select('*').eq('user_id', userId);
      if (error) throw error;
      if (bests && bests.length > 0) {
        mergeCloudBests(bests);
        renderSchulteRecords();
        renderRtRecords();
        renderExtraPB();
        updateRadarChart();
        loadGameData();
      }
      const { data: records } = await client
        .from('training_records').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(50);
      if (records && records.length > 0) {
        mergeCloudRecords(records);
        renderSpeedRecords();
      }
      // push local data to cloud (covers records made while logged out)
      await pushAllLocalToCloud(userId);
      showToast('云数据同步完成');
    } catch (e) {
      console.warn('Cloud pull failed:', e.message);
      showToast('云数据拉取失败');
    }
  }

  async function pushAllLocalToCloud(userId) {
    var bestKeys = ['schulteBests','rtBest','aim_best','st_best','mv_best','speedtest_best_cps','snake_best_score','2048_best_score','minesweeper_bests','breakout_best_score'];
    for (var i = 0; i < bestKeys.length; i++) {
      var val = localStorage.getItem(bestKeys[i]);
      if (!val) continue;
      var mapping = SUPABASE_CONFIG.keyToModule[bestKeys[i]];
      if (!mapping) continue;
      try {
        var data = JSON.parse(val);
        await pushBestToCloud(userId, mapping.module, data);
      } catch (e) { /* skip individual failures */ }
    }
  }

  function mergeCloudBests(bests) {
    const cloudSchulteBests = {};
    for (const b of bests) {
      if (b.module === 'schulte' && b.sub_key) {
        cloudSchulteBests[b.sub_key] = {
          time: b.score_data.time,
          rank: b.rank || '',
          date: Utils.formatDateStr(b.achieved_at),
          tags: b.tags || ''
        };
      }
    }
    if (Object.keys(cloudSchulteBests).length > 0) {
      const local = JSON.parse(localStorage.getItem('schulteBests') || '{}');
      localStorage.setItem('schulteBests', JSON.stringify({ ...local, ...cloudSchulteBests }));
    }
    for (const b of bests) {
      switch (b.module) {
        case 'reaction': {
          const local = JSON.parse(localStorage.getItem('rtBest') || 'null');
          if (!local || b.score_data.ms < local.ms) {
            localStorage.setItem('rtBest', JSON.stringify({
              ms: b.score_data.ms, date: Utils.formatDateStr(b.achieved_at),
              rank: b.rank, color: Utils.getReactRankColor(b.rank)
            }));
          }
          break;
        }
        case 'aim': {
          const local = JSON.parse(localStorage.getItem('aim_best') || '{}');
          if (!local.hits || b.score_data.hits > local.hits) {
            localStorage.setItem('aim_best', JSON.stringify({ hits: b.score_data.hits }));
          }
          break;
        }
        case 'stroop': {
          const local = JSON.parse(localStorage.getItem('st_best') || '{}');
          const ct = parseFloat(b.score_data.time);
          if (!local.time || ct < parseFloat(local.time)) {
            localStorage.setItem('st_best', JSON.stringify({ time: b.score_data.time }));
          }
          break;
        }
        case 'moving': {
          const local = JSON.parse(localStorage.getItem('mv_best') || '{}');
          if (!local.score || b.score_data.score > local.score) {
            localStorage.setItem('mv_best', JSON.stringify({ score: b.score_data.score }));
          }
          break;
        }
        case 'speedtest': {
          const local = parseFloat(localStorage.getItem('speedtest_best_cps') || '0');
          if (b.score_data.cps > local) {
            localStorage.setItem('speedtest_best_cps', String(b.score_data.cps));
            speedTestBest = b.score_data.cps;
          }
          break;
        }
        case 'snake': {
          const local = parseInt(localStorage.getItem('snake_best_score') || '0');
          if (b.score_data.score > local) {
            localStorage.setItem('snake_best_score', String(b.score_data.score));
            snakeBestScore = b.score_data.score;
          }
          break;
        }
        case '2048': {
          const local = parseInt(localStorage.getItem('2048_best_score') || '0');
          if (b.score_data.score > local) {
            localStorage.setItem('2048_best_score', String(b.score_data.score));
            best2048Score = b.score_data.score;
          }
          break;
        }
        case 'minesweeper': {
          const localBests = JSON.parse(localStorage.getItem('minesweeper_bests') || '{}');
          const diff = b.sub_key || '9x9';
          const existing = localBests[diff];
          if (!existing || parseFloat(b.score_data.time) < parseFloat(existing.time)) {
            localBests[diff] = { time: b.score_data.time, date: Utils.formatDateStr(b.achieved_at) };
            localStorage.setItem('minesweeper_bests', JSON.stringify(localBests));
            bestMinesweeper = localBests;
          }
          break;
        }
        case 'breakout': {
          const local = parseInt(localStorage.getItem('breakout_best_score') || '0');
          if (b.score_data.score > local) {
            localStorage.setItem('breakout_best_score', String(b.score_data.score));
            bestBreakoutScore = b.score_data.score;
          }
          break;
        }
      }
    }
  }

  function mergeCloudRecords(records) {
    const modules = {
      schulte: { key: 'schulteRecords', maxLen: 15, mapper: (r) => ({
        date: Utils.formatDateStr(r.created_at), size: r.sub_key,
        numSize: parseInt(r.sub_key) || 5, time: r.score_data.time,
        rank: r.rank || '', tags: r.tags || ''
      })},
      reaction: { key: 'rtRecords', maxLen: 10, mapper: (r) => ({
        date: Utils.formatDateStr(r.created_at), ms: r.score_data.ms,
        rank: r.rank || '', color: Utils.getReactRankColor(r.rank)
      })},
      speedtest: { key: 'speedRecords', maxLen: 15, mapper: (r) => ({
        date: Utils.formatDateStr(r.created_at), cps: r.score_data.cps
      })}
    };
    for (const [module, cfg] of Object.entries(modules)) {
      const cloudEntries = records.filter(r => r.module === module).map(cfg.mapper);
      if (!cloudEntries.length) continue;
      const localEntries = JSON.parse(localStorage.getItem(cfg.key) || '[]');
      const dates = new Set(localEntries.map(e => e.date));
      for (const ce of cloudEntries) {
        if (!dates.has(ce.date)) localEntries.unshift(ce);
      }
      localEntries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      localStorage.setItem(cfg.key, JSON.stringify(localEntries.slice(0, cfg.maxLen)));
    }
  }

  return {
    SUPABASE_CONFIG: SUPABASE_CONFIG,
    syncSetItem: syncSetItem,
    syncPullAll: syncPullAll,
    pushBestToCloud: pushBestToCloud,
    pushRecordToCloud: pushRecordToCloud,
    pushAllLocalToCloud: pushAllLocalToCloud,
    getSupabase: sb
  };
})();
