// js/user_profile.js
document.addEventListener('DOMContentLoaded', async () => {
    const loadingMessage = document.getElementById('loadingMessage');
    const profileDetailDiv = document.getElementById('profileDetail');
    const messageArea = document.getElementById('messageArea');

    // --- 変更・追加 ---
    const communityNameEl = document.getElementById('communityName');
    const avatarEl = document.getElementById('avatar');
    const businessSection = document.getElementById('businessSection');
    const businessDescriptionEl = document.getElementById('businessDescription');
    const bioSection = document.getElementById('bioSection');
    const bioEl = document.getElementById('bio');
    // --------------------

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        loadingMessage.style.display = 'none';
        messageArea.innerHTML = '<p class="error-message">ユーザーIDが指定されていません。</p>';
        return;
    }

    async function fetchUserProfile() {
        try {
            // --- 変更: selectにフィールドを追加 ---
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('community_name, bio, business_description, avatar_url')
                .eq('id', userId)
                .single();
            // ------------------------------------
            
            if (error) {
                // 'PGRST116'はレコードが見つからなかった場合のエラーコード
                if (error.code === 'PGRST116') {
                    throw new Error('指定されたプロフィールは見つかりませんでした。');
                }
                throw error;
            }

            if (profile) {
                document.title = `${profile.community_name || '会員'}のプロフィール - イベント管理アプリ`;
                communityNameEl.textContent = profile.community_name || 'コミュニティ名未設定';

                // --- 追加: 画像、事業内容、自己紹介の表示処理 ---
                if (profile.avatar_url) {
                    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
                    avatarEl.src = publicUrlData.publicUrl;
                    avatarEl.alt = `${profile.community_name || ''}のアイコン`;
                } else {
                    avatarEl.src = 'https://placehold.jp/180x180.png?text=No+Image'; // デフォルト画像
                }

                if (profile.business_description) {
                    businessDescriptionEl.textContent = profile.business_description;
                    businessSection.style.display = 'block';
                }

                if (profile.bio) {
                    bioEl.textContent = profile.bio;
                    bioSection.style.display = 'block';
                }
                // ----------------------------------------------------

                profileDetailDiv.style.display = 'block';
            } else {
                 throw new Error('プロフィールデータが見つかりません。');
            }

        } catch (error) {
            console.error('Error fetching user profile:', error.message);
            messageArea.innerHTML = `<p class="error-message">プロフィールの読み込みに失敗しました: ${error.message}</p>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    fetchUserProfile();
});