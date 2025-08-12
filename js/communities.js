// js/communities.js
document.addEventListener('DOMContentLoaded', async () => {
    const communityListUl = document.getElementById('communityList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noCommunitiesMessage = document.getElementById('noCommunitiesMessage');

    async function fetchCommunities() {
        try {
            loadingMessage.style.display = 'block';
            communityListUl.innerHTML = '';
            noCommunitiesMessage.style.display = 'none';

            const { data: owners, error } = await supabase
                .from('profiles')
                .select('id, community_name, community_description, community_banner_url, score')
                .eq('membership_type', 'owner')
                .order('score', { ascending: false }); 

            if (error) throw error;

            if (owners && owners.length > 0) {
                owners.forEach(owner => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('profile-card');

                    let bannerSrc = 'https://placehold.jp/400x150.png?text=No+Banner'; // デフォルトバナー
                    if (owner.community_banner_url) {
                        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(owner.community_banner_url);
                        bannerSrc = publicUrlData.publicUrl;
                    }

                    listItem.innerHTML = `
                        <a href="community_detail.html?id=${owner.id}" class="profile-card__link">
                            <img src="${bannerSrc}" alt="${owner.community_name || ''}のバナー" class="profile-card__banner">
                            <div class="profile-card__content">
                                <h3>${owner.community_name || '名称未設定'}</h3>
                                <div class="ql-snow"><div class="ql-editor">${owner.community_description || ''}</div></div>
                            </div>
                        </a>
                    `;
                    communityListUl.appendChild(listItem);
                });
            } else {
                noCommunitiesMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching communities:', error.message);
            communityListUl.innerHTML = `<li class="error-message">コミュニティ情報の読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    fetchCommunities();
});