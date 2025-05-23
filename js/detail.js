// js/detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventDetailDiv = document.getElementById('eventDetail');
    const rsvpForm = document.getElementById('rsvpForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const loadingMessage = document.getElementById('loadingMessage');
    const dynamicRsvpFormFieldsDiv = document.getElementById('dynamicRsvpFormFields');
    const termsLink = document.getElementById('termsLink'); // 利用規約リンク

    // TODO: 利用規約のリンク先を設定
    // termsLink.href = 'https://example.com/terms'; 

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    if (!currentEventId) {
        eventDetailDiv.innerHTML = '<p class="error-message">イベントIDが指定されていません。</p>';
        rsvpForm.style.display = 'none';
        loadingMessage.style.display = 'none';
        return;
    }

    eventIdInput.value = currentEventId;

    function generateDynamicFormFields(formSchema) {
        dynamicRsvpFormFieldsDiv.innerHTML = ''; 
        if (!formSchema || formSchema.length === 0) {
            return; 
        }

        formSchema.forEach(field => {
            // field.name は自動生成されたユニークなID
            // field.label は表示用
            const formGroup = document.createElement('div');
            formGroup.classList.add('form-group');

            const labelEl = document.createElement('label');
            labelEl.htmlFor = `custom_field_${field.name}`; // idと紐付け
            labelEl.textContent = `${field.label}${field.required ? ' (必須)' : ''}:`;
            

            let inputElement;
            if (field.type === 'textarea') {
                inputElement = document.createElement('textarea');
                formGroup.appendChild(labelEl); // textareaのラベルは先
                formGroup.appendChild(inputElement);
            } else if (field.type === 'checkbox') {
                inputElement = document.createElement('input');
                inputElement.type = 'checkbox';
                // チェックボックスの場合、inputを先に、ラベルテキストを後に追加
                formGroup.appendChild(inputElement);
                labelEl.style.fontWeight = 'normal';
                labelEl.style.marginLeft = '5px';
                labelEl.style.display = 'inline';
                formGroup.appendChild(labelEl); // inputの後にラベルを追加
            } else {
                inputElement = document.createElement('input');
                inputElement.type = field.type; 
                formGroup.appendChild(labelEl); // 他のinputタイプのラベルは先
                formGroup.appendChild(inputElement);
            }
            
            inputElement.id = `custom_field_${field.name}`; // id属性を設定
            inputElement.dataset.fieldName = field.name; // name属性の代わりにdata属性で内部名を保持

            if (field.required) {
                inputElement.required = true;
            }
            
            // dynamicRsvpFormFieldsDiv.appendChild(formGroup); // 各ループで追加するのではなく、最後にまとめて追加
            dynamicRsvpFormFieldsDiv.appendChild(formGroup);
        });
    }

    async function fetchEventDetails() {
        try {
            loadingMessage.style.display = 'block';
            const { data: event, error } = await supabase
                .from('events')
                .select('*, form_schema') 
                .eq('id', currentEventId)
                .single();

            if (error) throw error;

            if (event) {
                const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                eventDetailDiv.innerHTML = `
                    <h2>${event.name}</h2>
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

    rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '';

        const participantName = document.getElementById('participantName').value;
        const termsAgreementCheckbox = document.getElementById('termsAgreement');

        if (!participantName.trim()) {
            messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>';
            return;
        }
        if (!termsAgreementCheckbox.checked) {
            messageArea.innerHTML = '<p class="error-message">利用規約に同意してください。</p>';
            return;
        }
        
        const customFormData = {}; // カスタム項目のみを格納
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('form_schema')
            .eq('id', currentEventId)
            .single();

        if (eventError || !eventData) {
            messageArea.innerHTML = '<p class="error-message">イベント情報の取得に失敗しました。</p>';
            return;
        }
        const formSchema = eventData.form_schema;

        if (formSchema) {
            for (const field of formSchema) {
                const inputElement = document.getElementById(`custom_field_${field.name}`); // IDで取得
                if (inputElement) {
                    if (field.type === 'checkbox') {
                        customFormData[field.name] = inputElement.checked;
                    } else {
                        customFormData[field.name] = inputElement.value.trim();
                    }

                    if (field.required && !customFormData[field.name] && field.type !== 'checkbox') {
                        messageArea.innerHTML = `<p class="error-message">${field.label} を入力してください。</p>`;
                        return;
                    }
                     if (field.required && field.type === 'checkbox' && !inputElement.checked) {
                        messageArea.innerHTML = `<p class="error-message">${field.label} にチェックを入れてください。</p>`;
                        return;
                    }
                }
            }
        }
        
        // `form_data` にはカスタム項目と、利用規約同意の情報を入れる
        const submissionData = {
            ...customFormData, // カスタムフォームのデータ
            terms_agreed: termsAgreementCheckbox.checked // 利用規約同意の情報
        };


        try {
            const { data, error } = await supabase
                .from('participants')
                .insert([{
                    event_id: currentEventId,
                    name: participantName, 
                    form_data: Object.keys(submissionData).length > 0 ? submissionData : null
                }])
                .select();

            if (error) throw error;

            messageArea.innerHTML = '<p class="success-message">出欠を登録しました。ありがとうございます！</p>';
            rsvpForm.reset(); 
            if (formSchema) generateDynamicFormFields(formSchema); // 動的フィールドも初期化

        } catch (error) {
            console.error('Error submitting RSVP:', error.message);
            messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`;
        }
    });

    fetchEventDetails();
});