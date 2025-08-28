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
    const participantListUl = document.getElementById('eventParticipantList');
    const participantListLoading = document.getElementById('participantListLoading');
    const noEventParticipantsMessage = document.getElementById('noEventParticipantsMessage');
    const passwordSection = document.getElementById('passwordSection');
    const viewPasswordInput = document.getElementById('viewPasswordInput');
    const viewDetailsButton = document.getElementById('viewDetailsButton');
    const passwordErrorMessage = document.getElementById('passwordErrorMessage');
    const fullParticipantListContainer = document.getElementById('fullParticipantListContainer');
    const fullEventParticipantList = document.getElementById('fullEventParticipantList');
    const exportCsvButton = document.getElementById('exportCsvButton');
    const signupPrompt = document.getElementById('signup-prompt');

    // --- グローバル変数 ---
    let currentEventFormSchema = null;
    let currentEventName = 'event_participants';
    let currentParticipantsData = [];
    let eventPassword = null;
    let currentProfilesMap = new Map();

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    // --- 最初にログイン状態を確認 ---
    const user = await getCurrentUser();

    // ▼▼▼ innerHTMLを新しいデザインに変更 ▼▼▼
    if (!user && signupPrompt) {
        signupPrompt.style.display = 'block';
        signupPrompt.innerHTML = `
            <div class="signup-prompt-box">
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-color);">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="17" y1="11" x2="23" y2="11"></line>
                    </svg>
                </div>
                <div class="content">
                    <h3>新規登録(無料)のご案内</h3>
                    <p>新規登録（無料）後にログインした状態でイベント申し込みいただくと、２回目以降の参加の際に情報が自動入力されます。</p>
                </div>
                <div class="actions">
                     <a href="signup.html" class="btn">新規登録(無料)</a>
                </div>
            </div>
        `;
    }

    if (!currentEventId) {
        if (eventDetailDiv) eventDetailDiv.innerHTML = '<p class="error-message">イベントIDが指定されていません。</p>';
        if (rsvpForm) rsvpForm.style.display = 'none';
        if (eventDetailLoading) eventDetailLoading.style.display = 'none';
        const participantsSection = document.querySelector('.participants-section');
        if (participantsSection) participantsSection.style.display = 'none';
        return;
    }
    if (eventIdInput) eventIdInput.value = currentEventId;

    async function autofillFormWithUserData(user, formSchema) {
        if (!user) return;
        try {
            const { data: profile, error } = await supabase.from('profiles').select('username, business_description, bio').eq('id', user.id).single();
            if (error && error.code !== 'PGRST116') throw error;
            if (profile) {
                const participantNameInput = document.getElementById('participantName');
                if (participantNameInput && profile.username) {
                    participantNameInput.value = profile.username;
                }
                if (formSchema && formSchema.length > 0) {
                    formSchema.forEach(field => {
                        const inputElement = document.getElementById(`custom_field_${field.name}`);
                        if (!inputElement || inputElement.value) return;
                        const label = field.label.toLowerCase();
                        if (label.includes('メールアドレス') && user.email) {
                            inputElement.value = user.email;
                        } else if (label.includes('事業内容') && profile.business_description) {
                            inputElement.value = profile.business_description;
                        } else if (label.includes('自己紹介') && profile.bio) {
                            inputElement.value = profile.bio;
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('ユーザー情報の自動入力に失敗しました:', error.message);
        }
    }

    async function autofillFromPastParticipation(user, organizerId, currentFormSchema) {
        if (!user || !organizerId) return;
        try {
            const { data: organizerEvents, error: eventsError } = await supabase.from('events').select('id').eq('user_id', organizerId);
            if (eventsError) throw eventsError;
            if (!organizerEvents || organizerEvents.length === 0) return;
            const organizerEventIds = organizerEvents.map(e => e.id);
            const { data: lastParticipation, error: participationError } = await supabase.from('participants').select('form_data, event_id').in('event_id', organizerEventIds).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
            if (participationError) {
                if (participationError.code !== 'PGRST116') {
                    console.warn('過去の参加履歴の検索中にエラー:', participationError);
                }
                return;
            }
            if (lastParticipation && lastParticipation.form_data) {
                const { data: pastEvent, error: pastEventError } = await supabase.from('events').select('form_schema').eq('id', lastParticipation.event_id).single();
                if (pastEventError) throw pastEventError;
                const pastSchema = pastEvent.form_schema || [];
                const pastData = lastParticipation.form_data;
                const labelToValueMap = new Map();
                pastSchema.forEach(field => {
                    if (pastData[field.name] !== undefined) {
                        labelToValueMap.set(field.label, pastData[field.name]);
                    }
                });
                if (currentFormSchema) {
                    currentFormSchema.forEach(field => {
                        const inputElement = document.getElementById(`custom_field_${field.name}`);
                        if (inputElement && labelToValueMap.has(field.label)) {
                            const valueToSet = labelToValueMap.get(field.label);
                            if (field.type === 'checkbox') {
                                inputElement.checked = valueToSet;
                            } else {
                                inputElement.value = valueToSet;
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('過去の参加履歴からの自動入力に失敗しました:', error.message);
        }
    }

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
        participants.forEach((p, index) => {
            const profile = p.user_id ? profileMap.get(p.user_id) : null;
            let statusBadgeHtml = '';
            if (profile) {
                switch (profile.membership_type) {
                    case 'admin': case 'owner': case 'premium':
                        statusBadgeHtml += `<a href="user_profile.html?id=${p.user_id}" target="_blank" class="btn-premium">会員</a>`;
                        break;
                    default:
                        statusBadgeHtml += `<a href="user_profile.html?id=${p.user_id}" target="_blank" class="btn-user">非会員</a>`;
                        break;
                }
            } else {
                statusBadgeHtml += `<span class="btn-guest">非会員</span>`;
            }
            if (p.participation_type === '会員特典') {
                statusBadgeHtml += `<span class="btn-benefit" style="margin-left: 5px;">会員特典</span>`;
            }
            let anonymizedName = (index < 26) ? String.fromCharCode(65 + index) + 'さん' : String.fromCharCode(65 + Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26)) + 'さん';
            const businessDesc = (p.form_data && businessDescField && p.form_data[businessDescField]) ? p.form_data[businessDescField] : '未入力';
            const listItem = document.createElement('li');
            listItem.classList.add('participant-list-item');
            listItem.innerHTML = `<div class="participant-info-anonymous"><img src="assets/person_icon.webp" alt="参加者アイコン" class="participant-icon"><div class="participant-details"><span>${anonymizedName}</span><p class="business-desc"><strong>事業内容:</strong> ${businessDesc}</p></div></div><div class="participant-status">${statusBadgeHtml}</div>`;
            participantListUl.appendChild(listItem);
            const companyName = (p.form_data && companyNameField && p.form_data[companyNameField]) ? p.form_data[companyNameField] : '未入力';
            const referrerNameField = (currentEventFormSchema || []).find(f => f.label.includes('紹介者名'))?.name;
            const referrerName = (p.form_data && referrerNameField && p.form_data[referrerNameField]) ? p.form_data[referrerNameField] : '未入力';
            const fullListItem = document.createElement('li');
            fullListItem.classList.add('participant-list-item', 'full-details');
            fullListItem.innerHTML = `<div class="participant-details-full"><p><strong>会社名:</strong> ${companyName}</p><p><strong>名前:</strong> ${p.name || '-'}</p><p><strong>事業内容:</strong> ${businessDesc}</p><p><strong>紹介者名:</strong> ${referrerName}</p></div><div class="participant-status">${statusBadgeHtml}</div>`;
            fullEventParticipantList.appendChild(fullListItem);
        });
    }

    async function fetchEventDetailsAndParticipants() {
        if (eventDetailLoading) eventDetailLoading.style.display = 'block';
        if (participantListLoading) participantListLoading.style.display = 'block';
        if (exportCsvButton) exportCsvButton.style.display = 'none';
        try {
            const { data: event, error: eventError } = await supabase.from('events').select('*, user_id, form_schema, image_urls, video_urls, participation_fee, event_end_date, max_participants, view_password').eq('id', currentEventId).single();
            if (eventError) throw eventError;
            if (event) {
                currentEventName = event.name || 'event_participants';
                currentEventFormSchema = event.form_schema;
                eventPassword = event.view_password;
                const organizerId = event.user_id;
                const { count: participantCount, error: countError } = await supabase.from('participants').select('*', { count: 'exact', head: true }).eq('event_id', currentEventId);
                const currentParticipantNum = countError ? 0 : (participantCount || 0);
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
                eventDetailDiv.innerHTML = `<h2>${event.name}</h2>` + `${(event.image_urls?.length || event.video_urls?.length) ? mediaHtml : ''}` + `<p><strong>日時:</strong> ${dateTimeStr}</p>` + `<p><strong>場所:</strong> ${event.location || '未定'}</p>` + `${feeDisplay}${capacityStatusDetail}` + `<hr>` + `<div class="event-description"><h3>イベント概要</h3><p>${event.description || '詳細情報はありません。'}</p></div>`;
                generateDynamicFormFields(event.form_schema);
                if (user) {
                    await autofillFromPastParticipation(user, organizerId, event.form_schema);
                    await autofillFormWithUserData(user, event.form_schema);
                }
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
                const { data: participants, error: pError } = await supabase.from('participants').select('name, created_at, form_data, user_id, participation_type').eq('event_id', currentEventId).order('created_at', { ascending: true });
                if (pError) throw pError;
                const userIds = participants.map(p => p.user_id).filter(id => id);
                let profiles = [];
                if (userIds.length > 0) {
                    const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, membership_type').in('id', userIds);
                    if (profileError) throw profileError;
                    profiles = profileData || [];
                }
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

    function generateAndDownloadCsv() {
        if (!currentParticipantsData || currentParticipantsData.length === 0) { alert('エクスポートする参加者がいません。'); return; }
        const baseHeaders = ['氏名', '登録日時'];
        const newHeaders = ['会員種別', '特典利用'];
        let customFieldHeaders = [], customFieldNames = [];
        if (currentEventFormSchema && currentEventFormSchema.length > 0) {
            currentEventFormSchema.forEach(field => { customFieldHeaders.push(field.label); customFieldNames.push(field.name); });
        }
        const allHeaders = [...baseHeaders, ...newHeaders, ...customFieldHeaders];
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += allHeaders.map(v => v ? `"${v.replace(/"/g, '""')}"` : '').join(',') + '\r\n';
        currentParticipantsData.forEach(participant => {
            const row = [];
            row.push(`"${participant.name.replace(/"/g, '""')}"`);
            row.push(`"${participant.created_at.replace('T', ' ').substring(0, 19)}"`);
            let membershipStatus = 'ゲスト';
            const profile = participant.user_id ? currentProfilesMap.get(participant.user_id) : null;
            if (profile) {
                switch (profile.membership_type) {
                    case 'admin': case 'owner': membershipStatus = 'コミュニティオーナー'; break;
                    case 'premium': membershipStatus = '会員'; break;
                    default: membershipStatus = 'ユーザー'; break;
                }
            }
            const benefitUsed = (participant.participation_type === '会員特典') ? 'はい' : 'いいえ';
            row.push(`"${membershipStatus}"`);
            row.push(`"${benefitUsed}"`);
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
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeEventName = currentEventName.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]/g, '_');
        link.setAttribute("download", `${safeEventName}_参加者リスト.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    if (exportCsvButton) { exportCsvButton.addEventListener('click', generateAndDownloadCsv); }

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!messageArea) return;
            messageArea.innerHTML = '<p class="loading-message">登録処理中...</p>';
            const participantNameInput = document.getElementById('participantName');
            const termsAgreementCheckbox = document.getElementById('termsAgreement');
            if (!participantNameInput?.value.trim()) { messageArea.innerHTML = '<p class="error-message">氏名を入力してください。</p>'; return; }
            if (!termsAgreementCheckbox?.checked) { messageArea.innerHTML = '<p class="error-message">利用規約に同意してください。</p>'; return; }
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
            try {
                const { data: eventData, error: eventError } = await supabase.from('events').select('event_type').eq('id', currentEventId).single();
                if (eventError) throw new Error("イベント情報の取得に失敗しました。");
                const eventType = eventData?.event_type;
                let useBenefit = false, creditColumnName = null;
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
                if (useBenefit && creditColumnName) {
                    const { error: creditError } = await supabase.rpc('decrement_credit', { user_id_param: user.id, column_name_param: creditColumnName });
                    if (creditError) throw new Error(`特典利用処理に失敗しました: ${creditError.message}`);
                    participationTypeValue = '会員特典';
                }
                const participantData = { id: crypto.randomUUID(), event_id: currentEventId, name: participantName, created_at: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)), form_data: Object.keys(submissionData).length > 0 ? submissionData : null, user_id: user ? user.id : null, participation_type: participationTypeValue };
                const { error: insertError } = await supabase.from('participants').insert([participantData]);
                if (insertError) { throw insertError; }
                window.location.href = `registration_complete.html?event_id=${currentEventId}`;
            } catch (error) {
                console.error('Error submitting RSVP:', error.message);
                messageArea.innerHTML = `<p class="error-message">出欠登録に失敗しました: ${error.message}</p>`;
            }
        });
    }

    if (viewDetailsButton) {
        viewDetailsButton.addEventListener('click', () => {
            if (passwordErrorMessage) passwordErrorMessage.style.display = 'none';
            const inputPassword = viewPasswordInput.value;
            if (!inputPassword) {
                if (passwordErrorMessage) { passwordErrorMessage.textContent = 'パスワードを入力してください。'; passwordErrorMessage.style.display = 'block'; }
                return;
            }
            if (inputPassword === eventPassword) {
                if (passwordSection) passwordSection.style.display = 'none';
                if (fullParticipantListContainer) fullParticipantListContainer.style.display = 'block';
                if (exportCsvButton) exportCsvButton.style.display = 'inline-block';
            } else {
                if (passwordErrorMessage) { passwordErrorMessage.textContent = 'パスワードが正しくありません。'; passwordErrorMessage.style.display = 'block'; viewPasswordInput.value = ""; }
            }
        });
    }

    fetchEventDetailsAndParticipants();
});