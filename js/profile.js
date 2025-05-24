// js/profile.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) {
        // redirectToLoginIfNotAuthenticated がリダイレクトするので、ここでは追加処理不要
        return;
    }

    const profileForm = document.getElementById('profileForm');
    const communityNameInput = document.getElementById('communityName');
    const bioInput = document.getElementById('bio');
    const messageArea = document.getElementById('messageArea');
    const loadingMessage = document.getElementById('loadingMessage');

    async function loadProfile() {
        loadingMessage.style.display = 'block';
        profileForm.style.display = 'none';
        messageArea.innerHTML = '';

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('community_name, bio')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116は行がない場合のエラーコード
                throw error;
            }

            if (profile) {
                communityNameInput.value = profile.community_name || '';
                bioInput.value = profile.bio || '';
            } else {
                // プロファイルが存在しない場合 (初回アクセスなど)
                // 必要であれば、ここで空のプロファイルレコードをINSERTする処理を入れても良い。
                // 今回は、ユーザーが入力して更新ボタンを押したときにUPSERTする。
                console.log('No profile found for this user. User can create one by saving.');
            }
            profileForm.style.display = 'block';
        } catch (error) {
            console.error('Error loading profile:', error.message);
            messageArea.innerHTML = `<p class="error-message">プロフィールの読み込みに失敗しました: ${error.message}</p>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '';
        loadingMessage.style.display = 'block';
        profileForm.querySelector('button[type="submit"]').disabled = true;


        const updatedCommunityName = communityNameInput.value.trim();
        const updatedBio = bioInput.value.trim();

        try {
            // upsertを使用して、レコードが存在しない場合はINSERT、存在する場合はUPDATEする
            const { data, error } = await supabase
                .from('profiles')
                .upsert({ 
                    id: user.id, // 主キーを指定
                    community_name: updatedCommunityName, 
                    bio: updatedBio,
                    updated_at: new Date().toISOString() // updated_atをクライアント側で設定 (DBトリガーがあれば不要)
                })
                .select() // 更新/挿入されたデータを取得
                .single(); // 1行だけのはず

            if (error) {
                // RLS違反の可能性も考慮
                if (error.message.includes("violates row-level security policy")) {
                     messageArea.innerHTML = `<p class="error-message">プロフィールの更新に失敗しました。権限がありません。</p>`;
                } else {
                    throw error;
                }
            } else {
                 messageArea.innerHTML = '<p class="success-message">プロフィールが更新されました！</p>';
            }

        } catch (error) {
            console.error('Error updating profile:', error.message);
            messageArea.innerHTML = `<p class="error-message">プロフィールの更新に失敗しました: ${error.message}</p>`;
        } finally {
            loadingMessage.style.display = 'none';
            profileForm.querySelector('button[type="submit"]').disabled = false;
        }
    });

    loadProfile(); // ページ読み込み時にプロフィールを読み込む
});