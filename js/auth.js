window.Auth = (function() {
  let currentUser = null;
  let currentAuthTab = 'password';

  function getSupabase() { return Storage.getSupabase(); }

  function openAuthModal() {
    if (currentUser) {
      // 已登录 → 显示个人资料编辑
      document.getElementById('auth-login-section').style.display = 'none';
      document.getElementById('auth-profile-section').style.display = 'block';
      document.getElementById('profile-username').value = currentUser.username || '';
      document.getElementById('profile-country').value = currentUser.country || '';
      document.getElementById('profile-error').style.display = 'none';
    } else {
      document.getElementById('auth-login-section').style.display = 'block';
      document.getElementById('auth-profile-section').style.display = 'none';
      document.getElementById('auth-email').value = '';
      document.getElementById('auth-password').value = '';
      document.getElementById('auth-error').style.display = 'none';
      currentAuthTab = 'password';
      updateAuthTabUI();
    }
    document.getElementById('auth-overlay').classList.add('open');
  }

  function closeAuthModal() {
    document.getElementById('auth-overlay').classList.remove('open');
  }

  function switchAuthTab(tab) {
    currentAuthTab = tab;
    updateAuthTabUI();
  }

  function updateAuthTabUI() {
    var magicTab = document.getElementById('auth-tab-magiclink');
    var pwdTab = document.getElementById('auth-tab-password');
    var pwdField = document.getElementById('auth-password');
    var btnGroup = document.getElementById('auth-btns');
    var magicBtn = document.getElementById('auth-magiclink-btn');

    if (currentAuthTab === 'magiclink') {
      magicTab.style.background = 'var(--accent-color)';
      magicTab.style.color = '#fff';
      pwdTab.style.background = 'var(--bg-color)';
      pwdTab.style.color = 'var(--text-sub)';
      pwdField.style.display = 'none';
      btnGroup.style.display = 'none';
      magicBtn.style.display = 'block';
    } else {
      magicTab.style.background = 'var(--bg-color)';
      magicTab.style.color = 'var(--text-sub)';
      pwdTab.style.background = 'var(--accent-color)';
      pwdTab.style.color = '#fff';
      pwdField.style.display = 'block';
      btnGroup.style.display = 'flex';
      magicBtn.style.display = 'none';
    }
    document.getElementById('auth-error').style.display = 'none';
  }

  // 魔法链接
  async function handleAuthMagicLink() {
    var email = document.getElementById('auth-email').value.trim();
    var errEl = document.getElementById('auth-error');
    var client = Storage.getSupabase();
    if (!email) { errEl.innerText = '请输入邮箱地址'; errEl.style.display = 'block'; return; }
    if (!client) { errEl.innerText = 'SDK 未就绪，请刷新后重试'; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    try {
      var _r = await client.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
      if (_r.error) throw _r.error;
      showToast('魔法链接已发送到 ' + email + '，请查收邮件');
      closeAuthModal();
    } catch (e) {
      errEl.innerText = e.message || '发送失败';
      errEl.style.display = 'block';
    }
  }

  // 邮箱密码 — 注册
  async function handleAuthRegister() {
    var email = document.getElementById('auth-email').value.trim();
    var password = document.getElementById('auth-password').value;
    var errEl = document.getElementById('auth-error');
    var client = Storage.getSupabase();
    if (!email) { errEl.innerText = '请输入邮箱地址'; errEl.style.display = 'block'; return; }
    if (!password || password.length < 6) { errEl.innerText = '密码至少6位'; errEl.style.display = 'block'; return; }
    if (!client) { errEl.innerText = 'SDK 未就绪，请刷新后重试'; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    try {
      var _r = await client.auth.signUp({
        email: email, password: password,
        options: { data: { username: email.split('@')[0] } }
      });
      if (_r.error) throw _r.error;
      if (_r.data.user) {
        currentUser = { id: _r.data.user.id, email: _r.data.user.email, username: email.split('@')[0], country: '' };
        updateAuthButton();
        await ensureProfile(_r.data.user.id, _r.data.user.email, true);
        await Storage.syncPullAll();
        closeAuthModal();
        showToast('注册成功，数据将自动云端同步');
      }
    } catch (e) {
      errEl.innerText = e.message || '注册失败';
      errEl.style.display = 'block';
    }
  }

  // 邮箱密码 — 登录
  async function handleAuthLogin() {
    var email = document.getElementById('auth-email').value.trim();
    var password = document.getElementById('auth-password').value;
    var errEl = document.getElementById('auth-error');
    var client = Storage.getSupabase();
    if (!email) { errEl.innerText = '请输入邮箱地址'; errEl.style.display = 'block'; return; }
    if (!password) { errEl.innerText = '请输入密码'; errEl.style.display = 'block'; return; }
    if (!client) { errEl.innerText = 'SDK 未就绪，请刷新后重试'; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    try {
      var _r = await client.auth.signInWithPassword({ email: email, password: password });
      if (_r.error) throw _r.error;
      if (_r.data.user) {
        currentUser = { id: _r.data.user.id, email: _r.data.user.email, username: _r.data.user.user_metadata?.username || email.split('@')[0], country: '' };
        updateAuthButton();
        await ensureProfile(_r.data.user.id, _r.data.user.email, true);
        await Storage.syncPullAll();
        closeAuthModal();
        showToast('登录成功，正在同步云端数据...');
      }
    } catch (e) {
      errEl.innerText = e.message || '登录失败';
      errEl.style.display = 'block';
    }
  }

  function updateAuthButton() {
    const btn = document.getElementById('auth-btn');
    if (!btn) return;
    if (currentUser) {
      btn.className = 'auth-btn logged-in';
      var flag = Utils.countryToFlag(currentUser.country);
      var display = flag + ' ' + currentUser.username;
      btn.innerHTML = '<span class="user-badge">' + display + ' <span class="logout-link" onclick="event.stopPropagation();Auth.logout()">LOGOUT</span></span>';
    } else {
      btn.className = 'auth-btn';
      btn.innerText = 'LOGIN / SYNC';
    }
  }

  async function detectCountry() {
    try {
      var r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        var d = await r.json();
        return d.country_code || '';
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  async function saveProfile() {
    var username = document.getElementById('profile-username').value.trim();
    var country = document.getElementById('profile-country').value;
    var errEl = document.getElementById('profile-error');
    if (!username) { errEl.innerText = '显示名称不能为空'; errEl.style.display = 'block'; return; }
    var client = Storage.getSupabase();
    if (!client) { errEl.innerText = '云端未连接'; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    try {
      await client.rpc('update_profile', { p_user_id: currentUser.id, p_username: username, p_country: country });
      currentUser.username = username;
      currentUser.country = country;
      updateAuthButton();
      closeAuthModal();
      // 刷新所有已显示的排行榜
      if (App.currentView === 'overview') fetchMiniLeaderboard();
      var cfg = MODULE_LB_MAP[App.currentView];
      if (cfg) fetchModuleLB(App.currentView);
      showToast('资料已更新');
    } catch (e) {
      errEl.innerText = '保存失败: ' + (e.message || '未知错误');
      errEl.style.display = 'block';
    }
  }

  async function handleLogout() {
    const client = Storage.getSupabase();
    if (client) { await client.auth.signOut(); }
    currentUser = null;
    updateAuthButton();
    showToast('已退出登录，数据保留在本地');
  }

  async function ensureProfile(userId, email, detectCountryFlag) {
    var client = Storage.getSupabase();
    if (!client) return;
    try {
      var _c = await client.from('profiles').select('id,username,country').eq('id', userId).maybeSingle();
      if (_c.error) throw _c.error;
      if (!_c.data) {
        var username = email ? email.split('@')[0] : 'player';
        var cty = detectCountryFlag ? (await detectCountry()) : '';
        await client.from('profiles').insert({ id: userId, username: username, country: cty });
        currentUser.username = username;
        currentUser.country = cty;
      } else {
        // 读取已保存的 profile 信息
        currentUser.username = _c.data.username;
        currentUser.country = _c.data.country || '';
        // 如果还没有国家信息，尝试检测
        if (!currentUser.country && detectCountryFlag) {
          currentUser.country = await detectCountry();
          if (currentUser.country) {
            await client.rpc('update_profile', { p_user_id: userId, p_username: null, p_country: currentUser.country });
          }
        }
      }
    } catch (e) { console.warn('ensureProfile error:', e.message); }
  }

  async function restoreAuthState() {
    const client = Storage.getSupabase();
    if (!client) return;
    try {
      var _s2 = await client.auth.getSession();
      if (_s2.error) throw _s2.error;
      var session = _s2.data.session;
      if (session && session.user) {
        currentUser = {
          id: session.user.id, email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email.split('@')[0],
          country: ''
        };
        await ensureProfile(session.user.id, session.user.email, true);
        updateAuthButton();
        await Storage.syncPullAll();
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (e) {
      console.warn('Auth restore failed:', e.message);
      showToast('登录恢复失败，请重新登录');
    }
  }

  return {
    get currentUser() { return currentUser; },
    set currentUser(v) { currentUser = v; },
    openModal: openAuthModal,
    closeModal: closeAuthModal,
    switchAuthTab: switchAuthTab,
    handleAuthMagicLink: handleAuthMagicLink,
    handleAuthRegister: handleAuthRegister,
    handleAuthLogin: handleAuthLogin,
    restoreState: restoreAuthState,
    updateButton: updateAuthButton,
    logout: handleLogout,
    ensureProfile: ensureProfile,
    saveProfile: saveProfile,
    getSupabase: getSupabase
  };
})();
