// js/profile.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const profileForm = document.getElementById('profileForm');
    const messageArea = document.getElementById('messageArea');
    const communityNameInput = document.getElementById('community_name');
    const bioTextarea = document.getElementById('bio');
    // --- 追加 ---
    const businessDescriptionTextarea = document.getElementById('business_description');
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatarPreview');
    // -------------

    let avatarUrl = null; // 画像URLを保持する変数

    // 現在のプロフィール情報を読み込んでフォームに設定
    async function loadProfile() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('community_name, bio, business_description, avatar_url')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                communityNameInput.value = data.community_name || '';
                bioTextarea.value = data.bio || '';
                // --- 追加 ---
                businessDescriptionTextarea.value = data.business_description || '';
                if (data.avatar_url) {
                    avatarUrl = data.avatar_url;
                    // Supabase Storageから画像URLを取得してプレビューに表示
                    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
                    avatarPreview.src = publicUrlData.publicUrl;
                }
                // -------------
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            messageArea.innerHTML = `<p class="error-message">プロフィールの読み込みに失敗しました。</p>`;
        }
    }

    // --- 追加: アバターファイル選択時のプレビュー処理 ---
    avatarInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    // ---------------------------------------------------

    // フォームの送信処理
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '<p class="loading-message">更新中...</p>';

        try {
            const file = avatarInput.files[0];
            let newAvatarUrl = avatarUrl; // 既存のURLをデフォルトに

            // --- 追加: 画像アップロード処理 ---
            if (file) {
                // 古い画像があれば削除
                if (avatarUrl) {
                    const { error: removeError } = await supabase.storage.from('avatars').remove([avatarUrl]);
                    if (removeError) console.warn('古いアバターの削除に失敗:', removeError.message);
                }
                
                const filePath = `${user.id}/${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
                newAvatarUrl = filePath; // 新しい画像のパスを保存
            }
            // ---------------------------------

            const updates = {
                id: user.id,
                community_name: communityNameInput.value.trim(),
                bio: bioTextarea.value.trim(),
                // --- 追加 ---
                business_description: businessDescriptionTextarea.value.trim(),
                avatar_url: newAvatarUrl,
                // -------------
                updated_at: new Date(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;
            
            avatarUrl = newAvatarUrl; // 正常に更新されたらグローバル変数も更新
            messageArea.innerHTML = '<p class="success-message">プロフィールが正常に更新されました。</p>';

        } catch (error) {
            console.error('Error updating profile:', error);
            messageArea.innerHTML = `<p class="error-message">更新に失敗しました: ${error.message}</p>`;
        }
    });

    loadProfile();
});