// js/create.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    // アカウントが有効か確認し、停止中ならトップページへ
    const isActive = await checkUserStatusAndRedirectIfSuspended(user);
    if (!isActive) return; // アカウント停止中の場合はここで処理を中断

    // 特別な権限を持つユーザーのIDリスト (実際のユーザーIDに置き換えてください)
    const SPECIAL_USER_IDS = [
        '5982b68e-6b89-48ce-a4ad-25dfb71cfa94', // 例: MT
        '093e65ae-9f9e-4220-b805-e9b90ae979a8', // 例: dealden
        // 必要に応じて他の特別なユーザーIDを追加
    ];


        const contentSection = document.querySelector('.content-section');

    // 会員種別をチェック
    const membershipType = await checkUserMembership(user);

    if (membershipType == 'free') {
        // 無料会員またはエラーの場合、contentSectionの中身をすべてメッセージに入れ替える
        if (contentSection) {
            contentSection.innerHTML = `
                <div class="message warning-message" style="text-align: center; padding: 2rem;">
                    <h2>プレミアム会員限定機能です</h2>
                    <p style="margin-top: 1rem;">イベントの作成・管理機能は、プレミアム会員プランでご利用いただけます。</p>
                    <p>プランのアップグレードをご希望の場合は、管理者までお問い合わせください。</p>
                </div>
            `;
        }
        return; // 有料会員でない場合は、ここで処理を終了
    }

    const jointEventToggleContainer = document.getElementById('jointEventToggleContainer');
    const isJointEventCheckbox = document.getElementById('isJointEvent');
    const eventTypeContainer = document.getElementById('eventTypeContainer');
    const lunchCheckbox = document.getElementById('eventTypeLunch');
    const eveningCheckbox = document.getElementById('eventTypeEvening');

    // 現在のユーザーが特別なユーザーか確認し、チェックボックスを表示する
    if (user && SPECIAL_USER_IDS.includes(user.id)) {
        if (jointEventToggleContainer) jointEventToggleContainer.style.display = 'block';
        if (eventTypeContainer) eventTypeContainer.style.display = 'block';
    }

    // ★追加: チェックボックスの排他選択（ラジオボタンのように動作させる）
    if (lunchCheckbox && eveningCheckbox) {
        lunchCheckbox.addEventListener('change', () => {
            if (lunchCheckbox.checked) {
                eveningCheckbox.checked = false;
            }
        });
        eveningCheckbox.addEventListener('change', () => {
            if (eveningCheckbox.checked) {
                lunchCheckbox.checked = false;
            }
        });
    }

    const createEventForm = document.getElementById('createEventForm');
    const messageArea = document.getElementById('messageArea');
    const formFieldsContainer = document.getElementById('formFieldsContainer');
    const addFormFieldButton = document.getElementById('addFormField');
    const eventImagesInput = document.getElementById('eventImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imageCountInfo = document.getElementById('imageCountInfo');
    const eventVideosInput = document.getElementById('eventVideos');
    const videoPreviewContainer = document.getElementById('videoPreviewContainer');
    const videoCountInfo = document.getElementById('videoCountInfo');
    const loadingIndicator = document.getElementById('loadingIndicator');

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

    const BUCKET_NAME = 'event-media';
    const MAX_IMAGE_UPLOADS = 10;
    const MAX_VIDEO_UPLOADS = 10;

    let selectedImageFiles = [];
    let selectedVideoFiles = [];

    function updatePreviewAndFileArray(file, previewContainer, selectedFilesArray, fileType, index) { /* (変更なし) */
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
    function handleFileSelection(event, previewContainer, countInfo, maxUploads, targetSelectedFilesArray, fileType) { /* (変更なし) */
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

    function createFormFieldConfigElement() {
        const fieldDiv = document.createElement('div');
        fieldDiv.classList.add('form-field-config');
        fieldDiv.innerHTML = `
            <div>
                <label>表示ラベル:</label>
                <input type="text" data-config-key="label" placeholder="例: 会社名" required>
            </div>
            <div>
                <label>タイプ:</label>
                <select data-config-key="type">
                    <option value="text">一行テキスト</option>
                    <option value="textarea">複数行テキスト</option>
                    <option value="email">メールアドレス</option>
                    <option value="tel">電話番号</option>
                    <option value="checkbox">チェックボックス</option>
                </select>
            </div>
            <div>
                <label>必須:</label>
                <input type="checkbox" data-config-key="required">
            </div>
            <button type="button" class="remove-field-btn">削除</button>
        `;
        fieldDiv.dataset.fieldName = generateUniqueFieldName();
        fieldDiv.querySelector('.remove-field-btn').addEventListener('click', () => fieldDiv.remove());
        return fieldDiv;
    }

    // デフォルトのフォーム項目を生成して追加する関数
    function addDefaultFormField(label, type, required, placeholder = '') {
        const fieldElement = createFormFieldConfigElement();
        const labelInput = fieldElement.querySelector('input[data-config-key="label"]');
        labelInput.value = label;
        if (placeholder) {
            labelInput.placeholder = placeholder;
        }
        fieldElement.querySelector('select[data-config-key="type"]').value = type;
        fieldElement.querySelector('input[data-config-key="required"]').checked = required;
        formFieldsContainer.appendChild(fieldElement);
    }

    // 初期状態で表示するフォーム項目を設定
    addDefaultFormField('会社名', 'textarea', false, '例: ○○株式会社');
    addDefaultFormField('事業内容', 'textarea', false, '例: ITコンサルティング');
    addDefaultFormField('メールアドレス', 'email', true, '例: your.email@example.com');
    addDefaultFormField('電話番号', 'tel', false, '例: 090-1234-5678');
    addDefaultFormField('紹介者名', 'textarea', false, '例: 田中 太郎さん');

    addFormFieldButton.addEventListener('click', () => {
        formFieldsContainer.appendChild(createFormFieldConfigElement());
    });

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
        const eventName = eventNameInput.value.trim();

        if (!eventName) {
            messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>';
            eventNameInput.focus();
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
            return;
        }

        let eventDescriptionContent = '';
        if (quillEditor && eventDescriptionHiddenInput) {
            const descriptionHtml = quillEditor.root.innerHTML;
            if (quillEditor.getText().trim().length === 0) {
                eventDescriptionHiddenInput.value = '';
            } else {
                eventDescriptionHiddenInput.value = descriptionHtml;
            }
            eventDescriptionContent = eventDescriptionHiddenInput.value;
        }

        let imageUrls = [];
        let videoUrls = [];
        try {
            if (selectedImageFiles.length > 0) { for (let i = 0; i < selectedImageFiles.length; i++) { loadingIndicator.textContent = `画像をアップロード中 (${i + 1}/${selectedImageFiles.length}): ${selectedImageFiles[i].name}...`; const url = await uploadSingleFile(selectedImageFiles[i], 'image'); if (url) imageUrls.push(url); } }
            if (selectedVideoFiles.length > 0) { for (let i = 0; i < selectedVideoFiles.length; i++) { loadingIndicator.textContent = `動画をアップロード中 (${i + 1}/${selectedVideoFiles.length}): ${selectedVideoFiles[i].name}...`; const url = await uploadSingleFile(selectedVideoFiles[i], 'video'); if (url) videoUrls.push(url); } }
        } catch (uploadError) { messageArea.innerHTML += `<p class="error-message">${uploadError.message}</p>`; loadingIndicator.style.display = 'none'; submitButton.disabled = false; return; }

        const formSchema = [];
        const fieldConfigElements = formFieldsContainer.querySelectorAll('.form-field-config');
        let schemaValid = true;
        fieldConfigElements.forEach(el => { const label = el.querySelector('input[data-config-key="label"]').value.trim(); const type = el.querySelector('select[data-config-key="type"]').value; const required = el.querySelector('input[data-config-key="required"]').checked; const name = el.dataset.fieldName; if (!label) { schemaValid = false; return; } formSchema.push({ name, label, type, required }); });
        if (!schemaValid) { messageArea.innerHTML += '<p class="error-message">追加フォーム項目の「表示ラベル」を入力してください。</p>'; loadingIndicator.style.display = 'none'; submitButton.disabled = false; return; }

        const eventEndDate = document.getElementById('eventEndDate').value;
        const participationFee = document.getElementById('participationFee').value;
        const maxParticipantsInput = document.getElementById('maxParticipants').value;
        const maxParticipants = maxParticipantsInput ? parseInt(maxParticipantsInput, 10) : null;

        if (maxParticipants !== null && (isNaN(maxParticipants) || maxParticipants < 1)) {
            messageArea.innerHTML = '<p class="error-message">最大参加人数は1以上の数値を入力してください。</p>';
            document.getElementById('maxParticipants').focus();
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
            return;
        }

        const eventArea = document.getElementById('eventArea').value;
        const eveningCheckbox = document.getElementById('eventTypeEvening');
        let eventType = null;
        if (lunchCheckbox && lunchCheckbox.checked) {
            eventType = lunchCheckbox.value;
        } else if (eveningCheckbox && eveningCheckbox.checked) {
            eventType = eveningCheckbox.value;
        }
        
        let isJointEventValue = false; // デフォルトはfalse
        if (isJointEventCheckbox && jointEventToggleContainer && jointEventToggleContainer.style.display === 'block') {
            isJointEventValue = isJointEventCheckbox.checked;
        }
    // 4桁のランダムな数字パスワードを生成
        const generatedPassword = Math.floor(1000 + Math.random() * 9000).toString();

        const eventData = {
            name: eventName,
            description: eventDescriptionContent,
            event_date: document.getElementById('eventDate').value || null,
            event_end_date: eventEndDate || null,
            location: document.getElementById('eventLocation').value,
            area: eventArea || null,
            participation_fee: participationFee.trim() || null,
            max_participants: maxParticipants,
            image_urls: imageUrls.length > 0 ? imageUrls : null,
            video_urls: videoUrls.length > 0 ? videoUrls : null,
            form_schema: formSchema.length > 0 ? formSchema : null,
            is_joint_event: isJointEventValue,
            created_at: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)),
            view_password: generatedPassword, // 生成したパスワードを追加
            event_type: eventType || null // ★追加: eventTypeをデータに含める
        };

        loadingIndicator.textContent = "イベント情報を保存中...";
        try {
            const { data, error } = await supabase.from('events').insert([eventData]).select();
            if (error) throw error;
            
            // 成功メッセージに生成したパスワードを表示
            messageArea.innerHTML = `
                <p class="success-message">イベントが作成されました！10秒後にダッシュボードへ移動します。</p>
                <div class="message warning-message" style="margin-top: 1rem;">
                    <strong>参加者情報 閲覧用パスワード:</strong>
                    <p style="font-size: 1.5rem; font-weight: bold; color: var(--danger-color); letter-spacing: 0.1em;">${generatedPassword}</p>
                    <small>イベント編集画面で再度ご確認いただけます。<br>このパスワードはイベント詳細ページで参加者の詳細情報を閲覧する際に必要です。<br>参加者様にはメールで自動で届いております。</small>
                </div>
            `;
            createEventForm.reset(); // フォーム全体のリセット

            if (quillEditor) {
                quillEditor.setText('');
            }
            // 合同イベントチェックボックスもリセット（非表示の場合でも安全）
            if (isJointEventCheckbox) {
                isJointEventCheckbox.checked = false;
            }

            imagePreviewContainer.innerHTML = ''; selectedImageFiles.length = 0; imageCountInfo.textContent = '';
            videoPreviewContainer.innerHTML = ''; selectedVideoFiles.length = 0; videoCountInfo.textContent = '';
            formFieldsContainer.innerHTML = ''; // コンテナをクリア
            // デフォルト項目を再追加（またはページ遷移するので不要なら削除）
            addDefaultFormField('事業内容', 'textarea', false, '例: ITコンサルティング');
            addDefaultFormField('メールアドレス', 'email', true, '例: your.email@example.com');
            addDefaultFormField('電話番号', 'textarea', false, '例: 090-1234-5678');

        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 10000); // メッセージを読む時間を考慮して少し延長
    } catch (dbError) {
            console.error('Error creating event in DB:', dbError.message);
            messageArea.innerHTML += `<p class="error-message">イベント作成に失敗しました: ${dbError.message}</p>`;
            if (dbError.message.includes('column "area" of relation "events" does not exist')) {
                messageArea.innerHTML += `<p class="error-message"><b>データベースエラー:</b> "events"テーブルに "area" カラムが存在しないようです。Supabaseのテーブル設定を確認し、"area" カラム (TEXT型) を追加してください。</p>`;
            }
            if (dbError.message.includes('column "is_joint_event" of relation "events" does not exist')) {
                messageArea.innerHTML += `<p class="error-message"><b>データベースエラー:</b> "events"テーブルに "is_joint_event" カラムが存在しないようです。Supabaseのテーブル設定を確認し、"is_joint_event" カラム (boolean型、デフォルトfalse) を追加してください。</p>`;
            }
    } finally {
        loadingIndicator.style.display = 'none';
        submitButton.disabled = false;
    }
    });
});