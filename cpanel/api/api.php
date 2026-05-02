<?php
// ─────────────────────────────────────────────────────────────────
// NECT Exam — PHP API Backend  (requires PHP 8.0+, MySQL 5.7+)
// ─────────────────────────────────────────────────────────────────
declare(strict_types=1);
ini_set('display_errors', '0');   // never let PHP warnings leak into JSON
error_reporting(E_ALL);
require_once __DIR__ . '/config.php';

// ── CORS ──────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── DB ────────────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

// ── Utilities ─────────────────────────────────────────────────────
function respond(mixed $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    array_walk_recursive($data, function (mixed &$v): void { if (is_bool($v)) $v = (int)$v; });
    return $data;
}

function gen_uuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// ── JWT ───────────────────────────────────────────────────────────
function b64u_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64u_decode(string $data): string {
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}
function jwt_make(array $payload): string {
    $h = b64u_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64u_encode(json_encode($payload));
    $s = b64u_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    return "$h.$p.$s";
}
function jwt_verify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    if (!hash_equals(b64u_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), $s)) return null;
    $data = json_decode(b64u_decode($p), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}
function get_auth_header(): string {
    // Apache may deliver the header under several keys depending on SAPI / rewrite config
    foreach ([
        'HTTP_AUTHORIZATION',
        'REDIRECT_HTTP_AUTHORIZATION',
        'HTTP_HTTP_AUTHORIZATION',
    ] as $key) {
        if (!empty($_SERVER[$key])) return $_SERVER[$key];
    }
    // Fallback: apache_request_headers() (available with mod_php)
    if (function_exists('apache_request_headers')) {
        $hdrs = apache_request_headers();
        foreach ($hdrs as $k => $v) {
            if (strtolower($k) === 'authorization') return $v;
        }
    }
    return '';
}
function auth_required(): array {
    $hdr = get_auth_header();
    if (!str_starts_with($hdr, 'Bearer ')) respond(['message' => 'Unauthorized'], 401);
    $user = jwt_verify(substr($hdr, 7));
    if (!$user) respond(['message' => 'Invalid or expired token'], 401);
    return $user;
}

// ── Row normalisation ─────────────────────────────────────────────
const BOOL_COLS = ['is_public', 'shuffle_questions', 'show_results', 'is_correct', 'passed'];
const NUM_COLS  = ['score_pct', 'score_raw', 'points', 'points_awarded', 'time_spent_secs', 'duration_mins', 'pass_score', 'position'];

function normalize_row(array &$row): void {
    foreach ($row as $k => &$v) {
        if ($v === null) continue;
        if (in_array($k, BOOL_COLS, true)) { $v = (bool)(int)$v; continue; }
        if (in_array($k, NUM_COLS, true))  { $v = $v + 0; continue; }
        if (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $v)) {
            $v = str_replace(' ', 'T', $v) . '.000Z';
        }
    }
}

// ── Relationship maps ─────────────────────────────────────────────
const MANY_TO_ONE = [
    'courses'                  => ['profiles' => 'admin_id', 'trades' => 'trade_id'],
    'exams'                    => ['courses' => 'course_id'],
    'questions'                => ['exams' => 'exam_id'],
    'answer_options'           => ['questions' => 'question_id'],
    'question_library_options' => ['question_library' => 'question_library_id'],
    'exam_assignments'         => ['exams' => 'exam_id', 'profiles' => 'student_id'],
    'attempts'                 => ['exams' => 'exam_id', 'profiles' => 'student_id'],
    'responses'                => ['attempts' => 'attempt_id', 'questions' => 'question_id', 'answer_options' => 'selected_option_id'],
];
const ONE_TO_MANY = [
    'profiles'         => ['attempts' => 'student_id', 'exam_assignments' => 'student_id', 'courses' => 'admin_id'],
    'trades'           => ['courses' => 'trade_id'],
    'courses'          => ['exams' => 'course_id'],
    'exams'            => ['questions' => 'exam_id', 'exam_assignments' => 'exam_id', 'attempts' => 'exam_id'],
    'questions'        => ['answer_options' => 'question_id', 'responses' => 'question_id'],
    'question_library' => ['question_library_options' => 'question_library_id'],
    'attempts'         => ['responses' => 'attempt_id'],
];
function find_rel(string $main, string $nested): ?array {
    if (isset(MANY_TO_ONE[$main][$nested])) return ['type' => 'many-to-one', 'fk' => MANY_TO_ONE[$main][$nested]];
    if (isset(ONE_TO_MANY[$main][$nested])) return ['type' => 'one-to-many', 'fk' => ONE_TO_MANY[$main][$nested]];
    return null;
}

