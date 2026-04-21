#!/usr/bin/env php
<?php
// ═══════════════════════════════════════════════════════════════════════════
//  SIGNAGE SYSTEM — SCHEDULER
//  Runs every minute via cron.  Install with:
//    crontab -e    →   * * * * * php /var/www/signage/scheduler.php
//
//  Reads schedule.json, matches rules against current time/day,
//  executes commands, and appends to schedule_log.json.
// ═══════════════════════════════════════════════════════════════════════════

$baseDir  = __DIR__;
$schedFile  = $baseDir . '/schedule.json';
$logFile    = $baseDir . '/schedule_log.json';
$lastRunFile = $baseDir . '/schedule_lastrun.json';

// ── Load schedule ─────────────────────────────────────────────────────────
if (!file_exists($schedFile)) {
    exit(0);  // no schedule configured yet
}

$schedule = json_decode(file_get_contents($schedFile), true);
if (!isset($schedule['rules']) || !is_array($schedule['rules']) || empty($schedule['rules'])) {
    exit(0);
}

// ── Current time ──────────────────────────────────────────────────────────
$nowTime   = date('H:i');                // e.g. "22:00"
$nowMinute = date('YmdHi');              // unique per-minute key for dedup
$nowDay    = strtolower(date('D'));      // "mon","tue","wed","thu","fri","sat","sun"

// ── Load last-run registry (prevents double-firing within same minute) ────
$lastRun = [];
if (file_exists($lastRunFile)) {
    $lastRun = json_decode(file_get_contents($lastRunFile), true) ?? [];
}

// ── Logging helper ────────────────────────────────────────────────────────
function appendLog(string $logFile, array $entry): void {
    $log = [];
    if (file_exists($logFile)) {
        $log = json_decode(file_get_contents($logFile), true) ?? [];
    }
    array_unshift($log, $entry);
    $log = array_slice($log, 0, 100);  // keep last 100 entries
    file_put_contents($logFile, json_encode($log, JSON_PRETTY_PRINT));
}

// ── Process rules ─────────────────────────────────────────────────────────
foreach ($schedule['rules'] as $rule) {
    // Skip disabled rules
    if (empty($rule['enabled'])) {
        continue;
    }

    $id      = $rule['id']      ?? '';
    $label   = $rule['label']   ?? '';
    $time    = $rule['time']    ?? '';   // "HH:MM"
    $days    = $rule['days']    ?? [];   // ["mon","tue",...] — empty = all days
    $command = trim($rule['command'] ?? '');

    if ($id === '' || $time === '' || $command === '') {
        continue;
    }

    // Check time match
    if ($time !== $nowTime) {
        continue;
    }

    // Check day match (empty days array = every day)
    if (!empty($days) && !in_array($nowDay, $days, true)) {
        continue;
    }

    // Dedup: skip if already fired this exact minute
    $dedupKey = $id . '_' . $nowMinute;
    if (isset($lastRun[$dedupKey])) {
        continue;
    }

    // ── Execute ───────────────────────────────────────────────────────────
    $output = [];
    $code   = 0;
    exec($command . ' 2>&1', $output, $code);

    // Mark as fired
    $lastRun[$dedupKey] = time();

    // Prune stale entries (older than 10 minutes)
    $cutoff = time() - 600;
    foreach ($lastRun as $k => $ts) {
        if ($ts < $cutoff) unset($lastRun[$k]);
    }

    file_put_contents($lastRunFile, json_encode($lastRun));

    // Log the execution
    appendLog($logFile, [
        'ts'     => date('Y-m-d H:i:s'),
        'id'     => $id,
        'label'  => $label,
        'cmd'    => $command,
        'code'   => $code,
        'out'    => implode("\n", $output),
        'manual' => false,
    ]);
}

exit(0);
