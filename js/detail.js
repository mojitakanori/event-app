// js/detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventDetailDiv = document.getElementById('eventDetail');
    const eventDetailLoading = document.getElementById('eventDetailLoading'); 
    const rsvpForm = document.getElementById('rsvpForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const dynamicRsvpFormFieldsDiv = document.getElementById('dynamicRsvpFormFields');
    const termsLink = document.getElementById('termsLink'); 

    const participantListUl = document.getElementById('eventParticipantList');
    const participantListLoading = document.getElementById('participantListLoading');
    const noEventParticipantsMessage = document.getElementById('noEventParticipantsMessage');
    const exportCsvButton = document.getElementById('exportCsvButton');

    let currentEventFormSchema = null; 
    let currentEventName = 'event_participants'; 
    let currentParticipantsData = []; 

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    if (!currentEventId) {
        if (eventDetailDiv) eventDetailDiv.innerHTML = '<p class="error-message">イベントIDが指定されていません。</p>';
        if (rsvpForm) rsvpForm.style.display = 'none';
        if (eventDetailLoading) eventDetailLoading.style.display = 'none';
        const participantsSection = document.querySelector('.participants-section');
        if (participantsSection) participantsSection.style.display = 'none';
        return;
    } 
    if (eventIdInput) eventIdInput.value = currentEventId;

    function generateDynamicFormFields(formSchema) {
        currentEventFormSchema = formSchema; 
        if (!dynamicRsvpFormFieldsDiv) return;
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
                formGroup.appendChild(labelEl); 
                formGroup.appendChild(inputElement);
            } else if (field.type === 'checkbox') {
                inputElement = document.createElement('input');
                inputElement.type = 'checkbox';
                formGroup.appendChild(inputElement); // Input first for checkbox
                labelEl.style.fontWeight = 'normal';
                labelEl.style.marginLeft = '5px';
                labelEl.style.display = 'inline';
                formGroup.appendChild(labelEl); // Then label
            } else {
                inputElement = document.createElement('input');
                inputElement.type = field.type; 
                formGroup.appendChild(labelEl); 
                formGroup.appendChild(inputElement);
            }
            
            inputElement.id = `custom_field_${field.name}`;
            inputElement.dataset.fieldName = field.name; // Keep internal name if needed
            if (field.required) {
                inputElement.required = true;
            }
            dynamicRsvpFormFieldsDiv.appendChild(formGroup);
        });
    }

    function displayParticipants(participants, formSchema) {
        currentParticipantsData = participants || [];
        if (!participantListUl || !noEventParticipantsMessage || !exportCsvButton || !participantListLoading) return;

        participantListUl.innerHTML = '';
        if (currentParticipantsData.length > 0) {
            noEventParticipantsMessage.style.display = 'none';
            exportCsvButton.style.display = 'inline-block'; 

            currentParticipantsData.forEach(p => {
                const listItem = document.createElement('li');
                let customDataHtml = '';
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
                listItem.innerHTML = `<strong>氏名: ${p.name}</strong><br>${customDataHtml}<small>登録日時: ${p.created_at.replace('T', ' ').substring(0, 19)}</small>`;
                participantListUl.appendChild(listItem);
            });
        } else {
            noEventParticipantsMessage.style.display = 'block';
            exportCsvButton.style.display = 'none';
        }
        participantListLoading.style.display = 'none'; // ローディングメッセージを非表示
    }

    async function fetchEventDetailsAndParticipants() {
        if (!eventDetailLoading || !participantListLoading || !exportCsvButton || !eventDetailDiv || !rsvpForm) {
            console.error("Required DOM elements not found for fetching details.");
            return;
        }
        try {
            eventDetailLoading.style.display = 'block';
            participantListLoading.style.display = 'block'; 
            exportCsvButton.style.display = 'none'; 

            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('*, form_schema, image_urls, video_urls, participation_fee, event_end_date, max_participants') 
                .eq('id', currentEventId)
                .single();

            if (eventError) throw eventError;

            if (event) {
                currentEventName = event.name || 'event_participants'; 
                currentEventFormSchema = event.form_schema; 

                const { count: participantCount, error: countError } = await supabase
                    .from('participants')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', currentEventId);
                
                const currentParticipantNum = countError ? 0 : (participantCount || 0);

                const eventStartDate = event.event_date ? new Date(event.event_date) : null;
                const eventEndDate = event.event_end_date ? new Date(event.event_end_date) : null;
                let dateTimeStr = '日時未定';
                if (event.event_date) {
                    // Date オブジェクトを作成せず、文字列として直接処理
                    const startDateStr = event.event_date.replace('T', ' ').substring(0, 16);
                    dateTimeStr = startDateStr;
                    
                    if (event.event_end_date) {
                        const endDateStr = event.event_end_date.replace('T', ' ').substring(0, 16);
                        
                        // 同じ日付かどうかの判定（文字列で比較）
                        if (startDateStr.substring(0, 10) === endDateStr.substring(0, 10)) {
                            dateTimeStr += ` 〜 ${endDateStr.substring(11, 16)}`; // 時間部分のみ
                        } else {
                            dateTimeStr += ` 〜 ${endDateStr}`;
                        }
                    }
                }
                let mediaHtml = '<div class="event-media-gallery">';
                if (event.image_urls && event.image_urls.length > 0) event.image_urls.forEach(url => { if(url) mediaHtml += `<img src="${url}" alt="${event.name} の画像">`; });
                if (event.video_urls && event.video_urls.length > 0) event.video_urls.forEach(url => { if(url) mediaHtml += `<video src="${url}" controls preload="metadata"></video>`; });
                mediaHtml += '</div>';
                const feeDisplay = event.participation_fee ? `<p><strong>参加費用:</strong> ${event.participation_fee}</p>` : '';
                
                let capacityStatusDetail = '';
                let registrationClosed = false;

                if (event.max_participants !== null && event.max_participants !== undefined) {
                    if (currentParticipantNum >= event.max_participants) {
                        capacityStatusDetail = `<p style="color: red; font-weight: bold;">満員御礼 (現在 ${currentParticipantNum} / ${event.max_participants} 人)</p>`;
                        registrationClosed = true;
                    } else {
                        capacityStatusDetail = `<p><strong>参加状況:</strong> ${currentParticipantNum} / ${event.max_participants} 人</p>`;
                    }
                } else {
                    capacityStatusDetail = `<p><strong>現在の参加者:</strong> ${currentParticipantNum} 人</p>`;
                }

                eventDetailDiv.innerHTML = `
                    <h2>${event.name}</h2>
                    ${(event.image_urls && event.image_urls.length > 0) || (event.video_urls && event.video_urls.length > 0) ? mediaHtml : ''}
                    <p><strong>日時:</strong> ${dateTimeStr}</p>
                    <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    ${feeDisplay}
                    ${capacityStatusDetail}
                    <p><strong>詳細:</strong></p>
                    <p>${event.description || '詳細情報はありません。'}</p>
                `;
                generateDynamicFormFields(event.form_schema);

                const participantsSection = document.querySelector('.participants-section');
                if (registrationClosed) {
                    rsvpForm.style.display = 'none';
                    let closedMessageDiv = participantsSection ? participantsSection.querySelector('.registration-closed-message') : null;
                    if (!closedMessageDiv) {
                        closedMessageDiv = document.createElement('div');
                        closedMessageDiv.classList.add('registration-closed-message'); // クラス追加
                        closedMessageDiv.innerHTML = '<p class="error-message" style="text-align:center; font-size:1.2em;">このイベントは満員のため、受付を終了しました。</p>';
                        if (rsvpForm.parentElement && rsvpForm.nextSibling) {
                            rsvpForm.parentElement.insertBefore(closedMessageDiv, rsvpForm.nextSibling);
                        } else if (rsvpForm.parentElement) {
                             rsvpForm.parentElement.appendChild(closedMessageDiv);
                        }
                    }
                    closedMessageDiv.style.display = 'block'; // 表示
                } else {
                    rsvpForm.style.display = 'block';
                    const existingClosedMessage = participantsSection ? participantsSection.querySelector('.registration-closed-message') : null;
                    if (existingClosedMessage) existingClosedMessage.style.display = 'none'; // あれば隠す
                }

                const { data: participants, error: participantsError } = await supabase.from('participants').select('name, created_at, form_data').eq('event_id', currentEventId).order('created_at', { ascending: true });
                if (participantsError) throw participantsError;
                displayParticipants(participants, event.form_schema);

            } else {
                eventDetailDiv.innerHTML = '<p class="error-message">イベントが見つかりませんでした。</p>';
                rsvpForm.style.display = 'none';
                const participantsSection = document.querySelector('.participants-section');
                if (participantsSection) participantsSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching event details or participants:', error.message);
            if (eventDetailDiv) eventDetailDiv.innerHTML = `<p class="error-message">情報読み込みに失敗: ${error.message}</p>`;
            if (rsvpForm) rsvpForm.style.display = 'none';
            const participantsSection = document.querySelector('.participants-section');
            if (participantsSection) participantsSection.style.display = 'none';
        } finally {
            if (eventDetailLoading) eventDetailLoading.style.display = 'none';
            // participantListLoading は displayParticipants で制御されるため、ここでは触らないか、
            // displayParticipantsが呼ばれない可能性のあるパスでのみ制御する
            if (participantListLoading && participantListLoading.style.display !== 'none' && (!currentParticipantsData || currentParticipantsData.length === 0)) {
                 participantListLoading.style.display = 'none';
            }
        }
    }

    function escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        let stringValue = String(value);
        if (stringValue.includes('"')) stringValue = stringValue.replace(/"/g, '""');
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) return `"${stringValue}"`;
        return stringValue;
    }

    function generateAndDownloadCsv() {
        if (!currentParticipantsData || currentParticipantsData.length === 0) {
            alert('エクスポートする参加者がいません。');
            return;
        }
        const headers = ['氏名', '登録日時', '利用規約同意'];
        const customFieldHeaders = [];
        const customFieldNames = [];
        if (currentEventFormSchema && currentEventFormSchema.length > 0) {
            currentEventFormSchema.forEach(field => {
                customFieldHeaders.push(field.label); 
                customFieldNames.push(field.name);    
            });
        }
        const allHeaders = [...headers, ...customFieldHeaders];
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
        csvContent += allHeaders.map(escapeCsvValue).join(',') + '\r\n'; 
        currentParticipantsData.forEach(participant => {
            const row = [];
            row.push(escapeCsvValue(participant.name));
            row.push(escapeCsvValue(participant.created_at.replace('T', ' ').substring(0, 19)));
            const termsAgreed = (participant.form_data && participant.form_data.terms_agreed !== undefined) ? (participant.form_data.terms_agreed ? 'はい' : 'いいえ') : '';
            row.push(escapeCsvValue(termsAgreed));
            customFieldNames.forEach(fieldName => {
                let value = '';
                if (participant.form_data && participant.form_data[fieldName] !== undefined) {
                    const schemaField = currentEventFormSchema.find(f => f.name === fieldName);
                    if (schemaField && schemaField.type === 'checkbox') value = participant.form_data[fieldName] ? 'はい' : 'いいえ';
                    else value = participant.form_data[fieldName];
                }
                row.push(escapeCsvValue(value));
            });
            csvContent += row.join(',') + '\r\n';
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeEventName = currentEventName.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]/g, '_');
        link.setAttribute("download", `${safeEventName}_参加者リスト.csv`);
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
    }

    if (exportCsvButton) { // ボタンが存在する場合のみリスナーを設定
        exportCsvButton.addEventListener('click', generateAndDownloadCsv);
    }

    if (rsvpForm) { // フォームが存在する場合のみリスナーを設定
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            if (!messageArea) return;
            messageArea.innerHTML = '';

            const participantNameInput = document.getElementById('participantName');
            const termsAgreementCheckbox = document.getElementById('termsAgreement');
            if (!participantNameInput || !termsAgreementCheckbox) return;

            const participantName = participantNameInput.value;
            if (!participantName.trim()) { messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>'; return; }
            if (!termsAgreementCheckbox.checked) { messageArea.innerHTML = '<p class="error-message">利用規約に同意してください。</p>'; return; }
            
            const { count: currentCountBeforeSubmit, error: countErr } = await supabase
                .from('participants')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', currentEventId);
            
            const { data: eventForCapacityCheck, error: eventCapErr } = await supabase
                .from('events')
                .select('max_participants')
                .eq('id', currentEventId)
                .single();

            if (!countErr && !eventCapErr && eventForCapacityCheck && eventForCapacityCheck.max_participants !== null) {
                if ((currentCountBeforeSubmit || 0) >= eventForCapacityCheck.max_participants) {
                    messageArea.innerHTML = '<p class="error-message">申し訳ありません、定員に達したため登録できませんでした。</p>';
                    rsvpForm.style.display = 'none'; 
                    let closedMsg = rsvpForm.parentElement.querySelector('.registration-closed-message');
                    if (!closedMsg) {
                        closedMsg = document.createElement('div');
                        closedMsg.classList.add('registration-closed-message');
                        closedMsg.innerHTML = '<p class="error-message" style="text-align:center; font-size:1.2em;">このイベントは満員のため、受付を終了しました。</p>';
                        if (rsvpForm.parentElement && rsvpForm.nextSibling) rsvpForm.parentElement.insertBefore(closedMsg, rsvpForm.nextSibling);
                        else if (rsvpForm.parentElement) rsvpForm.parentElement.appendChild(closedMsg);
                    }
                    closedMsg.style.display = 'block';
                    return;
                }
            }

            const customFormData = {}; 
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
                const { data, error } = await supabase.from('participants').insert([{ event_id: currentEventId, name: participantName, created_at: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)), form_data: Object.keys(submissionData).length > 0 ? submissionData : null }]).select();
                if (error) throw error;
                messageArea.innerHTML = '<p class="success-message">出欠を登録しました。ありがとうございます！</p>';
                rsvpForm.reset(); 
                if (formSchema) generateDynamicFormFields(formSchema);
                fetchEventDetailsAndParticipants(); // 参加者リストとイベント情報(満員表示など)を更新
            } catch (error) { 
                console.error('Error submitting RSVP:', error.message); 
                messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`; 
            }
        });
    }

    fetchEventDetailsAndParticipants();
});