// ── Column parser ─────────────────────────────────────────────────
function parse_cols(string $colStr): array {
    if (!$colStr || trim($colStr) === '*') return ['main' => ['*'], 'nested' => []];
    $result = ['main' => [], 'nested' => []];
    $depth = 0; $cur = ''; $parts = [];
    for ($i = 0, $len = strlen($colStr); $i < $len; $i++) {
        $c = $colStr[$i];
        if ($c === '(')               { $depth++; $cur .= $c; }
        elseif ($c === ')')           { $depth--; $cur .= $c; }
        elseif ($c === ',' && !$depth){ if (trim($cur) !== '') $parts[] = trim($cur); $cur = ''; }
        else                          { $cur .= $c; }
    }
    if (trim($cur) !== '') $parts[] = trim($cur);
    foreach ($parts as $part) {
        $pi = strpos($part, '(');
        if ($pi !== false) {
            $name  = trim(substr($part, 0, $pi));
            $inner = trim(substr($part, $pi + 1, strrpos($part, ')') - $pi - 1));
            $result['nested'][] = ['name' => $name, 'columns' => $inner ?: '*'];
        } else {
            $result['main'][] = trim($part);
        }
    }
    if (empty($result['main'])) $result['main'] = ['*'];
    return $result;
}

// ── WHERE builder ─────────────────────────────────────────────────
// PHP auto-parses _eq[col]=val into $_GET['_eq']['col'] = val (array notation).
// We handle BOTH the parsed-array form and any literal-key fallback.
function build_where(array $q, string $table): array {
    $conds = []; $vals = [];

    // Array form: $_GET['_eq'] = ['col' => 'val']
    if (isset($q['_eq']) && is_array($q['_eq'])) {
        foreach ($q['_eq'] as $col => $val) {
            $conds[] = "`$table`.`$col` = ?"; $vals[] = $val;
        }
    }
    if (isset($q['_neq']) && is_array($q['_neq'])) {
        foreach ($q['_neq'] as $col => $val) {
            $conds[] = "`$table`.`$col` != ?"; $vals[] = $val;
        }
    }
    if (isset($q['_in']) && is_array($q['_in'])) {
        foreach ($q['_in'] as $col => $val) {
            $inVals = is_array($val) ? $val : array_map('trim', explode(',', (string)$val));
            if (!empty($inVals)) {
                $conds[] = "`$table`.`$col` IN (" . implode(',', array_fill(0, count($inVals), '?')) . ")";
                $vals    = array_merge($vals, $inVals);
            }
        }
    }

    // Literal-key fallback (e.g. _eq[col]=val sent without percent-encoding)
    foreach ($q as $key => $val) {
        if (!is_string($key)) continue;
        if (str_starts_with($key, '_eq[')) {
            $col = substr($key, 4, -1);
            $conds[] = "`$table`.`$col` = ?"; $vals[] = $val;
        } elseif (str_starts_with($key, '_neq[')) {
            $col = substr($key, 5, -1);
            $conds[] = "`$table`.`$col` != ?"; $vals[] = $val;
        } elseif (str_starts_with($key, '_in[')) {
            $col    = substr($key, 4, -1);
            $inVals = is_array($val) ? $val : array_map('trim', explode(',', (string)$val));
            if (!empty($inVals)) {
                $conds[] = "`$table`.`$col` IN (" . implode(',', array_fill(0, count($inVals), '?')) . ")";
                $vals    = array_merge($vals, $inVals);
            }
        }
    }

    return [implode(' AND ', array_unique($conds)), $vals];
}

