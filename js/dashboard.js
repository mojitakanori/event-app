// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const myEventList = document.getElementById('myEventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noMyEventsMessage = document.getElementById('noMyEventsMessage');

    const participantList = document.getElementById('participantList');
    const participantLoadingMessage = document.getElementById('participantLoadingMessage');
    const noParticipantsMessage = document.getElementById('noParticipantsMessage');
    const selectedEventNameDiv = document.getElementById('selectedEventName');


    async function fetchMyEvents() {
        try {
            loadingMessage.style.display = 'block';
            myEventList.innerHTML = '';
            noMyEventsMessage.style.display = 'none';

            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (events && events.length > 0) {
                events.forEach(event => {
                    const listItem = document.createElement('li');
                    const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                    listItem.innerHTML = `
                        <h3>${event.name}</h3>
                        <p><strong>日時:</strong> ${eventDate}</p>
                        <p><strong>場所:</strong> ${event.location || '未定'}</p>
                        <div class="action-buttons">
                            <button class="view-participants-btn" data-event-id="${event.id}" data-event-name="${event.name}">参加者一覧表示</button>
                            <button class="edit-btn" data-event-id="${event.id}">編集</button> 
                            <button class="delete-btn" data-event-id="${event.id}">削除</button>
                        </div>
                    `;
                    myEventList.appendChild(listItem);
                });
                addEventListenersToButtons();
            } else {
                noMyEventsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching my events:', error.message);
            myEventList.innerHTML = `<li class="error-message">イベントの読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    async function fetchParticipants(eventId, eventName) {
        // ... (変更なし) ...
        try {
            selectedEventNameDiv.textContent = `「${eventName}」の参加者:`;
            participantLoadingMessage.style.display = 'block';
            participantList.innerHTML = '';
            noParticipantsMessage.style.display = 'none';

            const { data: participants, error } = await supabase
                .from('participants')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (participants && participants.length > 0) {
                participants.forEach(p => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <strong>${p.name}</strong><br>
                        事業内容: ${p.business_content || '-'}<br>
                        紹介者: ${p.referrer || '-'}<br>
                        コメント: ${p.comment || '-'}
                    `;
                    participantList.appendChild(listItem);
                });
            } else {
                noParticipantsMessage.style.display = 'block';
            }

        } catch (error) {
            console.error('Error fetching participants:', error.message);
            participantList.innerHTML = `<li class="error-message">参加者情報の読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            participantLoadingMessage.style.display = 'none';
        }
    }

    async function deleteEvent(eventId) {
        // ... (変更なし) ...
        if (!confirm('本当にこのイベントを削除しますか？関連する参加者情報も削除されます。')) {
            return;
        }
        try {
            const { error: participantError } = await supabase
                .from('participants')
                .delete()
                .eq('event_id', eventId);

            if (participantError) throw participantError;

            const { error: eventError } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId)
                .eq('user_id', user.id);

            if (eventError) throw eventError;

            alert('イベントを削除しました。');
            fetchMyEvents();
            participantList.innerHTML = '';
            selectedEventNameDiv.textContent = '';
            noParticipantsMessage.style.display = 'none';

        } catch (error) {
            console.error('Error deleting event:', error.message);
            alert(`イベント削除に失敗しました: ${error.message}`);
        }
    }

    function addEventListenersToButtons() {
        document.querySelectorAll('.view-participants-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                const eventName = e.target.dataset.eventName;
                fetchParticipants(eventId, eventName);
            });
        });

        // 編集ボタンのイベントリスナーを追加
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                window.location.href = `edit_event.html?id=${eventId}`;
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                deleteEvent(eventId);
            });
        });
    }

    fetchMyEvents();
});