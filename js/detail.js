// js/detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventDetailDiv = document.getElementById('eventDetail');
    // ... (他の要素取得、関数定義は変更なし)
    const eventDetailLoading = document.getElementById('eventDetailLoading'); 
    const rsvpForm = document.getElementById('rsvpForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const dynamicRsvpFormFieldsDiv = document.getElementById('dynamicRsvpFormFields');
    const termsLink = document.getElementById('termsLink'); 
    const participantListUl = document.getElementById('eventParticipantList');
    const participantListLoading = document.getElementById('participantListLoading');
    const noEventParticipantsMessage = document.getElementById('noEventParticipantsMessage');
    let currentEventFormSchema = null; 
    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');
    if (!currentEventId) { /* ... */ return; } eventIdInput.value = currentEventId;
    function generateDynamicFormFields(formSchema) { /* ... (変更なし) ... */ currentEventFormSchema = formSchema; dynamicRsvpFormFieldsDiv.innerHTML = ''; if (!formSchema || formSchema.length === 0) return; formSchema.forEach(field => { const formGroup = document.createElement('div'); formGroup.classList.add('form-group'); const labelEl = document.createElement('label'); labelEl.htmlFor = `custom_field_${field.name}`; labelEl.textContent = `${field.label}${field.required ? ' (必須)' : ''}:`; let inputElement; if (field.type === 'textarea') { inputElement = document.createElement('textarea'); formGroup.appendChild(labelEl); formGroup.appendChild(inputElement); } else if (field.type === 'checkbox') { inputElement = document.createElement('input'); inputElement.type = 'checkbox'; formGroup.appendChild(inputElement); labelEl.style.fontWeight = 'normal'; labelEl.style.marginLeft = '5px'; labelEl.style.display = 'inline'; formGroup.appendChild(labelEl); } else { inputElement = document.createElement('input'); inputElement.type = field.type; formGroup.appendChild(labelEl); formGroup.appendChild(inputElement); } inputElement.id = `custom_field_${field.name}`; inputElement.dataset.fieldName = field.name; if (field.required) inputElement.required = true; dynamicRsvpFormFieldsDiv.appendChild(formGroup); }); }
    function displayParticipants(participants, formSchema) { /* ... (変更なし) ... */ participantListUl.innerHTML = ''; if (participants && participants.length > 0) { noEventParticipantsMessage.style.display = 'none'; participants.forEach(p => { const listItem = document.createElement('li'); let customDataHtml = ''; if (p.form_data && p.form_data.terms_agreed !== undefined) customDataHtml += `<strong>利用規約同意:</strong> ${p.form_data.terms_agreed ? 'はい' : 'いいえ'}<br>`; if (p.form_data && formSchema && formSchema.length > 0) { formSchema.forEach(fieldSchema => { const value = p.form_data[fieldSchema.name]; let displayValue = '-'; if (value !== undefined && value !== null) { if (fieldSchema.type === 'checkbox') displayValue = value ? 'はい' : 'いいえ'; else displayValue = value.toString() || '-'; } customDataHtml += `<strong>${fieldSchema.label}:</strong> ${displayValue}<br>`; }); } listItem.innerHTML = `<strong>氏名: ${p.name}</strong><br>${customDataHtml}<small>登録日時: ${new Date(p.created_at).toLocaleString('ja-JP')}</small>`; participantListUl.appendChild(listItem); }); } else noEventParticipantsMessage.style.display = 'block'; }

    async function fetchEventDetailsAndParticipants() {
        try {
            eventDetailLoading.style.display = 'block';
            participantListLoading.style.display = 'block';

            const { data: event, error: eventError } = await supabase
                .from('events')
                // select句に新しいカラムを追加
                .select('*, form_schema, image_urls, video_urls, participation_fee, event_end_date') 
                .eq('id', currentEventId)
                .single();

            if (eventError) throw eventError;

            if (event) {
                const eventStartDate = event.event_date ? new Date(event.event_date) : null;
                const eventEndDate = event.event_end_date ? new Date(event.event_end_date) : null;

                let dateTimeStr = '日時未定';
                if (eventStartDate) {
                    dateTimeStr = eventStartDate.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    if (eventEndDate) {
                        // 同じ日なら時間だけ、違う日なら日付も
                        if (eventStartDate.toDateString() === eventEndDate.toDateString()) {
                            dateTimeStr += ` 〜 ${eventEndDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
                        } else {
                            dateTimeStr += ` 〜 ${eventEndDate.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
                        }
                    }
                }

                let mediaHtml = '<div class="event-media-gallery">'; /* ... (変更なし) ... */ if (event.image_urls && event.image_urls.length > 0) event.image_urls.forEach(url => { if(url) mediaHtml += `<img src="${url}" alt="${event.name} の画像">`; }); if (event.video_urls && event.video_urls.length > 0) event.video_urls.forEach(url => { if(url) mediaHtml += `<video src="${url}" controls preload="metadata"></video>`; }); mediaHtml += '</div>';
                
                const feeDisplay = event.participation_fee ? `<p><strong>参加費用:</strong> ${event.participation_fee}</p>` : '';

                eventDetailDiv.innerHTML = `
                    <h2>${event.name}</h2>
                    ${(event.image_urls && event.image_urls.length > 0) || (event.video_urls && event.video_urls.length > 0) ? mediaHtml : ''}
                    <p><strong>日時:</strong> ${dateTimeStr}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    ${feeDisplay}
                    <p><strong>詳細:</strong></p>
                    <p>${event.description || '詳細情報はありません。'}</p>
                `;
                generateDynamicFormFields(event.form_schema);

                const { data: participants, error: participantsError } = await supabase.from('participants').select('name, created_at, form_data').eq('event_id', currentEventId).order('created_at', { ascending: true });
                if (participantsError) throw participantsError;
                displayParticipants(participants, event.form_schema);

            } else { /* ... (変更なし) ... */ eventDetailDiv.innerHTML = '<p class="error-message">イベントが見つかりませんでした。</p>'; rsvpForm.style.display = 'none'; document.querySelector('.participants-section').style.display = 'none'; }
        } catch (error) { /* ... (変更なし) ... */ console.error('Error fetching event details or participants:', error.message); eventDetailDiv.innerHTML = `<p class="error-message">情報読み込みに失敗: ${error.message}</p>`; rsvpForm.style.display = 'none'; document.querySelector('.participants-section').style.display = 'none'; }
        finally { /* ... (変更なし) ... */ eventDetailLoading.style.display = 'none'; participantListLoading.style.display = 'none'; }
    }

    rsvpForm.addEventListener('submit', async (e) => { /* (変更なし) */ /* ... */ });

    fetchEventDetailsAndParticipants();
});