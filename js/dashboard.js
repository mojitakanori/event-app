// js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return; 

    const myEventListUl = document.getElementById('myEventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noMyEventsMessage = document.getElementById('noMyEventsMessage');

    async function fetchMyEvents() {
        try {
            loadingMessage.style.display = 'block';
            myEventListUl.innerHTML = '';
            noMyEventsMessage.style.display = 'none';

            const { data: events, error } = await supabase
                .from('events')
                .select('id, name, event_date, location')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (events && events.length > 0) {
                events.forEach(event => {
                    const listItem = document.createElement('li');
                    const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                    
                    const detailLinkButton = document.createElement('a');
                    detailLinkButton.href = `detail.html?id=${event.id}`;
                    detailLinkButton.innerHTML = `<button class="view-detail-btn">詳細・参加者</button>`; // ボタンテキスト変更

                    // 編集ボタンの追加
                    const editLinkButton = document.createElement('a');
                    editLinkButton.href = `edit_event.html?id=${event.id}`;
                    editLinkButton.innerHTML = `<button class="edit-event-btn">編集</button>`;
                    editLinkButton.style.marginLeft = "5px"; // 少しマージン

                    listItem.innerHTML = `
                        <h3>${event.name}</h3>
                        <p><strong>日時:</strong> ${eventDate}</p>
                        <p><strong>場所:</strong> ${event.location || '未定'}</p>
                        <div class="action-buttons">
                            <button class="delete-btn" data-event-id="${event.id}">削除</button>
                        </div>
                    `;
                    const actionButtonsDiv = listItem.querySelector('.action-buttons');
                    if (actionButtonsDiv) {
                        actionButtonsDiv.prepend(editLinkButton); // 編集ボタンを追加
                        actionButtonsDiv.prepend(detailLinkButton); // 詳細ボタンを先頭に
                    }
                    myEventListUl.appendChild(listItem);
                });
                addEventListenersToButtons();
            } else {
                noMyEventsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching my events:', error.message);
            myEventListUl.innerHTML = `<li class="error-message">イベントの読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }
    
    async function deleteEvent(eventId) {
        if (!confirm('本当にこのイベントを削除しますか？関連する参加者情報も全て削除されます。')) {
            return;
        }
        try {
            const { error: eventError } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId)
                .eq('user_id', user.id); 

            if (eventError) throw eventError;

            alert('イベントを削除しました。');
            fetchMyEvents(); // リストを再読み込み

        } catch (error) {
            console.error('Error deleting event:', error.message);
            alert(`イベント削除に失敗しました: ${error.message}`);
        }
    }

    function addEventListenersToButtons() {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                deleteEvent(eventId);
            });
        });
        // 編集ボタン、詳細ボタンは<a>タグなのでJSでのリスナーは基本不要
    }
    fetchMyEvents();
});