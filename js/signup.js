// js/signup.js
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const messageArea = document.getElementById('messageArea');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '<p class="loading-message">登録処理中...</p>';
        const submitButton = signupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        // フォームから値を取得
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const community_name = document.getElementById('community_name').value;
        const business_description = document.getElementById('business_description').value;
        const bio = document.getElementById('bio').value;

        try {
            // 1. Supabaseの認証機能でユーザーをサインアップ
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) {
                // ユーザーが既に存在する場合でも、後続のログイン処理でカバーできるため、
                // 特定のエラーメッセージ以外をスローする（基本的にはエラーを無視して進む）
                if (authError.message !== 'User already registered') {
                    // throw authError; // デバッグ時以外はコメントアウトしても良い
                }
            }
            
            // ログイン処理を行い、現在のユーザー情報を確実に取得する
            // これにより、新規登録でも既存ユーザーでも同じ流れで処理できる
            const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (signInError || !user) {
                throw signInError || new Error('ユーザー情報の取得に失敗しました。');
            }

            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // 2. トリガーが作成したプロフィールを「更新(update)」する
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ // .upsert や .insert の代わりに .update を使用
                    community_name: community_name,
                    business_description: business_description,
                    bio: bio,
                    updated_at: new Date(),
                    // id や membership_type はトリガーが設定するので、ここでは更新しない
                })
                .eq('id', user.id); // どのユーザーのプロフィールを更新するか指定

            if (profileError) {
                console.error('Profile update failed:', profileError);
                throw new Error(`プロフィール情報の更新に失敗しました: ${profileError.message}`);
            }

            // 3. 成功した場合
            messageArea.innerHTML = `
                <p class="success-message">
                    新規登録が完了しました！<br>
                    3秒後にログインページに移動します。
                </p>`;
            signupForm.reset();
            
            // ログインページへリダイレクト
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);


        } catch (error) {
            console.error('Signup Error:', error);
            messageArea.innerHTML = `<p class="error-message">登録に失敗しました: ${error.message}</p>`;
            submitButton.disabled = false;
        } finally {
            // 処理が成功・失敗に関わらず、最後にサインアウトしてセッションをクリーンにする
            await supabase.auth.signOut();
        }
    });
});