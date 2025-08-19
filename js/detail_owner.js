// js/detail_owner.js
document.addEventListener('DOMContentLoaded', async () => {
    // --- 権限チェック ---
    const loggedInUser = await redirectToLoginIfNotAuthenticated();
    if (!loggedInUser) return;

    // --- HTML要素の取得 ---
    const loadingMessage = document.getElementById('loadingMessage');
    const authErrorMessage = document.getElementById('authErrorMessage');
    const ownerContent = document.getElementById('ownerContent');
    const eventDetailDiv = document.getElementById('eventDetail');
    const passwordDisplay = document.getElementById('passwordDisplay');
    const participantListUl = document.getElementById('participantList');
    const noParticipantsMessage = document.getElementById('noParticipantsMessage');
    const exportCsvButton = document.getElementById('exportCsvButton');
    const messageArea = document.createElement('div');
    messageArea.classList.add('message-area');
    if (ownerContent) {
      ownerContent.insertBefore(messageArea, ownerContent.firstChild);
    }


    // --- グローバル変数 ---
    let eventData = null;
    let participantsData = [];
    let eventFormSchema = [];
    const profilesMap = new Map();

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        if(loadingMessage) loadingMessage.style.display = 'none';
        if(authErrorMessage) authErrorMessage.innerHTML = '<p class="error-message">イベントIDが指定されていません。</p>';
        return;
    }

    // --- メイン処理 ---
    try {
        const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (error) throw error;
        
        if (!data || data.user_id !== loggedInUser.id) {
            if(loadingMessage) loadingMessage.style.display = 'none';
            if(authErrorMessage) authErrorMessage.innerHTML = '<p class="error-message">権限がありません。このページを表示できません。</p>';
            return;
        }

        eventData = data;
        eventFormSchema = data.form_schema || [];
        if(loadingMessage) loadingMessage.style.display = 'none';
        if(ownerContent) ownerContent.style.display = 'block';
        
        displayEventDetails();
        await fetchAndDisplayParticipants();

    } catch (error) {
        if(loadingMessage) loadingMessage.style.display = 'none';
        if(authErrorMessage) authErrorMessage.innerHTML = `<p class="error-message">エラーが発生しました: ${error.message}</p>`;
    }

    // --- 関数定義 ---

    function displayEventDetails() {
        if(eventDetailDiv) eventDetailDiv.innerHTML = `<h2>${eventData.name}</h2>`;
        if(eventData.view_password && passwordDisplay) {
            passwordDisplay.innerHTML = `<strong>参加者情報 閲覧用パスワード: ${eventData.view_password}</strong>`;
            passwordDisplay.style.display = 'block';
        }
    }

    async function fetchAndDisplayParticipants() {
        try {
            const { data, error } = await supabase.from('participants').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
            if (error) throw error;

            participantsData = data;
            
            if (participantsData.length === 0) {
                if(participantListUl) participantListUl.innerHTML = '';
                if(noParticipantsMessage) noParticipantsMessage.style.display = 'block';
                if(exportCsvButton) exportCsvButton.style.display = 'none';
                return;
            } else {
                 if(noParticipantsMessage) noParticipantsMessage.style.display = 'none';
                 if(exportCsvButton) exportCsvButton.style.display = 'inline-block';
            }
            
            const userIds = participantsData.map(p => p.user_id).filter(id => id);
            if (userIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, membership_type').in('id', userIds);
                if(profileError) throw profileError;
                profiles.forEach(p => profilesMap.set(p.id, p));
            }
            
            if(participantListUl) participantListUl.innerHTML = '';
            participantsData.forEach(p => {
                const li = document.createElement('li');
                
                let membershipStatus = 'ゲスト';
                const profile = p.user_id ? profilesMap.get(p.user_id) : null;
                if (profile) {
                    switch (profile.membership_type) {
                        case 'owner': case 'admin':membershipStatus = 'コミュニティオーナー'; break;
                        case 'premium': membershipStatus = '会員'; break;
                        default: membershipStatus = 'ユーザー'; break;
                    }
                }
                const benefitUsed = p.participation_type === '会員特典' ? 'はい' : 'いいえ';

                let content = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <p><strong>氏名:</strong> ${p.name || '-'}</p>
                            <p><strong>登録日時:</strong> ${new Date(p.created_at).toLocaleString()}</p>
                            <p><strong>会員種別:</strong> ${membershipStatus}</p>
                            <p><strong>特典利用:</strong> ${benefitUsed}</p>`;
                
                if (p.form_data) {
                    eventFormSchema.forEach(field => {
                        const value = p.form_data[field.name];
                        const displayValue = field.type === 'checkbox' ? (value ? 'はい' : 'いいえ') : (value !== undefined ? value : '未入力');
                        content += `<p><strong>${field.label}:</strong> ${displayValue}</p>`;
                    });
                }
                
                content += `</div>
                        <button class="btn danger-btn delete-participant-btn" data-participant-id="${p.id}" data-participant-name="${p.name || ''}">削除</button>
                    </div>`;

                li.innerHTML = content;
                if(participantListUl) participantListUl.appendChild(li);
            });

            addEventListenersToDeleteButtons();

        } catch (error) {
            if(participantListUl) participantListUl.innerHTML = `<li class="error-message">参加者情報の取得に失敗しました: ${error.message}</li>`;
        }
    }

    function addEventListenersToDeleteButtons() {
        document.querySelectorAll('.delete-participant-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const participantId = e.target.dataset.participantId;
                const participantName = e.target.dataset.participantName;

                if (confirm(`参加者「${participantName}」を本当に削除しますか？この操作は元に戻せません。`)) {
                    try {
                        // ★★★ 変更点 ★★★
                        // .select() を追加して、削除されたデータを返すようにする
                        const { data, error } = await supabase
                            .from('participants')
                            .delete()
                            .eq('id', participantId)
                            .select();
                        
                        if (error) {
                            // Supabaseから明確なエラーが返された場合
                            throw error;
                        }

                        // 応答データを確認し、実際に削除されたか判断する
                        if (data && data.length > 0) {
                            // 成功
                            messageArea.innerHTML = `<p class="success-message">参加者「${participantName}」を削除しました。</p>`;
                            await fetchAndDisplayParticipants();
                        } else {
                            // 失敗（RLSが原因の可能性が高い）
                            throw new Error("削除できませんでした。権限が不足している可能性があります。");
                        }
                        // ★★★ ここまで ★★★

                    } catch (error) {
                         messageArea.innerHTML = `<p class="error-message">削除に失敗しました: ${error.message}</p>`;
                    }
                }
            });
        });
    }

    function generateAndDownloadCsv() {
        if (participantsData.length === 0) return;

        const desiredHeaders = ["氏名","登録日時","会員種別","特典利用","会社名","事業内容","メールアドレス","電話番号","紹介者名"];
        const schemaMap = new Map(eventFormSchema.map(f => [f.label, f.name]));

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += desiredHeaders.map(h => `"${h}"`).join(',') + '\r\n';

        participantsData.forEach(p => {
            const rowData = {};
            
            rowData["氏名"] = p.name || '';
            rowData["登録日時"] = new Date(p.created_at).toLocaleString();

            let membershipStatus = 'ゲスト';
            const profile = p.user_id ? profilesMap.get(p.user_id) : null;
            if (profile) {
                switch (profile.membership_type) {
                    case 'owner': case 'admin':membershipStatus = 'コミュニティオーナー'; break;
                    case 'premium': membershipStatus = '会員'; break;
                    default: membershipStatus = 'ユーザー'; break;
                }
            }
            rowData["会員種別"] = membershipStatus;
            rowData["特典利用"] = p.participation_type === '会員特典' ? 'はい' : 'いいえ';
            
            desiredHeaders.forEach(header => {
                if (schemaMap.has(header)) {
                    const fieldName = schemaMap.get(header);
                    const value = p.form_data && p.form_data[fieldName] !== undefined ? p.form_data[fieldName] : '';
                    const fieldSchema = eventFormSchema.find(f => f.name === fieldName);
                    rowData[header] = fieldSchema && fieldSchema.type === 'checkbox' ? (value ? 'はい' : 'いいえ') : value;
                }
            });

            const row = desiredHeaders.map(header => {
                const value = rowData[header] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });

            csvContent += row.join(',') + '\r\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${eventData.name}_participants.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    if(exportCsvButton) {
      exportCsvButton.addEventListener('click', generateAndDownloadCsv);
    }
});