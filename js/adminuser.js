// js/adminuser.js
document.addEventListener('DOMContentLoaded', async () => {
    const messageArea = document.getElementById('messageArea');
    const loadingMessage = document.getElementById('loadingMessage');
    const adminContent = document.getElementById('adminContent');
    const userList = document.getElementById('userList');

    const membershipMap = {
        'free': '非会員',
        'premium': '会員',
        'owner': 'コミュニティオーナー',
        'admin': '管理者'
    };
    const internalMembershipValues = Object.keys(membershipMap);

    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('membership_type')
        .eq('id', user.id)
        .single();
    if (profileError || !profile || profile.membership_type !== 'admin') {
        loadingMessage.style.display = 'none';
        messageArea.innerHTML = `<p class="error-message">このページにアクセスする権限がありません。</p>`;
        return;
    }

    try {
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, username, community_name, membership_type, is_active, lunch_meeting_credit, evening_meeting_credit, score');

        if (usersError) throw usersError;

        users.forEach(u => {
            const row = document.createElement('tr');
            row.id = `user-row-${u.id}`;
            if (!u.is_active) {
                row.classList.add('inactive-row');
            }

            row.innerHTML = `
                <td>${u.username || '(未設定)'}</td>
                <td>${u.community_name || '(なし)'}</td>
                <td><select class="membership-select"></select></td>
                <td class="is-active-cell"><input type="checkbox" class="is-active-checkbox"></td>
                <td><input type="number" class="lunch-credit-input" min="0"></td>
                <td><input type="number" class="evening-credit-input" min="0"></td>
                <td><input type="number" class="score-input" min="0"></td>
                <td><button class="update-btn">更新</button></td>
            `;

            const membershipSelect = row.querySelector('.membership-select');
            const isActiveCheckbox = row.querySelector('.is-active-checkbox');
            const lunchInput = row.querySelector('.lunch-credit-input');
            const eveningInput = row.querySelector('.evening-credit-input');
            const scoreInput = row.querySelector('.score-input');
            const updateButton = row.querySelector('.update-btn');

            let optionsToShow = internalMembershipValues.filter(v => v !== 'admin');
            if (u.id === user.id) {
                optionsToShow = internalMembershipValues;
            }
            optionsToShow.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = membershipMap[value];
                if (u.membership_type === value) option.selected = true;
                membershipSelect.appendChild(option);
            });
            if (u.membership_type === 'admin') {
                 const adminOption = document.createElement('option');
                 adminOption.value = 'admin';
                 adminOption.textContent = '管理者';
                 adminOption.selected = true;
                 membershipSelect.innerHTML = '';
                 membershipSelect.appendChild(adminOption);
            }

            isActiveCheckbox.checked = u.is_active;
            lunchInput.value = u.lunch_meeting_credit || 0;
            eveningInput.value = u.evening_meeting_credit || 0;
            scoreInput.value = u.score || 0;

            if (u.membership_type === 'admin' && u.id !== user.id) {
                membershipSelect.disabled = true;
                isActiveCheckbox.disabled = true;
                lunchInput.disabled = true;
                eveningInput.disabled = true;
                scoreInput.disabled = true;
                updateButton.disabled = true;
            }

            // ★★★ 修正箇所: 更新ボタンの処理をEdge Function呼び出しに変更 ★★★
            updateButton.addEventListener('click', async () => {
                updateButton.disabled = true;
                updateButton.textContent = '更新中...';
                
                const dataToUpdate = {
                    target_user_id: u.id, // どのユーザーを更新するか
                    updates: { // 何を更新するか
                        membership_type: membershipSelect.value,
                        is_active: isActiveCheckbox.checked,
                        lunch_meeting_credit: parseInt(lunchInput.value, 10),
                        evening_meeting_credit: parseInt(eveningInput.value, 10),
                        score: parseInt(scoreInput.value, 10)
                    }
                };

                try {
                    // 'update-user-admin' という名前のEdge Functionを呼び出す
                    const { data, error } = await supabase.functions.invoke('update-user-admin', {
                        body: dataToUpdate
                    });

                    if (error) throw error;

                    messageArea.innerHTML = `<p class="success-message">「${u.username || '(未設定)'}」の情報を更新しました。</p>`;
                    row.classList.toggle('inactive-row', !dataToUpdate.updates.is_active);

                } catch (err) {
                    messageArea.innerHTML = `<p class="error-message">更新に失敗しました: ${err.message}</p>`;
                } finally {
                    updateButton.disabled = false;
                    updateButton.textContent = '更新';
                }
            });

            userList.appendChild(row);
        });

        loadingMessage.style.display = 'none';
        adminContent.style.display = 'block';

    } catch (error) {
        loadingMessage.style.display = 'none';
        messageArea.innerHTML = `<p class="error-message">ユーザー情報の取得に失敗しました: ${error.message}</p>`;
    }
});