<?php
// ─────────────────────────────────────────────────────────────────
// NECT Exam — Environment-aware configuration
// Auto-detects localhost vs production. Edit each section below.
// ─────────────────────────────────────────────────────────────────

$host = $_SERVER['HTTP_HOST'] ?? 'cli';
$is_local = in_array($host, ['localhost', '127.0.0.1', '::1'])
         || str_starts_with($host, 'localhost:')
         || str_starts_with($host, '127.0.0.1:');

if ($is_local) {
    // ── LOCAL (XAMPP / localhost) ──────────────────────────────
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'nect_exam');
    define('DB_USER', 'root');
    define('DB_PASS', '');                          // XAMPP default: empty

    define('JWT_SECRET', 'nect_exam_super_secret_jwt_key_2026_change_in_production');
    define('ADMIN_CODE', '');

} else {
    // ── PRODUCTION (cPanel) ───────────────────────────────────
     define('DB_HOST', 'localhost');
    define('DB_NAME', 'vendomark_nect-exam');     // e.g. john_nect_exam
    define('DB_USER', 'vendomark_nectexam');          // e.g. john_nect
    define('DB_PASS', '@5bPr8x&-?EVS+GQ');    // set your real password

    define('JWT_SECRET', 'K7jQzW1rT0yV2lP9aB4sD6fG8hJ2mB^1@9^p7vJ#kQn@wR6g$zYc2LpXoVtU8mNfE5h');
    define('ADMIN_CODE', '');
}

// ── Shared settings (same for both environments) ──────────────────
// uploads/ sits at web root, one level above api/
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads/');
