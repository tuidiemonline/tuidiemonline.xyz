<?php
/**
 * proxy-games.php — cầu nối feed GamePix, tránh lỗi CORS cho tuidiemonline.xyz
 * Đặt CÙNG THƯ MỤC với index.html. Cache 1 giờ / mỗi trang.
 * Không cần sửa gì, sid đã là 45U19 của bạn.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=600');

$sid  = '45U19';
$per  = 48;
$page = max(1, min(50, intval(isset($_GET['page']) ? $_GET['page'] : 1)));
$url  = "https://feeds.gamepix.com/v2/json?sid={$sid}&pagination={$per}&page={$page}";

$cache = __DIR__ . '/gamepix-cache-p' . $page . '.json';
$ttl   = 3600;

if (is_file($cache) && (time() - filemtime($cache)) < $ttl) {
    readfile($cache);
    exit;
}

$raw = false;
if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'TuiDiemOnline/1.0',
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
} else {
    $ctx = stream_context_create(['http' => [
        'timeout' => 15,
        'header'  => "User-Agent: TuiDiemOnline/1.0\r\nAccept: application/json\r\n",
    ]]);
    $raw = @file_get_contents($url, false, $ctx);
}

if ($raw === false || $raw === '' || json_decode($raw, true) === null) {
    if (is_file($cache)) { readfile($cache); exit; }   // dùng cache cũ nếu feed tạm lỗi
    http_response_code(502);
    echo json_encode(['error' => 'Không lấy được feed GamePix']);
    exit;
}

@file_put_contents($cache, $raw, LOCK_EX);
echo $raw;
