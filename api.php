<?php

header("Content-Type: application/json");
$action = $_GET['action'] ?? '';

// ── Upload ────────────────────────────────────────────────

if ($action === 'upload') {
    if (!isset($_FILES['file'])) { echo json_encode(["error" => "No file"]); exit; }
    $file = $_FILES['file'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $name = time() . '-' . mt_rand(100, 999) . '.' . $ext;
    $dest = "assets/" . $name;
    if (!is_dir("assets")) mkdir("assets", 0755, true);
    move_uploaded_file($file['tmp_name'], $dest);
    echo json_encode(["path" => $dest]);
    exit;
}

// ── Load ──────────────────────────────────────────────────

if ($action === 'load') {
    $path = "state.json";
    echo file_exists($path)
        ? file_get_contents($path)
        : json_encode(["canvas" => ["w" => 1920, "h" => 1080], "layers" => []]);
    exit;
}

// ── Save ──────────────────────────────────────────────────

if ($action === 'save') {
    $data = file_get_contents("php://input");
    if (json_decode($data) === null) { echo json_encode(["error" => "Invalid JSON"]); exit; }
    file_put_contents("state.json", $data);
    echo json_encode(["ok" => true]);
    exit;
}

// ── List assets ───────────────────────────────────────────

if ($action === 'assets') {
    $files = glob("assets/*") ?: [];
    $result = [];
    foreach ($files as $f) {
        if (!is_file($f)) continue;
        $result[] = [
            'path' => $f,
            'name' => basename($f),
            'size' => filesize($f),
            'type' => mime_content_type($f) ?: 'application/octet-stream',
        ];
    }
    // Newest first
    usort($result, fn($a, $b) => strcmp($b['name'], $a['name']));
    echo json_encode($result);
    exit;
}

// ── Delete asset ──────────────────────────────────────────

if ($action === 'delete_asset') {
    $path = $_POST['path'] ?? '';
    // Safety: only allow files inside assets/, no path traversal
    $real = realpath($path);
    $base = realpath("assets");
    if ($real && $base && strpos($real, $base . DIRECTORY_SEPARATOR) === 0 && is_file($real)) {
        unlink($real);
        echo json_encode(["ok" => true]);
    } else {
        echo json_encode(["error" => "Invalid path"]);
    }
    exit;
}

// ── Get refresh command ───────────────────────────────────

if ($action === 'get_refresh_cmd') {
    $path = "refresh_cmd.txt";
    echo json_encode(["cmd" => file_exists($path) ? trim(file_get_contents($path)) : ""]);
    exit;
}

// ── Save refresh command ──────────────────────────────────

if ($action === 'set_refresh_cmd') {
    $data = json_decode(file_get_contents("php://input"), true);
    $cmd  = trim($data['cmd'] ?? '');
    // Only store — never execute on save
    file_put_contents("refresh_cmd.txt", $cmd);
    echo json_encode(["ok" => true]);
    exit;
}

// ── Run refresh command ───────────────────────────────────

if ($action === 'run_refresh') {
    $path = "refresh_cmd.txt";
    if (!file_exists($path)) {
        echo json_encode(["error" => "No refresh command configured"]);
        exit;
    }
    $cmd = trim(file_get_contents($path));
    if ($cmd === '') {
        echo json_encode(["error" => "Refresh command is empty"]);
        exit;
    }
    // Run in background so the HTTP response can be sent first
    $escaped = escapeshellcmd($cmd);
    $output  = [];
    $code    = 0;
    exec($escaped . " 2>&1", $output, $code);
    echo json_encode([
        "ok"     => $code === 0,
        "code"   => $code,
        "output" => implode("\n", $output),
    ]);
    exit;
}

echo json_encode(["error" => "Unknown action"]);
