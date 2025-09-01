// js/edit_event.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const SPECIAL_USER_IDS = [
        '5982b68e-6b89-48ce-a4ad-25dfb71cfa94', // 例: MT
        '093e65ae-9f9e-4220-b805-e9b90ae979a8', // 例: dealden
    ];

    const jointEventToggleContainer = document.getElementById('jointEventToggleContainer');
    const isJointEventCheckbox = document.getElementById('isJointEvent');
    const lunchCheckbox = document.getElementById('eventTypeLunch');
    const eveningCheckbox = document.getElementById('eventTypeEvening');
    
    if (lunchCheckbox && eveningCheckbox) {
        lunchCheckbox.addEventListener('change', () => { if (lunchCheckbox.checked) eveningCheckbox.checked = false; });
        eveningCheckbox.addEventListener('change', () => { if (eveningCheckbox.checked) eveningCheckbox.checked = false; });
    }

    const editEventForm = document.getElementById('editEventForm');
    const eventIdInput = document.getElementById('eventId');
    const messageArea = document.getElementById('messageArea');
    const formLoadingMessage = document.getElementById('formLoadingMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const userSelectionContainer = document.getElementById('userSelectionContainer');
    const eventOwnerSelect = document.getElementById('eventOwner');

    const eventNameInput = document.getElementById('eventName');
    const eventDateInput = document.getElementById('eventDate');
    const eventEndDateInput = document.getElementById('eventEndDate');
    const eventLocationInput = document.getElementById('eventLocation');
    const eventAreaInput = document.getElementById('eventArea');
    const participationFeeInput = document.getElementById('participationFee');
    const maxParticipantsInput = document.getElementById('maxParticipants');

    const eventDescriptionHiddenInput = document.getElementById('eventDescription');
    const eventDescriptionEditorDiv = document.getElementById('eventDescriptionEditor');
    let quillEditor;

    if (eventDescriptionEditorDiv && eventDescriptionHiddenInput) {
        quillEditor = new Quill('#eventDescriptionEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link'],
                    ['clean']
                ]
            },
            placeholder: 'イベントの詳細や持ち物、注意事項などを入力してください...'
        });
    }

    const currentImagesContainer = document.getElementById('currentImagesContainer');
    const eventNewImagesInput = document.getElementById('eventNewImages');
    const newImageCountInfo = document.getElementById('newImageCountInfo');
    const newImagePreviewContainer = document.getElementById('newImagePreviewContainer');
    const currentVideosContainer = document.getElementById('currentVideosContainer');
    const eventNewVideosInput = document.getElementById('eventNewVideos');
    const newVideoCountInfo = document.getElementById('newVideoCountInfo');
    const newVideoPreviewContainer = document.getElementById('newVideoPreviewContainer');
    const formFieldsContainer = document.getElementById('formFieldsContainer');
    const addFormFieldButton = document.getElementById('addFormField');

    const BUCKET_NAME = 'event-media';
    const MAX_IMAGE_UPLOADS = 10;
    const MAX_VIDEO_UPLOADS = 10;

    let newSelectedImageFiles = [];
    let newSelectedVideoFiles = [];
    let existingImageUrls = [];
    let existingVideoUrls = [];

    const urlParams = new URLSearchParams(window.location.search);
    const currentEventIdToEdit = urlParams.get('id');

    if (!currentEventIdToEdit) {
        messageArea.innerHTML = '<p class="error-message">編集するイベントIDが指定されていません。</p>';
        formLoadingMessage.style.display = 'none';
        return;
    }
    eventIdInput.value = currentEventIdToEdit;
    
    // Helper functions (変更なし、そのまま)

    /**
     * 画像ファイルをWebP形式に変換・圧縮する関数
     */
    async function convertToWebP(imageFile) {
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp'
        };
        try {
            console.log(`変換前: ${imageFile.name}, サイズ: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
            const compressedFile = await imageCompression(imageFile, options);
            console.log(`変換後: ${compressedFile.name}, サイズ: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
            return compressedFile;
        } catch (error) {
            console.error('画像のWebP変換に失敗しました:', error);
            return imageFile; // エラー時は元のファイルを返す
        }
    }
    
    function sanitizeFileName(fileName) { /* (変更なし) */ const nameParts = fileName.split('.'); const extension = nameParts.length > 1 ? '.' + nameParts.pop() : ''; let baseName = nameParts.join('.'); baseName = baseName.replace(/[^a-zA-Z0-9_.\-]/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, ''); if (!baseName) baseName = 'file'; return baseName + extension; }
    async function uploadSingleFile(file, typePrefix = 'media') {
        if (!file) return null;

        // WebP変換処理を呼び出す
        const fileToUpload = await convertToWebP(file);

        // .webp形式のファイル名を作成
        const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const sanitizedFileName = sanitizeFileName(`${originalName}.webp`);

        const filePath = `${typePrefix}/${user.id}/${Date.now()}_${sanitizedFileName}_${Math.random().toString(36).substring(2,7)}`;
        const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, fileToUpload, { cacheControl: '3600', upsert: false });
        
        if (error) { console.error(`Error uploading ${typePrefix} (${originalName}):`, error); throw new Error(`${originalName}のアップロードに失敗しました: ${error.message}`); }
        
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
        return publicUrlData.publicUrl;
    }    function generateUniqueFieldName() { /* (変更なし) */ return `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; }
    function updateNewFilePreview(file, previewContainer, selectedFilesArray, fileType) { /* (変更なし) */
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
            const maxUploads = (fileType === 'image') ? MAX_IMAGE_UPLOADS : MAX_VIDEO_UPLOADS;
            countInfo.textContent = `選択中: ${selectedFilesArray.length}`;
             if (selectedFilesArray.length === 0) { const inputEl = (fileType === 'image') ? eventNewImagesInput : eventNewVideosInput; inputEl.value = "";}
        };
        previewItem.appendChild(mediaElement); previewItem.appendChild(removeBtn); previewContainer.appendChild(previewItem);
    }
    function handleNewFileSelection(event, previewContainer, countInfo, maxUploads, targetSelectedFilesArray, fileType, existingCount) { /* (変更なし) */
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
    function displayCurrentMedia(urls, container, type) { /* (変更なし) */
        container.innerHTML = '';
        (urls || []).forEach((url, index) => {
            if (!url) return;
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('current-media-item', 'preview-item');
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
            deleteBtn.classList.add('remove-preview-btn');
            deleteBtn.onclick = async () => {
                if (!confirm(`${type === 'image' ? '画像' : '動画'}「${url.split('/').pop()}」を削除しますか？この操作は元に戻せません。`)) return;

                try {
                    const filePath = url.substring(url.indexOf(BUCKET_NAME + '/') + (BUCKET_NAME + '/').length);
                    console.log("Attempting to delete from storage:", filePath);
                    const { error: deleteStorageError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
                    if (deleteStorageError) {
                        console.error("Error deleting from storage:", deleteStorageError);
                    }
                } catch (e) {
                    console.error("Exception deleting from storage:", e);
                }

                if (type === 'image') existingImageUrls = existingImageUrls.filter(u => u !== url);
                else existingVideoUrls = existingVideoUrls.filter(u => u !== url);

                itemDiv.remove();
                if (type === 'image') handleNewFileSelection({target:{files:[]}}, newImagePreviewContainer, newImageCountInfo, MAX_IMAGE_UPLOADS, newSelectedImageFiles, 'image', existingImageUrls.length);
                else handleNewFileSelection({target:{files:[]}}, newVideoPreviewContainer, newVideoCountInfo, MAX_VIDEO_UPLOADS, newSelectedVideoFiles, 'video', existingVideoUrls.length);

            };
            itemDiv.appendChild(deleteBtn);
            container.appendChild(itemDiv);
        });
    }
    function createFormFieldConfigElement(fieldData = {}) { /* (変更なし) */
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


    async function loadEventData() {
        formLoadingMessage.style.display = 'block';
        editEventForm.style.display = 'none';
        try {
            const membershipType = await checkUserMembership(user);
            const isAdminUser = membershipType === 'admin';

            let query = supabase
                .from('events')
                .select('*')
                .eq('id', currentEventIdToEdit);

            if (!isAdminUser) {
                query = query.eq('user_id', user.id);
            }
            
            const { data: event, error } = await query.single();

            if (error) {
                if (error.code === 'PGRST116') throw new Error('指定されたイベントが見つからないか、編集権限がありません。');
                throw error;
            }

            if (event) {
                if (isAdminUser) {
                    userSelectionContainer.style.display = 'block';
                    try {
                        const { data: users, error: usersError } = await supabase
                            .from('profiles')
                            .select('id, username')
                            .in('membership_type', ['premium', 'owner', 'admin'])
                            .order('username', { ascending: true });

                        if (usersError) throw usersError;

                        eventOwnerSelect.innerHTML = '';
                        
                        users.forEach(u => {
                            const option = document.createElement('option');
                            option.value = u.id;
                            if (u.id === user.id) {
                                option.textContent = `${u.username || '自分自身'} (管理者)`;
                            } else {
                                option.textContent = u.username || `(未設定: ${u.id.substring(0, 6)})`;
                            }
                            eventOwnerSelect.appendChild(option);
                        });

                        eventOwnerSelect.value = event.user_id;

                    } catch (err) {
                        messageArea.innerHTML += `<p class="error-message">ユーザーリストの読み込みに失敗しました: ${err.message}</p>`;
                    }
                }

                eventNameInput.value = event.name || '';

                const passwordDisplayArea = document.getElementById('passwordDisplayArea');
                if (event.view_password && passwordDisplayArea) {
                    passwordDisplayArea.innerHTML = `
                        <div class="message warning-message" style="margin-top: 1rem;">
                            <strong>参加者情報 閲覧用パスワード:</strong>
                            <p style="font-size: 1.5rem; font-weight: bold; color: var(--danger-color); letter-spacing: 0.1em;">${event.view_password}</p>
                            <small>このパスワードはイベント詳細ページで参加者の詳細情報を閲覧する際に必要です。<br>参加者様にはメールで自動で届いております。</small>
                        </div>
                    `;
                }
                if (quillEditor) {
                    if (event.description) quillEditor.root.innerHTML = event.description;
                    else quillEditor.setText('');
                }

                if (event.event_date) eventDateInput.value = new Date(event.event_date).toISOString().substring(0, 16);
                if (event.event_end_date) eventEndDateInput.value = new Date(event.event_end_date).toISOString().substring(0, 16);
                eventLocationInput.value = event.location || '';
                if (eventAreaInput) eventAreaInput.value = event.area || '';
                participationFeeInput.value = event.participation_fee || '';
                maxParticipantsInput.value = event.max_participants || '';

                if (SPECIAL_USER_IDS.includes(user.id) || isAdminUser) {
                    if(jointEventToggleContainer) jointEventToggleContainer.style.display = 'block';
                    isJointEventCheckbox.checked = event.is_joint_event === true;
                    if(eventTypeContainer) eventTypeContainer.style.display = 'block';
                    if(lunchCheckbox) lunchCheckbox.checked = (event.event_type === 'Lunchtime meeting');
                    if(eveningCheckbox) eveningCheckbox.checked = (event.event_type === 'Evening meeting');
                }

                existingImageUrls = event.image_urls || [];
                existingVideoUrls = event.video_urls || [];
                displayCurrentMedia(existingImageUrls, currentImagesContainer, 'image');
                displayCurrentMedia(existingVideoUrls, currentVideosContainer, 'video');
                
                formFieldsContainer.innerHTML = '';
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

    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '';
        const submitButton = editEventForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        loadingIndicator.textContent = "更新処理中...";
        loadingIndicator.style.display = 'block';

        const eventName = eventNameInput.value.trim();
        if (!eventName) {
            messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>';
            eventNameInput.focus(); loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }

        const maxParticipantsVal = maxParticipantsInput.value ? parseInt(maxParticipantsInput.value, 10) : null;
        if (maxParticipantsInput.value && (isNaN(maxParticipantsVal) || maxParticipantsVal < 1)) {
            messageArea.innerHTML = '<p class="error-message">最大参加人数は1以上の数値を入力してください。</p>';
            maxParticipantsInput.focus(); loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }

        let eventDescriptionContent = '';
        if (quillEditor) {
             eventDescriptionContent = quillEditor.root.innerHTML;
        }

        let uploadedImageUrls = [...existingImageUrls];
        let uploadedVideoUrls = [...existingVideoUrls];
        try {
            // ▼▼▼ ここから修正 ▼▼▼
            if (newSelectedImageFiles.length > 0) {
                for (let i = 0; i < newSelectedImageFiles.length; i++) {
                    loadingIndicator.textContent = `新しい画像をアップロード中 (${i + 1}/${newSelectedImageFiles.length})...`;
                    const url = await uploadSingleFile(newSelectedImageFiles[i], 'image');
                    if (url) uploadedImageUrls.push(url);
                }
            }
            if (newSelectedVideoFiles.length > 0) {
                for (let i = 0; i < newSelectedVideoFiles.length; i++) {
                    loadingIndicator.textContent = `新しい動画をアップロード中 (${i + 1}/${newSelectedVideoFiles.length})...`;
                    const url = await uploadSingleFile(newSelectedVideoFiles[i], 'video');
                    if (url) uploadedVideoUrls.push(url);
                }
            }
            // ▲▲▲ ここまで修正 ▲▲▲
        } catch (uploadError) { 
            messageArea.innerHTML += `<p class="error-message">${uploadError.message}</p>`;
            loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }
        
        const formSchema = []; 
        let schemaValid = true;
        formFieldsContainer.querySelectorAll('.form-field-config').forEach(el => {
            const label = el.querySelector('[data-config-key="label"]').value.trim();
            if(!label) schemaValid = false;
            formSchema.push({
                name: el.dataset.fieldName,
                label: label,
                type: el.querySelector('[data-config-key="type"]').value,
                required: el.querySelector('[data-config-key="required"]').checked
            });
        });
        if (!schemaValid) {
             messageArea.innerHTML += '<p class="error-message">追加フォーム項目の「表示ラベル」を入力してください。</p>';
             loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }

        const eventDataToUpdate = {
            name: eventName,
            description: eventDescriptionContent,
            event_date: eventDateInput.value || null,
            event_end_date: eventEndDateInput.value || null,
            location: eventLocationInput.value,
            area: eventAreaInput.value || null,
            participation_fee: participationFeeInput.value.trim() || null,
            max_participants: maxParticipantsVal,
            image_urls: uploadedImageUrls,
            video_urls: uploadedVideoUrls,
            form_schema: formSchema,
            is_joint_event: isJointEventCheckbox.checked,
            event_type: lunchCheckbox.checked ? lunchCheckbox.value : (eveningCheckbox.checked ? eveningCheckbox.checked : null)
        };
        
        const membershipType = await checkUserMembership(user);
        if (membershipType === 'admin') {
            eventDataToUpdate.user_id = eventOwnerSelect.value;
        }

        try {
            loadingIndicator.textContent = "イベント情報を更新中...";
            const { data, error } = await supabase
                .from('events')
                .update(eventDataToUpdate)
                .eq('id', currentEventIdToEdit);

            if (error) throw error;

            messageArea.innerHTML = '<p class="success-message">イベント情報が更新されました。ダッシュボードに戻ります。</p>';
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

        } catch (dbError) {
            console.error('Error updating event:', dbError);
            messageArea.innerHTML += `<p class="error-message">イベント更新に失敗しました: ${dbError.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    loadEventData();
});

