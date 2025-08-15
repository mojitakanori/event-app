<?php
// send_mail.php

// レスポンスの形式をJSONに設定
header('Content-Type: application/json; charset=utf-8');

// ★自分で決めた秘密のAPIキーを設定してください
// このキーは後でSupabaseの環境変数に設定します
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
mb_language("Japanese");
mb_internal_encoding("UTF-8");

$to      = $data['to'];
$subject = $data['subject'];
$body    = $data['body'];

// ★送信元のメールアドレスと名前を設定してください
// Xserverで設定したメールアドレスを推奨します
$fromEmail = 'support@dealden.jp'; 
$fromName  = 'Dealden事務局';

// ▼▼▼ 文字化け対策 ▼▼▼
// 1. 件名をエンコードする
$encodedSubject = mb_encode_mimeheader($subject, "ISO-2022-JP-MS");

// 2. ヘッダー情報を文字列として正しく組み立てる
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=ISO-2022-JP\r\n";
$headers .= "Content-Transfer-Encoding: 7bit\r\n";
$headers .= "From: " . mb_encode_mimeheader($fromName, "ISO-2022-JP-MS") . " <" . $fromEmail . ">\r\n";
// ▲▲▲ ここまで ▲▲▲


// メール送信
// mb_send_mailの第5引数に-fオプションで送信元を指定すると、迷惑メールになりにくい
if (mb_send_mail($to, $encodedSubject, $body, $headers, "-f" . $fromEmail)) {
    http_response_code(200);
    echo json_encode(['message' => 'Mail sent successfully.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send mail.']);
}

?>
