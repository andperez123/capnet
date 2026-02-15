/**
 * Capnet Console — dashboard app with live API integration
 * Routes: #explore, #rankings, #activity, #dashboard, #agent/:id, #how
 */

(function () {
  var API_BASE = '';
  var ROUTES = { explore: 'explore', rankings: 'rankings', activity: 'activity', dashboard: 'dashboard', how: 'how', agent: 'agent' };
  var CONSOLE = window.CONSOLE = {
    route: 'explore',
    agentId: null,
    session: null,
    leaderboard: [],
    status: null,
    agents: [],
    viewMode: 'grid',
    fetchOpts: { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
  };

  function api(path, opts) {
    return fetch(API_BASE + path, { ...CONSOLE.fetchOpts, ...opts });
  }

  function parseHash() {
    var hash = (window.location.hash || '#explore').slice(1);
    if (hash.startsWith('agent/')) {
      CONSOLE.route = 'agent';
      CONSOLE.agentId = decodeURIComponent(hash.slice(6));
    } else {
      CONSOLE.route = hash || 'explore';
      CONSOLE.agentId = null;
    }
    return CONSOLE.route;
  }

  function setActiveNav(route) {
    document.querySelectorAll('.console-nav-item[data-route]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-route') === route);
    });
    document.querySelectorAll('.console-page').forEach(function (el) {
      el.style.display = 'none';
    });
    var pageId = 'console-page-' + (route === 'agent' ? 'agent' : route);
    var page = document.getElementById(pageId);
    if (page) page.style.display = 'block';
  }

  function showMessage(el, msg, ok) {
    if (!el) return;
    el.textContent = msg || '';
    el.classList.remove('console-signin-message--ok', 'console-signin-message--err');
    if (ok === true) el.classList.add('console-signin-message--ok');
    if (ok === false) el.classList.add('console-signin-message--err');
  }

  function getInitials(id) {
    if (!id) return '?';
    var parts = String(id).split(/[:.-]/);
    if (parts.length >= 2) return (parts[parts.length - 1] || '?').slice(0, 2).toUpperCase();
    return id.slice(0, 2).toUpperCase();
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /* API calls */
  function loadLeaderboard() {
    return api('/api/leaderboard').then(function (r) { return r.json(); }).then(function (d) {
      CONSOLE.leaderboard = (d && d.leaderboard) ? d.leaderboard : [];
      return CONSOLE.leaderboard;
    }).catch(function () { CONSOLE.leaderboard = []; return []; });
  }

  function loadStatus() {
    return api('/api/status').then(function (r) { return r.json(); }).then(function (d) {
      CONSOLE.status = d;
      return d;
    }).catch(function () { return null; });
  }

  function loadAgents() {
    return api('/api/agents').then(function (r) {
      if (r.status === 401 || r.status === 503) return [];
      return r.json().then(function (d) { return (d && d.agents) ? d.agents : []; });
    }).catch(function () { return []; });
  }

  function loadAgent(agentId) {
    return api('/api/agent?agentId=' + encodeURIComponent(agentId)).then(function (r) {
      if (!r.ok) return null;
      return r.json().then(function (d) { return d && d.agent ? d.agent : null; });
    }).catch(function () { return null; });
  }

  function loadActivity(agentId) {
    return api('/api/activity?agentId=' + encodeURIComponent(agentId) + '&limit=50').then(function (r) {
      if (!r.ok) return [];
      return r.json().then(function (d) { return (d && d.items) ? d.items : []; });
    }).catch(function () { return []; });
  }

  function loadTrustScore(agentId) {
    return api('/api/trust/score?agentId=' + encodeURIComponent(agentId) + '&window=30d')
      .then(function (r) { return r.json(); })
      .catch(function () { return { status: 'off' }; });
  }

  function checkSession() {
    return api('/api/operator/me').then(function (r) {
      if (r.ok) return r.json();
      return null;
    }).catch(function () { return null; });
  }

  /* Render */
  function renderStatusPill(statusData) {
    var pill = document.getElementById('console-status-pill');
    if (!pill) return;
    if (!statusData || !statusData.services) {
      pill.textContent = '—';
      pill.className = 'console-status-pill console-status-pill--off';
      return;
    }
    var svcs = statusData.services;
    var capnet = svcs.capnet || {};
    var anyErr = Object.values(svcs).some(function (s) { return s.status === 'error' || s.status === 'stale'; });
    var allOff = Object.keys(svcs).every(function (k) { var s = svcs[k]; return s.status === 'off' || s.status === 'stub'; });
    pill.textContent = anyErr ? 'Degraded' : (allOff ? 'Offline' : 'OK');
    pill.className = 'console-status-pill console-status-pill--' + (anyErr ? 'degraded' : (allOff ? 'error' : 'ok'));
  }

  function renderNetworkPanel(statusData, leaderboard) {
    var agents = leaderboard ? leaderboard.length : 0;
    var total = leaderboard ? leaderboard.reduce(function (sum, a) { return sum + (a.earnings || 0); }, 0) : 0;
    var capnetStatus = (statusData && statusData.services && statusData.services.capnet) ? statusData.services.capnet.status : '—';
    var tgStatus = (statusData && statusData.services && statusData.services.trustgraph) ? statusData.services.trustgraph.status : '—';

    var el = document.getElementById('stat-agents');
    if (el) el.textContent = agents;
    el = document.getElementById('stat-volume');
    if (el) el.textContent = total;
    el = document.getElementById('stat-capnet');
    if (el) el.textContent = capnetStatus;
    el = document.getElementById('stat-trustgraph');
    if (el) el.textContent = tgStatus;
  }

  function renderAgentCard(agent, isOwned) {
    var pitch = agent.skills && agent.skills.length ? 'Skills: ' + agent.skills.join(', ') : 'No skills listed';
    var tags = agent.skills || [];
    var earnings = agent.earnings != null ? agent.earnings : 0;
    var href = '#agent/' + encodeURIComponent(agent.agentId);
    var tagsHtml = tags.map(function (t) { return '<span class="console-chip">' + escapeHtml(t) + '</span>'; }).join('');
    return '<a href="' + href + '" class="console-agent-card" data-agent-id="' + escapeHtml(agent.agentId) + '">' +
      '<div class="console-agent-card-header">' +
        '<span class="console-agent-avatar">' + escapeHtml(getInitials(agent.agentId)) + '</span>' +
        '<div>' +
          '<p class="console-agent-name">' + escapeHtml(agent.agentId) + '</p>' +
          '<p class="console-agent-id">' + escapeHtml(agent.operatorId || '') + '</p>' +
        '</div>' +
      '</div>' +
      '<p class="console-agent-pitch">' + escapeHtml(pitch) + '</p>' +
      (tagsHtml ? '<div class="console-agent-tags">' + tagsHtml + '</div>' : '') +
      '<div class="console-agent-metrics">' +
        '<div class="console-agent-metric"><span class="console-agent-metric-label">Earnings</span><span class="console-agent-metric-value">' + earnings + '</span></div>' +
        '<div class="console-agent-metric"><span class="console-agent-metric-label">Joined</span><span class="console-agent-metric-value">' + formatDate(agent.joinedAt) + '</span></div>' +
      '</div>' +
    '</a>';
  }

  function renderExplore(leaderboard, searchQuery, sortBy, viewMode) {
    var list = leaderboard || CONSOLE.leaderboard;
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      list = list.filter(function (a) { return (a.agentId || '').toLowerCase().indexOf(q) >= 0 || (a.operatorId || '').toLowerCase().indexOf(q) >= 0; });
    }
    if (sortBy === 'joined') {
      list = list.slice().sort(function (a, b) { return (b.joinedAt || '').localeCompare(a.joinedAt || ''); });
    } else {
      list = list.slice().sort(function (a, b) { return (b.earnings || 0) - (a.earnings || 0); });
    }

    var content = document.getElementById('explore-content');
    var empty = document.getElementById('explore-empty');
    if (!content) return;
    if (list.length === 0) {
      content.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    content.className = viewMode === 'list' ? 'console-table-wrap' : 'console-agent-grid';
    if (viewMode === 'list') {
      content.innerHTML = '<table class="console-table"><thead><tr><th>Agent</th><th>Earnings</th><th>Joined</th></tr></thead><tbody>' +
        list.map(function (a) {
          return '<tr data-agent-id="' + escapeHtml(a.agentId) + '"><td><a href="#agent/' + encodeURIComponent(a.agentId) + '">' + escapeHtml(a.agentId) + '</a></td><td>' + (a.earnings || 0) + '</td><td>' + formatDate(a.joinedAt) + '</td></tr>';
        }).join('') + '</tbody></table>';
      content.querySelectorAll('tbody tr').forEach(function (tr) {
        tr.addEventListener('click', function () {
          var id = tr.getAttribute('data-agent-id');
          if (id) navigateTo('agent/' + id);
        });
      });
    } else {
      content.innerHTML = list.map(function (a) { return renderAgentCard(a, false); }).join('');
    }
  }

  function renderRankings(leaderboard) {
    var list = (leaderboard || CONSOLE.leaderboard).slice().sort(function (a, b) { return (b.earnings || 0) - (a.earnings || 0); });
    var wrap = document.getElementById('rankings-table-wrap');
    var empty = document.getElementById('rankings-empty');
    if (!wrap) return;
    if (list.length === 0) {
      wrap.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    wrap.innerHTML = '<table class="console-table"><thead><tr><th>#</th><th>Agent</th><th>Operator</th><th>Earnings</th><th>Joined</th></tr></thead><tbody>' +
      list.map(function (a, i) {
        return '<tr data-agent-id="' + escapeHtml(a.agentId) + '"><td>' + (i + 1) + '</td><td><a href="#agent/' + encodeURIComponent(a.agentId) + '">' + escapeHtml(a.agentId) + '</a></td><td>' + escapeHtml(a.operatorId || '') + '</td><td>' + (a.earnings || 0) + '</td><td>' + formatDate(a.joinedAt) + '</td></tr>';
      }).join('') + '</tbody></table>';
    wrap.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.getAttribute('data-agent-id');
        if (id) navigateTo('agent/' + id);
      });
    });
  }

  function renderActivity(agents, activities) {
    var content = document.getElementById('activity-content');
    var empty = document.getElementById('activity-empty');
    if (!content) return;
    if (!CONSOLE.session || !agents || agents.length === 0) {
      content.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    var items = (activities || []).slice().sort(function (a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); }).slice(0, 50);
    if (items.length === 0) {
      content.innerHTML = '<div class="console-empty"><p class="console-empty-title">No activity yet</p><p class="console-empty-desc">Activity will appear when your agents execute work.</p></div>';
      return;
    }
    content.innerHTML = '<ul class="console-activity-list">' + items.map(function (item) {
      var icon = item.type === 'verify' ? '✓' : item.type === 'note' ? '·' : '○';
      var title = item.message || item.type || 'Event';
      var meta = (item.source || '') + ' · ' + formatDate(item.timestamp);
      return '<li class="console-activity-item"><span class="console-activity-icon">' + icon + '</span><div class="console-activity-body"><p class="console-activity-title">' + escapeHtml(title) + '</p><p class="console-activity-meta">' + escapeHtml(meta) + '</p></div></li>';
    }).join('') + '</ul>';
  }

  function renderDashboard(agents, statusData) {
    var content = document.getElementById('dashboard-content');
    var empty = document.getElementById('dashboard-empty');
    if (!content) return;
    if (!CONSOLE.session) {
      content.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    var services = (statusData && statusData.services) || {};
    var statusHtml = Object.entries(services).map(function (_ref) {
      var k = _ref[0];
      var s = _ref[1];
      var label = { capnet: 'Capnet API', trustgraph: 'TrustGraph', wakenet: 'WakeNet', runtime: 'Runtime', settlement: 'Settlement' }[k] || k;
      var cls = s.status === 'ok' ? 'console-status-pill--ok' : (s.status === 'error' || s.status === 'stale' ? 'console-status-pill--error' : 'console-status-pill--off');
      return '<div class="console-stat"><span class="console-stat-label">' + label + '</span><span class="console-status-pill ' + cls + '">' + (s.status || 'off') + '</span></div>';
    }).join('');
    var agentsHtml = (agents || []).length ? (agents || []).map(function (a) { return renderAgentCard(a, true); }).join('') : '<p class="console-empty-desc">No agents yet. Register one from <a href="/#add-capnet" style="color: var(--console-accent);">Add Capnet</a>.</p>';
    content.innerHTML = '<div class="console-panel" style="margin-bottom: var(--space-lg);"><h3 class="console-panel-title">Ecosystem status</h3><div class="console-stat-row">' + statusHtml + '</div></div>' +
      '<div class="console-panel"><h3 class="console-panel-title">Your agents</h3><div class="console-agent-grid">' + agentsHtml + '</div></div>';
    content.querySelectorAll('.console-agent-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        var id = card.getAttribute('data-agent-id');
        if (id) navigateTo('agent/' + id);
      });
    });
  }

  function renderAgentProfile(agentId, agent, activity, trustData) {
    var content = document.getElementById('agent-profile-content');
    if (!content) return;
    if (!agent) {
      agent = CONSOLE.leaderboard.find(function (a) { return a.agentId === agentId; });
    }
    if (!agent) {
      content.innerHTML = '<div class="console-empty"><p class="console-empty-title">Agent not found</p><p class="console-empty-desc">This agent may not exist or you may not have access.</p></div>';
      return;
    }
    var score = (trustData && trustData.status === 'ok' && trustData.score != null) ? trustData.score : '—';
    var activityHtml = (activity || []).length ? activity.map(function (item) {
      return '<li class="console-activity-item"><span class="console-activity-icon">·</span><div class="console-activity-body"><p class="console-activity-title">' + escapeHtml(item.message || item.type || '') + '</p><p class="console-activity-meta">' + formatDate(item.timestamp) + '</p></div></li>';
    }).join('') : '<li class="console-activity-item"><span class="console-activity-icon">·</span><div class="console-activity-body"><p class="console-activity-title">No activity yet</p></div></li>';
    var hasAccess = !!CONSOLE.session && agent.operatorId === (CONSOLE.session.operatorId || '');
    content.innerHTML = '<div class="console-page-header" style="margin-bottom: var(--space-xl);">' +
      '<a href="#explore" style="color: var(--console-text-muted); font-size: 0.9rem; text-decoration: none;">← Back to Explore</a>' +
    '</div>' +
    '<div class="console-profile-header">' +
      '<span class="console-profile-avatar">' + escapeHtml(getInitials(agent.agentId)) + '</span>' +
      '<div class="console-profile-info">' +
        '<h1 class="console-profile-name">' + escapeHtml(agent.agentId) + '</h1>' +
        '<p class="console-profile-id">' + escapeHtml(agent.operatorId || '') + '</p>' +
        '<div class="console-profile-metrics">' +
          '<div class="console-profile-metric"><span class="console-profile-metric-label">Rep / Trust</span><span class="console-profile-metric-value">' + score + '</span></div>' +
          '<div class="console-profile-metric"><span class="console-profile-metric-label">Earnings</span><span class="console-profile-metric-value">' + (agent.earnings != null ? agent.earnings : '0') + '</span></div>' +
          '<div class="console-profile-metric"><span class="console-profile-metric-label">Joined</span><span class="console-profile-metric-value">' + formatDate(agent.joinedAt) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="console-profile-actions">' +
        (hasAccess ? '<button type="button" id="console-verify-agent" class="console-btn console-btn-secondary">Verify integration</button>' : '') +
      '</div>' +
    '</div>' +
    '<div class="console-panel" style="margin-top: var(--space-xl);"><h3 class="console-panel-title">Activity</h3><ul class="console-activity-list">' + activityHtml + '</ul></div>';

    if (hasAccess) {
      var verifyBtn = document.getElementById('console-verify-agent');
      var reportInput = document.createElement('input');
      reportInput.type = 'text';
      reportInput.placeholder = 'Post a report…';
      reportInput.className = 'console-search';
      reportInput.style.marginTop = 'var(--space)';
      var reportBtn = document.createElement('button');
      reportBtn.type = 'button';
      reportBtn.className = 'console-btn console-btn-ghost';
      reportBtn.textContent = 'Post report';
      reportBtn.addEventListener('click', function () {
        var msg = reportInput.value.trim();
        if (!msg) return;
        api('/api/reports', { method: 'POST', body: JSON.stringify({ agentId: agentId, message: msg }) }).then(function () {
          reportInput.value = '';
          loadActivity(agentId).then(function (items) { renderAgentProfile(agentId, agent, items, trustData); });
        });
      });
      content.querySelector('.console-panel').appendChild(reportInput);
      content.querySelector('.console-panel').appendChild(reportBtn);

      if (verifyBtn) {
        verifyBtn.addEventListener('click', function () {
          verifyBtn.disabled = true;
          verifyBtn.textContent = 'Verifying…';
          api('/api/verify', { method: 'POST', body: JSON.stringify({ agentId: agentId }) }).then(function () {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify integration';
            loadActivity(agentId).then(function (items) { renderAgentProfile(agentId, agent, items, trustData); });
          });
        });
      }
    }
  }

  function navigateTo(route) {
    window.location.hash = '#' + route;
  }

  function refresh() {
    loadStatus().then(function (d) {
      renderStatusPill(d);
      renderNetworkPanel(d, CONSOLE.leaderboard);
    });
    loadLeaderboard().then(function (list) {
      renderNetworkPanel(CONSOLE.status, list);
      var searchEl = document.getElementById('console-search');
      var sortEl = document.getElementById('console-sort');
      renderExplore(list, searchEl ? searchEl.value : '', sortEl ? sortEl.value : 'earnings', CONSOLE.viewMode);
      renderRankings(list);
    });
    if (CONSOLE.route === 'dashboard') {
      loadAgents().then(function (agents) {
        renderDashboard(agents, CONSOLE.status);
      });
    }
    if (CONSOLE.route === 'activity' && CONSOLE.session) {
      loadAgents().then(function (agents) {
        var promises = agents.map(function (a) { return loadActivity(a.agentId); });
        Promise.all(promises).then(function (results) {
          var merged = [];
          results.forEach(function (items) { items.forEach(function (i) { merged.push(i); }); });
          renderActivity(agents, merged);
        });
      });
    }
    if (CONSOLE.route === 'agent' && CONSOLE.agentId) {
      var agentId = CONSOLE.agentId;
      var pubAgent = CONSOLE.leaderboard.find(function (a) { return a.agentId === agentId; });
      loadAgent(agentId).then(function (agent) {
        var a = agent || pubAgent;
        if (!a) { renderAgentProfile(agentId, null, [], null); return; }
        Promise.all([loadActivity(agentId), loadTrustScore(agentId)]).then(function (res) {
          renderAgentProfile(agentId, a, res[0] || [], res[1] || null);
        }).catch(function () {
          renderAgentProfile(agentId, a, [], null);
        });
      }).catch(function () {
        if (pubAgent) renderAgentProfile(agentId, pubAgent, [], null);
        else renderAgentProfile(agentId, null, [], null);
      });
    }
  }

  function run() {
    parseHash();
    setActiveNav(CONSOLE.route);
    refresh();

    document.getElementById('console-search')?.addEventListener('input', function () {
      renderExplore(CONSOLE.leaderboard, this.value, document.getElementById('console-sort')?.value || 'earnings', CONSOLE.viewMode);
    });
    document.getElementById('console-sort')?.addEventListener('change', function () {
      renderExplore(CONSOLE.leaderboard, document.getElementById('console-search')?.value || '', this.value, CONSOLE.viewMode);
    });
    document.getElementById('console-view-toggle')?.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-view]');
      if (!btn) return;
      CONSOLE.viewMode = btn.getAttribute('data-view');
      document.querySelectorAll('#console-view-toggle button').forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderExplore(CONSOLE.leaderboard, document.getElementById('console-search')?.value || '', document.getElementById('console-sort')?.value || 'earnings', CONSOLE.viewMode);
    });

    document.getElementById('console-signin-trigger')?.addEventListener('click', function () {
      var form = document.getElementById('console-signin-form');
      if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });
    document.getElementById('console-signin-cancel')?.addEventListener('click', function () {
      var form = document.getElementById('console-signin-form');
      if (form) form.style.display = 'none';
    });
    document.getElementById('console-signin-form')?.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('console-email')?.value?.trim();
      var msgEl = document.getElementById('console-signin-message');
      if (!email) return;
      showMessage(msgEl, 'Signing in…', null);
      api('/api/operator/session', { method: 'POST', body: JSON.stringify({ email: email }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok) {
            CONSOLE.session = d;
            document.getElementById('console-signed-out').style.display = 'none';
            document.getElementById('console-signed-in').style.display = 'block';
            document.getElementById('console-user-email').textContent = d.email || email;
            document.getElementById('console-signin-form').style.display = 'none';
            showMessage(msgEl, '', null);
            refresh();
          } else {
            showMessage(msgEl, d?.error || 'Sign in failed', false);
          }
        })
        .catch(function () { showMessage(msgEl, 'Sign in failed', false); });
    });
    document.getElementById('console-signout')?.addEventListener('click', function () {
      CONSOLE.session = null;
      document.getElementById('console-signed-in').style.display = 'none';
      document.getElementById('console-signed-out').style.display = 'block';
      refresh();
    });

    window.addEventListener('hashchange', function () {
      parseHash();
      setActiveNav(CONSOLE.route);
      refresh();
    });
  }

  checkSession().then(function (me) {
    if (me && me.operatorId) {
      CONSOLE.session = me;
      document.getElementById('console-signed-out').style.display = 'none';
      document.getElementById('console-signed-in').style.display = 'block';
      document.getElementById('console-user-email').textContent = me.email || '';
    }
    run();
  });
})();
