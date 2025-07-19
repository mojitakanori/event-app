// js/profile.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const profileForm = document.getElementById('profileForm');
    const messageArea = document.getElementById('messageArea');

    // 基本プロフィール要素
    const communityNameInput = document.getElementById('community_name');
    const bioTextarea = document.getElementById('bio');
    const businessDescriptionTextarea = document.getElementById('business_description');
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatarPreview');

    // コミュニティプロフィール要素
    const communityProfileSection = document.getElementById('communityProfileSection');
    const communityBannerInput = document.getElementById('communityBanner');
    const communityBannerPreview = document.getElementById('communityBannerPreview');
    const communityDescriptionHidden = document.getElementById('communityDescription');
    const communityProjectsHidden = document.getElementById('communityProjects');
    
    let descriptionQuill, projectsQuill;
    let avatarUrl = null;
    let communityBannerUrl = null; // コミュニティバナーURLを保持

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
            modules: {
                toolbar: toolbarOptions
            }
        });

        projectsQuill = new Quill('#communityProjectsEditor', {
            theme: 'snow',
            placeholder: '現在進行中のプロジェクトや過去の実績などを記述します。',
            modules: {
                toolbar: toolbarOptions
            }
        });
    };
    
    // プロフィール情報を読み込み
    async function loadProfile() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('membership_type, community_name, bio, business_description, avatar_url, community_banner_url, community_description, community_projects')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                // 基本情報
                communityNameInput.value = data.community_name || '';
                bioTextarea.value = data.bio || '';
                businessDescriptionTextarea.value = data.business_description || '';
                if (data.avatar_url) {
                    avatarUrl = data.avatar_url;
                    avatarPreview.src = supabase.storage.from('avatars').getPublicUrl(avatarUrl).data.publicUrl;
                }

                // ownerの場合のみコミュニティプロフィール欄を表示・設定
                if (data.membership_type === 'owner') {
                    communityProfileSection.style.display = 'block';
                    initQuillEditors();

                    if (data.community_banner_url) {
                        communityBannerUrl = data.community_banner_url;
                        communityBannerPreview.src = supabase.storage.from('avatars').getPublicUrl(communityBannerUrl).data.publicUrl;
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

    // 画像アップロードの共通関数
    async function uploadImage(file, currentUrl, userId) {
        if (!file) return currentUrl;

        // 古い画像があれば削除
        if (currentUrl) {
            await supabase.storage.from('avatars').remove([currentUrl]);
        }
        
        const filePath = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);
        if (uploadError) throw new Error(`画像アップロード失敗: ${uploadError.message}`);
        
        return filePath;
    }

    // フォーム送信処理
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '<p class="loading-message">更新中...</p>';

        try {
            // 画像アップロード
            const newAvatarPath = await uploadImage(avatarInput.files[0], avatarUrl, user.id);
            let newBannerPath = communityBannerUrl;
            if (communityProfileSection.style.display === 'block') { // ownerの場合のみ
                 newBannerPath = await uploadImage(communityBannerInput.files[0], communityBannerUrl, user.id);
            }

            // 更新データオブジェクト作成
            const updates = {
                id: user.id,
                updated_at: new Date(),
                community_name: communityNameInput.value.trim(),
                bio: bioTextarea.value.trim(),
                business_description: businessDescriptionTextarea.value.trim(),
                avatar_url: newAvatarPath,
            };

            // ownerの場合、コミュニティ情報を追加
            if (communityProfileSection.style.display === 'block') {
                updates.community_banner_url = newBannerPath;
                updates.community_description = descriptionQuill.root.innerHTML;
                updates.community_projects = projectsQuill.root.innerHTML;
            }

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;
            
            // URL変数を更新
            avatarUrl = newAvatarPath;
            communityBannerUrl = newBannerPath;
            
            messageArea.innerHTML = '<p class="success-message">プロフィールが正常に更新されました。</p>';

        } catch (error) {
            console.error('Error updating profile:', error);
            messageArea.innerHTML = `<p class="error-message">更新に失敗しました: ${error.message}</p>`;
        }
    });

    loadProfile();
});