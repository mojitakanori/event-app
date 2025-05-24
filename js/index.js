// js/index.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventListUl = document.getElementById('eventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noEventsMessage = document.getElementById('noEventsMessage');
    const organizerFilterSelect = document.getElementById('organizerFilter');
    const messageArea = document.querySelector('.container > h2').nextElementSibling; // メッセージ表示用の汎用的な場所 (h2の次)

    let allEventsData = []; // イベントデータと参加者数を保持する配列 ({event: {...}, participantCount: X})

    function populateOrganizerFilter(eventsArray) {
        if (!organizerFilterSelect) return;
        const organizerMap = new Map(); 

        eventsArray.forEach(eventObj => { // allEventsDataの構造に合わせてeventObj.eventを参照
            const event = eventObj.event; // イベント本体
            if (event.user_id) {
                let displayName = `開催者 (ID: ${event.user_id.substring(0,6)}...)`;
                if (event.profiles && event.profiles.community_name) {
                    displayName = event.profiles.community_name;
                } else if (event.profiles && event.profiles.id && !event.profiles.community_name) {
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

    function displayEvents(eventsDataToDisplay) {
        if (!eventListUl || !noEventsMessage) return;

        eventListUl.innerHTML = '';
        if (eventsDataToDisplay && eventsDataToDisplay.length > 0) {
            noEventsMessage.style.display = 'none';
            eventsDataToDisplay.forEach(eventDataObj => {
                const event = eventDataObj.event; 
                const participantCount = eventDataObj.participantCount;

                const listItem = document.createElement('li');
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未定';
                const eventEndDateStr = event.event_end_date ? new Date(event.event_end_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
                const dateTimeStr = event.event_date ? `${eventDate}${eventEndDateStr ? ' ~ ' + eventEndDateStr : ''}` : '日時未定';
                
                let imageHtml = ''; 
                if (event.image_urls && event.image_urls.length > 0 && event.image_urls[0]) {
                    imageHtml = `<img src="${event.image_urls[0]}" alt="${event.name} の画像" class="event-image">`;
                }
                
                let organizerDisplay = ''; 
                if (event.profiles && event.profiles.community_name) {
                    organizerDisplay = `<small>主催: ${event.profiles.community_name}</small><br>`;
                } else if (event.user_id) {
                     organizerDisplay = `<small>主催ID: ${event.user_id.substring(0,6)}...</small><br>`;
                }
                
                const feeDisplay = event.participation_fee ? `<p><strong>参加費用:</strong> ${event.participation_fee}</p>` : '';

                let capacityStatus = '';
                if (event.max_participants !== null && event.max_participants !== undefined) {
                    if (participantCount >= event.max_participants) {
                        capacityStatus = `<p style="color: red; font-weight: bold;">満員御礼</p>`;
                    } else {
                        capacityStatus = `<p><strong>参加状況:</strong> ${participantCount} / ${event.max_participants} 人</p>`;
                    }
                } else { 
                    capacityStatus = `<p><strong>現在の参加者:</strong> ${participantCount} 人</p>`;
                }

                listItem.innerHTML = `
                    <h3><a href="detail.html?id=${event.id}">${event.name}</a></h3>
                    ${imageHtml}
                    <p>${organizerDisplay}<strong>日時:</strong> ${dateTimeStr}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    ${feeDisplay}
                    ${capacityStatus}
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
        if (!loadingMessage || !eventListUl || !noEventsMessage) {
             console.error("Required DOM elements for events display not found.");
             return;
        }
        try {
            loadingMessage.style.display = 'block'; 
            eventListUl.innerHTML = ''; 
            noEventsMessage.style.display = 'none';
            
            let events;
            try {
                const { data, error } = await supabase.from('events')
                    .select(`
                        id, name, description, event_date, event_end_date, location, 
                        participation_fee, max_participants, image_urls, video_urls, user_id,
                        profiles (id, community_name)
                    `) 
                    .order('event_date', { ascending: true });
                
                if (error) { 
                    if (error.code === 'PGRST200' && error.message.includes("Could not find a relationship")) {
                         console.warn("Relationship 'events' -> 'profiles' not found. Fetching events without profiles.");
                         const { data: fallbackData, error: fallbackError } = await supabase.from('events')
                            .select('id, name, description, event_date, event_end_date, location, participation_fee, max_participants, image_urls, video_urls, user_id')
                            .order('event_date', { ascending: true });
                        if (fallbackError) throw fallbackError; 
                        events = fallbackData || [];
                    } else {
                        throw error; 
                    }
                } else {
                    events = data || [];
                }
            } catch (e) { 
                 console.error('Error fetching events (primary or first fallback):', e.message);
                 const { data: finalFallbackData, error: finalFallbackError } = await supabase.from('events')
                    .select('id, name, description, event_date, event_end_date, location, participation_fee, max_participants, image_urls, video_urls, user_id')
                    .order('event_date', { ascending: true });
                if (finalFallbackError) throw finalFallbackError;
                events = finalFallbackData || [];
                if (messageArea) messageArea.innerHTML = '<p class="warning-message" style="color: orange;">開催者情報の取得に一部失敗しましたが、イベントは表示されています。</p>';
            }

            const eventsWithParticipantCounts = [];
            for (const event of events) {
                const { count, error: countError } = await supabase
                    .from('participants')
                    .select('*', { count: 'exact', head: true }) 
                    .eq('event_id', event.id);

                if (countError) {
                    console.warn(`Error fetching participant count for event ${event.id}:`, countError.message);
                    eventsWithParticipantCounts.push({ event: event, participantCount: 0 }); 
                } else {
                    eventsWithParticipantCounts.push({ event: event, participantCount: count || 0 });
                }
            }
            
            allEventsData = eventsWithParticipantCounts; 
            displayEvents(allEventsData);
            populateOrganizerFilter(allEventsData); // allEventsData を渡す (eventとprofile情報が必要)

        } catch (finalError) { 
            console.error('Failed to fetch any event data:', finalError.message);
            if (eventListUl) eventListUl.innerHTML = `<li class="error-message">イベントの読み込みに完全に失敗しました: ${finalError.message}</li>`;
            if (messageArea) messageArea.innerHTML = `<p class="error-message">イベントの読み込みに失敗しました。管理者に連絡してください。</p>`;
        } 
        finally { 
            if (loadingMessage) loadingMessage.style.display = 'none'; 
        }
    }

    if (organizerFilterSelect) {
        organizerFilterSelect.addEventListener('change', () => {
            const selectedOrganizerId = organizerFilterSelect.value;
            let filteredEventData;
            if (selectedOrganizerId) {
                filteredEventData = allEventsData.filter(ed => ed.event.user_id === selectedOrganizerId);
            } else {
                filteredEventData = allEventsData;
            }
            displayEvents(filteredEventData);
        });
    }

    fetchAndDisplayInitialEvents();
});