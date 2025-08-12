// login.js
document.addEventListener('DOMContentLoaded', async () => {
    // 既にログイン済みの場合はダッシュボードへリダイレクト
    await redirectToDashboardIfAuthenticated();

    const loginForm = document.getElementById('loginForm');
    const messageArea = document.getElementById('messageArea'); // login.html の messageArea を取得

    if (!loginForm) {
        console.error('Login form (loginForm) not found in login.html!');
        alert('ログインフォームの読み込みに失敗しました。');
        return;
    }
    // messageArea は存在しなくても alert で通知はできるので、ここでは処理を止めない
    if (!messageArea) {
        console.warn('Message area (messageArea) not found in login.html. Messages will only be shown as alerts.');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (messageArea) {
            messageArea.innerHTML = ''; // 既存のメッセージをクリア
        }

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) {
            alert('メールアドレスまたはパスワードの入力フィールドが見つかりません。');
            console.error('Email or password input fields not found.');
            return;
        }

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (signInError) {
                // Supabaseからの認証エラー
                throw signInError; // catchブロックで処理
            }

            
            // ナビゲーションを更新 (auth.js の updateNav を呼び出す)
            if (typeof updateNav === 'function') {
                await updateNav();
            }
            
            window.location.href = 'index.html';

        } catch (error) {
            // ログイン失敗またはその他のエラー
            console.error('Login error:', error.message); // コンソールにはエラー詳細を出力
            
            // ユーザーにポップアップで通知
            alert(`ログインに失敗しました: ${error.message}`);
            
            if (messageArea) {
                // messageArea にもエラーメッセージを表示
                messageArea.innerHTML = `<p class="error-message">ログインに失敗しました。メールアドレスまたはパスワードを確認してください。</p>`;
                // 詳細なエラーを開発者向けに表示したい場合は以下も追加
                // messageArea.innerHTML += `<p class="error-message"><small>エラー詳細: ${error.message}</small></p>`;
            }
        }
    });
});