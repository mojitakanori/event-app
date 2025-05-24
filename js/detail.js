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
    const exportCsvButton = document.getElementById('exportCsvButton'); // CSV出力ボタン

    let currentEventFormSchema = null; 
    let currentEventName = 'event_participants'; // CSVファイル名のデフォルト
    let currentParticipantsData = []; // 参加者データを保持する配列

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    if (!currentEventId) { /* ... (変更なし) ... */ return; } 
    eventIdInput.value = currentEventId;

    function generateDynamicFormFields(formSchema) { /* (変更なし) */ /* ... */ }
    function displayParticipants(participants, formSchema) {
        currentParticipantsData = participants || []; // 参加者データを更新
        participantListUl.innerHTML = '';
        if (currentParticipantsData.length > 0) {
            noEventParticipantsMessage.style.display = 'none';
            exportCsvButton.style.display = 'inline-block'; // 参加者がいればCSVボタン表示

            currentParticipantsData.forEach(p => {
                const listItem = document.createElement('li');
                let customDataHtml = '';
                if (p.form_data && p.form_data.terms_agreed !== undefined) customDataHtml += `<strong>利用規約同意:</strong> ${p.form_data.terms_agreed ? 'はい' : 'いいえ'}<br>`;
                if (p.form_data && formSchema && formSchema.length > 0) {
                    formSchema.forEach(fieldSchema => {
                        const value = p.form_data[fieldSchema.name];
                        let displayValue = '-';
                        if (value !== undefined && value !== null) {
                            if (fieldSchema.type === 'checkbox') displayValue = value ? 'はい' : 'いいえ';
                            else displayValue = value.toString() || '-';
                        }
                        customDataHtml += `<strong>${fieldSchema.label}:</strong> ${displayValue}<br>`;
                    });
                }
                listItem.innerHTML = `<strong>氏名: ${p.name}</strong><br>${customDataHtml}<small>登録日時: ${new Date(p.created_at).toLocaleString('ja-JP')}</small>`;
                participantListUl.appendChild(listItem);
            });
        } else {
            noEventParticipantsMessage.style.display = 'block';
            exportCsvButton.style.display = 'none'; // 参加者がいなければCSVボタン非表示
        }
    }

    async function fetchEventDetailsAndParticipants() {
        try {
            eventDetailLoading.style.display = 'block';
            participantListLoading.style.display = 'block';
            exportCsvButton.style.display = 'none'; // 初期は非表示

            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('name, form_schema, image_urls, video_urls, participation_fee, event_end_date, event_date, location, description') // event.name を取得
                .eq('id', currentEventId)
                .single();

            if (eventError) throw eventError;

            if (event) {
                currentEventName = event.name || 'event_participants'; // イベント名をファイル名に使用
                currentEventFormSchema = event.form_schema; // スキーマをグローバルに保持

                // ... (イベント詳細表示部分は変更なし)
                const eventStartDate = event.event_date ? new Date(event.event_date) : null; /* ... */
                const eventEndDate = event.event_end_date ? new Date(event.event_end_date) : null; /* ... */
                let dateTimeStr = '日時未定'; /* ... */
                if (eventStartDate) { /* ... */ }
                let mediaHtml = '<div class="event-media-gallery">'; /* ... */
                if (event.image_urls && event.image_urls.length > 0) event.image_urls.forEach(url => { if(url) mediaHtml += `<img src="${url}" alt="${event.name} の画像">`; });
                if (event.video_urls && event.video_urls.length > 0) event.video_urls.forEach(url => { if(url) mediaHtml += `<video src="${url}" controls preload="metadata"></video>`; });
                mediaHtml += '</div>';
                const feeDisplay = event.participation_fee ? `<p><strong>参加費用:</strong> ${event.participation_fee}</p>` : '';
                eventDetailDiv.innerHTML = `<h2>${event.name}</h2>${(event.image_urls && event.image_urls.length > 0) || (event.video_urls && event.video_urls.length > 0) ? mediaHtml : ''}<p><strong>日時:</strong> ${dateTimeStr}</p><p><strong>場所:</strong> ${event.location || '未定'}</p>${feeDisplay}<p><strong>詳細:</strong></p><p>${event.description || '詳細情報はありません。'}</p>`;
                generateDynamicFormFields(event.form_schema);

                const { data: participants, error: participantsError } = await supabase.from('participants').select('name, created_at, form_data').eq('event_id', currentEventId).order('created_at', { ascending: true });
                if (participantsError) throw participantsError;
                displayParticipants(participants, event.form_schema);

            } else { /* ... (変更なし) ... */ }
        } catch (error) { /* ... (変更なし) ... */ }
        finally { /* ... (変更なし) ... */ }
    }

    // CSVエスケープ関数
    function escapeCsvValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        let stringValue = String(value);
        // ダブルクォートが含まれる場合は、それを2つのダブルクォートに置換し、全体をダブルクォートで囲む
        if (stringValue.includes('"')) {
            stringValue = stringValue.replace(/"/g, '""');
        }
        // カンマ、改行、ダブルクォートが含まれる場合は、全体をダブルクォートで囲む
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue}"`;
        }
        return stringValue;
    }

    function generateAndDownloadCsv() {
        if (currentParticipantsData.length === 0) {
            alert('エクスポートする参加者がいません。');
            return;
        }

        const headers = ['氏名', '登録日時', '利用規約同意'];
        const customFieldHeaders = [];
        const customFieldNames = []; // 内部的なフィールド名

        if (currentEventFormSchema && currentEventFormSchema.length > 0) {
            currentEventFormSchema.forEach(field => {
                customFieldHeaders.push(field.label); // 表示ラベルをヘッダーに
                customFieldNames.push(field.name);    // 内部名をデータアクセスに
            });
        }
        const allHeaders = [...headers, ...customFieldHeaders];
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM付きUTF-8
        csvContent += allHeaders.map(escapeCsvValue).join(',') + '\r\n'; // ヘッダー行

        currentParticipantsData.forEach(participant => {
            const row = [];
            row.push(escapeCsvValue(participant.name));
            row.push(escapeCsvValue(new Date(participant.created_at).toLocaleString('ja-JP')));
            
            const termsAgreed = (participant.form_data && participant.form_data.terms_agreed !== undefined) 
                                ? (participant.form_data.terms_agreed ? 'はい' : 'いいえ') 
                                : '';
            row.push(escapeCsvValue(termsAgreed));

            customFieldNames.forEach(fieldName => {
                let value = '';
                if (participant.form_data && participant.form_data[fieldName] !== undefined) {
                    const schemaField = currentEventFormSchema.find(f => f.name === fieldName);
                    if (schemaField && schemaField.type === 'checkbox') {
                        value = participant.form_data[fieldName] ? 'はい' : 'いいえ';
                    } else {
                        value = participant.form_data[fieldName];
                    }
                }
                row.push(escapeCsvValue(value));
            });
            csvContent += row.join(',') + '\r\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeEventName = currentEventName.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]/g, '_'); // ファイル名に使えない文字を置換
        link.setAttribute("download", `${safeEventName}_participants.csv`);
        document.body.appendChild(link); // Firefoxで必要
        link.click();
        document.body.removeChild(link); // 後片付け
    }

    exportCsvButton.addEventListener('click', generateAndDownloadCsv);


    rsvpForm.addEventListener('submit', async (e) => {
        // (この部分は変更なし、前回と同じ)
        e.preventDefault(); messageArea.innerHTML = '';
        const participantName = document.getElementById('participantName').value;
        const termsAgreementCheckbox = document.getElementById('termsAgreement');
        if (!participantName.trim()) { messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>'; return; }
        if (!termsAgreementCheckbox.checked) { messageArea.innerHTML = '<p class="error-message">利用規約に同意してください。</p>'; return; }
        const customFormData = {}; const formSchema = currentEventFormSchema; 
        if (formSchema) { for (const field of formSchema) { const inputElement = document.getElementById(`custom_field_${field.name}`); if (inputElement) { if (field.type === 'checkbox') customFormData[field.name] = inputElement.checked; else customFormData[field.name] = inputElement.value.trim(); if (field.required && !customFormData[field.name] && field.type !== 'checkbox') { messageArea.innerHTML = `<p class="error-message">${field.label} を入力してください。</p>`; return; } if (field.required && field.type === 'checkbox' && !inputElement.checked) { messageArea.innerHTML = `<p class="error-message">${field.label} にチェックを入れてください。</p>`; return; } } } }
        const submissionData = { ...customFormData, terms_agreed: termsAgreementCheckbox.checked };
        try {
            const { data, error } = await supabase.from('participants').insert([{ event_id: currentEventId, name: participantName, form_data: Object.keys(submissionData).length > 0 ? submissionData : null }]).select();
            if (error) throw error;
            messageArea.innerHTML = '<p class="success-message">出欠を登録しました。ありがとうございます！</p>';
            rsvpForm.reset(); if (formSchema) generateDynamicFormFields(formSchema);
            // 参加登録後、参加者リストを再読み込みしてCSVボタンの状態も更新
            const { data: participants, error: participantsError } = await supabase.from('participants').select('name, created_at, form_data').eq('event_id', currentEventId).order('created_at', { ascending: true });
            if (!participantsError) displayParticipants(participants, formSchema);
        } catch (error) { console.error('Error submitting RSVP:', error.message); messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`; }
    });

    fetchEventDetailsAndParticipants();
});