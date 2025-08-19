// js/premium_members.js
document.addEventListener('DOMContentLoaded', async () => {
    // このページはログインしていなくても閲覧可能とする場合は、認証チェックを外します。
    // ログインユーザーのみに表示したい場合は、以下の行のコメントを解除してください。
    // const user = await redirectToLoginIfNotAuthenticated();
    // if (!user) return;

    const memberListUl = document.getElementById('premiumMemberList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noMembersMessage = document.getElementById('noMembersMessage');

    async function fetchPremiumMembers() {
        try {
            loadingMessage.style.display = 'block';
            memberListUl.innerHTML = '';
            noMembersMessage.style.display = 'none';

            // --- 変更: selectにavatar_urlとbusiness_descriptionを追加 ---
            const { data: members, error } = await supabase
                .from('profiles')
                .select('id, username, community_name, business_description, avatar_url, score') // ★変更点: scoreを追加
                .in('membership_type', ['premium', 'owner', 'admin'])
                .eq('is_active', true) 
                .order('score', { ascending: false }); 

            if (error) throw error;

            if (members && members.length > 0) {
                members.forEach(member => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('profile-card');

                    // --- 変更: 表示内容の生成 ---
                    // 画像URLの処理
                    let avatarSrc = 'https://placehold.jp/150x150.png?text=No+Image'; // デフォルト画像
                    if (member.avatar_url) {
                        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(member.avatar_url);
                        avatarSrc = publicUrlData.publicUrl;
                    }

                    // 事業内容を30文字に短縮
                    const businessDescShort = member.business_description 
                        ? (member.business_description.length > 30 
                            ? member.business_description.substring(0, 30) + '…' 
                            : member.business_description) 
                        : '';

                    listItem.innerHTML = `
                        <a href="user_profile.html?id=${member.id}" class="profile-card__link">
                            <img src="${avatarSrc}" alt="${member.username || ''}のアイコン" class="avatar">
                            <h3>${member.username || '名称未設定'}</h3>
                            <p class="business-desc">${businessDescShort}</p>
                        </a>
                    `;
                    memberListUl.appendChild(listItem);
                });
            } else {
                noMembersMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching premium members:', error.message);
            memberListUl.innerHTML = `<li class="error-message">会員情報の読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    fetchPremiumMembers();
});