// js/create.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const createEventForm = document.getElementById('createEventForm');
    const messageArea = document.getElementById('messageArea');
    // ... (他の要素取得は変更なし)
    const formFieldsContainer = document.getElementById('formFieldsContainer');
    const addFormFieldButton = document.getElementById('addFormField');
    const eventImagesInput = document.getElementById('eventImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imageCountInfo = document.getElementById('imageCountInfo');
    const eventVideosInput = document.getElementById('eventVideos');
    const videoPreviewContainer = document.getElementById('videoPreviewContainer');
    const videoCountInfo = document.getElementById('videoCountInfo');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const BUCKET_NAME = 'event_media';
    const MAX_IMAGE_UPLOADS = 10; 
    const MAX_VIDEO_UPLOADS = 10; 

    let selectedImageFiles = [];
    let selectedVideoFiles = [];

    // handleFileSelection, updatePreviewAndFileArray 関数 (変更なし、前回と同じ)
    function updatePreviewAndFileArray(file, previewContainer, selectedFilesArray, fileType, index) { /* ... */ 
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        previewItem.dataset.fileIndex = index; 
        let mediaElement;
        if (file.type.startsWith('image/')) mediaElement = document.createElement('img');
        else if (file.type.startsWith('video/')) { mediaElement = document.createElement('video'); mediaElement.controls = true; }
        else return; 
        mediaElement.src = URL.createObjectURL(file);
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button'; removeBtn.classList.add('remove-preview-btn'); removeBtn.innerHTML = '×';
        removeBtn.onclick = function() {
            const fileToRemove = selectedFilesArray.find(f => URL.createObjectURL(f) === mediaElement.src || f === file);
            if (fileToRemove) { const idx = selectedFilesArray.indexOf(fileToRemove); if (idx > -1) selectedFilesArray.splice(idx, 1); }
            previewItem.remove();
            const countInfo = (fileType === 'image') ? imageCountInfo : videoCountInfo;
            const maxUploads = (fileType === 'image') ? MAX_IMAGE_UPLOADS : MAX_VIDEO_UPLOADS;
            countInfo.textContent = `選択中: ${selectedFilesArray.length} / ${maxUploads} 個`;
            if (selectedFilesArray.length === 0) { const inputEl = (fileType === 'image') ? eventImagesInput : eventVideosInput; inputEl.value = "";}
        };
        previewItem.appendChild(mediaElement); previewItem.appendChild(removeBtn); previewContainer.appendChild(previewItem);
    }
    function handleFileSelection(event, previewContainer, countInfo, maxUploads, targetSelectedFilesArray, fileType) { /* ... */
        const currentFiles = Array.from(event.target.files);
        if (targetSelectedFilesArray.length + currentFiles.length > maxUploads) {
            messageArea.innerHTML = `<p class="error-message">${fileType === 'image' ? '画像' : '動画'}は合計${maxUploads}個まで選択できます。</p>`;
            return; 
        }
        messageArea.innerHTML = '';
        currentFiles.forEach(file => {
            if (targetSelectedFilesArray.length < maxUploads) {
                const isDuplicate = targetSelectedFilesArray.some(ef => ef.name === file.name && ef.size === file.size);
                if (!isDuplicate) targetSelectedFilesArray.push(file);
            }
        });
        previewContainer.innerHTML = '';
        targetSelectedFilesArray.forEach((file, index) => updatePreviewAndFileArray(file, previewContainer, targetSelectedFilesArray, fileType, index));
        countInfo.textContent = `選択中: ${targetSelectedFilesArray.length} / ${maxUploads} 個`;
        event.target.value = ''; 
    }
    eventImagesInput.addEventListener('change', (e) => handleFileSelection(e, imagePreviewContainer, imageCountInfo, MAX_IMAGE_UPLOADS, selectedImageFiles, 'image'));
    eventVideosInput.addEventListener('change', (e) => handleFileSelection(e, videoPreviewContainer, videoCountInfo, MAX_VIDEO_UPLOADS, selectedVideoFiles, 'video'));
    function generateUniqueFieldName() { /* (変更なし) */ return `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; }
    function createFormFieldConfigElement() { /* (変更なし) */ const fieldDiv = document.createElement('div'); fieldDiv.classList.add('form-field-config'); fieldDiv.innerHTML = `<div><label>表示ラベル:</label><input type="text" data-config-key="label" placeholder="例: 会社名" required></div><div><label>タイプ:</label><select data-config-key="type"><option value="text">一行テキスト</option><option value="textarea">複数行テキスト</option><option value="email">メールアドレス</option><option value="tel">電話番号</option><option value="checkbox">チェックボックス</option></select></div><div><label>必須:</label><input type="checkbox" data-config-key="required"></div><button type="button" class="remove-field-btn">削除</button>`; fieldDiv.dataset.fieldName = generateUniqueFieldName(); fieldDiv.querySelector('.remove-field-btn').addEventListener('click', () => fieldDiv.remove()); return fieldDiv; }
    addFormFieldButton.addEventListener('click', () => formFieldsContainer.appendChild(createFormFieldConfigElement()));
    async function uploadSingleFile(file, typePrefix = 'media') { /* (変更なし) */ if (!file) return null; function sanitizeFileName(fileName) { const nameParts = fileName.split('.'); const extension = nameParts.length > 1 ? '.' + nameParts.pop() : ''; let baseName = nameParts.join('.'); baseName = baseName.replace(/[^a-zA-Z0-9_.\-]/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, ''); if (!baseName) baseName = 'file'; return baseName + extension; } const originalFileName = file.name; const sanitizedFileName = sanitizeFileName(originalFileName); const filePath = `${typePrefix}/${user.id}/${Date.now()}_${sanitizedFileName}_${Math.random().toString(36).substring(2,7)}`; const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, { cacheControl: '3600', upsert: false }); if (error) { console.error(`Error uploading ${typePrefix} (${originalFileName}):`, error); throw new Error(`${originalFileName}のアップロードに失敗しました: ${error.message}`); } const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path); return publicUrlData.publicUrl; }


    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '';
        const submitButton = createEventForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        loadingIndicator.textContent = "処理を開始しています...";
        loadingIndicator.style.display = 'block';

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
            messageArea.innerHTML = '<p class="error-message">認証エラー: 再ログインしてください。</p>';
            loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }

        const eventNameInput = document.getElementById('eventName');
        const eventName = eventNameInput.value.trim(); // .trim() を追加

        // イベント名必須チェック
        if (!eventName) { // HTMLのrequiredに加え、JSでもチェック
            messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>';
            eventNameInput.focus(); // フォーカスを当てる
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
            return;
        }
        
        let imageUrls = [];
        let videoUrls = [];
        // ... (ファイルアップロード処理は変更なし)
        try {
            if (selectedImageFiles.length > 0) { /* ... */ for (let i = 0; i < selectedImageFiles.length; i++) { loadingIndicator.textContent = `画像をアップロード中 (${i + 1}/${selectedImageFiles.length}): ${selectedImageFiles[i].name}...`; const url = await uploadSingleFile(selectedImageFiles[i], 'image'); if (url) imageUrls.push(url); } }
            if (selectedVideoFiles.length > 0) { /* ... */ for (let i = 0; i < selectedVideoFiles.length; i++) { loadingIndicator.textContent = `動画をアップロード中 (${i + 1}/${selectedVideoFiles.length}): ${selectedVideoFiles[i].name}...`; const url = await uploadSingleFile(selectedVideoFiles[i], 'video'); if (url) videoUrls.push(url); } }
        } catch (uploadError) { messageArea.innerHTML += `<p class="error-message">${uploadError.message}</p>`; loadingIndicator.style.display = 'none'; submitButton.disabled = false; return; }


        const formSchema = []; 
        // ... (formSchemaの構築は変更なし)
        const fieldConfigElements = formFieldsContainer.querySelectorAll('.form-field-config');
        let schemaValid = true;
        fieldConfigElements.forEach(el => { /* ... */ const label = el.querySelector('input[data-config-key="label"]').value.trim(); const type = el.querySelector('select[data-config-key="type"]').value; const required = el.querySelector('input[data-config-key="required"]').checked; const name = el.dataset.fieldName; if (!label) { schemaValid = false; return; } formSchema.push({ name, label, type, required }); });
        if (!schemaValid) { /* ... */ messageArea.innerHTML += '<p class="error-message">追加フォーム項目の「表示ラベル」を入力してください。</p>'; loadingIndicator.style.display = 'none'; submitButton.disabled = false; return; }

        // 新しいフィールドの値を取得
        const eventEndDate = document.getElementById('eventEndDate').value;
        const participationFee = document.getElementById('participationFee').value;
        const maxParticipantsInput = document.getElementById('maxParticipants').value;
        const maxParticipants = maxParticipantsInput ? parseInt(maxParticipantsInput, 10) : null;

        if (maxParticipants !== null && (isNaN(maxParticipants) || maxParticipants < 1)) { // ← 追加バリデーション
            messageArea.innerHTML = '<p class="error-message">最大参加人数は1以上の数値を入力してください。</p>';
            document.getElementById('maxParticipants').focus();
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
            return;
        }
        const eventData = {
            name: eventName, // trim() された値を使用
            description: document.getElementById('eventDescription').value,
            event_date: document.getElementById('eventDate').value || null,
            event_end_date: eventEndDate || null, // ← 追加
            location: document.getElementById('eventLocation').value,
            participation_fee: participationFee.trim() || null, // ← 追加 (空ならnull)
            max_participants: maxParticipants,
            image_urls: imageUrls.length > 0 ? imageUrls : null, 
            video_urls: videoUrls.length > 0 ? videoUrls : null,  
            form_schema: formSchema.length > 0 ? formSchema : null,
            // user_id はRLSで自動設定されるか、バックエンドで設定（今回はRLS前提）
        };
        
        loadingIndicator.textContent = "イベント情報を保存中...";
        try {
            const { data, error } = await supabase.from('events').insert([eventData]).select();
            if (error) throw error;
            messageArea.innerHTML = '<p class="success-message">イベントが作成されました！ダッシュボードへ移動します。</p>';
            createEventForm.reset();
            // ... (プレビュークリア処理は変更なし)
            imagePreviewContainer.innerHTML = ''; selectedImageFiles.length = 0; imageCountInfo.textContent = '';
            videoPreviewContainer.innerHTML = ''; selectedVideoFiles.length = 0; videoCountInfo.textContent = '';
            formFieldsContainer.innerHTML = ''; 
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
        } catch (dbError) {
            console.error('Error creating event in DB:', dbError.message);
            messageArea.innerHTML += `<p class="error-message">イベント作成に失敗しました: ${dbError.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
        }
    });
});