// ── Nested fetcher ────────────────────────────────────────────────
function fetch_nested(string $mainTable, array &$rows, array $nest): void {
    global $pdo;
    $rel = find_rel($mainTable, $nest['name']);
    if (!$rel || empty($rows)) {
        foreach ($rows as &$r) $r[$nest['name']] = ($rel && $rel['type'] === 'one-to-many') ? [] : null;
        return;
    }
    $nc       = parse_cols($nest['columns']);
    $colsSQL  = $nc['main'][0] === '*' ? '*' : implode(', ', array_map(fn($c) => "`$c`", $nc['main']));

    if ($rel['type'] === 'one-to-many') {
        $pids = array_values(array_unique(array_filter(array_column($rows, 'id'))));
        if (empty($pids)) { foreach ($rows as &$r) $r[$nest['name']] = []; return; }
        $ph  = implode(',', array_fill(0, count($pids), '?'));
        // Sort by position for tables that have it (questions, answer_options, etc.)
        $hasPosition = in_array($nest['name'], ['questions', 'answer_options', 'question_library_options'], true);
        $orderBy     = $hasPosition ? ' ORDER BY `position` ASC' : '';
        $st  = $pdo->prepare("SELECT $colsSQL FROM `{$nest['name']}` WHERE `{$rel['fk']}` IN ($ph)$orderBy");
        $st->execute($pids);
        $nested = $st->fetchAll();
        foreach ($nested as &$nr) normalize_row($nr);
        foreach ($nc['nested'] as $dn) fetch_nested($nest['name'], $nested, $dn);
        $grouped = [];
        foreach ($nested as $nr) $grouped[$nr[$rel['fk']]][] = $nr;
        foreach ($rows as &$r) $r[$nest['name']] = $grouped[$r['id']] ?? [];
    } else {
        $fkIds = array_values(array_unique(array_filter(array_column($rows, $rel['fk']))));
        if (empty($fkIds)) { foreach ($rows as &$r) $r[$nest['name']] = null; return; }
        $ph  = implode(',', array_fill(0, count($fkIds), '?'));
        // Always include `id` so we can build the lookup index
        $selectSQL = ($nc['main'][0] === '*') ? '*'
            : (in_array('id', $nc['main']) ? $colsSQL : '`id`, ' . $colsSQL);
        $st  = $pdo->prepare("SELECT $selectSQL FROM `{$nest['name']}` WHERE id IN ($ph)");
        $st->execute($fkIds);
        $nested = $st->fetchAll();
        foreach ($nested as &$nr) normalize_row($nr);
        foreach ($nc['nested'] as $dn) fetch_nested($nest['name'], $nested, $dn);
        $idx = [];
        foreach ($nested as $nr) $idx[$nr['id']] = $nr;
        foreach ($rows as &$r) $r[$nest['name']] = $idx[$r[$rel['fk']]] ?? null;
    }
}

// ════════════════════════════════════════════════════════════════
// AUTH HANDLERS
// ════════════════════════════════════════════════════════════════
function handle_login(): void {
    global $pdo;
    $b = body();
    if (empty($b['email']) || empty($b['password'])) respond(['message' => 'Email and password required'], 400);
    $st = $pdo->prepare('SELECT * FROM profiles WHERE email = ?');
    $st->execute([$b['email']]);
    $p = $st->fetch();
    if (!$p || !password_verify($b['password'], $p['password_hash'])) respond(['message' => 'Invalid email or password'], 401);
    unset($p['password_hash']);
    normalize_row($p);
    respond([
        'token'   => jwt_make(['id' => $p['id'], 'email' => $p['email'], 'role' => $p['role'], 'iat' => time(), 'exp' => time() + 604800]),
        'profile' => $p,
    ]);
}

