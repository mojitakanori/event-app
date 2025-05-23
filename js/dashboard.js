// js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return; 

    const myEventList = document.getElementById('myEventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noMyEventsMessage = document.getElementById('noMyEventsMessage');

    const participantListUl = document.getElementById('participantList');
    const participantLoadingMessage = document.getElementById('participantLoadingMessage');
    const noParticipantsMessage = document.getElementById('noParticipantsMessage');
    const selectedEventNameDiv = document.getElementById('selectedEventName');

    let currentSelectedEventSchema = null; 

    async function fetchMyEvents() {
        try {
            loadingMessage.style.display = 'block';
            myEventList.innerHTML = '';
            noMyEventsMessage.style.display = 'none';

            const { data: events, error } = await supabase
                .from('events')
                .select('*, form_schema') 
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
                            <button class="delete-btn" data-event-id="${event.id}">削除</button>
                        </div>
                    `;
                    listItem.querySelector('.view-participants-btn').dataset.formSchema = JSON.stringify(event.form_schema || []);
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

    async function fetchParticipants(eventId, eventName, formSchemaString) {
        currentSelectedEventSchema = JSON.parse(formSchemaString); 
        try {
            selectedEventNameDiv.textContent = `「${eventName}」の参加者:`;
            participantLoadingMessage.style.display = 'block';
            participantListUl.innerHTML = '';
            noParticipantsMessage.style.display = 'none';

            const { data: participants, error } = await supabase
                .from('participants')
                .select('name, created_at, form_data') // name, created_at, form_dataを取得
                .eq('event_id', eventId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;

            if (participants && participants.length > 0) {
                participants.forEach(p => {
                    const listItem = document.createElement('li');
                    let customDataHtml = '';

                    // 利用規約同意の表示
                    if (p.form_data && p.form_data.terms_agreed !== undefined) {
                        customDataHtml += `<strong>利用規約同意:</strong> ${p.form_data.terms_agreed ? 'はい' : 'いいえ'}<br>`;
                    }

                    // カスタム項目の表示 (form_schemaに基づいて)
                    if (p.form_data && currentSelectedEventSchema && currentSelectedEventSchema.length > 0) {
                        currentSelectedEventSchema.forEach(fieldSchema => {
                            // fieldSchema.name は自動生成されたID
                            // fieldSchema.label は表示用ラベル
                            const value = p.form_data[fieldSchema.name]; // 自動生成されたnameをキーとして値を取得
                            let displayValue = '-';
                            if (value !== undefined && value !== null) {
                                if (fieldSchema.type === 'checkbox') {
                                    displayValue = value ? 'はい' : 'いいえ';
                                } else {
                                    displayValue = value.toString() || '-';
                                }
                            }
                            customDataHtml += `<strong>${fieldSchema.label}:</strong> ${displayValue}<br>`;
                        });
                    }
                    // もしスキーマにないがform_dataに存在する項目があればそれも表示する（フォールバック、通常は不要）
                    // else if (p.form_data) { ... } 

                    listItem.innerHTML = `
                        <strong>氏名: ${p.name}</strong><br>
                        ${customDataHtml}
                        <small>登録日時: ${new Date(p.created_at).toLocaleString('ja-JP')}</small>
                    `;
                    participantListUl.appendChild(listItem);
                });
            } else {
                noParticipantsMessage.style.display = 'block';
            }

        } catch (error) {
            console.error('Error fetching participants:', error.message);
            participantListUl.innerHTML = `<li class="error-message">参加者情報の読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            participantLoadingMessage.style.display = 'none';
        }
    }
    
    async function deleteEvent(eventId) {
        // (変更なし、前回と同じ)
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
            fetchMyEvents(); 
            participantListUl.innerHTML = ''; 
            selectedEventNameDiv.textContent = '';
            noParticipantsMessage.style.display = 'none';
            currentSelectedEventSchema = null;

        } catch (error) {
            console.error('Error deleting event:', error.message);
            alert(`イベント削除に失敗しました: ${error.message}`);
        }
    }

    function addEventListenersToButtons() {
        // (変更なし、前回と同じ)
        document.querySelectorAll('.view-participants-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                const eventName = e.target.dataset.eventName;
                const formSchemaString = e.target.dataset.formSchema;
                fetchParticipants(eventId, eventName, formSchemaString);
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