// js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return; 

    // アカウントが有効か確認し、停止中ならトップページへ
    const isActive = await checkUserStatusAndRedirectIfSuspended(user);
    if (!isActive) return; // アカウント停止中の場合はここで処理を中断
    
    const contentSection = document.querySelector('.content-section');

    // 会員種別をチェック
    const membershipType = await checkUserMembership(user);

    if (membershipType == 'free') {
        // 無料会員またはエラーの場合、contentSectionの中身をすべてメッセージに入れ替える
        if (contentSection) {
            contentSection.innerHTML = `
                <div class="message warning-message" style="text-align: center; padding: 2rem;">
                    <h2>会員限定機能です</h2>
                    <p style="margin-top: 1rem;">イベントの作成・管理機能は、会員プランでご利用いただけます。</p>
                    <p>プランのアップグレードをご希望の場合は、管理者までお問い合わせください。</p>
                </div>
            `;
        }
        return; // 有料会員でない場合は、ここで処理を終了
    }

    const myEventListUl = document.getElementById('myEventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noMyEventsMessage = document.getElementById('noMyEventsMessage');
    
    /**
     * ランダムな短いIDを生成する関数
     * @param {number} length 生成するIDの長さ
     * @returns {string} 生成されたID
     */
    function generateShortId(length = 3) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async function fetchMyEvents() {
        try {
            loadingMessage.style.display = 'block';
            myEventListUl.innerHTML = '';
            noMyEventsMessage.style.display = 'none';

            const { data: events, error } = await supabase
                .from('events')
                .select('id, name, event_date, location')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (events && events.length > 0) {
                events.forEach(event => {
                    const listItem = document.createElement('li');
                    const eventDate = event.event_date ? event.event_date.replace('T', ' ').substring(0, 16) : '未定';
                    
                    const ownerDetailLinkButton = document.createElement('a');
                    ownerDetailLinkButton.href = `detail_owner.html?id=${event.id}`;
                    ownerDetailLinkButton.innerHTML = `<button class="view-detail-btn">参加者情報</button>`;

                    // 編集ボタン
                    const editLinkButton = document.createElement('a');
                    editLinkButton.href = `edit_event.html?id=${event.id}`;
                    editLinkButton.innerHTML = `<button class="edit-event-btn">編集</button>`;

                    // コピーボタン
                    const copyButton = document.createElement('button');
                    copyButton.classList.add('copy-btn');
                    copyButton.dataset.eventId = event.id;
                    copyButton.textContent = 'コピー';

                    // 削除ボタン
                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-btn');
                    deleteButton.dataset.eventId = event.id;
                    deleteButton.textContent = '削除';

                    listItem.innerHTML = `
                        <h3><a href="detail.html?id=${event.id}" target="_blank">${event.name}</a></h3>
                        <p><strong>日時:</strong> ${eventDate}</p>
                        <p><strong>場所:</strong> ${event.location || '未定'}</p>
                        <div class="action-buttons">
                        </div>
                    `;
                    const actionButtonsDiv = listItem.querySelector('.action-buttons');
                    if (actionButtonsDiv) {
                        actionButtonsDiv.appendChild(ownerDetailLinkButton);
                        actionButtonsDiv.appendChild(editLinkButton);
                        actionButtonsDiv.appendChild(copyButton);
                        actionButtonsDiv.appendChild(deleteButton);
                    }
                    
                    myEventListUl.appendChild(listItem);
                });
                addEventListenersToButtons();
            } else {
                noMyEventsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching my events:', error.message);
            myEventListUl.innerHTML = `<li class="error-message">イベントの読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }
    
    /**
     * イベントをコピーする関数
     * @param {string} eventId コピー元のイベントID
     */
    async function copyEvent(eventId) {
        if (!confirm('このイベントをコピーしますか？')) {
            return;
        }
        try {
            // 1. コピー元のイベントデータを取得
            const { data: originalEvent, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (fetchError) throw fetchError;

            // 2. 新しいイベントデータを作成
            const newEventData = { ...originalEvent };
            
            // 新しいIDを生成して設定
            newEventData.id = generateShortId(); 
            
            // created_at はDBが自動設定するので削除
            delete newEventData.created_at; 
            
            // 新しい閲覧用パスワードを生成
            newEventData.view_password = Math.floor(1000 + Math.random() * 9000).toString();
            
            // イベント名の先頭に「[コピー] 」を追加
            newEventData.name = `[コピー] ${originalEvent.name}`;

            // 3. 新しいイベントデータをDBに挿入
            const { error: insertError } = await supabase
                .from('events')
                .insert([newEventData]);

            if (insertError) throw insertError;

            alert('イベントをコピーしました。');
            fetchMyEvents(); // リストを再読み込み

        } catch (error) {
            console.error('Error copying event:', error.message);
            alert(`イベントのコピーに失敗しました: ${error.message}`);
        }
    }
    
    // ★★★ ここから関数を修正 ★★★
    async function deleteEvent(eventId) {
        if (!confirm('本当にこのイベントを削除しますか？関連する参加者情報も全て削除されます。')) {
            return;
        }
        try {
            // 1. 先に関連する参加者情報をすべて削除
            const { error: participantsError } = await supabase
                .from('participants')
                .delete()
                .eq('event_id', eventId);
            
            if (participantsError) throw participantsError;

            // 2. 参加者情報が削除された後、イベント本体を削除
            const { error: eventError } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId)
                .eq('user_id', user.id); 

            if (eventError) throw eventError;

            alert('イベントを削除しました。');
            fetchMyEvents(); // リストを再読み込み

        } catch (error) {
            console.error('Error deleting event:', error.message);
            alert(`イベント削除に失敗しました: ${error.message}`);
        }
    }
    // ★★★ ここまで ★★★

    function addEventListenersToButtons() {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                deleteEvent(eventId);
            });
        });
        
        document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                copyEvent(eventId);
            });
        });

        // 編集ボタン、詳細ボタンは<a>タグなのでJSでのリスナーは基本不要
    }
    fetchMyEvents();
});