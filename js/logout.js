// js/logout.js
document.addEventListener('DOMContentLoaded', async () => {
    const logoutMessage = document.getElementById('logoutMessage');
    console.log('Logout script started.'); // ★デバッグログ1

    if (!logoutMessage) {
        console.error('logoutMessage element not found!'); // ★デバッグログ2
        // もしメッセージ要素がない場合、処理を中断するか、代替の通知方法を考える
        alert('ログアウト処理中にエラーが発生しました。(UI要素不足)');
        // 念のためホームに飛ばす
        setTimeout(() => { window.location.href = 'index.html'; }, 500);
        return;
    }

    try {
        console.log('Attempting to sign out...'); // ★デバッグログ3
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Supabase signOut error:', error); // ★デバッグログ4
            throw error; // エラーをキャッチブロックに投げる
        }

        console.log('Sign out successful.'); // ★デバッグログ5
        logoutMessage.textContent = 'ログアウトしました。ホームへリダイレクトします。';
        
        // ナビゲーションを更新 (updateNavがPromiseを返すのでawaitする)
        console.log('Updating nav after logout...'); // ★デバッグログ6
        if (typeof updateNav === 'function') {
            await updateNav(); 
            console.log('Nav updated.'); // ★デバッグログ7
        } else {
            console.warn('updateNav function is not defined globally or not imported.'); // ★デバッグログ8
        }
        
        // ホーム画面にリダイレクト
        setTimeout(() => {
            console.log('Redirecting to index.html...'); // ★デバッグログ9
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('Logout process error:', error.message); // ★デバッグログ10
        logoutMessage.textContent = `ログアウト処理に失敗しました: ${error.message}`;
        // エラー時もナビゲーション更新を試みる
        if (typeof updateNav === 'function') {
            try {
                await updateNav();
            } catch (navError) {
                console.error('Error updating nav during logout error handling:', navError);
            }
        }
    }
});