// js/index.js
document.addEventListener('DOMContentLoaded', async () => {
    const eventList = document.getElementById('eventList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noEventsMessage = document.getElementById('noEventsMessage');

    async function fetchAndDisplayEvents() {
        try {
            loadingMessage.style.display = 'block';
            eventList.innerHTML = ''; 
            noEventsMessage.style.display = 'none';

            // カラム名を image_urls, video_urls に変更
            const { data: events, error } = await supabase
                .from('events')
                .select('id, name, description, event_date, location, image_urls') 
                .order('event_date', { ascending: true }); 

            if (error) throw error;

            if (events && events.length > 0) {
                events.forEach(event => {
                    const listItem = document.createElement('li');
                    const eventDate = event.event_date ? new Date(event.event_date).toLocaleString('ja-JP') : '未定';
                    
                    let imageHtml = '';
                    // image_urls が配列であり、要素が存在する場合に最初の画像を表示
                    if (event.image_urls && event.image_urls.length > 0 && event.image_urls[0]) {
                        imageHtml = `<img src="${event.image_urls[0]}" alt="${event.name} の画像" class="event-image">`;
                    }

                    listItem.innerHTML = `
                        <h3><a href="detail.html?id=${event.id}">${event.name}</a></h3>
                        ${imageHtml}
                        <p><strong>日時:</strong> ${eventDate}</p>
                        <p><strong>場所:</strong> ${event.location || '未定'}</p>
                        <p>${event.description ? (event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description) : ''}</p>
                    `;
                    eventList.appendChild(listItem);
                });
            } else {
                noEventsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching events:', error.message);
            eventList.innerHTML = `<li class="error-message">イベントの読み込みに失敗しました: ${error.message}</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }
    fetchAndDisplayEvents();
});