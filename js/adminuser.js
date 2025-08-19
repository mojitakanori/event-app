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

    // 1. ログイン状態と権限をチェック
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

    async function updateUserField(userId, username, field, value, displayFieldName) {
        const { error } = await supabase
            .from('profiles')
            .update({ [field]: value })
            .eq('id', userId);

        if (error) {
            messageArea.innerHTML = `<p class="error-message">「${username}」の${displayFieldName}更新に失敗: ${error.message}</p>`;
        } else {
            messageArea.innerHTML = `<p class="success-message">「${username}」の${displayFieldName}を更新しました。</p>`;
        }
    }

    // 2. 全ユーザーの情報を取得して表示
    try {
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, username, community_name, membership_type, is_active, lunch_meeting_credit, evening_meeting_credit, score');

        if (usersError) throw usersError;

        users.forEach(u => {
            const row = document.createElement('tr');
            if (!u.is_active) {
                row.classList.add('inactive-row');
            }

            // ユーザー名
            const usernameCell = document.createElement('td');
            usernameCell.textContent = u.username || '(未設定)';
            row.appendChild(usernameCell);

            // コミュニティ名
            const communityNameCell = document.createElement('td');
            communityNameCell.textContent = u.community_name || '(なし)';
            row.appendChild(communityNameCell);
            
            // 権限
            const membershipCell = document.createElement('td');
            const select = document.createElement('select');

            // ★★★ ここからが修正箇所 ★★★
            // 表示する権限の選択肢を動的に決める
            let optionsToShow = internalMembershipValues;

            // もし対象ユーザー(u)が管理者で、かつ自分自身ではない場合
            if (u.membership_type === 'admin' && u.id !== user.id) {
                // ドロップダウン自体を無効化する
                select.disabled = true;
            } else {
                // 管理者権限への変更オプションを表示させない
                optionsToShow = internalMembershipValues.filter(v => v !== 'admin');
            }
            
            // ログイン中の管理者自身の行には、管理者オプションを含める
            if (u.id === user.id) {
                 optionsToShow = internalMembershipValues;
            }


            optionsToShow.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = membershipMap[value];
                if (u.membership_type === value) option.selected = true;
                select.appendChild(option);
            });
            // ★★★ ここまでが修正箇所 ★★★

            select.addEventListener('change', (e) => {
                updateUserField(u.id, u.username || '(未設定)', 'membership_type', e.target.value, '権限');
            });
            membershipCell.appendChild(select);
            row.appendChild(membershipCell);

            // アカウント有効/無効
            const isActiveCell = document.createElement('td');
            isActiveCell.classList.add('is-active-cell');
            const isActiveCheckbox = document.createElement('input');
            isActiveCheckbox.type = 'checkbox';
            isActiveCheckbox.checked = u.is_active;
            isActiveCheckbox.addEventListener('change', (e) => {
                const newStatus = e.target.checked;
                updateUserField(u.id, u.username || '(未設定)', 'is_active', newStatus, 'アカウント状態');
                row.classList.toggle('inactive-row', !newStatus);
            });
            isActiveCell.appendChild(isActiveCheckbox);
            row.appendChild(isActiveCell);

            // 数値項目
            const numberFields = [
                { key: 'lunch_meeting_credit', name: '昼クレジット' },
                { key: 'evening_meeting_credit', name: '夜クレジット' },
                { key: 'score', name: 'スコア' }
            ];
            numberFields.forEach(field => {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.value = u[field.key] || 0;
                input.min = 0;

                // ★★★ 追加: 自分以外の管理者の数値項目も無効化 ★★★
                if (u.membership_type === 'admin' && u.id !== user.id) {
                    input.disabled = true;
                    isActiveCheckbox.disabled = true; // 有効/無効チェックボックスも無効化
                }
                
                input.addEventListener('change', (e) => {
                    const newValue = parseInt(e.target.value, 10);
                    if (!isNaN(newValue)) {
                        updateUserField(u.id, u.username || '(未設定)', field.key, newValue, field.name);
                    }
                });
                cell.appendChild(input);
                row.appendChild(cell);
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