function handle_register(): void {
    global $pdo;
    $b    = body();
    $role = $b['role'] ?? 'student';
    if (empty($b['email']) || empty($b['password'])) respond(['message' => 'Email and password required'], 400);
    if ($role === 'admin' && ADMIN_CODE !== '' && ($b['admin_code'] ?? '') !== ADMIN_CODE) respond(['message' => 'Invalid admin code'], 403);
    $st = $pdo->prepare('SELECT id FROM profiles WHERE email = ?');
    $st->execute([$b['email']]);
    if ($st->fetch()) respond(['message' => 'Email already registered'], 409);
    $pdo->prepare(
        'INSERT INTO profiles (id, email, full_name, role, password_hash, dob, father_name, mother_name, address, pin_code, mobile, course_id, reference)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        gen_uuid(),
        $b['email'],
        $b['full_name'] ?? '',
        $role,
        password_hash($b['password'], PASSWORD_BCRYPT),
        $b['dob']         ?? null,
        $b['father_name'] ?? null,
        $b['mother_name'] ?? null,
        $b['address']     ?? null,
        $b['pin_code']    ?? null,
        $b['mobile']      ?? null,
        $b['course_id']   ?? null,
        $b['reference']   ?? null,
    ]);
    respond(['message' => 'Account created'], 201);
}

function handle_me(): void {
    global $pdo;
    $user = auth_required();
    $st   = $pdo->prepare('SELECT id,email,full_name,role,avatar_url,created_at,updated_at FROM profiles WHERE id=?');
    $st->execute([$user['id']]);
    $p = $st->fetch();
    if (!$p) respond(['message' => 'Profile not found'], 404);
    normalize_row($p);
    respond(['profile' => $p]);
}

// ════════════════════════════════════════════════════════════════
// FILE UPLOAD
// ════════════════════════════════════════════════════════════════
function handle_upload(): void {
    auth_required();
    if (empty($_FILES['file'])) respond(['message' => 'No file uploaded'], 400);
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) respond(['message' => 'Upload error'], 400);
    if ($file['size'] > 2 * 1024 * 1024) respond(['message' => 'File too large (max 2 MB)'], 400);
    $mime = mime_content_type($file['tmp_name']);
    if (!str_starts_with($mime, 'image/')) respond(['message' => 'Only image files allowed'], 400);
    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
    $ext  = pathinfo($file['name'], PATHINFO_EXTENSION);
    $name = 'upload-' . time() . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
    move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $name);
    $base = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    respond(['url' => $base . '/uploads/' . $name]);
}

