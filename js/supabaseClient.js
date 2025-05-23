// supabaseClient.js
const SUPABASE_URL = 'https://loutbvbueiodlfvmpbka.supabase.co'; // 例: https://abcdefg.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvdXRidmJ1ZWlvZGxmdm1wYmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MDgwMzAsImV4cCI6MjA2MzM4NDAzMH0.-U_DegnMBhHjdaHmL4d5O9ubCA3K2yUfV9ZdlQVxU70'; // SupabaseプロジェクトのAPI設定から取得

// グローバルスコープに存在する `supabase` オブジェクト (CDNから読み込まれたライブラリ本体) の
// `createClient` メソッドを使って、新しいクライアントインスタンスを作成します。
// このとき、作成したインスタンスを格納する変数名は、グローバルの `supabase` とは異なる名前にするか、
// `window.supabase.createClient` のように明示的にグローバルオブジェクトを指定します。
const supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 作成したクライアントインスタンスをグローバルな `supabase` 変数に代入します。
// これにより、他のスクリプトファイル (auth.js, index.js など) は
// `supabase.from(...)` のようにして、このクライアントインスタンスを使用できます。
window.supabase = supabaseClientInstance;