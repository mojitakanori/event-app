<?php
// send_mail.php  — 件名文字化け対策（JIS方式の安定版）

declare(strict_types=1);

// レスポンスの形式をJSONに設定
header('Content-Type: application/json; charset=utf-8');

// タイムゾーン（Warning防止）
date_default_timezone_set('Asia/Tokyo');

// ★自分で決めた秘密のAPIキーを設定してください
$definedApiKey = 'YNrimQetXuseWXj55Ee6p';

// POST以外のリクエストは拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// POSTされたJSONデータを取得
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

// 必須データのチェック
if (
    !isset($data['to']) ||
    !isset($data['subject']) ||
    !isset($data['body']) ||
    !isset($data['apiKey'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'Bad Request: Missing required fields.']);
    exit;
}

// APIキーの検証
if ($data['apiKey'] !== $definedApiKey) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: Invalid API Key.']);
    exit;
}

// --- メール送信処理 ---
// ポイント：日本語メールの鉄板設定（mb_send_mail 用）
// ・内部はUTF-8で受け、送信時にISO-2022-JP-MSに変換
// ・Subjectは「未MIME化」のJIS文字列を渡す（mb_send_mail が正しくエンコード）
// ・From名のみ mb_encode_mimeheader でエンコードしてヘッダへ

mb_language('Japanese');
mb_internal_encoding('UTF-8');

$to       = (string)$data['to'];
$subjectU = (string)$data['subject']; // UTF-8
$bodyU    = (string)$data['body'];    // UTF-8

// 送信元のメールアドレスと名前（UTF-8）
$fromEmail = 'support@dealden.jp';
$fromNameU = 'Dealden事務局';

// --- 送信用（JIS）に変換 ---
$subjectJis = mb_convert_encoding($subjectU, 'ISO-2022-JP-MS', 'UTF-8');
$bodyJis    = mb_convert_encoding($bodyU,    'ISO-2022-JP-MS', 'UTF-8');
$fromNameJisHeader = mb_encode_mimeheader(
    mb_convert_encoding($fromNameU, 'ISO-2022-JP-MS', 'UTF-8'),
    'ISO-2022-JP',
    'B',
    "\r\n"
);

// ヘッダ作成（CRLF厳守）
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=ISO-2022-JP\r\n";
$headers .= "Content-Transfer-Encoding: 7bit\r\n";
$headers .= "From: {$fromNameJisHeader} <{$fromEmail}>\r\n";
$headers .= "Return-Path: {$fromEmail}\r\n";

// 重要：$subject は JIS の「プレーン文字列」を渡す（ここでMIME化しない）
if (mb_send_mail($to, $subjectJis, $bodyJis, $headers, "-f{$fromEmail}")) {
    http_response_code(200);
    echo json_encode(['message' => 'Mail sent successfully.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send mail.']);
}