// ════════════════════════════════════════════════════════════════
// RPC HANDLERS
// ════════════════════════════════════════════════════════════════
function handle_rpc(string $name): void {
    global $pdo;
    auth_required();
    $p = body();

    if ($name === 'expire_past_exams') {
        $pdo->exec("UPDATE exams SET status='expired' WHERE status IN ('published','active') AND ends_at IS NOT NULL AND ends_at < NOW()");
        respond(['data' => null, 'error' => null]);
    }

    if ($name === 'grade_attempt') {
        $aid = $p['p_attempt_id'] ?? null;
        if (!$aid) respond(['message' => 'p_attempt_id required'], 400);
        $st = $pdo->prepare('SELECT exam_id FROM attempts WHERE id=?');
        $st->execute([$aid]);
        $att = $st->fetch();
        if (!$att) respond(['message' => 'Attempt not found'], 404);
        $eid = $att['exam_id'];

        // Grade MCQ / true_false
        $st = $pdo->prepare(
            "SELECT r.id, q.points, ao.is_correct
             FROM responses r
             JOIN questions q ON q.id=r.question_id
             LEFT JOIN answer_options ao ON ao.id=r.selected_option_id
             WHERE r.attempt_id=? AND r.selected_option_id IS NOT NULL AND q.type IN ('mcq','true_false')"
        );
        $st->execute([$aid]);
        foreach ($st->fetchAll() as $r) {
            $ok = (bool)(int)$r['is_correct'];
            $pdo->prepare('UPDATE responses SET is_correct=?, points_awarded=? WHERE id=?')
                ->execute([$ok ? 1 : 0, $ok ? $r['points'] : 0, $r['id']]);
        }
        // Zero out un-graded short_answer
        $pdo->prepare(
            "UPDATE responses r JOIN questions q ON q.id=r.question_id
             SET r.points_awarded=0
             WHERE r.attempt_id=? AND q.type='short_answer' AND r.points_awarded IS NULL"
        )->execute([$aid]);

        // Totals
        $st = $pdo->prepare(
            "SELECT COALESCE(SUM(q.points),0) AS total, COALESCE(SUM(r.points_awarded),0) AS earned
             FROM questions q LEFT JOIN responses r ON r.question_id=q.id AND r.attempt_id=?
             WHERE q.exam_id=?"
        );
        $st->execute([$aid, $eid]);
        $totals    = $st->fetch();
        $st2       = $pdo->prepare('SELECT pass_score FROM exams WHERE id=?');
        $st2->execute([$eid]);
        $passScore = (int)($st2->fetchColumn() ?? 60);
        $total     = (float)$totals['total'];
        $earned    = (float)$totals['earned'];
        $pct       = $total > 0 ? round(($earned / $total) * 100, 2) : 0;
        $pdo->prepare("UPDATE attempts SET score_raw=?,score_pct=?,passed=?,status='graded',graded_at=NOW() WHERE id=?")
            ->execute([$earned, $pct, $pct >= $passScore ? 1 : 0, $aid]);
        respond(['data' => null, 'error' => null]);
    }

    if ($name === 'admin_create_student') {
        $email = $p['p_email'] ?? ''; $pass = $p['p_password'] ?? ''; $fname = $p['p_full_name'] ?? '';
        if (!$email || !$pass) respond(['message' => 'Email and password required'], 400);
        $st = $pdo->prepare('SELECT id FROM profiles WHERE email=?'); $st->execute([$email]);
        if ($st->fetch()) respond(['message' => 'Email already exists'], 409);
        $id = gen_uuid();
        $pdo->prepare(
            'INSERT INTO profiles (id,email,full_name,role,password_hash,dob,father_name,mother_name,address,pin_code,mobile,course_id,reference)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $email, $fname, 'student', password_hash($pass, PASSWORD_BCRYPT),
            $p['p_dob']         ?? null,
            $p['p_father_name'] ?? null,
            $p['p_mother_name'] ?? null,
            $p['p_address']     ?? null,
            $p['p_pin_code']    ?? null,
            $p['p_mobile']      ?? null,
            $p['p_course_id']   ?? null,
            $p['p_reference']   ?? null,
        ]);
        respond(['data' => $id, 'error' => null]);
    }

    if ($name === 'admin_update_student_password') {
        $uid = $p['p_user_id'] ?? ''; $pass = $p['p_password'] ?? '';
        if (!$uid || !$pass) respond(['message' => 'user_id and password required'], 400);
        $pdo->prepare('UPDATE profiles SET password_hash=? WHERE id=?')
            ->execute([password_hash($pass, PASSWORD_BCRYPT), $uid]);
        respond(['data' => null, 'error' => null]);
    }

    respond(['message' => "Unknown RPC: $name"], 404);
}

// ════════════════════════════════════════════════════════════════
// GENERIC CRUD
// ════════════════════════════════════════════════════════════════
const ALLOWED_TABLES = [
    'profiles','trades','courses','exams','questions','answer_options',
    'question_library','question_library_options','exam_assignments',
    'attempts','responses','app_settings',
];

