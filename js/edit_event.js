// js/edit_event.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return; // ログインしていなければ処理を中断

    const editEventForm = document.getElementById('editEventForm');
    const eventIdInput = document.getElementById('eventId');
    const eventNameInput = document.getElementById('eventName');
    const eventDescriptionInput = document.getElementById('eventDescription');
    const eventDateInput = document.getElementById('eventDate');
    const eventLocationInput = document.getElementById('eventLocation');
    const maxParticipantsInput = document.getElementById('maxParticipants');
    const messageArea = document.getElementById('messageArea');
    const loadingMessage = document.getElementById('loadingMessage');
    const notFoundMessage = document.getElementById('notFoundMessage');

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    if (!currentEventId) {
        messageArea.innerHTML = '<p class="error-message">編集するイベントIDが指定されていません。</p>';
        notFoundMessage.style.display = 'block';
        notFoundMessage.textContent = '編集するイベントIDが指定されていません。ダッシュボードに戻ってください。';
        if(editEventForm) editEventForm.style.display = 'none';
        return;
    }

    async function fetchEventData() {
        loadingMessage.style.display = 'block';
        editEventForm.style.display = 'none';
        notFoundMessage.style.display = 'none';

        try {
            const { data: event, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', currentEventId)
                .eq('user_id', user.id) // 自分が作成したイベントのみ編集可能
                .single();

            if (error || !event) {
                if (error && error.code === 'PGRST116') { // PostgREST error: Row not found
                     notFoundMessage.textContent = 'イベントが見つからないか、編集権限がありません。';
                } else if(error) {
                    throw error;
                } else {
                     notFoundMessage.textContent = 'イベントデータが見つかりません。';
                }
                notFoundMessage.style.display = 'block';
                return;
            }

            // フォームにイベントデータを設定
            eventIdInput.value = event.id;
            eventNameInput.value = event.name;
            eventDescriptionInput.value = event.description || '';
            if (event.event_date) {
                // datetime-local は YYYY-MM-DDTHH:mm 形式を期待
                const date = new Date(event.event_date);
                // タイムゾーンオフセットを考慮してローカル時刻に変換
                const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                eventDateInput.value = localDate.toISOString().slice(0, 16);
            }
            eventLocationInput.value = event.location || '';
            maxParticipantsInput.value = event.max_participants !== null ? event.max_participants : '';

            editEventForm.style.display = 'block';

        } catch (error) {
            console.error('Error fetching event data for edit:', error.message);
            messageArea.innerHTML = `<p class="error-message">イベント情報の読み込みに失敗しました: ${error.message}</p>`;
            notFoundMessage.style.display = 'block';
            notFoundMessage.textContent = 'イベント情報の読み込みに失敗しました。';
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    if (editEventForm) {
        editEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageArea.innerHTML = '';

            const eventName = eventNameInput.value;
            const eventDescription = eventDescriptionInput.value;
            const eventDate = eventDateInput.value;
            const eventLocation = eventLocationInput.value;
            const maxParticipantsValue = maxParticipantsInput.value;

            if (!eventName.trim()) {
                messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>';
                return;
            }

            let maxParticipants = null;
            if (maxParticipantsValue.trim() !== "" && parseInt(maxParticipantsValue) > 0) {
                maxParticipants = parseInt(maxParticipantsValue);
            } else if (maxParticipantsValue.trim() !== "" && parseInt(maxParticipantsValue) === 0) {
                maxParticipants = null; // 0または空は無制限(NULL)として扱う
            }

            const updatedEventData = {
                name: eventName,
                description: eventDescription,
                event_date: eventDate || null,
                location: eventLocation,
                max_participants: maxParticipants
                // user_id は更新しない、RLSのUSING句でチェックされる
            };

            try {
                const { data, error } = await supabase
                    .from('events')
                    .update(updatedEventData)
                    .eq('id', currentEventId)
                    .eq('user_id', user.id); // RLSで保護されているが、念のためクライアントでも条件追加

                if (error) throw error;

                messageArea.innerHTML = '<p class="success-message">イベント情報が更新されました。ダッシュボードへ移動します。</p>';
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);

            } catch (error) {
                console.error('Error updating event:', error.message);
                messageArea.innerHTML = `<p class="error-message">イベント更新に失敗しました: ${error.message}</p>`;
            }
        });
    }

    fetchEventData(); // ページ読み込み時にイベントデータを取得・表示
});