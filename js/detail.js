// js/detail.js
document.addEventListener('DOMContentLoaded', async () => {
    // --- HTML要素の取得 ---
    const eventDetailDiv = document.getElementById('eventDetail');
    const eventDetailLoading = document.getElementById('eventDetailLoading');
    const rsvpForm = document.getElementById('rsvpForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const dynamicRsvpFormFieldsDiv = document.getElementById('dynamicRsvpFormFields');
    const termsLink = document.getElementById('termsLink');

    // 参加者リスト（通常表示）
    const participantListUl = document.getElementById('eventParticipantList');
    const participantListLoading = document.getElementById('participantListLoading');
    const noEventParticipantsMessage = document.getElementById('noEventParticipantsMessage');
    
    // パスワードと詳細表示に関連する要素
    const passwordSection = document.getElementById('passwordSection');
    const viewPasswordInput = document.getElementById('viewPasswordInput');
    const viewDetailsButton = document.getElementById('viewDetailsButton');
    const passwordErrorMessage = document.getElementById('passwordErrorMessage');
    const fullParticipantListContainer = document.getElementById('fullParticipantListContainer');
    const fullEventParticipantList = document.getElementById('fullEventParticipantList');
    const exportCsvButton = document.getElementById('exportCsvButton');

    // --- グローバル変数 ---
    let currentEventFormSchema = null;
    let currentEventName = 'event_participants';
    let currentParticipantsData = [];
    let eventPassword = null; // イベントのパスワードを保持
    let currentProfilesMap = new Map(); // ★追加: プロフィール情報を保持するMap

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

    // --- 動的フォーム生成 ---
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
                formGroup.appendChild(inputElement);
                labelEl.style.fontWeight = 'normal';
                labelEl.style.marginLeft = '5px';
                labelEl.style.display = 'inline';
                formGroup.appendChild(labelEl);
            } else {
                inputElement = document.createElement('input');
                inputElement.type = field.type; 
                formGroup.appendChild(labelEl); 
                formGroup.appendChild(inputElement);
            }
            
            inputElement.id = `custom_field_${field.name}`;
            inputElement.dataset.fieldName = field.name;
            if (field.required) {
                inputElement.required = true;
            }
            dynamicRsvpFormFieldsDiv.appendChild(formGroup);
        });
    }

    // --- 2種類の参加者リストを描画する関数 ---
    function renderParticipantLists(participants, profiles) {
        participantListUl.innerHTML = '';
        fullEventParticipantList.innerHTML = '';
        currentParticipantsData = participants || [];

        if (currentParticipantsData.length === 0) {
            noEventParticipantsMessage.style.display = 'block';
            if (passwordSection) passwordSection.style.display = 'none';
            return;
        }
        
        noEventParticipantsMessage.style.display = 'none';
        if (passwordSection) passwordSection.style.display = 'block';

        const profileMap = new Map(profiles.map(p => [p.id, p]));
        const businessDescField = (currentEventFormSchema || []).find(f => f.label.includes('事業内容'))?.name;
        const companyNameField = (currentEventFormSchema || []).find(f => f.label.includes('会社名'))?.name;

        participants.forEach(p => {
            const profile = p.user_id ? profileMap.get(p.user_id) : null;
            const isPremium = profile?.membership_type === 'premium';
            
            // ★修正: 表示するバッジを決定するロジック
            let statusBadgeHtml = '';
            // 特典を利用していたら「会員特典」バッジを追加
            if (p.participation_type === '会員特典') {
                statusBadgeHtml += `<span class="btn-benefit" style="margin-left: 5px;">会員特典</span>`;
            }
            // 有料会員またはオーナーなら「有料会員」バッジを追加
            if (isPremium) {
                statusBadgeHtml += `<a href="user_profile.html?id=${p.user_id}" target="_blank" class="btn-premium" style="padding: 2px 8px; font-size: 0.75rem; margin-left: 5px;">有料会員</a>`;
            }

            // 1. 通常リストの生成
            const businessDesc = (p.form_data && businessDescField && p.form_data[businessDescField]) ? p.form_data[businessDescField] : '未入力';
            const listItem = document.createElement('li');
            listItem.style.display = 'flex';
            listItem.style.justifyContent = 'space-between';
            listItem.style.alignItems = 'center';
            listItem.innerHTML = `
                <div><strong>事業内容:</strong> ${businessDesc}</div>
                <div>${statusBadgeHtml}</div>
            `;
            participantListUl.appendChild(listItem);

            // 2. 詳細リストの生成
            const companyName = (p.form_data && companyNameField && p.form_data[companyNameField]) ? p.form_data[companyNameField] : '未入力';
            const fullListItem = document.createElement('li');
            fullListItem.style.display = 'flex';
            fullListItem.style.justifyContent = 'space-between';
            fullListItem.style.alignItems = 'center';
            fullListItem.innerHTML = `
                <div>
                    <p style="margin: 0 0 4px 0;"><strong>会社名:</strong> ${companyName}</p>
                    <p style="margin: 0 0 4px 0;"><strong>名前:</strong> ${p.name || '-'}</p>
                    <p style="margin: 0;"><strong>事業内容:</strong> ${businessDesc}</p>
                </div>
                <div>${statusBadgeHtml}</div>
            `;
            fullEventParticipantList.appendChild(fullListItem);
        });
    }

    // --- データ取得のメイン関数 ---
    async function fetchEventDetailsAndParticipants() {
        if (eventDetailLoading) eventDetailLoading.style.display = 'block';
        if (participantListLoading) participantListLoading.style.display = 'block';
        if (exportCsvButton) exportCsvButton.style.display = 'none';

        try {
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('*, form_schema, image_urls, video_urls, participation_fee, event_end_date, max_participants, view_password')
                .eq('id', currentEventId)
                .single();

            if (eventError) throw eventError;

            if (event) {
                currentEventName = event.name || 'event_participants';
                currentEventFormSchema = event.form_schema;
                eventPassword = event.view_password;

                const { count: participantCount, error: countError } = await supabase
                    .from('participants').select('*', { count: 'exact', head: true }).eq('event_id', currentEventId);
                const currentParticipantNum = countError ? 0 : (participantCount || 0);

                // イベント詳細の表示（元のコードを流用・整理）
                let dateTimeStr = '日時未定';
                if (event.event_date) {
                    const startDateStr = event.event_date.replace('T', ' ').substring(0, 16);
                    dateTimeStr = startDateStr;
                    if (event.event_end_date) {
                        const endDateStr = event.event_end_date.replace('T', ' ').substring(0, 16);
                        if (startDateStr.substring(0, 10) === endDateStr.substring(0, 10)) {
                            dateTimeStr += ` 〜 ${endDateStr.substring(11, 16)}`;
                        } else {
                            dateTimeStr += ` 〜 ${endDateStr}`;
                        }
                    }
                }
                let mediaHtml = '<div class="event-media-gallery">';
                if (event.image_urls && event.image_urls.length > 0) event.image_urls.forEach(url => { if (url) mediaHtml += `<img src="${url}" alt="${event.name} の画像">`; });
                if (event.video_urls && event.video_urls.length > 0) event.video_urls.forEach(url => { if (url) mediaHtml += `<video src="${url}" controls preload="metadata"></video>`; });
                mediaHtml += '</div>';
                const feeDisplay = event.participation_fee ? `<p><strong>参加費用:</strong> ${event.participation_fee}</p>` : '';
                let capacityStatusDetail = '';
                let registrationClosed = false;
                if (event.max_participants != null) {
                    if (currentParticipantNum >= event.max_participants) {
                        capacityStatusDetail = `<p style="color: red; font-weight: bold;">満員御礼 (現在 ${currentParticipantNum} / ${event.max_participants} 人)</p>`;
                        registrationClosed = true;
                    } else {
                        capacityStatusDetail = `<p><strong>参加状況:</strong> ${currentParticipantNum} / ${event.max_participants} 人</p>`;
                    }
                } else {
                    capacityStatusDetail = `<p><strong>現在の参加者:</strong> ${currentParticipantNum} 人</p>`;
                }
                eventDetailDiv.innerHTML = `<h2>${event.name}</h2>` +
                    `${(event.image_urls?.length || event.video_urls?.length) ? mediaHtml : ''}` +
                    `<p><strong>日時:</strong> ${dateTimeStr}</p>` +
                    `<p><strong>場所:</strong> ${event.location || '未定'}</p>` +
                    `${feeDisplay}${capacityStatusDetail}` +
                    `<p><strong>詳細:</strong></p><div class="event-description"><p>${event.description || '詳細情報はありません。'}</p></div>`;

                generateDynamicFormFields(event.form_schema);

                if (registrationClosed) {
                    rsvpForm.style.display = 'none';
                    let closedMessageDiv = document.querySelector('.registration-closed-message');
                    if (!closedMessageDiv) {
                        closedMessageDiv = document.createElement('div');
                        closedMessageDiv.classList.add('registration-closed-message');
                        closedMessageDiv.innerHTML = '<p class="error-message" style="text-align:center; font-size:1.2em;">このイベントは満員のため、受付を終了しました。</p>';
                        if (rsvpForm.parentElement) {
                            rsvpForm.parentElement.insertBefore(closedMessageDiv, rsvpForm.nextSibling);
                        }
                    }
                    closedMessageDiv.style.display = 'block';
                } else {
                    rsvpForm.style.display = 'block';
                    const existingClosedMessage = document.querySelector('.registration-closed-message');
                    if (existingClosedMessage) existingClosedMessage.style.display = 'none';
                }

                // 参加者とそのプロフィール情報を取得
                const { data: participants, error: pError } = await supabase.from('participants')
                .select('name, created_at, form_data, user_id, participation_type') // ★修正
                .eq('event_id', currentEventId).order('created_at', { ascending: true });
                if (pError) throw pError;

                const userIds = participants.map(p => p.user_id).filter(id => id);
                let profiles = [];
                if (userIds.length > 0) {
                    const { data: profileData, error: profileError } = await supabase.from('profiles')
                        .select('id, membership_type').in('id', userIds);
                    if (profileError) throw profileError;
                    profiles = profileData || [];
                }
                // ★追加: 取得したプロフィール情報をグローバルなMapに保存
                currentProfilesMap.clear();
                profiles.forEach(p => currentProfilesMap.set(p.id, p));

                renderParticipantLists(participants, profiles);

            } else {
                eventDetailDiv.innerHTML = '<p class="error-message">イベントが見つかりませんでした。</p>';
            }
        } catch (error) {
            console.error('Error fetching data:', error.message);
            if (eventDetailDiv) eventDetailDiv.innerHTML = `<p class="error-message">情報読み込みに失敗: ${error.message}</p>`;
        } finally {
            if (eventDetailLoading) eventDetailLoading.style.display = 'none';
            if (participantListLoading) participantListLoading.style.display = 'none';
        }
    }

    // --- CSVエクスポート ---
    function generateAndDownloadCsv() {
        if (!currentParticipantsData || currentParticipantsData.length === 0) {
            alert('エクスポートする参加者がいません。');
            return;
        }

        // 1. ヘッダーを定義
        const baseHeaders = ['氏名', '登録日時'];
        // ★追加: 新しいヘッダー
        const newHeaders = ['会員種別', '特典利用'];
        
        let customFieldHeaders = [];
        let customFieldNames = [];
        if (currentEventFormSchema && currentEventFormSchema.length > 0) {
            currentEventFormSchema.forEach(field => {
                customFieldHeaders.push(field.label); 
                customFieldNames.push(field.name);    
            });
        }
        // 全てのヘッダーを結合
        const allHeaders = [...baseHeaders, ...newHeaders, ...customFieldHeaders];

        // 2. CSVコンテンツを生成
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
        csvContent += allHeaders.map(v => v ? `"${v.replace(/"/g, '""')}"` : '').join(',') + '\r\n'; 
        
        currentParticipantsData.forEach(participant => {
            const row = [];
            
            // 基本項目
            row.push(`"${participant.name.replace(/"/g, '""')}"`);
            row.push(`"${participant.created_at.replace('T', ' ').substring(0, 19)}"`);
            
            // ★追加: 新しい項目の値を取得
            let membershipStatus = '非会員';
            const profile = participant.user_id ? currentProfilesMap.get(participant.user_id) : null;
            if (profile) {
                if (profile.membership_type === 'premium') {
                    membershipStatus = '有料会員';
                } else if (profile.membership_type === 'owner') {
                    membershipStatus = 'コミュニティオーナー';
                }
            }
            const benefitUsed = (participant.participation_type === '会員特典') ? 'はい' : 'いいえ';

            row.push(`"${membershipStatus}"`);
            row.push(`"${benefitUsed}"`);

            // カスタムフォーム項目
            customFieldNames.forEach(fieldName => {
                let value = '';
                if (participant.form_data && participant.form_data[fieldName] !== undefined) {
                    const schemaField = currentEventFormSchema.find(f => f.name === fieldName);
                    if (schemaField && schemaField.type === 'checkbox') value = participant.form_data[fieldName] ? 'はい' : 'いいえ';
                    else value = participant.form_data[fieldName];
                }
                row.push(value ? `"${String(value).replace(/"/g, '""')}"` : '');
            });

            csvContent += row.join(',') + '\r\n';
        });

        // 3. ダウンロード処理
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeEventName = currentEventName.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]/g, '_');
        link.setAttribute("download", `${safeEventName}_参加者リスト.csv`);
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
    }

    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', generateAndDownloadCsv);
    }
    
    // --- 参加登録フォームの送信処理 ---
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!messageArea) return;
            messageArea.innerHTML = '<p class="loading-message">登録処理中...</p>';

            const participantNameInput = document.getElementById('participantName');
            const termsAgreementCheckbox = document.getElementById('termsAgreement');

            // --- 基本的なバリデーション ---
            if (!participantNameInput?.value.trim()) { messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>'; return; }
            if (!termsAgreementCheckbox?.checked) { messageArea.innerHTML = '<p class="error-message">利用規約に同意してください。</p>'; return; }

            // --- 動的フォームのデータ収集 ---
            const customFormData = {};
            if (currentEventFormSchema) {
                for (const field of currentEventFormSchema) {
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
            const participantName = participantNameInput.value.trim();
            const user = await getCurrentUser();

            try {
                // --- ★ここから会員特典のロジック ---
                const { data: eventData, error: eventError } = await supabase.from('events').select('event_type').eq('id', currentEventId).single();
                if(eventError) throw new Error("イベント情報の取得に失敗しました。");
                
                const eventType = eventData?.event_type;
                let useBenefit = false;
                let creditColumnName = null;
                
                // ログインユーザーかつ、特典対象イベントの場合のみチェック
                if (user && eventType) {
                    if (eventType === 'Lunchtime meeting') creditColumnName = 'lunch_meeting_credit';
                    else if (eventType === 'Evening meeting') creditColumnName = 'evening_meeting_credit';

                    if (creditColumnName) {
                        const { data: profile } = await supabase.from('profiles').select(`membership_type, ${creditColumnName}`).eq('id', user.id).single();
                        if ((profile?.membership_type === 'premium' || profile?.membership_type === 'owner') && profile[creditColumnName] > 0) {
                            useBenefit = true;
                        }
                    }
                }

                let participationTypeValue = null;

                // --- ★会員特典を利用する場合の処理 ---
                if (useBenefit && creditColumnName) {
                    // 1. 先にクレジットを減らす
                    const { error: creditError } = await supabase
                        .rpc('decrement_credit', { // 先ほど作成したSQL関数を呼び出す
                            user_id_param: user.id,
                            column_name_param: creditColumnName
                        });
                    if (creditError) throw new Error(`特典利用処理に失敗しました: ${creditError.message}`);
                    
                    participationTypeValue = '会員特典';
                }

                // --- ★参加者情報を登録（通常参加・特典利用共通） ---
                const { error: insertError } = await supabase.from('participants').insert([{
                    event_id: currentEventId,
                    name: participantName,
                    created_at: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)),
                    form_data: Object.keys(submissionData).length > 0 ? submissionData : null,
                    user_id: user ? user.id : null,
                    participation_type: participationTypeValue // 特典利用なら'会員特典', 通常ならnull
                }]);
                
                if (insertError) {
                    // 万が一、参加者登録に失敗した場合はクレジットを戻す処理も検討できますが、
                    // 今回はエラーメッセージ表示のみとします。
                    throw insertError;
                }

                // --- 成功時の共通処理 ---
                window.scrollTo({ top: 700, behavior: 'smooth' });
                messageArea.innerHTML = `<p class="success-message">イベントへの参加登録が完了しました！${useBenefit ? ' (会員特典を利用)' : ''}</p>`;
                rsvpForm.reset();
                if (currentEventFormSchema) generateDynamicFormFields(currentEventFormSchema);
                fetchEventDetailsAndParticipants(); // 参加者リストを更新

            } catch (error) {
                console.error('Error submitting RSVP:', error.message);
                messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`;
            }
        });
    }

    // --- パスワード確認ボタンのリスナー ---
    if(viewDetailsButton) {
        viewDetailsButton.addEventListener('click', () => {
            if (passwordErrorMessage) passwordErrorMessage.style.display = 'none';
            const inputPassword = viewPasswordInput.value;
    
            if (!inputPassword) {
                if (passwordErrorMessage) {
                    passwordErrorMessage.textContent = 'パスワードを入力してください。';
                    passwordErrorMessage.style.display = 'block';
                }
                return;
            }
    
            if (inputPassword === eventPassword) {
                if (passwordSection) passwordSection.style.display = 'none';
                if (fullParticipantListContainer) fullParticipantListContainer.style.display = 'block';
                if (exportCsvButton) exportCsvButton.style.display = 'inline-block';
            } else {
                if (passwordErrorMessage) {
                    passwordErrorMessage.textContent = 'パスワードが正しくありません。';
                    passwordErrorMessage.style.display = 'block';
                    viewPasswordInput.value = ""; // 入力内容をクリア
                }
            }
        });
    }

    // --- 初期実行 ---
    fetchEventDetailsAndParticipants();
});