function handle_crud(string $table, string $method): void {
    if (!in_array($table, ALLOWED_TABLES, true)) respond(['message' => 'Unknown table'], 404);
    // app_settings and courses are publicly readable (needed on login/register pages)
    $public_read = ['app_settings', 'courses'];
    if (!(in_array($table, $public_read, true) && $method === 'GET')) {
        auth_required();
    }
    match ($method) {
        'GET'    => crud_select($table),
        'POST'   => crud_insert($table),
        'PUT'    => crud_update($table),
        'DELETE' => crud_delete($table),
        'PATCH'  => crud_upsert($table),
        default  => respond(['message' => 'Method not allowed'], 405),
    };
}

// ── SELECT ────────────────────────────────────────────────────────
function crud_select(string $table): void {
    global $pdo;
    $q  = $_GET;
    $pc = parse_cols($q['_cols'] ?? '*');

    // Auto-add FK columns needed for many-to-one nested fetches so fetch_nested can match rows
    $mainCols = $pc['main'];
    if ($mainCols[0] !== '*') {
        foreach ($pc['nested'] as $nest) {
            $rel = find_rel($table, $nest['name']);
            if ($rel && $rel['type'] === 'many-to-one' && !in_array($rel['fk'], $mainCols, true)) {
                $mainCols[] = $rel['fk'];
            }
        }
    }

    $selSQL = $mainCols[0] === '*'
        ? "`$table`.*"
        : implode(', ', array_map(fn($c) => "`$table`.`$c`", $mainCols));

    [$whereSQL, $vals] = build_where($q, $table);

    $orderSQL = '';
    if (!empty($q['_order'])) {
        $col = $q['_order'];
        $dir = ($q['_asc'] ?? 'true') !== 'false' ? 'ASC' : 'DESC';
        if (str_contains($col, '(') && preg_match('/\((.+)\)/', $col, $m)) {
            $orderSQL = "`{$m[1]}` $dir";
        } else {
            $orderSQL = "`$table`.`$col` $dir";
        }
    }

    $limitSQL = !empty($q['_limit']) ? 'LIMIT ' . min((int)$q['_limit'], 1000) : '';

    // COUNT query
    if (!empty($q['_count'])) {
        $sql = "SELECT COUNT(*) FROM `$table`" . ($whereSQL ? " WHERE $whereSQL" : '');
        $st  = $pdo->prepare($sql); $st->execute($vals);
        respond(['count' => (int)$st->fetchColumn()]);
    }

    $sql = trim(implode(' ', array_filter([
        "SELECT $selSQL FROM `$table`",
        $whereSQL ? "WHERE $whereSQL" : '',
        $orderSQL ? "ORDER BY $orderSQL" : '',
        $limitSQL,
    ])));

    $st = $pdo->prepare($sql); $st->execute($vals);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) normalize_row($r);

    foreach ($pc['nested'] as $nest) fetch_nested($table, $rows, $nest);

    if (!empty($q['_single']) || !empty($q['_maybe'])) respond(['data' => $rows[0] ?? null]);
    respond(['data' => $rows, 'count' => count($rows)]);
}

// ── INSERT ────────────────────────────────────────────────────────
function crud_insert(string $table): void {
    global $pdo;
    $body = body();
    $rows = isset($body[0]) && is_array($body[0]) ? $body : [$body];
    $ids  = [];

    foreach ($rows as $row) {
        if ($table !== 'app_settings' && empty($row['id'])) $row['id'] = gen_uuid();
        $keys = array_keys($row); $vals = array_values($row);
        $cols = implode(',', array_map(fn($k) => "`$k`", $keys));
        $ph   = implode(',', array_fill(0, count($keys), '?'));
        $pdo->prepare("INSERT INTO `$table` ($cols) VALUES ($ph)")->execute($vals);
        if (isset($row['id'])) $ids[] = $row['id'];
    }

    if (!empty($_GET['_return'])) {
        $ph  = implode(',', array_fill(0, count($ids), '?'));
        $st  = $pdo->prepare("SELECT * FROM `$table` WHERE id IN ($ph)");
        $st->execute($ids);
        $fetched = $st->fetchAll();
        foreach ($fetched as &$r) normalize_row($r);
        respond(['data' => count($ids) === 1 ? ($fetched[0] ?? null) : $fetched], 201);
    }
    respond(['data' => null, 'error' => null], 201);
}

