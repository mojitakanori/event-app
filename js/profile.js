// js/profile.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. ログインユーザーと編集対象ユーザーのIDを特定 ---
    const loggedInUser = await redirectToLoginIfNotAuthenticated();
    if (!loggedInUser) return;

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserIdFromUrl = urlParams.get('id');
    const targetUserId = targetUserIdFromUrl || loggedInUser.id; // URLにIDがなければ自分自身

    const messageArea = document.getElementById('messageArea');
    const profileForm = document.getElementById('profileForm');

    // --- 2. 権限チェック ---
    const { data: loggedInProfile, error: profileError } = await supabase
        .from('profiles')
        .select('membership_type')
        .eq('id', loggedInUser.id)
        .single();

    const isAdmin = loggedInProfile && loggedInProfile.membership_type === 'admin';

    // 管理者でなく、かつ他人のプロフィールを編集しようとした場合はエラー
    if (!isAdmin && targetUserId !== loggedInUser.id) {
        messageArea.innerHTML = `<p class="error-message">他人のプロフィールを編集する権限がありません。</p>`;
        profileForm.style.display = 'none';
        return;
    }
    
    // --- 3. ページタイトルの動的変更 ---
    if (isAdmin && targetUserId !== loggedInUser.id) {
        document.title = '管理者用 プロフィール編集 - Deal Den';
        const h2 = profileForm.querySelector('h2');
        if(h2) h2.textContent = 'ユーザープロフィール編集 (管理者用)';
    }

    // --- 4. HTML要素の取得 ---
    const usernameInput = document.getElementById('username');
    const bioTextarea = document.getElementById('bio');
    const businessDescriptionTextarea = document.getElementById('business_description');
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatarPreview');
    const communityProfileSection = document.getElementById('communityProfileSection');
    const communityNameInput = document.getElementById('community_name');
    const communityBannerInput = document.getElementById('communityBanner');
    const communityBannerPreview = document.getElementById('communityBannerPreview');
    
    let descriptionQuill, projectsQuill;
    let avatarUrl = null;
    let communityBannerUrl = null;

    // --- 5. Quillエディタの初期化 ---
    const initQuillEditors = () => {
        const toolbarOptions = [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link'],
            ['clean']
        ];
        descriptionQuill = new Quill('#communityDescriptionEditor', {
            theme: 'snow',
            placeholder: 'コミュニティの活動内容や理念などを記述します。',
            modules: { toolbar: toolbarOptions }
        });
        projectsQuill = new Quill('#communityProjectsEditor', {
            theme: 'snow',
            placeholder: '現在進行中のプロジェクトや過去の実績などを記述します。',
            modules: { toolbar: toolbarOptions }
        });
    };

    // --- 6. プロフィール読み込み関数 ---
    async function loadProfile() {
        try {
            // ▼▼▼ ここから修正 ▼▼▼
            const emailInput = document.getElementById('email');
            const { data: { user } } = await supabase.auth.getUser();
            if (user && emailInput) {
                emailInput.value = user.email || '';
            }
            // ▲▲▲ 修正ここまで ▲▲▲

            const { data, error } = await supabase
                .from('profiles')
                .select('membership_type, username, community_name, bio, business_description, avatar_url, community_banner_url, community_description, community_projects')
                .eq('id', targetUserId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                usernameInput.value = data.username || '';
                bioTextarea.value = data.bio || '';
                businessDescriptionTextarea.value = data.business_description || '';
                if (data.avatar_url) {
                    avatarUrl = data.avatar_url;
                    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
                    avatarPreview.src = publicUrlData.publicUrl;
                }
                if (data.membership_type === 'owner' || data.membership_type === 'admin') {
                    communityProfileSection.style.display = 'block';
                    initQuillEditors();
                    communityNameInput.value = data.community_name || '';
                    if (data.community_banner_url) {
                        communityBannerUrl = data.community_banner_url;
                        const { data: bannerUrlData } = supabase.storage.from('avatars').getPublicUrl(communityBannerUrl);
                        communityBannerPreview.src = bannerUrlData.publicUrl;
                    }
                    if (data.community_description) descriptionQuill.root.innerHTML = data.community_description;
                    if (data.community_projects) projectsQuill.root.innerHTML = data.community_projects;
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            messageArea.innerHTML = `<p class="error-message">プロフィールの読み込みに失敗しました。</p>`;
        }
    }

    // --- 7. ファイル選択時のプレビュー処理 ---
    const setupPreview = (input, preview) => {
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                preview.src = URL.createObjectURL(file);
            }
        });
    };
    setupPreview(avatarInput, avatarPreview);
    setupPreview(communityBannerInput, communityBannerPreview);

    // --- 8. 画像圧縮・アップロード関数 ---
    async function convertToWebP(imageFile) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp' };
        try {
            return await imageCompression(imageFile, options);
        } catch (error) {
            console.error('画像のWebP変換に失敗しました:', error);
            return imageFile;
        }
    }
    
    async function uploadImage(file, currentUrl, userIdForPath) {
        if (!file) return currentUrl;

        const fileToUpload = await convertToWebP(file);

        if (currentUrl) {
            await supabase.storage.from('avatars').remove([currentUrl]);
        }

        const originalStem =
            file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;

        const safeStem = makeSafeKey(originalStem);
        const filePath = `${userIdForPath}/${Date.now()}_${safeStem}.webp`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, fileToUpload, { contentType: 'image/webp', upsert: false });

        if (uploadError) throw new Error(`画像アップロード失敗: ${uploadError.message}`);
        return filePath;
    }

    function makeSafeKey(stem) {
        return (stem || 'image')
            .normalize('NFKC')
            .replace(/[^\w.-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 120) || 'image';
    }

    // --- 9. フォーム送信処理 ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = profileForm.querySelector('button[type="submit"]');

        submitButton.classList.add('btn--loading');
        submitButton.disabled = true;
        messageArea.innerHTML = '';

        try {
            // ▼▼▼ ここから修正 ▼▼▼
            const newEmail = document.getElementById('email').value.trim();
            const { data: { user } } = await supabase.auth.getUser();

            let emailChanged = false;
            if (newEmail && newEmail !== user.email) {
                const { data, error: updateUserError } = await supabase.auth.updateUser({ email: newEmail });
                if (updateUserError) {
                    throw new Error(`メールアドレスの更新に失敗しました: ${updateUserError.message}`);
                }
                emailChanged = true;
            }
            // ▲▲▲ 修正ここまで ▲▲▲

            const newAvatarPath = await uploadImage(avatarInput.files[0], avatarUrl, targetUserId);
            
            const updates = {
                id: targetUserId,
                updated_at: new Date(),
                username: usernameInput.value.trim(),
                bio: bioTextarea.value.trim(),
                business_description: businessDescriptionTextarea.value.trim(),
                avatar_url: newAvatarPath,
            };

            if (communityProfileSection.style.display === 'block') {
                const newBannerPath = await uploadImage(communityBannerInput.files[0], communityBannerUrl, targetUserId);
                updates.community_name = communityNameInput.value.trim();
                updates.community_banner_url = newBannerPath;
                updates.community_description = descriptionQuill.root.innerHTML;
                updates.community_projects = projectsQuill.root.innerHTML;
                communityBannerUrl = newBannerPath;
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', targetUserId)
                .select();

            if (error) {
                throw error;
            }
            if (!data || data.length === 0) {
                throw new Error("データベースの更新が拒否されました。RLSポリシーの設定を確認してください。");
            }
            
            avatarUrl = newAvatarPath;

            // ▼▼▼ 成功メッセージを修正 ▼▼▼
            let successMessage = '<p class="success-message">プロフィールが正常に更新されました。</p>';
            if (emailChanged) {
                successMessage += '<p class="warning-message">新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。</p>';
            }
            messageArea.innerHTML = successMessage;
            // ▲▲▲ 修正ここまで ▲▲▲
            
            if (isAdmin && targetUserId !== loggedInUser.id) {
                 setTimeout(() => { window.close(); }, 2000);
            } else {
                setTimeout(() => {
                    window.location.href = `user_profile.html?id=${targetUserId}`;
                }, 1500);
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            messageArea.innerHTML = `<p class="error-message">更新に失敗しました: ${error.message}</p>`;
        } finally {
            submitButton.classList.remove('btn--loading');
            submitButton.disabled = false;
        }
    });

    // --- 10. 初期読み込みの実行 ---
    loadProfile();
});