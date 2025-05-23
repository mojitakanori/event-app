// js/create.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

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

    const BUCKET_NAME = 'event-media';
    const MAX_IMAGE_UPLOADS = 10; 
    const MAX_VIDEO_UPLOADS = 10; 

    let selectedImageFiles = []; // Fileオブジェクトの配列
    let selectedVideoFiles = []; // Fileオブジェクトの配列

    // プレビューとファイル配列を更新する共通関数
    function updatePreviewAndFileArray(file, previewContainer, selectedFilesArray, fileType, index) {
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        previewItem.dataset.fileIndex = index; // 配列内のインデックスを保持

        let mediaElement;
        if (file.type.startsWith('image/')) {
            mediaElement = document.createElement('img');
        } else if (file.type.startsWith('video/')) {
            mediaElement = document.createElement('video');
            mediaElement.controls = true;
        } else {
            return; // 未対応のファイルタイプ
        }
        mediaElement.src = URL.createObjectURL(file); // FileReaderより効率的で、オブジェクトURLを直接使える
        
        // メディア読み込み完了後にオブジェクトURLを解放する (メモリリーク対策)
        mediaElement.onloadedmetadata = () => { // video用
            // URL.revokeObjectURL(mediaElement.src); // すぐに解放するとプレビューが消える場合があるので注意
        };
        mediaElement.onload = () => { // img用
            // URL.revokeObjectURL(mediaElement.src);
        };


        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.classList.add('remove-preview-btn');
        removeBtn.innerHTML = '×'; // '×' マーク
        removeBtn.onclick = function() {
            // selectedFilesArray から該当ファイルを削除
            // data-file-index を頼りに削除すると、配列が途中で変わった時にズレる可能性あり。
            // Fileオブジェクト自体を比較するか、一意なIDを振るのが確実。
            // ここでは、簡略化のため、プレビュー要素を削除し、再度selectedFilesArrayを構築する。
            const fileToRemove = selectedFilesArray.find(f => URL.createObjectURL(f) === mediaElement.src || f === file); // より確実なファイル特定
            if (fileToRemove) {
                const idx = selectedFilesArray.indexOf(fileToRemove);
                if (idx > -1) {
                    selectedFilesArray.splice(idx, 1);
                }
            }
            
            previewItem.remove(); // プレビューアイテムをDOMから削除
            
            // ファイル数表示を更新
            const countInfo = (fileType === 'image') ? imageCountInfo : videoCountInfo;
            const maxUploads = (fileType === 'image') ? MAX_IMAGE_UPLOADS : MAX_VIDEO_UPLOADS;
            countInfo.textContent = `選択中: ${selectedFilesArray.length} / ${maxUploads} 個`;

            // input要素のFileListを直接操作できないため、
            // 削除後に再度ファイルを選択させるか、現在の選択を維持しアップロード時にselectedFilesArrayを使う。
            // ここでは後者のアプローチ（selectedFilesArrayが真のファイルリスト）。
            // 必要なら、inputの値をリセットしてユーザーに再選択を促すUIにする。
             if (selectedFilesArray.length === 0) {
                const inputEl = (fileType === 'image') ? eventImagesInput : eventVideosInput;
                inputEl.value = ""; // 0個になったらinputもクリア
            }
        };

        previewItem.appendChild(mediaElement);
        previewItem.appendChild(removeBtn);
        previewContainer.appendChild(previewItem);
    }


    // ファイル選択時の処理 (共通関数)
    function handleFileSelection(event, previewContainer, countInfo, maxUploads, targetSelectedFilesArray, fileType) {
        const currentFiles = Array.from(event.target.files);
        
        // 既存の選択ファイルと新規選択ファイルの合計が上限を超えないかチェック
        if (targetSelectedFilesArray.length + currentFiles.length > maxUploads) {
            messageArea.innerHTML = `<p class="error-message">${fileType === 'image' ? '画像' : '動画'}は合計${maxUploads}個まで選択できます。現在の合計選択予定数: ${targetSelectedFilesArray.length + currentFiles.length}個</p>`;
            // event.target.value = ''; // このリセットは、以前の選択も消してしまうので、ここでは行わない。
                                     // ユーザーに一部削除を促すメッセージを出すのが良い。
            // アップロード上限を超える場合、新規に選択されたファイルは追加しない
            return; 
        }
        
        messageArea.innerHTML = ''; // エラーメッセージがあればクリア

        currentFiles.forEach(file => {
            if (targetSelectedFilesArray.length < maxUploads) {
                // 重複チェック (ファイル名とサイズで簡易的に)
                const isDuplicate = targetSelectedFilesArray.some(
                    existingFile => existingFile.name === file.name && existingFile.size === file.size
                );
                if (!isDuplicate) {
                    targetSelectedFilesArray.push(file); // 選択されたファイルを配列に追加
                }
            }
        });

        // プレビューを再描画
        previewContainer.innerHTML = ''; // 既存のプレビューをクリア
        targetSelectedFilesArray.forEach((file, index) => {
            updatePreviewAndFileArray(file, previewContainer, targetSelectedFilesArray, fileType, index);
        });
        
        countInfo.textContent = `選択中: ${targetSelectedFilesArray.length} / ${maxUploads} 個`;

        // input要素の値をクリアしておくと、同じファイルを再度選択したときにchangeイベントが発火する
        event.target.value = ''; 
    }


    eventImagesInput.addEventListener('change', (e) => {
        handleFileSelection(e, imagePreviewContainer, imageCountInfo, MAX_IMAGE_UPLOADS, selectedImageFiles, 'image');
    });

    eventVideosInput.addEventListener('change', (e) => {
        handleFileSelection(e, videoPreviewContainer, videoCountInfo, MAX_VIDEO_UPLOADS, selectedVideoFiles, 'video');
    });


    function generateUniqueFieldName() { /* (変更なし) */
        return `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    function createFormFieldConfigElement() { /* (変更なし) */
        const fieldDiv = document.createElement('div');
        fieldDiv.classList.add('form-field-config');
        fieldDiv.innerHTML = `
            <div><label>表示ラベル:</label><input type="text" data-config-key="label" placeholder="例: 会社名" required></div>
            <div><label>タイプ:</label><select data-config-key="type"><option value="text">一行テキスト</option><option value="textarea">複数行テキスト</option><option value="email">メールアドレス</option><option value="tel">電話番号</option><option value="checkbox">チェックボックス</option></select></div>
            <div><label>必須:</label><input type="checkbox" data-config-key="required"></div>
            <button type="button" class="remove-field-btn">削除</button>
        `;
        fieldDiv.dataset.fieldName = generateUniqueFieldName();
        fieldDiv.querySelector('.remove-field-btn').addEventListener('click', () => fieldDiv.remove());
        return fieldDiv;
    }
    addFormFieldButton.addEventListener('click', () => { /* (変更なし) */
        formFieldsContainer.appendChild(createFormFieldConfigElement());
    });


    async function uploadSingleFile(file, typePrefix = 'media') { /* (変更なし、前回と同じ) */
        if (!file) return null;
        function sanitizeFileName(fileName) {
            const nameParts = fileName.split('.');
            const extension = nameParts.length > 1 ? '.' + nameParts.pop() : '';
            let baseName = nameParts.join('.');
            baseName = baseName.replace(/[^a-zA-Z0-9_.\-]/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '');
            if (!baseName) baseName = 'file';
            return baseName + extension;
        }
        const originalFileName = file.name;
        const sanitizedFileName = sanitizeFileName(originalFileName);
        const filePath = `${typePrefix}/${user.id}/${Date.now()}_${sanitizedFileName}_${Math.random().toString(36).substring(2,7)}`; // ユニーク性を高めるためにランダム文字列追加
        
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) {
            console.error(`Error uploading ${typePrefix} (${originalFileName}):`, error);
            throw new Error(`${originalFileName}のアップロードに失敗しました: ${error.message}`);
        }
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
        return publicUrlData.publicUrl;
    }

    createEventForm.addEventListener('submit', async (e) => {
        // ... (フォーム送信処理の冒頭、認証チェックなどは変更なし)
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
        
        // アップロード対象は selectedImageFiles と selectedVideoFiles を使う
        let imageUrls = [];
        let videoUrls = [];

        try {
            if (selectedImageFiles.length > 0) {
                loadingIndicator.textContent = `画像をアップロード中 (1/${selectedImageFiles.length})...`;
                for (let i = 0; i < selectedImageFiles.length; i++) {
                    loadingIndicator.textContent = `画像をアップロード中 (${i + 1}/${selectedImageFiles.length}): ${selectedImageFiles[i].name}...`;
                    const url = await uploadSingleFile(selectedImageFiles[i], 'image');
                    if (url) imageUrls.push(url);
                }
            }
            if (selectedVideoFiles.length > 0) {
                 loadingIndicator.textContent = `動画をアップロード中 (1/${selectedVideoFiles.length})...`;
                for (let i = 0; i < selectedVideoFiles.length; i++) {
                    loadingIndicator.textContent = `動画をアップロード中 (${i + 1}/${selectedVideoFiles.length}): ${selectedVideoFiles[i].name}...`;
                    const url = await uploadSingleFile(selectedVideoFiles[i], 'video');
                    if (url) videoUrls.push(url);
                }
            }
        } catch (uploadError) {
            messageArea.innerHTML += `<p class="error-message">${uploadError.message}</p>`;
            loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }

        // ... (フォームスキーマ、イベントデータ作成、DB保存処理は前回とほぼ同じ)
        const eventName = document.getElementById('eventName').value;
        if (!eventName.trim()) { 
            messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>';
            loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }
        const formSchema = [];
        const fieldConfigElements = formFieldsContainer.querySelectorAll('.form-field-config');
        let schemaValid = true;
        fieldConfigElements.forEach(el => {
            const label = el.querySelector('input[data-config-key="label"]').value.trim();
            const type = el.querySelector('select[data-config-key="type"]').value;
            const required = el.querySelector('input[data-config-key="required"]').checked;
            const name = el.dataset.fieldName; 
            if (!label) { schemaValid = false; return; }
            formSchema.push({ name, label, type, required });
        });
        if (!schemaValid) {
            messageArea.innerHTML += '<p class="error-message">追加フォーム項目の「表示ラベル」を入力してください。</p>';
            loadingIndicator.style.display = 'none'; submitButton.disabled = false; return;
        }
        const eventData = {
            name: eventName,
            description: document.getElementById('eventDescription').value,
            event_date: document.getElementById('eventDate').value || null,
            location: document.getElementById('eventLocation').value,
            image_urls: imageUrls.length > 0 ? imageUrls : null, 
            video_urls: videoUrls.length > 0 ? videoUrls : null,  
            form_schema: formSchema.length > 0 ? formSchema : null,
        };
        loadingIndicator.textContent = "イベント情報を保存中...";
        try {
            const { data, error } = await supabase.from('events').insert([eventData]).select();
            if (error) throw error;
            messageArea.innerHTML = '<p class="success-message">イベントが作成されました！ダッシュボードへ移動します。</p>';
            createEventForm.reset();
            imagePreviewContainer.innerHTML = ''; selectedImageFiles.length = 0; imageCountInfo.textContent = '';
            videoPreviewContainer.innerHTML = ''; selectedVideoFiles.length = 0; videoCountInfo.textContent = '';
            formFieldsContainer.innerHTML = ''; 
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
        } catch (dbError) {
            console.error('Error creating event in DB:', dbError.message);
            messageArea.innerHTML += `<p class="error-message">イベント作成に失敗しました: ${dbError.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none'; submitButton.disabled = false;
        }
    });
});