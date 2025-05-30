// js/edit_event.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const editEventForm = document.getElementById('editEventForm');
    const eventIdInput = document.getElementById('eventId'); // hidden input for event ID
    const messageArea = document.getElementById('messageArea');
    const formLoadingMessage = document.getElementById('formLoadingMessage');
    const loadingIndicator = document.getElementById('loadingIndicator'); // for uploads/save

    // Form fields
    const eventNameInput = document.getElementById('eventName');
    const eventDescriptionInput = document.getElementById('eventDescription');
    const eventDateInput = document.getElementById('eventDate');
    const eventEndDateInput = document.getElementById('eventEndDate');
    const eventLocationInput = document.getElementById('eventLocation');
    const participationFeeInput = document.getElementById('participationFee');
    const maxParticipantsInput = document.getElementById('maxParticipants');

    // File fields and previews
    const currentImagesContainer = document.getElementById('currentImagesContainer');
    const eventNewImagesInput = document.getElementById('eventNewImages');
    const newImageCountInfo = document.getElementById('newImageCountInfo');
    const newImagePreviewContainer = document.getElementById('newImagePreviewContainer');

    const currentVideosContainer = document.getElementById('currentVideosContainer');
    const eventNewVideosInput = document.getElementById('eventNewVideos');
    const newVideoCountInfo = document.getElementById('newVideoCountInfo');
    const newVideoPreviewContainer = document.getElementById('newVideoPreviewContainer');
    
    // Form Schema Builder
    const formFieldsContainer = document.getElementById('formFieldsContainer');
    const addFormFieldButton = document.getElementById('addFormField');

    const BUCKET_NAME = 'event-media';
    const MAX_IMAGE_UPLOADS = 10; 
    const MAX_VIDEO_UPLOADS = 10; 

    let newSelectedImageFiles = []; // 新しく選択された画像ファイル
    let newSelectedVideoFiles = []; // 新しく選択された動画ファイル
    let existingImageUrls = [];     // 既存の画像URLリスト
    let existingVideoUrls = [];     // 既存の動画URLリスト

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventIdToEdit = urlParams.get('id');

    if (!currentEventIdToEdit) {
        messageArea.innerHTML = '<p class="error-message">編集するイベントIDが指定されていません。</p>';
        formLoadingMessage.style.display = 'none';
        return;
    }
    eventIdInput.value = currentEventIdToEdit; // hidden inputにセット

    // --- Helper functions (from create.js, potentially common utils) ---
    function sanitizeFileName(fileName) { /* ... (create.jsと同じ) ... */ const nameParts = fileName.split('.'); const extension = nameParts.length > 1 ? '.' + nameParts.pop() : ''; let baseName = nameParts.join('.'); baseName = baseName.replace(/[^a-zA-Z0-9_.\-]/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, ''); if (!baseName) baseName = 'file'; return baseName + extension; }
    async function uploadSingleFile(file, typePrefix = 'media') { /* ... (create.jsと同じ) ... */ if (!file) return null; const originalFileName = file.name; const sanitizedFileName = sanitizeFileName(originalFileName); const filePath = `${typePrefix}/${user.id}/${Date.now()}_${sanitizedFileName}_${Math.random().toString(36).substring(2,7)}`; const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, { cacheControl: '3600', upsert: false }); if (error) { console.error(`Error uploading ${typePrefix} (${originalFileName}):`, error); throw new Error(`${originalFileName}のアップロードに失敗しました: ${error.message}`); } const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path); return publicUrlData.publicUrl; }
    function generateUniqueFieldName() { /* ... (create.jsと同じ) ... */ return `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; }
    
    // プレビューとファイル配列を更新 (新規ファイル用)
    function updateNewFilePreview(file, previewContainer, selectedFilesArray, fileType) { /* ... (create.jsのupdatePreviewAndFileArrayとほぼ同じ、削除対象がselectedFilesArray) ... */
        const previewItem = document.createElement('div'); previewItem.classList.add('preview-item');
        let mediaElement;
        if (file.type.startsWith('image/')) mediaElement = document.createElement('img');
        else if (file.type.startsWith('video/')) { mediaElement = document.createElement('video'); mediaElement.controls = true; }
        else return; 
        mediaElement.src = URL.createObjectURL(file);
        const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.classList.add('remove-preview-btn'); removeBtn.innerHTML = '×';
        removeBtn.onclick = function() {
            const idx = selectedFilesArray.indexOf(file); if (idx > -1) selectedFilesArray.splice(idx, 1);
            previewItem.remove();
            const countInfo = (fileType === 'image') ? newImageCountInfo : newVideoCountInfo;
            const maxUploads = (fileType === 'image') ? MAX_IMAGE_UPLOADS : MAX_VIDEO_UPLOADS; // 将来的に既存と合わせて上限管理
            countInfo.textContent = `選択中: ${selectedFilesArray.length}`; // / ${maxUploads - existingCount}
             if (selectedFilesArray.length === 0) { const inputEl = (fileType === 'image') ? eventNewImagesInput : eventNewVideosInput; inputEl.value = "";}
        };
        previewItem.appendChild(mediaElement); previewItem.appendChild(removeBtn); previewContainer.appendChild(previewItem);
    }
    function handleNewFileSelection(event, previewContainer, countInfo, maxUploads, targetSelectedFilesArray, fileType, existingCount) { /* ... (create.jsのhandleFileSelectionとほぼ同じ) ... */
        const currentFiles = Array.from(event.target.files);
        if (existingCount + targetSelectedFilesArray.length + currentFiles.length > maxUploads) {
            messageArea.innerHTML = `<p class="error-message">${fileType === 'image' ? '画像' : '動画'}は合計${maxUploads}個までです。既存:${existingCount}, 新規選択:${targetSelectedFilesArray.length + currentFiles.length}</p>`;
            return; 
        }
        messageArea.innerHTML = '';
        currentFiles.forEach(file => { if (targetSelectedFilesArray.length < (maxUploads - existingCount)) { const isDuplicate = targetSelectedFilesArray.some(ef => ef.name === file.name && ef.size === file.size); if (!isDuplicate) targetSelectedFilesArray.push(file); } });
        previewContainer.innerHTML = ''; targetSelectedFilesArray.forEach((file) => updateNewFilePreview(file, previewContainer, targetSelectedFilesArray, fileType));
        countInfo.textContent = `新規選択: ${targetSelectedFilesArray.length} (合計上限 ${maxUploads}, 既存 ${existingCount})`;
        event.target.value = '';
    }
    eventNewImagesInput.addEventListener('change', (e) => handleNewFileSelection(e, newImagePreviewContainer, newImageCountInfo, MAX_IMAGE_UPLOADS, newSelectedImageFiles, 'image', existingImageUrls.length));
    eventNewVideosInput.addEventListener('change', (e) => handleNewFileSelection(e, newVideoPreviewContainer, newVideoCountInfo, MAX_VIDEO_UPLOADS, newSelectedVideoFiles, 'video', existingVideoUrls.length));

    // 既存メディア表示と削除ボタン
    function displayCurrentMedia(urls, container, type) {
        container.innerHTML = '';
        (urls || []).forEach((url, index) => {
            if (!url) return;
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('current-media-item', 'preview-item'); // preview-itemも適用
            let mediaEl;
            if (type === 'image') {
                mediaEl = document.createElement('img');
                mediaEl.src = url;
                mediaEl.alt = `既存画像 ${index + 1}`;
            } else {
                mediaEl = document.createElement('video');
                mediaEl.src = url;
                mediaEl.controls = true;
            }
            itemDiv.appendChild(mediaEl);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'このメディアを削除';
            deleteBtn.type = 'button';
            deleteBtn.classList.add('remove-preview-btn'); // 同じスタイルを適用
            deleteBtn.onclick = async () => {
                if (!confirm(`${type === 'image' ? '画像' : '動画'}「${url.split('/').pop()}」を削除しますか？この操作は元に戻せません。`)) return;
                
                // 1. Storageからファイルを削除 (ファイルパスをURLから抽出する必要あり)
                try {
                    const filePath = url.substring(url.indexOf(BUCKET_NAME + '/') + (BUCKET_NAME + '/').length);
                    console.log("Attempting to delete from storage:", filePath);
                    const { error: deleteStorageError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
                    if (deleteStorageError) {
                        console.error("Error deleting from storage:", deleteStorageError);
                        // alert("ストレージからのファイル削除に失敗しました。");
                        // 失敗してもUIからは消すか、エラー表示するか検討。ここではUIから消す。
                    }
                } catch (e) {
                    console.error("Exception deleting from storage:", e);
                }

                // 2. existingImageUrls/existingVideoUrls からURLを削除
                if (type === 'image') existingImageUrls = existingImageUrls.filter(u => u !== url);
                else existingVideoUrls = existingVideoUrls.filter(u => u !== url);
                
                // 3. UIから要素を削除
                itemDiv.remove();
                // カウント更新 (新規ファイル選択時の上限計算に影響)
                if (type === 'image') handleNewFileSelection({target:{files:[]}}, newImagePreviewContainer, newImageCountInfo, MAX_IMAGE_UPLOADS, newSelectedImageFiles, 'image', existingImageUrls.length);
                else handleNewFileSelection({target:{files:[]}}, newVideoPreviewContainer, newVideoCountInfo, MAX_VIDEO_UPLOADS, newSelectedVideoFiles, 'video', existingVideoUrls.length);

            };
            itemDiv.appendChild(deleteBtn);
            container.appendChild(itemDiv);
        });
    }

    // フォームスキーマビルダーのロジック (create.jsと共通)
    function createFormFieldConfigElement(fieldData = {}) {
        const fieldDiv = document.createElement('div');
        fieldDiv.classList.add('form-field-config');
        const fieldName = fieldData.name || generateUniqueFieldName();
        fieldDiv.dataset.fieldName = fieldName;
        fieldDiv.innerHTML = `
            <div><label>表示ラベル:</label><input type="text" data-config-key="label" value="${fieldData.label || ''}" placeholder="例: 会社名" required></div>
            <div><label>タイプ:</label><select data-config-key="type">${['text','textarea','email','tel','checkbox'].map(t => `<option value="${t}" ${fieldData.type === t ? 'selected':''}>${t==='text'?'一行テキスト':t==='textarea'?'複数行テキスト':t==='email'?'メールアドレス':t==='tel'?'電話番号':'チェックボックス'}</option>`).join('')}</select></div>
            <div><label>必須:</label><input type="checkbox" data-config-key="required" ${fieldData.required ? 'checked':''}></div>
            <button type="button" class="remove-field-btn">削除</button>
        `;
        fieldDiv.querySelector('.remove-field-btn').addEventListener('click', () => fieldDiv.remove());
        return fieldDiv;
    }
    addFormFieldButton.addEventListener('click', () => formFieldsContainer.appendChild(createFormFieldConfigElement()));


    // イベントデータを読み込んでフォームにセット
    async function loadEventData() {
        formLoadingMessage.style.display = 'block';
        editEventForm.style.display = 'none';
        try {
            const { data: event, error } = await supabase
                .from('events')
                .select('*') // 全カラム取得
                .eq('id', currentEventIdToEdit)
                .eq('user_id', user.id) // 自分のイベントのみ編集可能
                .single();

            if (error) {
                if (error.code === 'PGRST116') throw new Error('指定されたイベントが見つからないか、編集権限がありません。');
                throw error;
            }

            if (event) {
                eventNameInput.value = event.name || '';
                eventDescriptionInput.value = event.description || '';
                if (event.event_date) eventDateInput.value = new Date(event.event_date).toISOString().substring(0, 16);
                if (event.event_end_date) eventEndDateInput.value = new Date(event.event_end_date).toISOString().substring(0, 16);
                eventLocationInput.value = event.location || '';
                participationFeeInput.value = event.participation_fee || '';
                maxParticipantsInput.value = event.max_participants || '';

                existingImageUrls = event.image_urls || [];
                existingVideoUrls = event.video_urls || [];
                displayCurrentMedia(existingImageUrls, currentImagesContainer, 'image');
                displayCurrentMedia(existingVideoUrls, currentVideosContainer, 'video');
                handleNewFileSelection({target:{files:[]}}, newImagePreviewContainer, newImageCountInfo, MAX_IMAGE_UPLOADS, newSelectedImageFiles, 'image', existingImageUrls.length); // 初期カウント表示
                handleNewFileSelection({target:{files:[]}}, newVideoPreviewContainer, newVideoCountInfo, MAX_VIDEO_UPLOADS, newSelectedVideoFiles, 'video', existingVideoUrls.length); // 初期カウント表示


                formFieldsContainer.innerHTML = ''; // クリア
                (event.form_schema || []).forEach(field => {
                    formFieldsContainer.appendChild(createFormFieldConfigElement(field));
                });

                editEventForm.style.display = 'block';
            } else {
                 throw new Error('イベントデータが見つかりません。');
            }
        } catch (err) {
            console.error("Error loading event data:", err);
            messageArea.innerHTML = `<p class="error-message">イベントデータの読み込みに失敗しました: ${err.message}</p>`;
        } finally {
            formLoadingMessage.style.display = 'none';
        }
    }
    
    // フォーム送信処理 (更新)
    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '';
        const submitButton = editEventForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        loadingIndicator.textContent = "更新処理中...";
        loadingIndicator.style.display = 'block';

        const eventName = eventNameInput.value.trim();
        if (!eventName) { messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>'; eventNameInput.focus(); loadingIndicator.style.display = 'none'; submitButton.disabled = false; return; }
        
        const maxParticipantsVal = maxParticipantsInput.value ? parseInt(maxParticipantsInput.value, 10) : null;
        if (maxParticipantsInput.value && (isNaN(maxParticipantsVal) || maxParticipantsVal < 1)) { messageArea.innerHTML = '<p class="error-message">最大参加人数は1以上の数値を入力してください。</p>'; maxParticipantsInput.focus(); loadingIndicator.style.display = 'none'; submitButton.disabled = false; return; }

        let uploadedImageUrls = [...existingImageUrls]; // 既存のURLをコピー
        let uploadedVideoUrls = [...existingVideoUrls];

        try {
            // 新しい画像のアップロード
            if (newSelectedImageFiles.length > 0) {
                for (const file of newSelectedImageFiles) {
                    const url = await uploadSingleFile(file, 'image');
                    if (url) uploadedImageUrls.push(url);
                }
            }
            // 新しい動画のアップロード
            if (newSelectedVideoFiles.length > 0) {
                for (const file of newSelectedVideoFiles) {
                    const url = await uploadSingleFile(file, 'video');
                    if (url) uploadedVideoUrls.push(url);
                }
            }
        } catch (uploadError) {
            messageArea.innerHTML += `<p class="error-message">${uploadError.message}</p>`;
            loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }
        
        const formSchema = []; 
        const fieldConfigElements = formFieldsContainer.querySelectorAll('.form-field-config');
        let schemaValid = true;
        fieldConfigElements.forEach(el => { const label = el.querySelector('input[data-config-key="label"]').value.trim(); const type = el.querySelector('select[data-config-key="type"]').value; const required = el.querySelector('input[data-config-key="required"]').checked; const name = el.dataset.fieldName; if (!label) { schemaValid = false; return; } formSchema.push({ name, label, type, required }); });
        if (!schemaValid) { messageArea.innerHTML += '<p class="error-message">追加フォーム項目の「表示ラベル」を入力してください。</p>'; loadingIndicator.style.display = 'none'; submitButton.disabled = false; return; }

        const eventDataToUpdate = {
            name: eventName,
            description: eventDescriptionInput.value,
            event_date: eventDateInput.value || null,
            event_end_date: eventEndDateInput.value || null,
            location: eventLocationInput.value,
            participation_fee: participationFeeInput.value.trim() || null,
            max_participants: maxParticipantsVal,
            image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
            video_urls: uploadedVideoUrls.length > 0 ? uploadedVideoUrls : null,
            form_schema: formSchema.length > 0 ? formSchema : null,
            // user_id は更新しない (RLSで保護)
        };

        try {
            const { data, error } = await supabase
                .from('events')
                .update(eventDataToUpdate)
                .eq('id', currentEventIdToEdit)
                .eq('user_id', user.id); // 念のため自分のイベントであることも確認

            if (error) throw error;

            messageArea.innerHTML = '<p class="success-message">イベント情報が更新されました。ダッシュボードに戻ります。</p>';
            // フォームリセットは不要、または編集後のデータで再表示するならloadEventData()を呼ぶ
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (dbError) {
            console.error('Error updating event:', dbError);
            messageArea.innerHTML += `<p class="error-message">イベント更新に失敗しました: ${dbError.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    loadEventData(); // ページロード時にイベントデータを読み込む
});