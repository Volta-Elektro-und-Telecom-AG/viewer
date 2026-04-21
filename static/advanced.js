

// ── Update check & run ────────────────────────────────────────────────────────

async function checkUpdate() {
  const badge  = document.getElementById('updateBadge');
  const meta   = document.getElementById('updateMeta');
  const commits = document.getElementById('updateCommits');
  const btn    = document.getElementById('updateBtn');
  const status = document.getElementById('updateStatus');

  badge.className = 'update-badge checking';
  badge.textContent = '⬤ Wird geprüft…';
  meta.textContent  = '';
  commits.innerHTML = '';

  try {
    const r = await fetch('api.php?action=check_update');
    const d = await r.json();

    if (d.error) throw new Error(d.error);

    meta.textContent = `Aktueller Stand: ${d.current_hash}  (${d.branch})` +
      (d.current_date ? `  ·  ${d.current_date.slice(0,10)}` : '');

    if (d.up_to_date) {
      badge.className   = 'update-badge current';
      badge.textContent = '✔ Aktuell';
      btn.disabled = true;
      status.textContent = '';
    } else {
      badge.className   = 'update-badge outdated';
      badge.textContent = `⬤ Nicht aktuell  (+${d.behind})`;
      btn.disabled = false;

      if (d.commits && d.commits.length) {
        commits.innerHTML = d.commits
          .map(c => `<span>▸ ${escHtml(c)}</span>`)
          .join('<br>');
        if (d.changelog_url) {
          commits.innerHTML += `<br><a href="${d.changelog_url}" target="_blank" rel="noopener">→ Alle Änderungen auf GitHub</a>`;
        }
      }
    }
  } catch (e) {
    badge.className   = 'update-badge error';
    badge.textContent = '✘ Fehler';
    meta.textContent  = e.message || 'Unbekannter Fehler';
    btn.disabled = false; // allow manual retry via update
  }
}

