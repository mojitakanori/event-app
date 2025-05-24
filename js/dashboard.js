// js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return; 

    const myEventListUl = document.getElementById('myEventList'); // Ul要素自体を取得
    const loadingMessage = document.getElementById('loadingMessage');
    const noMyEventsMessage = document.getElementById('noMyEventsMessage');

    async function fetchMyEvents() {
        try {
            loadingMessage.style.display = 'block';
            myEventListUl.innerHTML = '';
            noMyEventsMessage.style.display = 'none';

            const { data: events, error } = await supabase
                .from('events')
                .select('id, name, event_date, location') // 必要なカラムのみ取得 (form_schemaは不要になった)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (events && events.length > 0) {
                events.forEach(event => {
                    const listItem = document.createElement('li');
                    const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                    
                    // 新しい「詳細・参加者確認」ボタン
                    const detailLinkButton = document.createElement('a');
                    detailLinkButton.href = `detail.html?id=${event.id}`;
                    detailLinkButton.innerHTML = `<button class="view-detail-btn">詳細・参加者確認</button>`;
                    // 必要であれば、このボタンにクラスを追加してスタイルを適用
                    // detailLinkButton.firstChild.classList.add('some-class');


                    listItem.innerHTML = `
                        <h3>${event.name}</h3>
                        <p><strong>日時:</strong> ${eventDate}</p>
                        <p><strong>場所:</strong> ${event.location || '未定'}</p>
                        <div class="action-buttons">
                            <!-- 「参加者一覧表示」ボタンを削除し、新しいボタンを直接ここに入れるか、JSで追加 -->
                            <!-- <button class="edit-event-btn" data-event-id="${event.id}">イベント情報編集</button> -->
                            <button class="delete-btn" data-event-id="${event.id}">削除</button>
                        </div>
                    `;
                    // 詳細ページへのリンクボタンをaction-buttonsの先頭に追加
                    const actionButtonsDiv = listItem.querySelector('.action-buttons');
                    if (actionButtonsDiv) {
                        actionButtonsDiv.prepend(detailLinkButton);
                    }

                    myEventListUl.appendChild(listItem);
                });
                addEventListenersToButtons(); // 削除ボタンのイベントリスナーは引き続き必要
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
        // 「参加者一覧表示」ボタンのリスナーは削除
        // document.querySelectorAll('.view-participants-btn').forEach(button => { ... });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                deleteEvent(eventId);
            });
        });
    }

    fetchMyEvents();
});