// index.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventList = document.getElementById('eventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noEventsMessage = document.getElementById('noEventsMessage');

    async function fetchAndDisplayEvents() {
        try {
            loadingMessage.style.display = 'block';
            eventList.innerHTML = ''; // リストをクリア
            noEventsMessage.style.display = 'none';

            // 1. 全てのイベントを取得
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true }); // 日付順にソート

            if (eventsError) {
                throw eventsError;
            }

            if (!events || events.length === 0) {
                noEventsMessage.style.display = 'block';
                loadingMessage.style.display = 'none';
                return;
            }

            // 2. 全ての参加者情報を取得 (event_idのみで十分)
            //    大量の参加者がいる場合はパフォーマンスに注意
            const { data: allParticipants, error: participantsError } = await supabase
                .from('participants')
                .select('event_id');

            if (participantsError) {
                // 参加者情報の取得に失敗しても、イベント一覧自体は表示試行する
                console.warn('Warning: Could not fetch participant counts. Capacity info might be inaccurate.', participantsError.message);
            }

            // 3. イベントIDごとに参加者数を集計
            const participantCounts = {};
            if (allParticipants) {
                allParticipants.forEach(participant => {
                    participantCounts[participant.event_id] = (participantCounts[participant.event_id] || 0) + 1;
                });
            }

            // 4. イベントをリスト表示 (集計した参加者数と最大参加人数を比較)
            events.forEach(event => {
                const listItem = document.createElement('li');
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';

                const currentParticipants = participantCounts[event.id] || 0;
                let capacityStatus = '';
                let isFull = false;

                if (event.max_participants !== null && event.max_participants > 0) {
                    capacityStatus = ` (参加者 ${currentParticipants} / ${event.max_participants}名)`;
                    if (currentParticipants >= event.max_participants) {
                        capacityStatus += ' <strong style="color:red;">満席</strong>';
                        isFull = true; // 詳細ページへのリンク挙動制御用などに使える
                    }
                } else if (event.max_participants === null) { // 定員なしの場合
                    capacityStatus = ` (参加者 ${currentParticipants}名 / 定員なし)`;
                }
                // max_participants が 0 の場合もUI上は「定員なし」または「0名(満席)」など明確に定義が必要
                // 現在の実装ではDBに0は保存されずNULLになるため、上記分岐でカバーされる

                listItem.innerHTML = `
                    <h3><a href="detail.html?id=${event.id}">${event.name}</a></h3>
                    <p><strong>日時:</strong> ${eventDate}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    <p><strong>定員情報:</strong>${capacityStatus || '情報なし'}</p>
                    <p>${event.description || ''}</p>
                `;
                eventList.appendChild(listItem);
            });

        } catch (error) {
            console.error('Error fetching events:', error.message);
            eventList.innerHTML = `<li class="error-message">イベントの読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    fetchAndDisplayEvents();
});