// Capnet Operator Console — session, status, agents, verify
(function () {
  var CONSOLE = window.CONSOLE = {
    session: null,
    selectedAgentId: null,
    fetchOpts: { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
  };

  function api(base, opts) {
    return fetch(base, { ...CONSOLE.fetchOpts, ...opts });
  }

  function showMessage(el, msg, ok) {
    if (!el) return;
    el.textContent = msg || '';
    el.classList.remove('waitlist-message--error', 'waitlist-message--ok');
    if (ok != null) el.classList.add(ok ? 'waitlist-message--ok' : 'waitlist-message--error');
  }

  function checkSession() {
    return api('/api/operator/me').then(function (r) {
      if (r.ok) return r.json();
      return null;
    });
  }

  function loadStatus() {
    return api('/api/status').then(function (r) { return r.json(); });
  }

  function loadAgents() {
    return api('/api/agents').then(function (r) {
      if (r.status === 401 || r.status === 503) return { agents: [] };
      return r.json();
    });
  }

  function loadActivity(agentId) {
    return api('/api/activity?agentId=' + encodeURIComponent(agentId) + '&limit=50').then(function (r) {
      if (!r.ok) return [];
      return r.json().then(function (d) { return d.items || []; });
    });
  }

  function loadTrustScore(agentId) {
    return api('/api/trust/score?agentId=' + encodeURIComponent(agentId) + '&window=30d').then(function (r) {
      return r.json();
    });
  }

  function renderStatusGrid(data) {
    var grid = document.getElementById('console-status-grid');
    if (!grid) return;
    var services = (data && data.services) || {};
    var pill = document.getElementById('console-status-pill');
    var anyError = Object.values(services).some(function (s) { return s.status === 'error' || s.status === 'stale'; });
    var allOff = Object.keys(services).length && Object.values(services).every(function (s) { return s.status === 'off' || s.status === 'stub'; });
    if (pill) {
      pill.textContent = anyError ? 'Degraded' : (allOff ? 'Offline' : 'OK');
      pill.className = 'status-pill status-pill--' + (anyError ? 'degraded' : (allOff ? 'error' : 'ok'));
    }
    var names = { capnet: 'Capnet API', trustgraph: 'TrustGraph', wakenet: 'WakeNet', runtime: 'Runtime', settlement: 'Settlement' };
    grid.innerHTML = Object.keys(names).map(function (k) {
      var s = services[k] || { status: 'off', latencyMs: null };
      return '<article class="feature-card"><h3 class="feature-name">' + names[k] + '</h3><p><span class="status-pill status-pill--' + (s.status === 'ok' ? 'ok' : (s.status === 'error' || s.status === 'stale' ? 'error' : 'pending')) + '">' + (s.status || 'off') + '</span></p><p class="mcp-step" style="margin-top:0.5rem">' + (s.latencyMs != null ? s.latencyMs + 'ms' : '—') + '</p></article>';
    }).join('');
  }

  function renderAgents(agents) {
    var tbody = document.getElementById('console-agents-tbody');
    var empty = document.getElementById('console-agents-empty');
    if (!tbody) return;
    agents = agents || [];
    empty.style.display = agents.length ? 'none' : 'block';
    tbody.innerHTML = agents.map(function (a) {
      return '<tr data-agent-id="' + (a.agentId || '').replace(/"/g, '&quot;') + '"><td>' + (a.agentId || '') + '</td><td>' + (a.activationStatus || '—') + '</td><td class="agent-score">—</td><td>' + (a.updatedAt || a.joinedAt || '—') + '</td></tr>';
    }).join('');
    tbody.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.getAttribute('data-agent-id');
        if (id) CONSOLE.selectedAgentId = id;
        CONSOLE.showAgentDetails(id);
      });
    });
    agents.forEach(function (a) {
      loadTrustScore(a.agentId).then(function (d) {
        var scoreCell = tbody.querySelector('tr[data-agent-id="' + (a.agentId || '').replace(/"/g, '&quot;') + '"] .agent-score');
        if (scoreCell) scoreCell.textContent = (d && d.status === 'ok' && d.score != null) ? d.score : '—';
      });
    });
  }

  CONSOLE.showAgentDetails = function (agentId) {
    var details = document.getElementById('console-agent-details');
    var idEl = document.getElementById('console-detail-agent-id');
    var scoreEl = document.getElementById('console-detail-score');
    var listEl = document.getElementById('console-activity-list');
    var reportInput = document.getElementById('console-report-message');
    var reportBtn = document.getElementById('console-report-btn');
    if (!agentId) {
      if (details) details.style.display = 'none';
      return;
    }
    if (idEl) idEl.textContent = agentId;
    if (details) details.style.display = 'block';
    if (scoreEl) scoreEl.textContent = '—';
    if (listEl) listEl.innerHTML = '<li>Loading…</li>';
    loadTrustScore(agentId).then(function (d) {
      if (scoreEl) scoreEl.textContent = (d && d.status === 'ok' && d.score != null) ? d.score : '—';
    });
    loadActivity(agentId).then(function (items) {
      if (listEl) listEl.innerHTML = items.length ? items.map(function (x) { return '<li>' + (x.message || x.type || '') + ' <small>' + (x.timestamp || '') + '</small></li>'; }).join('') : '<li>No activity yet</li>';
    });
    if (reportBtn) {
      reportBtn.onclick = function () {
        var msg = (reportInput && reportInput.value) || '';
        if (!msg.trim()) return;
        api('/api/reports', { method: 'POST', body: JSON.stringify({ agentId: agentId, message: msg }) }).then(function (r) {
          return r.json();
        }).then(function () {
          if (reportInput) reportInput.value = '';
          showMessage(document.getElementById('console-report-message-out'), 'Report added.', true);
          loadActivity(agentId).then(function (items) {
            if (listEl) listEl.innerHTML = items.map(function (x) { return '<li>' + (x.message || x.type || '') + ' <small>' + (x.timestamp || '') + '</small></li>'; }).join('');
          });
        });
      };
    }
    var verifyBtn = document.getElementById('console-verify-btn');
    if (verifyBtn) {
      verifyBtn.onclick = function () {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying…';
        api('/api/verify', { method: 'POST', body: JSON.stringify({ agentId: agentId }) }).then(function (r) {
          return r.json();
        }).then(function () {
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify integration';
          loadActivity(agentId).then(function (items) {
            if (listEl) listEl.innerHTML = items.map(function (x) { return '<li>' + (x.message || x.type || '') + ' <small>' + (x.timestamp || '') + '</small></li>'; }).join('');
          });
        });
      };
    }
  };

  var signinEl = document.getElementById('console-signin');
  var authEl = document.getElementById('console-authenticated');
  var signinForm = document.getElementById('console-signin-form');
  var signinMsg = document.getElementById('console-signin-message');

  if (signinForm) {
    signinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (document.getElementById('console-email') || {}).value.trim();
      if (!email) return;
      showMessage(signinMsg, 'Signing in…', null);
      api('/api/operator/session', { method: 'POST', body: JSON.stringify({ email: email }) })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            CONSOLE.session = data;
            signinEl.style.display = 'none';
            authEl.style.display = 'block';
            document.getElementById('console-operator-id').textContent = data.operatorId || '';
            document.getElementById('console-operator-email').textContent = data.email || '';
            loadStatus().then(renderStatusGrid);
            loadAgents().then(function (d) { renderAgents((d && d.agents) || []); });
          } else {
            showMessage(signinMsg, data.error || 'Sign in failed', false);
          }
        })
        .catch(function () {
          showMessage(signinMsg, 'Sign in failed. Is KV configured?', false);
        });
    });
  }

  var registerBtn = document.getElementById('console-register-agent');
  if (registerBtn) {
    registerBtn.addEventListener('click', function () {
      var agentId = (document.getElementById('console-agent-id') || {}).value.trim();
      var skillsStr = (document.getElementById('console-agent-skills') || {}).value.trim();
      var msgEl = document.getElementById('console-register-message');
      if (!agentId) {
        showMessage(msgEl, 'Agent ID required', false);
        return;
      }
      var skills = skillsStr ? skillsStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
      showMessage(msgEl, 'Registering…', null);
      api('/api/register-agent', { method: 'POST', body: JSON.stringify({ agentId: agentId, skills: skills }) })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            showMessage(msgEl, data.message || 'Agent registered.', true);
            document.getElementById('console-agent-id').value = '';
            document.getElementById('console-agent-skills').value = '';
            loadAgents().then(function (d) { renderAgents((d && d.agents) || []); });
          } else {
            showMessage(msgEl, data.error || 'Registration failed', false);
          }
        })
        .catch(function () {
          showMessage(msgEl, 'Registration failed', false);
        });
    });
  }

  checkSession().then(function (me) {
    if (me && me.ok) {
      CONSOLE.session = me;
      if (signinEl) signinEl.style.display = 'none';
      if (authEl) authEl.style.display = 'block';
      document.getElementById('console-operator-id').textContent = me.operatorId || '';
      document.getElementById('console-operator-email').textContent = me.email || '';
      loadStatus().then(renderStatusGrid);
      loadAgents().then(function (d) { renderAgents((d && d.agents) || []); });
    }
  });
})();
