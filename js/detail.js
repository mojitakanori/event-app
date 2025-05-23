// detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventDetailDiv = document.getElementById('eventDetail');
    const rsvpForm = document.getElementById('rsvpForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const loadingMessage = document.getElementById('loadingMessage');
    const capacityInfoDiv = document.getElementById('capacityInfo'); // 追加
    const submitRsvpButton = document.getElementById('submitRsvpButton'); // 追加

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    if (!currentEventId) {
        eventDetailDiv.innerHTML = '<p class="error-message">イベントIDが指定されていません。</p>';
        if(rsvpForm) rsvpForm.style.display = 'none';
        loadingMessage.style.display = 'none';
        return;
    }

    eventIdInput.value = currentEventId;

    async function fetchEventDetailsAndParticipants() {
        try {
            loadingMessage.style.display = 'block';
            capacityInfoDiv.innerHTML = '';
            if(rsvpForm) rsvpForm.style.display = 'block'; // 一旦表示
            if(submitRsvpButton) submitRsvpButton.disabled = false; // 一旦有効化

            // 1. イベント詳細を取得
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('id', currentEventId)
                .single();

            if (eventError) throw eventError;

            if (event) {
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                eventDetailDiv.innerHTML = `
                    <h2>${event.name}</h2>
                    <p><strong>日時:</strong> ${eventDate}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    <p><strong>詳細:</strong></p>
                    <p>${event.description || '詳細情報はありません。'}</p>
                `;

                // 2. このイベントの現在の参加者数を取得
                const { count: currentParticipants, error: countError } = await supabase
                    .from('participants')
                    .select('*', { count: 'exact', head: true }) // head:trueでデータ自体は取得せず件数のみ
                    .eq('event_id', currentEventId);

                if (countError) throw countError;

                // 3. 満席判定と表示
                if (event.max_participants !== null && event.max_participants > 0) {
                    capacityInfoDiv.innerHTML = `<p>現在の参加者数: ${currentParticipants} / ${event.max_participants} 名</p>`;
                    if (currentParticipants >= event.max_participants) {
                        capacityInfoDiv.innerHTML += '<p class="error-message" style="font-weight:bold; color:red;">満席御礼。現在、このイベントの受付は終了しました。</p>';
                        if(rsvpForm) rsvpForm.style.display = 'none'; // フォームを非表示
                        if(submitRsvpButton) submitRsvpButton.disabled = true; // 送信ボタンを無効化
                    }
                } else if (event.max_participants === null) { // 定員なしの場合
                     capacityInfoDiv.innerHTML = `<p>現在の参加者数: ${currentParticipants} 名 (定員なし)</p>`;
                }
                // max_participants が 0 の場合はどう扱うかによって分岐追加（現在は無制限扱いなのでここには来ない想定）


            } else {
                eventDetailDiv.innerHTML = '<p class="error-message">イベントが見つかりませんでした。</p>';
                if(rsvpForm) rsvpForm.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching event details or participants:', error.message);
            eventDetailDiv.innerHTML = `<p class="error-message">イベント情報の読み込みに失敗しました: ${error.message}</p>`;
            if(rsvpForm) rsvpForm.style.display = 'none';
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageArea.innerHTML = '';

            // 念のため、送信直前にも満席チェック
            const { data: event, error: eventCheckError } = await supabase
                .from('events')
                .select('max_participants')
                .eq('id', currentEventId)
                .single();
            
            const { count: currentParticipants, error: countCheckError } = await supabase
                .from('participants')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', currentEventId);

            if (eventCheckError || countCheckError) {
                 messageArea.innerHTML = `<p class="error-message">登録情報の確認に失敗しました。再度お試しください。</p>`;
                 console.error("Pre-submit check error:", eventCheckError || countCheckError);
                 return;
            }

            if (event && event.max_participants !== null && event.max_participants > 0 && currentParticipants >= event.max_participants) {
                messageArea.innerHTML = '<p class="error-message">申し訳ありません、定員に達したため登録できませんでした。</p>';
                capacityInfoDiv.innerHTML = `<p>現在の参加者数: ${currentParticipants} / ${event.max_participants} 名</p>`;
                capacityInfoDiv.innerHTML += '<p class="error-message" style="font-weight:bold; color:red;">満席御礼。現在、このイベントの受付は終了しました。</p>';
                if(rsvpForm) rsvpForm.style.display = 'none';
                if(submitRsvpButton) submitRsvpButton.disabled = true;
                return;
            }


            const participantName = document.getElementById('participantName').value;
            const businessContent = document.getElementById('businessContent').value;
            const referrer = document.getElementById('referrer').value;
            const comment = document.getElementById('comment').value;

            if (!participantName.trim()) {
                messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>';
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('participants')
                    .insert([{
                        event_id: currentEventId,
                        name: participantName,
                        business_content: businessContent,
                        referrer: referrer,
                        comment: comment
                    }]);

                if (error) throw error;

                messageArea.innerHTML = '<p class="success-message">出欠を登録しました。ありがとうございます！</p>';
                rsvpForm.reset();
                // 登録後にもう一度参加者数を更新して表示
                fetchEventDetailsAndParticipants();
            } catch (error) {
                console.error('Error submitting RSVP:', error.message);
                if (error.message.includes('check constraint') || error.message.includes('limit')) { // DB側で制約をかける場合
                     messageArea.innerHTML = `<p class="error-message">定員に達しているか、登録に問題がありました。</p>`;
                } else {
                     messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`;
                }
            }
        });
    }


    fetchEventDetailsAndParticipants();
});