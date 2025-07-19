// auth.js

// ログイン状態を確認し、セッションがあればユーザー情報を返す
async function getCurrentUser() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        return null;
    }
    if (session) {
        return session.user;
    }
    return null;
}

// ログインしていなければログインページへリダイレクト
async function redirectToLoginIfNotAuthenticated(protectedPath = true) {
    const user = await getCurrentUser();
    if (!user && protectedPath) {
        if (!window.location.pathname.endsWith('login.html')) {
            alert('ログインが必要です。ログインページに移動します。');
            window.location.href = 'login.html';
        }
    }
    return user;
}

// ログインしていればダッシュボードへリダイレクト
async function redirectToDashboardIfAuthenticated() {
    const user = await getCurrentUser();
    if (user) {
        if (window.location.pathname.endsWith('login.html')) {
            window.location.href = 'dashboard.html';
        }
    }
}

// ログアウト処理
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        alert('ログアウトしました。'); // ポップアップで通知
        await updateNav(); // ナビゲーションを更新
        window.location.href = 'index.html'; // ホーム画面へリダイレクト

    } catch (error) {
        console.error('Logout error:', error.message);
        alert(`ログアウトに失敗しました: ${error.message}`);
        await updateNav(); // エラー時もナビは更新しておく
    }
}



//  ユーザーの会員種別をチェックする関数
async function checkUserMembership(user) {
    if (!user) return null;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('membership_type')
            .eq('id', user.id)
            .single();

        if (error) {
            // プロファイルが存在しない場合も'free'として扱うか、エラーとするか選択できます。
            // ここでは、プロファイルがない=無料会員とみなします。
            if (error.code === 'PGRST116') {
                return 'free'; 
            }
            throw error;
        }

        return profile ? profile.membership_type : 'free';

    } catch (error) {
        console.error('Error fetching user membership:', error.message);
        return null; // エラーが発生した場合はnullを返す
    }
}

// ナビゲーションの表示を更新
async function updateNav() {
    const user = await getCurrentUser();
    const navElement = document.getElementById('nav');
    if (navElement) {
        if (user) {
            navElement.innerHTML = `
                <a href="index.html">ホーム</a>
                <a href="premium_members.html">プレミアム会員一覧</a>
                <a href="communities.html">コミュニティ一覧</a>
                <a href="create.html">イベント作成</a>
                <a href="dashboard.html">ダッシュボード</a>
                <a href="profile.html">プロフィール編集</a>
                <a href="logout.html">ログアウト</a>
            `;
        } else {
            navElement.innerHTML = `
                <a href="index.html">ホーム</a>
                <a href="premium_members.html">プレミアム会員一覧</a>
                <a href="communities.html">参画コミュニティ一覧</a>
                <a href="signup.html">会員登録</a>
                <a href="login.html">会員ログイン</a>
            `;
        }
    }
}

// ページ読み込み時にナビゲーションを更新
document.addEventListener('DOMContentLoaded', updateNav);