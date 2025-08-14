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


/**
 * ユーザーのアカウント状態を確認し、停止中であればアラートを表示してトップページにリダイレクトする。
 * @param {object} user - Supabaseのユーザーオブジェクト
 * @returns {boolean} - アカウントが有効な場合は true, 停止中の場合は false を返す
 */
async function checkUserStatusAndRedirectIfSuspended(user) {
    if (!user) {
        // そもそもログインしていない場合は何もしない（別関数が処理するため）
        return false;
    }

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_active')
            .eq('id', user.id)
            .single();

        if (error) {
            // プロファイルがない場合も念のためエラーとして扱う
            console.error('Error fetching user status:', error.message);
            alert('ユーザー情報の取得に失敗しました。');
            window.location.href = 'index.html';
            return false;
        }

        if (profile && !profile.is_active) {
            // アカウントが停止中の場合
            alert('現在、このアカウントは管理者によって機能が制限されています。ご不明な点は運営までお問い合わせください。');
            window.location.href = 'index.html';
            return false;
        }

        // アカウントが有効な場合
        return true;

    } catch (error) {
        console.error('An unexpected error occurred:', error.message);
        alert('予期せぬエラーが発生しました。');
        window.location.href = 'index.html';
        return false;
    }
}

// ナビゲーションの表示を更新
async function updateNav() {
    const user = await getCurrentUser();
    const navElement = document.getElementById('nav');
    if (navElement) {
        if (user) {
            navElement.innerHTML = `
                <a href="https://dealden.jp/">ホーム</a>
                <a href="index.html">イベント検索</a>
                <a href="premium_members.html">会員一覧</a>
                <a href="communities.html">コミュニティ一覧</a>
                <a href="create.html">イベント作成</a>
                <a href="dashboard.html">イベント編集</a>
                <a href="profile.html">プロフィール編集</a>
                <a href="logout.html">ログアウト</a>
            `;
        } else {
            navElement.innerHTML = `
                <a href="https://dealden.jp/">ホーム</a>
                <a href="index.html">イベント検索</a>
                <a href="premium_members.html">会員一覧</a>
                <a href="communities.html">参画コミュニティ一覧</a>
                <a href="signup.html">新規登録</a>
                <a href="login.html">ログイン</a>
            `;
        }
    }
}

// ページ読み込み時にナビゲーションを更新
document.addEventListener('DOMContentLoaded', updateNav);