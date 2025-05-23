// create.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const createEventForm = document.getElementById('createEventForm');
    const messageArea = document.getElementById('messageArea');

    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '';

        const eventName = document.getElementById('eventName').value;
        const eventDescription = document.getElementById('eventDescription').value;
        const eventDate = document.getElementById('eventDate').value;
        const eventLocation = document.getElementById('eventLocation').value;
        const maxParticipantsInput = document.getElementById('maxParticipants').value;

        if (!eventName.trim()) {
            messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>';
            return;
        }

        let maxParticipants = null; // デフォルトは無制限 (DBではNULL)
        if (maxParticipantsInput.trim() !== "" && parseInt(maxParticipantsInput) > 0) {
            maxParticipants = parseInt(maxParticipantsInput);
        } else if (maxParticipantsInput.trim() !== "" && parseInt(maxParticipantsInput) === 0) {
            // 0 を入力された場合も無制限として扱うか、0人として扱うか。ここでは無制限(NULL)として扱う
            maxParticipants = null; // または特定の意味を持たせるなら 0 を許容
        }


        const eventData = {
            name: eventName,
            description: eventDescription,
            event_date: eventDate || null,
            location: eventLocation,
            max_participants: maxParticipants
            // user_id はRLSで自動設定
        };

        try {
            const { data, error } = await supabase
                .from('events')
                .insert([eventData]);

            if (error) throw error;

            messageArea.innerHTML = '<p class="success-message">イベントが作成されました！ダッシュボードへ移動します。</p>';
            createEventForm.reset();
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Error creating event:', error.message);
            messageArea.innerHTML = `<p class="error-message">イベント作成に失敗しました: ${error.message}</p>`;
        }
    });
});