<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Advanced Settings</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="static/style.css">
<link rel="icon" href="https://avatars.githubusercontent.com/u/175005826?v=4&size=64">
</head>
<body class="admin-body settings-body">
<div id="topbar">
  <div class="topbar-left">
    <div class="logo"><span class="logo-icon">▣</span><span class="logo-text">SIGNAGE</span><span class="logo-sub">SETTINGS</span></div>
  </div>
  <div class="topbar-center"></div>
  <div class="topbar-right">
    <select  class="topbar-btn" id="themeSelect">
      <option value="dark">Dark</option>
      <option value="white">White</option>
    </select>
    <a href="settings.php" class="topbar-btn">⚙ SETTINGS</a>
    <a href="admin.php" class="topbar-btn highlight">← EDITOR</a>
  </div>
</div>

<div id="settingsLayout">

  <!-- ── UPDATE ─────────────────────────────────── -->
  <div class="settings-col">
    <div class="settings-card">
      <div class="settings-card-title">
        UPDATE
        <span id="updateBadge" class="update-badge checking">⬤ Wird geprüft…</span>
      </div>
      <div class="pref-row pref-row--col">
        <div class="pref-info">
          <div class="pref-label">Anwendung aktualisieren</div>
          <div class="pref-desc">
            Aktualisiert den Code aus GitHub via <code>update.sh</code>.
            Assets (<code>assets/</code>), <code>state.json</code> und der Refresh-Befehl bleiben erhalten.
          </div>
          <div class="update-meta" id="updateMeta"></div>
          <div class="update-commits" id="updateCommits"></div>
        </div>
        <div class="refresh-run-row">
          <button class="refresh-cmd-btn run-btn" id="updateBtn" onclick="doUpdate()" disabled>↑ AKTUALISIEREN</button>
          <span id="updateStatus" class="refresh-status"></span>
        </div>
      </div>
    </div>
  </div>



<?php
$isLinux = strtoupper(substr(PHP_OS, 0, 5)) === 'LINUX';

if ($isLinux) {

    // --- System Metrics ---
    $cpuLoad = sys_getloadavg()[0];

    $memInfo = file_get_contents("/proc/meminfo");
    preg_match("/MemTotal:\s+(\d+)/", $memInfo, $totalMem);
    preg_match("/MemAvailable:\s+(\d+)/", $memInfo, $availableMem);
    $usedMem = $totalMem[1] - $availableMem[1];

    $diskTotal = disk_total_space("/");
    $diskFree = disk_free_space("/");
    $diskUsed = $diskTotal - $diskFree;

    $temp = @exec("vcgencmd measure_temp") ?: "N/A";
?>
        <div class="settings-col">
        <div class="settings-card">
            <div class="settings-card-title">
            SYSTEM METRICS
            </div>

            <div class="pref-row">
            <div class="pref-info">
                <div class="pref-label">CPU Load</div>
                <div class="pref-desc"><?= round($cpuLoad, 2) ?></div>
            </div>
            </div>

            <div class="pref-row">
            <div class="pref-info">
                <div class="pref-label">Memory Usage</div>
                <div class="pref-desc">
                <?= round($usedMem / 1024) ?> MB / <?= round($totalMem[1] / 1024) ?> MB
                </div>
            </div>
            </div>

            <div class="pref-row">
            <div class="pref-info">
                <div class="pref-label">Disk Usage</div>
                <div class="pref-desc">
                <?= round($diskUsed / 1073741824, 2) ?> GB / <?= round($diskTotal / 1073741824, 2) ?> GB
                </div>
            </div>
            </div>

            <div class="pref-row">
            <div class="pref-info">
                <div class="pref-label">Temperature</div>
                <div class="pref-desc"><?= $temp ?></div>
            </div>
            </div>

        </div>
        </div>

<?php
} else {
?>
    <div class="settings-col">
    <div class="settings-card">
        <div class="settings-card-title">SYSTEM METRICS</div>

        <div class="pref-row">
        <div class="pref-info">
            <div class="pref-label" style="color:red;">
            ⚠ Not running on supported OS (Linux required)
            </div>
        </div>
        </div>

    </div>
    </div>
<?php
}
?>



  <!-- ── SCHEDULES ─────────────────────────────────────── -->
  <div class="settings-col wide">
    <div class="settings-card">
      <div class="settings-card-title">
        SCHEDULES
        <span id="cronBadge" class="update-badge checking">⬤ Checking cron…</span>
      </div>

      <!-- Cron status row -->
      <div class="pref-row pref-row--col" id="cronRow">
        <div class="pref-info">
          <div class="pref-label">Cron Job</div>
          <div class="pref-desc">
            The scheduler runs every minute via cron as <code>www-data</code>.
            Click <strong>Install</strong> to register it automatically, or add manually:<br>
            <code>* * * * * php <?= __DIR__ ?>/scheduler.php</code>
          </div>
        </div>
        <div class="refresh-run-row">
          <button class="refresh-cmd-btn run-btn" id="installCronBtn" onclick="installCron()" disabled>↓ INSTALL CRON</button>
          <span id="cronStatus" class="refresh-status"></span>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">

      <!-- Rule list -->
      <div id="scheduleRules" style="margin-bottom:16px">
        <div class="asset-loading">Loading rules…</div>
      </div>

      <!-- Add / Edit rule form -->
      <div class="settings-card" style="background:var(--bg2);margin-top:8px" id="ruleForm">
        <div class="settings-card-title" id="ruleFormTitle">ADD RULE</div>

        <div class="pref-row" style="gap:10px;flex-wrap:wrap;align-items:flex-start">

          <div style="flex:1;min-width:160px">
            <div class="pref-label" style="margin-bottom:4px">Label</div>
            <input type="text" id="ruleLabel" class="refresh-cmd-input" placeholder="Night Off" autocomplete="off">
          </div>

          <div style="flex:0 0 100px">
            <div class="pref-label" style="margin-bottom:4px">Time</div>
            <input type="time" id="ruleTime" class="refresh-cmd-input" value="22:00">
          </div>

          <div style="flex:1;min-width:220px">
            <div class="pref-label" style="margin-bottom:4px">Command</div>
            <input type="text" id="ruleCommand" class="refresh-cmd-input"
              placeholder='echo "standby 0" | cec-client -s -d 1' spellcheck="false" autocomplete="off">
          </div>

        </div>

        <div class="pref-row" style="margin-top:10px;align-items:flex-start;gap:16px">
          <div>
            <div class="pref-label" style="margin-bottom:6px">Days <span style="opacity:.5;font-size:11px">(none = every day)</span></div>
            <div id="dayCheckboxes" style="display:flex;gap:8px;flex-wrap:wrap"></div>
          </div>
        </div>

        <div class="refresh-run-row" style="margin-top:14px">
          <button class="refresh-cmd-btn save-btn"  onclick="saveRule()">SAVE RULE</button>
          <button class="refresh-cmd-btn"            onclick="clearRuleForm()" style="opacity:.7">CLEAR</button>
          <span id="ruleFormStatus" class="refresh-status"></span>
        </div>
      </div>

      <!-- Log -->
      <div style="margin-top:18px">
        <div class="settings-card-title" style="font-size:11px;margin-bottom:8px;cursor:pointer" onclick="toggleLog()">
          ▸ EXECUTION LOG <span id="logToggleHint" style="opacity:.5;font-weight:400">(click to show)</span>
        </div>
        <div id="scheduleLog" style="display:none"></div>
      </div>

    </div>
  </div>

</div>



<script src="static/advanced.js"></script>
<script src="static/theme.js"></script>
</body>
</html>
