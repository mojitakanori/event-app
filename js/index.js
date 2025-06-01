// js/index.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventListUl = document.getElementById('eventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noEventsMessage = document.getElementById('noEventsMessage');
    const organizerFilterSelect = document.getElementById('organizerFilter');
    const areaFilterSelect = document.getElementById('areaFilter');
    const messageArea = document.getElementById('messageArea');

    let allEventsData = [];

    function populateOrganizerFilter(eventsArray) {
        if (!organizerFilterSelect) return;
        const organizerMap = new Map();

        eventsArray.forEach(eventObj => {
            const event = eventObj.event;
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

            // イベントを is_joint_event でソート (true が先頭、次に日時順)
            const sortedEvents = [...eventsDataToDisplay].sort((a, b) => {
                const aIsJoint = a.event.is_joint_event === true;
                const bIsJoint = b.event.is_joint_event === true;

                if (aIsJoint && !bIsJoint) {
                    return -1; // a を b より前に
                }
                if (!aIsJoint && bIsJoint) {
                    return 1;  // b を a より前に
                }
                return 0; // 順序変更なし
            });

            // sortedEvents を使って表示
            sortedEvents.forEach(eventDataObj => {
                const event = eventDataObj.event;
                const participantCount = eventDataObj.participantCount;

                const listItem = document.createElement('li');
                listItem.classList.add('event-card');

                // is_joint_event が true なら特別なクラスを追加
                if (event.is_joint_event === true) {
                    listItem.classList.add('joint-event');
                }

                let dateTimeStr = '日時未定';
                if (event.event_date) {
                    const startDateStr = event.event_date.replace('T', ' ').substring(0, 16);
                    dateTimeStr = startDateStr;
                    if (event.event_end_date) {
                        const endDateStr = event.event_end_date.replace('T', ' ').substring(0, 16);
                        if (startDateStr.substring(0, 10) === endDateStr.substring(0, 10)) {
                            dateTimeStr += ` 〜 ${endDateStr.substring(11, 16)}`;
                        } else {
                            dateTimeStr += ` 〜 ${endDateStr}`;
                        }
                    }
                }

                let imageUrl = 'assets/placeholder_event_image.png';
                if (event.image_urls && event.image_urls.length > 0 && event.image_urls[0]) {
                    imageUrl = event.image_urls[0];
                }

                let organizerDisplay = '主催者情報なし';
                if (event.profiles && event.profiles.community_name) {
                    organizerDisplay = event.profiles.community_name;
                } else if (event.user_id) {
                     organizerDisplay = `ID: ${event.user_id.substring(0,6)}...`;
                }

                const feeDisplay = event.participation_fee || '未設定';

                let capacityBadgeHtml = '';
                let capacityText = '';
                if (event.max_participants !== null && event.max_participants !== undefined) {
                    const isFull = participantCount >= event.max_participants;
                    capacityBadgeHtml = `<span class="event-card__capacity-badge ${isFull ? 'full' : ''}">${isFull ? '満員' : `${participantCount}/${event.max_participants}`}</span>`;
                    capacityText = isFull ? '満員御礼' : `${participantCount} / ${event.max_participants} 人`;
                } else {
                    capacityText = `${participantCount} 人`;
                }

                const descriptionShort = event.description ? (event.description.length > 80 ? event.description.substring(0, 80) + '…' : event.description) : '詳細はクリック';

                let areaDisplay = 'エリア未設定';
                if (event.area) {
                    const areaMap = {
                        "tokyo": "東京エリア", "osaka": "大阪エリア", "nagoya": "名古屋エリア",
                        "fukuoka": "福岡エリア", "hokkaido": "北海道エリア",
                        "online": "オンライン", "other": "その他"
                    };
                    areaDisplay = areaMap[event.area.toLowerCase()] || event.area;
                }


                listItem.innerHTML = `
                    <a href="detail.html?id=${event.id}" class="event-card__image-wrapper">
                        <img src="${imageUrl}" alt="${event.name || 'イベント画像'}" class="event-card__image">
                        ${capacityBadgeHtml}
                    </a>
                    <div class="event-card__content">
                        <h3 class="event-card__title"><a href="detail.html?id=${event.id}">${event.name || '名称未設定'}</a></h3>
                        <div class="event-card__meta">
                            <span class="event-card__meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M4.75 0a.75.75 0 01.75.75V2h5V.75a.75.75 0 011.5 0V2h.25A2.75 2.75 0 0115 4.75v8.5A2.75 2.75 0 0112.25 16H3.75A2.75 2.75 0 011 13.25v-8.5A2.75 2.75 0 013.75 2H4V.75A.75.75 0 014.75 0zm0 3.5h6.5a.25.25 0 01.25.25V6h-7V3.75a.25.25 0 01.25-.25zM3.5 7.5v5.75c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V7.5h-9z"></path></svg>
                                <strong>日時:</strong> ${dateTimeStr}
                            </span>
                            <span class="event-card__meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M11.538 8.427a.75.75 0 01-.011 1.05l-4.25 3.5a.75.75 0 01-1.054-1.05l4.25-3.5a.75.75 0 011.065 0zm-1.13 1.475a.75.75 0 00.01-1.05l-4.25-3.5a.75.75 0 00-1.054 1.05l4.25 3.5a.75.75 0 001.044 0zM8 1a3.5 3.5 0 00-3.5 3.5c0 .344.036.68.105 1.006L8 15.08l3.395-9.574A3.518 3.518 0 0011.5 4.5 3.5 3.5 0 008 1zm0 1c1.38 0 2.5 1.12 2.5 2.5S9.38 7 8 7 5.5 5.88 5.5 4.5 6.62 2 8 2z"></path></svg>
                                <strong>場所:</strong> ${event.location || '未定'}
                            </span>
                            <span class="event-card__meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8 .75A7.25 7.25 0 00.75 8a7.25 7.25 0 0011.255 6.516.75.75 0 10-.93-1.17A5.75 5.75 0 012.25 8a5.75 5.75 0 019.973-4.32.75.75 0 10.93-1.17A7.228 7.228 0 008 .75zM13.5 8a5.5 5.5 0 10-11 0 5.5 5.5 0 0011 0zm-10.22.242a.75.75 0 111.06-1.06l2.248 2.247L9.293 6.77a.75.75 0 111.06 1.06L7.105 11.077a.75.75 0 01-1.06 0L3.28 8.242z"></path></svg>
                                <strong>エリア:</strong> ${areaDisplay}
                            </span>
                            <span class="event-card__meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.005 6.005 0 00-2.9 5.142.75.75 0 101.498.07 4.5 4.5 0 018.97 0 .75.75 0 101.498-.07 6.004 6.004 0 00-2.9-5.142z"></path></svg>
                                <strong>主催:</strong> ${organizerDisplay}
                            </span>
                            <span class="event-card__meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z"></path><path d="M9 4.5a1 1 0 11-2 0 1 1 0 012 0zM10 8.5a1 1 0 11-2 0V10a1 1 0 11-2 0V8.5a3 3 0 015.196-2.016A1.5 1.5 0 0111.5 8c0 .828-.448 1.5-1 1.5h-.5z"></path></svg>
                                <strong>費用:</strong> ${feeDisplay}
                            </span>
                            ${ (event.max_participants !== null && event.max_participants !== undefined) ?
                                `<span class="event-card__meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M12.5 7.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-.757-3.15A5.986 5.986 0 008 2.5c-1.59 0-3.032.622-4.111 1.637a.75.75 0 101.048 1.076A4.485 4.485 0 018 4c.997 0 1.914.323 2.65 0.86A.75.75 0 0011.743 4.35zm-1.71 4.783C9.435 10.03 8.388 9.5 7.015 9.5h-.03C5.612 9.5 4.565 10.03 3.967 10.866a.75.75 0 001.066 1.068C5.456 11.412 6.188 11 7 11h-.015c.812 0 1.544.412 1.968.934a.75.75 0 101.066-1.068zM14.5 10.5a3 3 0 11-6 0 3 3 0 016 0zm-4 .75a.75.75 0 000-1.5h-2.5a.75.75 0 000 1.5h2.5z"></path></svg>
                                    <strong>参加状況:</strong> ${capacityText}
                                </span>` :
                                `<span class="event-card__meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M12.5 7.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-.757-3.15A5.986 5.986 0 008 2.5c-1.59 0-3.032.622-4.111 1.637a.75.75 0 101.048 1.076A4.485 4.485 0 018 4c.997 0 1.914.323 2.65 0.86A.75.75 0 0011.743 4.35zm-1.71 4.783C9.435 10.03 8.388 9.5 7.015 9.5h-.03C5.612 9.5 4.565 10.03 3.967 10.866a.75.75 0 001.066 1.068C5.456 11.412 6.188 11 7 11h-.015c.812 0 1.544.412 1.968.934a.75.75 0 101.066-1.068zM14.5 10.5a3 3 0 11-6 0 3 3 0 016 0zm-4 .75a.75.75 0 000-1.5h-2.5a.75.75 0 000 1.5h2.5z"></path></svg>
                                    <strong>現在の参加者:</strong> ${capacityText}
                                </span>`
                            }
                        </div>
                        <p class="event-card__description">${descriptionShort}</p>
                        <div class="event-card__footer">
                            <a href="detail.html?id=${event.id}" class="btn event-card__details-btn">詳細を見る</a>
                        </div>
                    </div>
                `;
                eventListUl.appendChild(listItem);
            });
        } else {
            noEventsMessage.style.display = 'block';
            eventListUl.innerHTML = '';
        }
    }


    function applyFilters() {
        const selectedOrganizerId = organizerFilterSelect ? organizerFilterSelect.value : '';
        const selectedArea = areaFilterSelect ? areaFilterSelect.value : '';

        let filteredEventData = allEventsData;

        if (selectedOrganizerId) {
            filteredEventData = filteredEventData.filter(ed => ed.event.user_id === selectedOrganizerId);
        }

        if (selectedArea) {
            if (selectedArea === "none") {
                filteredEventData = filteredEventData.filter(ed => !ed.event.area);
            } else {
                filteredEventData = filteredEventData.filter(ed => ed.event.area && ed.event.area.toLowerCase() === selectedArea.toLowerCase());
            }
        }
        // フィルター適用後も、displayEvents内でソートされる
        displayEvents(filteredEventData);
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
                // select句に is_joint_event を追加
                const { data, error } = await supabase.from('events')
                    .select(`
                        id, name, description, event_date, event_end_date, location, area,
                        participation_fee, max_participants, image_urls, video_urls, user_id,
                        is_joint_event,
                        profiles (id, community_name)
                    `)
                    .order('is_joint_event', { ascending: false, nullsFirst: false }) // true (合同) が先
                    .order('event_date', { ascending: true }); // 次に日時順

                if (error) {
                    if (error.code === 'PGRST200' && error.message.includes("Could not find a relationship")) {
                         console.warn("Relationship 'events' -> 'profiles' not found. Fetching events without profiles.");
                         const { data: fallbackData, error: fallbackError } = await supabase.from('events')
                            .select('id, name, description, event_date, event_end_date, location, area, participation_fee, max_participants, image_urls, video_urls, user_id, is_joint_event')
                            .order('is_joint_event', { ascending: false, nullsFirst: false })
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
                    .select('id, name, description, event_date, event_end_date, location, area, participation_fee, max_participants, image_urls, video_urls, user_id, is_joint_event')
                    .order('is_joint_event', { ascending: false, nullsFirst: false })
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
            populateOrganizerFilter(allEventsData); // フィルター用データ作成
            applyFilters(); // フィルターを通して表示 (この中で displayEvents が呼ばれる)

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
        organizerFilterSelect.addEventListener('change', applyFilters);
    }
    if (areaFilterSelect) {
        areaFilterSelect.addEventListener('change', applyFilters);
    }
    fetchAndDisplayInitialEvents();
});