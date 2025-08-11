// js/user_profile.js
document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. HTML要素を取得 ---
    const loadingMessage = document.getElementById('loadingMessage');
    const profileDetailDiv = document.getElementById('profileDetail');
    const messageArea = document.getElementById('messageArea');
    const communityNameEl = document.getElementById('communityName');
    const avatarEl = document.getElementById('avatar');
    const businessSection = document.getElementById('businessSection');
    const businessDescriptionEl = document.getElementById('businessDescription');
    const bioSection = document.getElementById('bioSection');
    const bioEl = document.getElementById('bio');
    const showModalBtn = document.getElementById('showMeetingRequestModalBtn');
    const modalOverlay = document.getElementById('meetingRequestModal');
    const closeModalBtn = document.getElementById('closeMeetingRequestModalBtn');
    const meetingRequestForm = document.getElementById('meetingRequestForm');
    const modalMessageArea = document.getElementById('modalMessageArea');

    // --- 2. 表示対象のユーザーIDをURLから取得 ---
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id'); // 変数名を「userId」に統一

    if (!userId) {
        loadingMessage.style.display = 'none';
        messageArea.innerHTML = '<p class="error-message">ユーザーIDが指定されていません。</p>';
        return;
    }

    // --- 3. プロフィール情報を取得して表示する関数 ---
    async function fetchUserProfile() {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('community_name, bio, business_description, avatar_url')
                .eq('id', userId) // 「userId」を使用
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') throw new Error('指定されたプロフィールは見つかりませんでした。');
                throw error;
            }

            if (profile) {
                document.title = `${profile.community_name || '会員'}のプロフィール - イベント管理アプリ`;
                if(communityNameEl) communityNameEl.textContent = profile.community_name || 'コミュニティ名未設定';

                if (profile.avatar_url && avatarEl) {
                    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
                    avatarEl.src = publicUrlData.publicUrl;
                    avatarEl.alt = `${profile.community_name || ''}のアイコン`;
                } else if (avatarEl) {
                    avatarEl.src = 'https://placehold.jp/180x180.png?text=No+Image';
                }

                if (profile.business_description && businessDescriptionEl && businessSection) {
                    businessDescriptionEl.textContent = profile.business_description;
                    businessSection.style.display = 'block';
                }

                if (profile.bio && bioEl && bioSection) {
                    bioEl.textContent = profile.bio;
                    bioSection.style.display = 'block';
                }

                if(profileDetailDiv) profileDetailDiv.style.display = 'block';
            } else {
                 throw new Error('プロフィールデータが見つかりません。');
            }

        } catch (error) {
            console.error('Error fetching user profile:', error.message);
            if(messageArea) messageArea.innerHTML = `<p class="error-message">プロフィールの読み込みに失敗しました: ${error.message}</p>`;
        } finally {
            if(loadingMessage) loadingMessage.style.display = 'none';
        }
    }
    
    // --- 4. メイン処理 ---
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();

    // 自分のプロフィールページでは申し込みボタンを非表示にする
    if (loggedInUser && loggedInUser.id === userId) { // 「userId」を使用
        if (showModalBtn) showModalBtn.style.display = 'none';
    }

    // --- 5. イベントリスナーを設定 ---
    if (showModalBtn) {
        showModalBtn.addEventListener('click', () => {
            if (!loggedInUser) {
                alert('この機能を利用するにはログインが必要です。');
                window.location.href = 'login.html';
                return;
            }
            if (modalOverlay) modalOverlay.classList.add('active');
        });
    }

    if (closeModalBtn && modalOverlay) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });
    }

    if (meetingRequestForm) {
        meetingRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = meetingRequestForm.querySelector('button[type="submit"]');
            if(submitBtn) submitBtn.disabled = true;
            if(modalMessageArea) modalMessageArea.innerHTML = `<p class="loading-message">送信中...</p>`;

            try {
                const title = document.getElementById('requestTitle').value;
                const content = document.getElementById('requestContent').value;
                const meetingType = document.querySelector('input[name="meetingType"]:checked').value;
                const contactInfo = document.getElementById('requestContact').value;

                const { data, error } = await supabase.functions.invoke('send-mail-meeting-request', {
                    body: {
                        recipient_user_id: userId, // 「userId」を使用
                        title: title,
                        content: content,
                        meeting_type: meetingType,
                        contact_info: contactInfo
                    },
                });

                if (error) throw error;

                if(modalMessageArea) modalMessageArea.innerHTML = `<p class="success-message">申し込みを送信しました。</p>`;
                setTimeout(() => {
                    if(modalOverlay) modalOverlay.classList.remove('active');
                    meetingRequestForm.reset();
                }, 2000);

            } catch (err) {
                if(modalMessageArea) modalMessageArea.innerHTML = `<p class="error-message">送信に失敗しました: ${err.message}</p>`;
            } finally {
                if(submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // --- 6. 初期表示のためにプロフィール取得を実行 ---
    fetchUserProfile();
});