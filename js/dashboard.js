// js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return; 

    // アカウントが有効か確認し、停止中ならトップページへ
    const isActive = await checkUserStatusAndRedirectIfSuspended(user);
    if (!isActive) return;
    
    const contentSection = document.querySelector('.content-section');
    const myEventListUl = document.getElementById('myEventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noMyEventsMessage = document.getElementById('noMyEventsMessage');
    const adminViewToggle = document.getElementById('adminViewToggle');

    const membershipType = await checkUserMembership(user);
    const isAdminUser = membershipType === 'admin';

    if (membershipType === 'free') {
        if (contentSection) {
            contentSection.innerHTML = `
                <div class="message warning-message" style="text-align: center; padding: 2rem;">
                    <h2>会員限定機能です</h2>
                    <p style="margin-top: 1rem;">イベントの作成・管理機能は、会員プランでご利用いただけます。</p>
                    <p>プランのアップグレードをご希望の場合は、管理者までお問い合わせください。</p>
                </div>
            `;
        }
        return;
    }

    // 管理者であれば、表示切り替えスイッチを表示し、イベントリスナーを設定
    if (isAdminUser && adminViewToggle) {
        adminViewToggle.style.display = 'flex';
        const viewRadios = document.querySelectorAll('input[name="eventView"]');
        viewRadios.forEach(radio => radio.addEventListener('change', fetchMyEvents));
    }

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

            let query = supabase
                .from('events')
                .select(`
                    id, name, event_date, location, user_id,
                    profiles ( username )
                `);

            // 管理者の場合、表示範囲をチェック
            if (isAdminUser) {
                const viewAllRadio = document.getElementById('viewAll');
                if (!viewAllRadio.checked) { // 「自分のイベント」が選択されている場合
                    query = query.eq('user_id', user.id);
                }
            } else { // 管理者でない場合は、自分のイベントのみを対象にする
                query = query.eq('user_id', user.id);
            }

            const { data: events, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            if (events && events.length > 0) {
                events.forEach(event => {
                    const listItem = document.createElement('li');
                    const eventDate = event.event_date ? event.event_date.replace('T', ' ').substring(0, 16) : '未定';
                    
                    let ownerDisplay = '';
                    if (isAdminUser) {
                        const ownerName = event.profiles ? event.profiles.username : '不明なユーザー';
                        const isOwnEvent = event.user_id === user.id ? ' (自分)' : '';
                        ownerDisplay = `<p style="font-size: 0.85rem; color: var(--danger-color); font-weight: bold;">主催者: ${ownerName || '(名前未設定)'}${isOwnEvent}</p>`;
                    }
                    
                    const actionButtonsDiv = document.createElement('div');
                    actionButtonsDiv.classList.add('action-buttons');
                    actionButtonsDiv.innerHTML = `
                        <a href="detail_owner.html?id=${event.id}"><button class="view-detail-btn">参加者情報</button></a>
                        <a href="edit_event.html?id=${event.id}"><button class="edit-event-btn">編集</button></a>
                        <button class="copy-btn" data-event-id="${event.id}">コピー</button>
                        <button class="delete-btn" data-event-id="${event.id}">削除</button>
                    `;

                    listItem.innerHTML = `
                        <h3><a href="detail.html?id=${event.id}" target="_blank">${event.name}</a></h3>
                        ${ownerDisplay}
                        <p><strong>日時:</strong> ${eventDate}</p>
                        <p><strong>場所:</strong> ${event.location || '未定'}</p>
                    `;
                    listItem.appendChild(actionButtonsDiv);
                    
                    myEventListUl.appendChild(listItem);
                });
                addEventListenersToButtons();
            } else {
                noMyEventsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching events:', error.message);
            myEventListUl.innerHTML = `<li class="error-message">イベントの読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }
    
    async function copyEvent(eventId) {
        if (!confirm('このイベントをコピーしますか？')) return;
        try {
            const { data: originalEvent, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            if (fetchError) throw fetchError;

            const newEventData = { ...originalEvent };
            newEventData.id = generateShortId(); 
            delete newEventData.created_at; 
            newEventData.view_password = Math.floor(1000 + Math.random() * 9000).toString();
            newEventData.name = `[コピー] ${originalEvent.name}`;
            
            // 管理者が他人のイベントをコピーした場合、所有者は管理者自身になる
            newEventData.user_id = user.id;

            const { error: insertError } = await supabase.from('events').insert([newEventData]);
            if (insertError) throw insertError;

            alert('イベントをコピーしました。');
            fetchMyEvents();

        } catch (error) {
            console.error('Error copying event:', error.message);
            alert(`イベントのコピーに失敗しました: ${error.message}`);
        }
    }
    
    async function deleteEvent(eventId) {
        if (!confirm('本当にこのイベントを削除しますか？関連する参加者情報も全て削除されます。')) return;
        try {
            const { error: participantsError } = await supabase
                .from('participants')
                .delete()
                .eq('event_id', eventId);
            if (participantsError) throw participantsError;

            const { error: eventError } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);
            if (eventError) throw eventError;

            alert('イベントを削除しました。');
            fetchMyEvents();

        } catch (error) {
            console.error('Error deleting event:', error.message);
            alert(`イベント削除に失敗しました: ${error.message}`);
        }
    }

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
    }

    fetchMyEvents();
});

