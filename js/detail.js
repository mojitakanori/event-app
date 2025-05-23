// js/detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventDetailDiv = document.getElementById('eventDetail');
    // ... 他の要素取得 (変更なし)
    const rsvpForm = document.getElementById('rsvpForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const loadingMessage = document.getElementById('loadingMessage');
    const dynamicRsvpFormFieldsDiv = document.getElementById('dynamicRsvpFormFields');
    const termsLink = document.getElementById('termsLink'); 

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');
    // ... (currentEventIdチェックなどは変更なし)
    if (!currentEventId) { /* ... */ return; }
    eventIdInput.value = currentEventId;


    function generateDynamicFormFields(formSchema) { /* (変更なし) */
        dynamicRsvpFormFieldsDiv.innerHTML = ''; 
        if (!formSchema || formSchema.length === 0) return; 
        formSchema.forEach(field => {
            const formGroup = document.createElement('div');
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


    async function fetchEventDetails() {
        try {
            loadingMessage.style.display = 'block';
            // カラム名を image_urls, video_urls に変更
            const { data: event, error } = await supabase
                .from('events')
                .select('*, form_schema, image_urls, video_urls') 
                .eq('id', currentEventId)
                .single();

            if (error) throw error;

            if (event) {
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                let mediaHtml = '<div class="event-media-gallery">'; // ギャラリーコンテナ
                
                if (event.image_urls && event.image_urls.length > 0) {
                    event.image_urls.forEach(url => {
                        if(url) mediaHtml += `<img src="${url}" alt="${event.name} の画像">`;
                    });
                }
                if (event.video_urls && event.video_urls.length > 0) {
                    event.video_urls.forEach(url => {
                        if(url) mediaHtml += `<video src="${url}" controls preload="metadata"></video>`;
                    });
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
                generateDynamicFormFields(event.form_schema);
            } else {
                eventDetailDiv.innerHTML = '<p class="error-message">イベントが見つかりませんでした。</p>';
                rsvpForm.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching event details:', error.message);
            eventDetailDiv.innerHTML = `<p class="error-message">イベント情報の読み込みに失敗しました: ${error.message}</p>`;
            rsvpForm.style.display = 'none';
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    rsvpForm.addEventListener('submit', async (e) => { /* (この部分は変更なし) */
        e.preventDefault();
        messageArea.innerHTML = '';
        const participantName = document.getElementById('participantName').value;
        const termsAgreementCheckbox = document.getElementById('termsAgreement');
        if (!participantName.trim()) { messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>'; return; }
        if (!termsAgreementCheckbox.checked) { messageArea.innerHTML = '<p class="error-message">利用規約に同意してください。</p>'; return; }
        const customFormData = {};
        const { data: eventData, error: eventError } = await supabase.from('events').select('form_schema').eq('id', currentEventId).single();
        if (eventError || !eventData) { messageArea.innerHTML = '<p class="error-message">イベント情報の取得に失敗しました。</p>'; return; }
        const formSchema = eventData.form_schema;
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
            if (formSchema) generateDynamicFormFields(formSchema);
        } catch (error) {
            console.error('Error submitting RSVP:', error.message);
            messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`;
        }
    });

    fetchEventDetails();
});