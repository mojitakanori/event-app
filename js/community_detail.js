// js/community_detail.js
document.addEventListener('DOMContentLoaded', async () => {
    // --- HTML要素の取得 ---
    const loadingMessage = document.getElementById('loadingMessage');
    const communityDetailDiv = document.getElementById('communityDetail');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Community Profile Elements
    const bannerEl = document.getElementById('communityBanner');
    const nameEl = document.getElementById('communityName');
    const descriptionSection = document.getElementById('descriptionSection');
    const descriptionEl = document.getElementById('communityDescription');
    const projectsSection = document.getElementById('projectsSection');
    const projectsEl = document.getElementById('communityProjects');

    // Events Elements
    const eventsSection = document.getElementById('eventsSection');
    const eventListUl = document.getElementById('eventList');
    const noEventsMessage = document.getElementById('noEventsMessage');

    // --- URLからオーナーIDを取得 ---
    const urlParams = new URLSearchParams(window.location.search);
    const ownerId = urlParams.get('id');

    if (!ownerId) {
        loadingMessage.style.display = 'none';
        errorMessageDiv.innerHTML = '<p class="error-message">ユーザーIDが指定されていません。</p>';
        return;
    }

    // --- メインのデータ取得・表示関数 ---
    async function fetchCommunityDetails() {
        try {
            // 1. コミュニティプロフィール情報を取得
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('community_name, community_banner_url, community_description, community_projects')
                .eq('id', ownerId)
                .eq('membership_type', 'owner')
                .single();

            if (profileError) {
                if (profileError.code === 'PGRST116') throw new Error('指定されたコミュニティは存在しないか、オーナーではありません。');
                throw profileError;
            }

            // 2. 取得したプロフィール情報を表示
            if (profile) {
                document.title = `${profile.community_name || 'コミュニティ'}詳細 - Business HUB『Deal Den』`;
                nameEl.textContent = profile.community_name || 'コミュニティ名未設定';

                if (profile.community_banner_url) {
                    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(profile.community_banner_url);
                    bannerEl.src = publicUrlData.publicUrl;
                    bannerEl.alt = `${profile.community_name || ''}のバナー`;
                } else {
                    bannerEl.src = 'https://placehold.jp/1200x300.png?text=No+Banner';
                }

                if (profile.community_description) {
                    descriptionEl.innerHTML = profile.community_description;
                    descriptionSection.style.display = 'block';
                }

                if (profile.community_projects) {
                    projectsEl.innerHTML = profile.community_projects;
                    projectsSection.style.display = 'block';
                }
            } else {
                 throw new Error('プロフィールデータが見つかりません。');
            }

            // 3. このオーナーが開催するイベントを取得
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id, name, event_date, location, image_urls')
                .eq('user_id', ownerId)
                .order('event_date', { ascending: true });

            if (eventsError) throw eventsError;

            // 4. イベント一覧を表示
            eventListUl.innerHTML = '';
            if (events && events.length > 0) {
                noEventsMessage.style.display = 'none';
                events.forEach(event => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('event-card');

                    let imageUrl = 'https://placehold.jp/300x180.png?text=Event';
                    if (event.image_urls && event.image_urls.length > 0 && event.image_urls[0]) {
                        imageUrl = event.image_urls[0];
                    }

                    const eventDate = event.event_date ? event.event_date.replace('T', ' ').substring(0, 16) : '日時未定';

                    listItem.innerHTML = `
                        <a href="detail.html?id=${event.id}">
                            <img src="${imageUrl}" alt="${event.name || 'イベント画像'}" class="event-card__image">
                        </a>
                        <div class="event-card__content">
                            <h3 class="event-card__title"><a href="detail.html?id=${event.id}">${event.name || '名称未設定'}</a></h3>
                            <div class="event-card__meta">
                                <p><strong>日時:</strong> ${eventDate}</p>
                                <p><strong>場所:</strong> ${event.location || '未定'}</p>
                            </div>
                             <a href="detail.html?id=${event.id}" class="btn event-card__details-btn">詳細を見る</a>
                        </div>
                    `;
                    eventListUl.appendChild(listItem);
                });
            } else {
                noEventsMessage.style.display = 'block';
            }

            // すべての読み込みが終わったら詳細を表示
            communityDetailDiv.style.display = 'block';

        } catch (error) {
            console.error('Error fetching community details:', error.message);
            errorMessageDiv.innerHTML = `<p class="error-message">情報の読み込みに失敗しました: ${error.message}</p>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    fetchCommunityDetails();
});