// ── UPDATE ────────────────────────────────────────────────────────
function crud_update(string $table): void {
    global $pdo;
    [$whereSQL, $wVals] = build_where($_GET, $table);
    if (!$whereSQL) respond(['message' => 'At least one filter required'], 400);
    $body = body();
    $keys = array_keys($body); $bVals = array_values($body);
    $set  = implode(', ', array_map(fn($k) => "`$k`=?", $keys));
    $pdo->prepare("UPDATE `$table` SET $set WHERE $whereSQL")->execute(array_merge($bVals, $wVals));
    respond(['data' => null, 'error' => null]);
}

// ── DELETE ────────────────────────────────────────────────────────
function crud_delete(string $table): void {
    global $pdo;
    [$whereSQL, $vals] = build_where($_GET, $table);
    if (!$whereSQL) respond(['message' => 'At least one filter required'], 400);
    $pdo->prepare("DELETE FROM `$table` WHERE $whereSQL")->execute($vals);
    respond(['data' => null, 'error' => null]);
}

// ── UPSERT ────────────────────────────────────────────────────────
function crud_upsert(string $table): void {
    global $pdo;
    $body = body();
    $rows = isset($body[0]) && is_array($body[0]) ? $body : [$body];

    foreach ($rows as $row) {
        if ($table !== 'app_settings' && empty($row['id'])) $row['id'] = gen_uuid();
        $keys   = array_keys($row); $vals = array_values($row);
        $cols   = implode(',', array_map(fn($k) => "`$k`", $keys));
        $ph     = implode(',', array_fill(0, count($keys), '?'));
        $update = implode(', ', array_filter(
            array_map(fn($k) => $k !== 'id' ? "`$k`=VALUES(`$k`)" : null, $keys)
        ));
        $pdo->prepare("INSERT INTO `$table` ($cols) VALUES ($ph) ON DUPLICATE KEY UPDATE $update")->execute($vals);
    }
    respond(['data' => null, 'error' => null]);
}

// ════════════════════════════════════════════════════════════════
// ROUTER  — parse URI and dispatch
// ════════════════════════════════════════════════════════════════
$method = $_SERVER['REQUEST_METHOD'];
$uri    = '/' . trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

// Strip subfolder prefix if app is not in web root (e.g. /nect-exam/api/login → /api/login)
// Adjust $base_path if your app lives in a subdirectory, e.g. '/nect-exam'
$base_path = '';
if ($base_path && str_starts_with($uri, $base_path)) {
    $uri = substr($uri, strlen($base_path)) ?: '/';
}

if ($uri === '/auth/login'    && $method === 'POST')  handle_login();
if ($uri === '/auth/register' && $method === 'POST')  handle_register();
if ($uri === '/auth/me'       && $method === 'GET')   handle_me();
if ($uri === '/auth/logout'   && $method === 'POST')  respond(['message' => 'Logged out']);
if ($uri === '/upload'        && $method === 'POST')  handle_upload();
if ($uri === '/health' && $method === 'GET') {
    try { $pdo->query('SELECT 1'); respond(['status' => 'ok', 'db' => 'connected']); }
    catch (\Exception $e) { http_response_code(503); echo json_encode(['status' => 'error', 'db' => 'disconnected']); exit; }
}

if (preg_match('#^/api/rpc/([a-z_]+)$#', $uri, $m) && $method === 'POST') handle_rpc($m[1]);
if (preg_match('#^/api/([a-z_]+)$#',     $uri, $m))                       handle_crud($m[1], $method);

respond(['message' => 'Not found'], 404);
