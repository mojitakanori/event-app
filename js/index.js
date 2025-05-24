// js/index.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventListUl = document.getElementById('eventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noEventsMessage = document.getElementById('noEventsMessage');
    const organizerFilterSelect = document.getElementById('organizerFilter');

    let allEvents = []; 

    function populateOrganizerFilter(eventsWithPotentialProfiles) {
        const organizerMap = new Map(); 

        eventsWithPotentialProfiles.forEach(event => {
            if (event.user_id) {
                let displayName = `開催者 (ID: ${event.user_id.substring(0,6)}...)`; // デフォルト表示名
                if (event.profiles && event.profiles.community_name) {
                    displayName = event.profiles.community_name;
                } else if (event.profiles && event.profiles.id && !event.profiles.community_name) {
                    // profilesはあるがcommunity_nameが空の場合
                    displayName = `未設定 (${event.profiles.id.substring(0,6)}...)`;
                }
                organizerMap.set(event.user_id, displayName);
            }
        });
        
        while (organizerFilterSelect.options.length > 1) {
            organizerFilterSelect.remove(1);
        }

        organizerMap.forEach((displayName, userId) => {
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = displayName;
            organizerFilterSelect.appendChild(option);
        });
    }

    function displayEvents(eventsToDisplay) {
        eventListUl.innerHTML = '';
        if (eventsToDisplay && eventsToDisplay.length > 0) {
            noEventsMessage.style.display = 'none';
            eventsToDisplay.forEach(event => {
                const listItem = document.createElement('li');
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                let imageHtml = '';
                if (event.image_urls && event.image_urls.length > 0 && event.image_urls[0]) {
                    imageHtml = `<img src="${event.image_urls[0]}" alt="${event.name} の画像" class="event-image">`;
                }
                
                let organizerDisplay = '';
                if (event.profiles && event.profiles.community_name) {
                    organizerDisplay = `<small>主催: ${event.profiles.community_name}</small><br>`;
                } else if (event.user_id) { // フォールバック
                     organizerDisplay = `<small>主催ID: ${event.user_id.substring(0,6)}...</small><br>`;
                }

                listItem.innerHTML = `
                    <h3><a href="detail.html?id=${event.id}">${event.name}</a></h3>
                    ${imageHtml}
                    <p>${organizerDisplay}<strong>日時:</strong> ${eventDate}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    <p>${event.description ? (event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description) : ''}</p>
                `;
                eventListUl.appendChild(listItem);
            });
        } else {
            noEventsMessage.style.display = 'block';
            eventListUl.innerHTML = '';
        }
    }

    async function fetchAndDisplayInitialEvents() {
        try {
            loadingMessage.style.display = 'block';
            eventListUl.innerHTML = ''; 
            noEventsMessage.style.display = 'none';

            let eventsData;
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select(`
                        id, name, description, event_date, location, image_urls, user_id,
                        profiles ( id, community_name ) 
                    `)
                    .order('event_date', { ascending: true });
                
                if (error) {
                    // エラーオブジェクトに詳細が含まれているか確認
                    console.error('Error fetching events with profiles (attempt 1):', JSON.stringify(error, null, 2));
                    // PGRST200エラーならリレーションの問題の可能性が高い
                    if (error.code === 'PGRST200' && error.message.includes("Could not find a relationship")) {
                         console.warn("Relationship 'events' -> 'profiles' not found or misconfigured. Fetching events without profiles as fallback.");
                         const { data: fallbackData, error: fallbackError } = await supabase
                            .from('events')
                            .select('id, name, description, event_date, location, image_urls, user_id')
                            .order('event_date', { ascending: true });
                        if (fallbackError) throw fallbackError; // フォールバックも失敗
                        eventsData = fallbackData;
                    } else {
                        throw error; // その他のエラー
                    }
                } else {
                    eventsData = data;
                }
            } catch (e) { // 上記 try ブロック内の throw をキャッチ
                 console.error('Fallback fetch or other error:', e);
                 // さらにフォールバックするか、エラー表示
                 const { data: finalFallbackData, error: finalFallbackError } = await supabase
                    .from('events')
                    .select('id, name, description, event_date, location, image_urls, user_id')
                    .order('event_date', { ascending: true });
                if (finalFallbackError) throw finalFallbackError;
                eventsData = finalFallbackData;
                messageArea.innerHTML = '<p class="warning-message">開催者情報の取得に一部失敗しましたが、イベントは表示されています。</p>';
            }
            

            allEvents = eventsData || [];
            displayEvents(allEvents);
            populateOrganizerFilter(allEvents);

        } catch (finalError) { // 最外殻の catch
            console.error('Failed to fetch any event data:', finalError.message);
            eventListUl.innerHTML = `<li class="error-message">イベントの読み込みに完全に失敗しました: ${finalError.message}</li>`;
             messageArea.innerHTML = `<p class="error-message">イベントの読み込みに失敗しました。管理者に連絡してください。</p>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    organizerFilterSelect.addEventListener('change', () => {
        const selectedOrganizerId = organizerFilterSelect.value;
        if (selectedOrganizerId) {
            const filteredEvents = allEvents.filter(event => event.user_id === selectedOrganizerId);
            displayEvents(filteredEvents);
        } else {
            displayEvents(allEvents);
        }
    });

    fetchAndDisplayInitialEvents();
});