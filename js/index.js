// js/index.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventListUl = document.getElementById('eventList');
    // ... (他の要素取得、関数定義は変更なし)
    const loadingMessage = document.getElementById('loadingMessage');
    const noEventsMessage = document.getElementById('noEventsMessage');
    const organizerFilterSelect = document.getElementById('organizerFilter');
    let allEvents = []; 
    function populateOrganizerFilter(eventsWithPotentialProfiles) { /* ... (変更なし) ... */ const organizerMap = new Map(); eventsWithPotentialProfiles.forEach(event => { if (event.user_id) { let displayName = `開催者 (ID: ${event.user_id.substring(0,6)}...)`; if (event.profiles && event.profiles.community_name) displayName = event.profiles.community_name; else if (event.profiles && event.profiles.id && !event.profiles.community_name) displayName = `未設定 (${event.profiles.id.substring(0,6)}...)`; organizerMap.set(event.user_id, displayName); } }); while (organizerFilterSelect.options.length > 1) organizerFilterSelect.remove(1); organizerMap.forEach((displayName, userId) => { const option = document.createElement('option'); option.value = userId; option.textContent = displayName; organizerFilterSelect.appendChild(option); }); }
    function displayEvents(eventsToDisplay) { /* ... (変更なし) ... */
        eventListUl.innerHTML = '';
        if (eventsToDisplay && eventsToDisplay.length > 0) {
            noEventsMessage.style.display = 'none';
            eventsToDisplay.forEach(event => {
                const listItem = document.createElement('li');
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未定';
                // 終了時刻の表示 (あれば)
                const eventEndDateStr = event.event_end_date ? new Date(event.event_end_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
                const dateTimeStr = event.event_date ? `${eventDate}${eventEndDateStr ? ' ~ ' + eventEndDateStr : ''}` : '日時未定';

                let imageHtml = ''; /* ... (変更なし) ... */ if (event.image_urls && event.image_urls.length > 0 && event.image_urls[0]) imageHtml = `<img src="${event.image_urls[0]}" alt="${event.name} の画像" class="event-image">`;
                let organizerDisplay = ''; /* ... (変更なし) ... */ if (event.profiles && event.profiles.community_name) organizerDisplay = `<small>主催: ${event.profiles.community_name}</small><br>`; else if (event.user_id) organizerDisplay = `<small>主催ID: ${event.user_id.substring(0,6)}...</small><br>`;
                
                // 参加費用の表示 (あれば)
                const feeDisplay = event.participation_fee ? `<p><strong>参加費用:</strong> ${event.participation_fee}</p>` : '';

                listItem.innerHTML = `
                    <h3><a href="detail.html?id=${event.id}">${event.name}</a></h3>
                    ${imageHtml}
                    <p>${organizerDisplay}<strong>日時:</strong> ${dateTimeStr}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    ${feeDisplay} 
                    <p>${event.description ? (event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description) : ''}</p>
                `;
                eventListUl.appendChild(listItem);
            });
        } else { /* ... (変更なし) ... */ noEventsMessage.style.display = 'block'; eventListUl.innerHTML = ''; }
    }
    async function fetchAndDisplayInitialEvents() { /* ... (変更なし、ただしselect句に新しいカラムを追加) ... */
        try {
            loadingMessage.style.display = 'block'; eventListUl.innerHTML = ''; noEventsMessage.style.display = 'none';
            let eventsData;
            try {
                const { data, error } = await supabase.from('events')
                    .select(`id, name, description, event_date, event_end_date, location, participation_fee, image_urls, user_id, profiles (id, community_name)`) // ← カラム追加
                    .order('event_date', { ascending: true });
                if (error) { if (error.code === 'PGRST200' && error.message.includes("Could not find a relationship")) { const { data: fallbackData, error: fallbackError } = await supabase.from('events').select('id, name, description, event_date, event_end_date, location, participation_fee, image_urls, user_id').order('event_date', { ascending: true }); if (fallbackError) throw fallbackError; eventsData = fallbackData; } else throw error; } else eventsData = data;
            } catch (e) { const { data: finalFallbackData, error: finalFallbackError } = await supabase.from('events').select('id, name, description, event_date, event_end_date, location, participation_fee, image_urls, user_id').order('event_date', { ascending: true }); if (finalFallbackError) throw finalFallbackError; eventsData = finalFallbackData; messageArea.innerHTML = '<p class="warning-message">開催者情報の取得に一部失敗しましたが、イベントは表示されています。</p>'; }
            allEvents = eventsData || []; displayEvents(allEvents); populateOrganizerFilter(allEvents);
        } catch (finalError) { console.error('Failed to fetch any event data:', finalError.message); eventListUl.innerHTML = `<li class="error-message">イベントの読み込みに完全に失敗しました: ${finalError.message}</li>`; } finally { loadingMessage.style.display = 'none'; }
    }
    organizerFilterSelect.addEventListener('change', () => { /* ... (変更なし) ... */ const selectedOrganizerId = organizerFilterSelect.value; if (selectedOrganizerId) { const filteredEvents = allEvents.filter(event => event.user_id === selectedOrganizerId); displayEvents(filteredEvents); } else displayEvents(allEvents); });
    fetchAndDisplayInitialEvents();
});