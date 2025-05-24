// js/detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventDetailDiv = document.getElementById('eventDetail');
    const eventDetailLoading = document.getElementById('eventDetailLoading'); // ID変更
    const rsvpForm = document.getElementById('rsvpForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const dynamicRsvpFormFieldsDiv = document.getElementById('dynamicRsvpFormFields');
    const termsLink = document.getElementById('termsLink'); 

    const participantListUl = document.getElementById('eventParticipantList');
    const participantListLoading = document.getElementById('participantListLoading');
    const noEventParticipantsMessage = document.getElementById('noEventParticipantsMessage');

    let currentEventFormSchema = null; // イベントのフォームスキーマを保持

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    if (!currentEventId) {
        eventDetailDiv.innerHTML = '<p class="error-message">イベントIDが指定されていません。</p>';
        rsvpForm.style.display = 'none';
        eventDetailLoading.style.display = 'none';
        return;
    }
    eventIdInput.value = currentEventId;

    function generateDynamicFormFields(formSchema) { /* (変更なし) */
        currentEventFormSchema = formSchema; // スキーマを保持
        dynamicRsvpFormFieldsDiv.innerHTML = ''; 
        if (!formSchema || formSchema.length === 0) return; 
        formSchema.forEach(field => {
            const formGroup = document.createElement('div'); /* ... (中身は前回と同じ) ... */
            formGroup.classList.add('form-group');
            const labelEl = document.createElement('label');
            labelEl.htmlFor = `custom_field_${field.name}`;
            labelEl.textContent = `${field.label}${field.required ? ' (必須)' : ''}:`;
            let inputElement;
            if (field.type === 'textarea') {
                inputElement = document.createElement('textarea');
                formGroup.appendChild(labelEl); formGroup.appendChild(inputElement);
            } else if (field.type === 'checkbox') {
                inputElement = document.createElement('input'); inputElement.type = 'checkbox';
                formGroup.appendChild(inputElement);
                labelEl.style.fontWeight = 'normal'; labelEl.style.marginLeft = '5px'; labelEl.style.display = 'inline';
                formGroup.appendChild(labelEl);
            } else {
                inputElement = document.createElement('input'); inputElement.type = field.type; 
                formGroup.appendChild(labelEl); formGroup.appendChild(inputElement);
            }
            inputElement.id = `custom_field_${field.name}`;
            inputElement.dataset.fieldName = field.name;
            if (field.required) inputElement.required = true;
            dynamicRsvpFormFieldsDiv.appendChild(formGroup);
        });
    }

    function displayParticipants(participants, formSchema) {
        participantListUl.innerHTML = '';
        if (participants && participants.length > 0) {
            noEventParticipantsMessage.style.display = 'none';
            participants.forEach(p => {
                const listItem = document.createElement('li');
                let customDataHtml = '';

                if (p.form_data && p.form_data.terms_agreed !== undefined) {
                    customDataHtml += `<strong>利用規約同意:</strong> ${p.form_data.terms_agreed ? 'はい' : 'いいえ'}<br>`;
                }

                if (p.form_data && formSchema && formSchema.length > 0) {
                    formSchema.forEach(fieldSchema => {
                        const value = p.form_data[fieldSchema.name];
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
                listItem.innerHTML = `
                    <strong>氏名: ${p.name}</strong><br>
                    ${customDataHtml}
                    <small>登録日時: ${new Date(p.created_at).toLocaleString('ja-JP')}</small>
                `;
                participantListUl.appendChild(listItem);
            });
        } else {
            noEventParticipantsMessage.style.display = 'block';
        }
    }


    async function fetchEventDetailsAndParticipants() {
        try {
            eventDetailLoading.style.display = 'block';
            participantListLoading.style.display = 'block';

            // イベント詳細を取得
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('*, form_schema, image_urls, video_urls') 
                .eq('id', currentEventId)
                .single();

            if (eventError) throw eventError;

            if (event) {
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                let mediaHtml = '<div class="event-media-gallery">';
                if (event.image_urls && event.image_urls.length > 0) {
                    event.image_urls.forEach(url => { if(url) mediaHtml += `<img src="${url}" alt="${event.name} の画像">`; });
                }
                if (event.video_urls && event.video_urls.length > 0) {
                    event.video_urls.forEach(url => { if(url) mediaHtml += `<video src="${url}" controls preload="metadata"></video>`; });
                }
                mediaHtml += '</div>';
                eventDetailDiv.innerHTML = `
                    <h2>${event.name}</h2>
                    ${(event.image_urls && event.image_urls.length > 0) || (event.video_urls && event.video_urls.length > 0) ? mediaHtml : ''}
                    <p><strong>日時:</strong> ${eventDate}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    <p><strong>詳細:</strong></p>
                    <p>${event.description || '詳細情報はありません。'}</p>
                `;
                generateDynamicFormFields(event.form_schema); // currentEventFormSchemaもここで設定される

                // 参加者一覧を取得
                const { data: participants, error: participantsError } = await supabase
                    .from('participants')
                    .select('name, created_at, form_data')
                    .eq('event_id', currentEventId)
                    .order('created_at', { ascending: true });

                if (participantsError) throw participantsError;
                
                displayParticipants(participants, event.form_schema); // イベントのスキーマを渡す

            } else {
                eventDetailDiv.innerHTML = '<p class="error-message">イベントが見つかりませんでした。</p>';
                rsvpForm.style.display = 'none';
                document.querySelector('.participants-section').style.display = 'none'; // 参加者セクションも非表示
            }
        } catch (error) {
            console.error('Error fetching event details or participants:', error.message);
            eventDetailDiv.innerHTML = `<p class="error-message">情報読み込みに失敗: ${error.message}</p>`;
            rsvpForm.style.display = 'none';
            document.querySelector('.participants-section').style.display = 'none';
        } finally {
            eventDetailLoading.style.display = 'none';
            participantListLoading.style.display = 'none';
        }
    }

    rsvpForm.addEventListener('submit', async (e) => {
        // (この部分は変更なし、前回と同じ)
        e.preventDefault();
        messageArea.innerHTML = '';
        const participantName = document.getElementById('participantName').value;
        const termsAgreementCheckbox = document.getElementById('termsAgreement');
        if (!participantName.trim()) { messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>'; return; }
        if (!termsAgreementCheckbox.checked) { messageArea.innerHTML = '<p class="error-message">利用規約に同意してください。</p>'; return; }
        
        const customFormData = {};
        // currentEventFormSchema は fetchEventDetailsAndParticipants で設定されているはず
        const formSchema = currentEventFormSchema; 

        if (formSchema) {
            for (const field of formSchema) {
                const inputElement = document.getElementById(`custom_field_${field.name}`);
                if (inputElement) {
                    if (field.type === 'checkbox') customFormData[field.name] = inputElement.checked;
                    else customFormData[field.name] = inputElement.value.trim();
                    if (field.required && !customFormData[field.name] && field.type !== 'checkbox') { messageArea.innerHTML = `<p class="error-message">${field.label} を入力してください。</p>`; return; }
                    if (field.required && field.type === 'checkbox' && !inputElement.checked) { messageArea.innerHTML = `<p class="error-message">${field.label} にチェックを入れてください。</p>`; return; }
                }
            }
        }
        const submissionData = { ...customFormData, terms_agreed: termsAgreementCheckbox.checked };
        try {
            const { data, error } = await supabase.from('participants').insert([{ event_id: currentEventId, name: participantName, form_data: Object.keys(submissionData).length > 0 ? submissionData : null }]).select();
            if (error) throw error;
            messageArea.innerHTML = '<p class="success-message">出欠を登録しました。ありがとうございます！</p>';
            rsvpForm.reset(); 
            if (formSchema) generateDynamicFormFields(formSchema); // 動的フォームもリセット

            // 参加登録後、参加者リストを再読み込み
            const { data: participants, error: participantsError } = await supabase
                .from('participants')
                .select('name, created_at, form_data')
                .eq('event_id', currentEventId)
                .order('created_at', { ascending: true });
            if (!participantsError) {
                displayParticipants(participants, formSchema);
            }

        } catch (error) {
            console.error('Error submitting RSVP:', error.message);
            messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`;
        }
    });

    fetchEventDetailsAndParticipants(); // 初期表示
});