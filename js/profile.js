// js/profile.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const profileForm = document.getElementById('profileForm');
    const messageArea = document.getElementById('messageArea');

    // 基本プロフィール要素
    const usernameInput = document.getElementById('username');
    const bioTextarea = document.getElementById('bio');
    const businessDescriptionTextarea = document.getElementById('business_description');
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatarPreview');

    // コミュニティプロフィール要素
    const communityProfileSection = document.getElementById('communityProfileSection');
    const communityNameInput = document.getElementById('community_name');
    const communityBannerInput = document.getElementById('communityBanner');
    const communityBannerPreview = document.getElementById('communityBannerPreview');
    
    let descriptionQuill, projectsQuill;
    let avatarUrl = null;
    let communityBannerUrl = null;

    // Quillエディタの初期化
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
    
    // プロフィール情報を読み込み
    async function loadProfile() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('membership_type, username, community_name, bio, business_description, avatar_url, community_banner_url, community_description, community_projects')
                .eq('id', user.id)
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

                if (data.membership_type === 'owner') {
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

    // ファイル選択時のプレビュー処理
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

    /**
     * 画像ファイルをWebP形式に変換・圧縮する関数
     */
    async function convertToWebP(imageFile) {
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp'
        };
        try {
            console.log(`変換前: ${imageFile.name}, サイズ: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
            const compressedFile = await imageCompression(imageFile, options);
            console.log(`変換後: ${compressedFile.name}, サイズ: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
            return compressedFile;
        } catch (error) {
            console.error('画像のWebP変換に失敗しました:', error);
            return imageFile;
        }
    }

    // 画像アップロードの共通関数
    async function uploadImage(file, currentUrl, userId) {
        if (!file) return currentUrl;
        
        const fileToUpload = await convertToWebP(file);

        if (currentUrl) {
            await supabase.storage.from('avatars').remove([currentUrl]);
        }
        
        // ★★★ 修正点1: ファイル名を.webpに変更 ★★★
        const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const filePath = `${userId}/${Date.now()}_${originalName}.webp`;
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★

        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, fileToUpload);
        if (uploadError) throw new Error(`画像アップロード失敗: ${uploadError.message}`);
        return filePath;
    }

    // フォーム送信処理
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = profileForm.querySelector('button[type="submit"]'); // ボタン要素を取得

        // ▼▼▼ 処理開始時にローディング状態にする ▼▼▼
        submitButton.classList.add('btn--loading');
        submitButton.disabled = true;
        messageArea.innerHTML = ''; // メッセージを一旦クリア

        try {
            const newAvatarPath = await uploadImage(avatarInput.files[0], avatarUrl, user.id);
            
            const updates = {
                id: user.id,
                updated_at: new Date(),
                username: usernameInput.value.trim(),
                bio: bioTextarea.value.trim(),
                business_description: businessDescriptionTextarea.value.trim(),
                avatar_url: newAvatarPath,
            };

            if (communityProfileSection.style.display === 'block') {
                const newBannerPath = await uploadImage(communityBannerInput.files[0], communityBannerUrl, user.id);
                updates.community_name = communityNameInput.value.trim();
                updates.community_banner_url = newBannerPath;
                updates.community_description = descriptionQuill.root.innerHTML;
                updates.community_projects = projectsQuill.root.innerHTML;
                communityBannerUrl = newBannerPath;
            }

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;
            
            avatarUrl = newAvatarPath;
            
            messageArea.innerHTML = '<p class="success-message">プロフィールが正常に更新されました。詳細ページへ移動します...</p>';
            setTimeout(() => {
                window.location.href = `user_profile.html?id=${user.id}`;
            }, 1500);

        } catch (error) {
            console.error('Error updating profile:', error);
            messageArea.innerHTML = `<p class="error-message">更新に失敗しました: ${error.message}</p>`;
        } finally {
            // ▼▼▼ 処理終了時にローディング状態を解除 ▼▼▼
            submitButton.classList.remove('btn--loading');
            submitButton.disabled = false;
        }
    });

    loadProfile();
});