async function doUpdate() {
  const btn    = document.getElementById('updateBtn');
  const status = document.getElementById('updateStatus');
  const badge  = document.getElementById('updateBadge');

  btn.disabled = true;
  badge.className = 'update-badge checking';
  badge.textContent = '⬤ Wird aktualisiert…';
  status.textContent = '⏳ Update läuft…';

  try {
    const r = await fetch('api.php?action=do_update');
    const d = await r.json();

    if (d.ok) {
      status.textContent = `✔ Fertig  (${d.new_hash || 'OK'})`;
      await checkUpdate(); // refresh badge
    } else {
      status.textContent = `✘ Fehler (Code ${d.code})`;
      if (d.output) status.title = d.output;
      badge.className = 'update-badge error';
      badge.textContent = '✘ Fehler';
      btn.disabled = false;
    }
  } catch (e) {
    status.textContent = '✘ Netzwerkfehler';
    badge.className = 'update-badge error';
    badge.textContent = '✘ Fehler';
    btn.disabled = false;
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Run check on page load
checkUpdate();

// ═══════════════════════════════════════════════════════════════════════════
//  SCHEDULING — CEC / DISPLAY RULES
// ═══════════════════════════════════════════════════════════════════════════

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABELS = { mon:'Mo', tue:'Tu', wed:'We', thu:'Th', fri:'Fr', sat:'Sa', sun:'Su' };

let scheduleRules  = [];   // current rule set
let editingRuleId  = null; // null = adding, string = editing

// ── Init ──────────────────────────────────────────────────────────────────

(function initSchedule() {
  // Build day checkboxes
  const wrap = document.getElementById('dayCheckboxes');
  DAYS.forEach(d => {
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px';
    lbl.innerHTML = `<input type="checkbox" id="day_${d}" value="${d}"> ${DAY_LABELS[d]}`;
    wrap.appendChild(lbl);
  });

  loadSchedule();
  checkCron();
})();

// ── Cron ──────────────────────────────────────────────────────────────────

async function checkCron() {
  const badge  = document.getElementById('cronBadge');
  const btn    = document.getElementById('installCronBtn');
  try {
    const r = await fetch('api.php?action=check_cron');
    const d = await r.json();
    if (d.installed) {
      badge.className   = 'update-badge current';
      badge.textContent = '✔ Cron active';
      btn.disabled = true;
      btn.textContent = '✔ INSTALLED';
    } else {
      badge.className   = 'update-badge outdated';
      badge.textContent = '⬤ Cron not installed';
      btn.disabled = false;
    }
  } catch(e) {
    badge.className   = 'update-badge error';
    badge.textContent = '✘ Check failed';
    btn.disabled = false;
  }
}

async function installCron() {
  const btn    = document.getElementById('installCronBtn');
  const status = document.getElementById('cronStatus');
  btn.disabled = true;
  status.textContent = '⏳ Installing…';
  try {
    const r = await fetch('api.php?action=install_cron');
    const d = await r.json();
    if (d.ok) {
      status.textContent = '✔ Done';
      checkCron();
    } else {
      status.textContent = `✘ ${d.output || d.error || 'Error'}`;
      btn.disabled = false;
    }
  } catch(e) {
    status.textContent = '✘ Network error';
    btn.disabled = false;
  }
}

// ── Load & render rules ───────────────────────────────────────────────────

async function loadSchedule() {
  try {
    const r = await fetch('api.php?action=get_schedule');
    const d = await r.json();
    scheduleRules = d.rules || [];
    renderRules();
  } catch(e) {
    document.getElementById('scheduleRules').innerHTML =
      `<div class="pref-label" style="color:red">✘ Failed to load schedule</div>`;
  }
}

function renderRules() {
  const el = document.getElementById('scheduleRules');
  if (scheduleRules.length === 0) {
    el.innerHTML = `<div style="opacity:.5;font-size:13px;padding:6px 0">No rules yet. Add one below.</div>`;
    return;
  }

  el.innerHTML = scheduleRules.map(r => {
    const daysStr = (!r.days || r.days.length === 0)
      ? '<span style="opacity:.5">Every day</span>'
      : r.days.map(d => `<span class="day-chip${r.days.includes(d) ? ' active' : ''}">${DAY_LABELS[d]}</span>`).join('');

    return `
    <div class="rule-row" id="rule_${r.id}">
      <div class="rule-meta">
        <span class="rule-time">${escHtml(r.time)}</span>
        <span class="rule-label">${escHtml(r.label || '—')}</span>
        <span class="rule-days">${daysStr}</span>
        <code class="rule-cmd">${escHtml(r.command || '')}</code>
      </div>
      <div class="rule-actions">
        <label class="toggle" title="Enable/disable">
          <input type="checkbox" ${r.enabled ? 'checked' : ''}
            onchange="toggleRule('${r.id}', this.checked)">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
        <button class="refresh-cmd-btn run-btn" style="padding:3px 10px;font-size:11px"
          onclick="runRuleNow('${r.id}')">▶ RUN</button>
        <button class="refresh-cmd-btn" style="padding:3px 10px;font-size:11px"
          onclick="editRule('${r.id}')">✎ EDIT</button>
        <button class="refresh-cmd-btn" style="padding:3px 10px;font-size:11px;opacity:.6"
          onclick="deleteRule('${r.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ── CRUD helpers ──────────────────────────────────────────────────────────

function getFormValues() {
  return {
    label:   document.getElementById('ruleLabel').value.trim(),
    time:    document.getElementById('ruleTime').value,
    command: document.getElementById('ruleCommand').value.trim(),
    days:    DAYS.filter(d => document.getElementById('day_' + d)?.checked),
  };
}

function clearRuleForm() {
  document.getElementById('ruleLabel').value   = '';
  document.getElementById('ruleTime').value    = '08:00';
  document.getElementById('ruleCommand').value = '';
  DAYS.forEach(d => { const el = document.getElementById('day_' + d); if (el) el.checked = false; });
  document.getElementById('ruleFormTitle').textContent = 'ADD RULE';
  document.getElementById('ruleFormStatus').textContent = '';
  editingRuleId = null;
}

function editRule(id) {
  const rule = scheduleRules.find(r => r.id === id);
  if (!rule) return;
  editingRuleId = id;
  document.getElementById('ruleLabel').value   = rule.label   || '';
  document.getElementById('ruleTime').value    = rule.time    || '08:00';
  document.getElementById('ruleCommand').value = rule.command || '';
  DAYS.forEach(d => {
    const el = document.getElementById('day_' + d);
    if (el) el.checked = (rule.days || []).includes(d);
  });
  document.getElementById('ruleFormTitle').textContent = 'EDIT RULE';
  document.getElementById('ruleForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveRule() {
  const status = document.getElementById('ruleFormStatus');
  const vals = getFormValues();

  if (!vals.time)    { status.textContent = '✘ Time is required';    return; }
  if (!vals.command) { status.textContent = '✘ Command is required'; return; }

  if (editingRuleId) {
    const idx = scheduleRules.findIndex(r => r.id === editingRuleId);
    if (idx !== -1) {
      scheduleRules[idx] = { ...scheduleRules[idx], ...vals };
    }
  } else {
    scheduleRules.push({
      id:      'r' + Date.now(),
      enabled: true,
      ...vals,
    });
  }

  status.textContent = '⏳ Saving…';
  const ok = await persistSchedule();
  if (ok) {
    status.textContent = '✔ Saved';
    clearRuleForm();
    renderRules();
    setTimeout(() => { status.textContent = ''; }, 2000);
  } else {
    status.textContent = '✘ Save failed';
  }
}

async function deleteRule(id) {
  if (!confirm('Delete this rule?')) return;
  scheduleRules = scheduleRules.filter(r => r.id !== id);
  await persistSchedule();
  renderRules();
}

async function toggleRule(id, enabled) {
  const rule = scheduleRules.find(r => r.id === id);
  if (rule) rule.enabled = enabled;
  await persistSchedule();
}

async function persistSchedule() {
  try {
    const r = await fetch('api.php?action=save_schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: scheduleRules }),
    });
    const d = await r.json();
    return !!d.ok;
  } catch { return false; }
}

// ── Manual run ────────────────────────────────────────────────────────────

async function runRuleNow(id) {
  const btn = document.querySelector(`#rule_${id} .run-btn`);
  const orig = btn ? btn.textContent : '';
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  try {
    const r = await fetch('api.php?action=run_rule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    if (btn) {
      btn.textContent = d.ok ? '✔ OK' : `✘ ${d.code}`;
      if (d.output) btn.title = d.output;
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; btn.title = ''; }, 3000);
    }
    // refresh log if open
    const logEl = document.getElementById('scheduleLog');
    if (logEl.style.display !== 'none') loadLog();
  } catch(e) {
    if (btn) { btn.textContent = '✘ err'; btn.disabled = false; }
  }
}

// ── Log ───────────────────────────────────────────────────────────────────

let logVisible = false;

function toggleLog() {
  const el   = document.getElementById('scheduleLog');
  const hint = document.getElementById('logToggleHint');
  logVisible = !logVisible;
  el.style.display = logVisible ? 'block' : 'none';
  hint.textContent  = logVisible ? '(click to hide)' : '(click to show)';
  if (logVisible) loadLog();
}

async function loadLog() {
  const el = document.getElementById('scheduleLog');
  try {
    const r = await fetch('api.php?action=get_schedule_log');
    const entries = await r.json();
    if (!entries.length) {
      el.innerHTML = `<div style="opacity:.5;font-size:12px">No entries yet.</div>`;
      return;
    }
    el.innerHTML = entries.map(e => `
      <div class="log-entry ${e.code === 0 ? 'ok' : 'err'}">
        <span class="log-ts">${escHtml(e.ts)}</span>
        <span class="log-label">${escHtml(e.label || e.id)}</span>
        ${e.manual ? '<span class="log-manual">manual</span>' : ''}
        <span class="log-code">${e.code === 0 ? '✔' : `✘ ${e.code}`}</span>
        ${e.out ? `<span class="log-out" title="${escHtml(e.out)}">[output]</span>` : ''}
      </div>`).join('');
  } catch(e) {
    el.innerHTML = `<div style="color:red;font-size:12px">Failed to load log</div>`;
  }
}
