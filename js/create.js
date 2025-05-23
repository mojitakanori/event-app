// js/create.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await redirectToLoginIfNotAuthenticated();
    if (!user) return;

    const createEventForm = document.getElementById('createEventForm');
    const messageArea = document.getElementById('messageArea');
    const formFieldsContainer = document.getElementById('formFieldsContainer');
    const addFormFieldButton = document.getElementById('addFormField');

    // 氏名と利用規約は固定項目なので、スキーマビルダーでは扱わない
    // これらは form_schema には含めず、participants テーブルの固定カラムや form_data 内の予約キーで扱う

    function generateUniqueFieldName() {
        return `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    function createFormFieldConfigElement() {
        const fieldDiv = document.createElement('div');
        fieldDiv.classList.add('form-field-config');
        // name属性は内部的に使うので、input要素のname属性は不要になるか、
        // data属性などで保持する。ここではJSオブジェクトで管理する方針。
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
        // 自動生成される内部的なフィールド名をdata属性として保持
        fieldDiv.dataset.fieldName = generateUniqueFieldName();

        fieldDiv.querySelector('.remove-field-btn').addEventListener('click', () => {
            fieldDiv.remove();
        });
        return fieldDiv;
    }

    addFormFieldButton.addEventListener('click', () => {
        formFieldsContainer.appendChild(createFormFieldConfigElement());
    });

    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.innerHTML = '';

        const eventName = document.getElementById('eventName').value;
        const eventDescription = document.getElementById('eventDescription').value;
        const eventDate = document.getElementById('eventDate').value;
        const eventLocation = document.getElementById('eventLocation').value;

        if (!eventName.trim()) {
            messageArea.innerHTML = '<p class="error-message">イベント名を入力してください。</p>';
            return;
        }

        const formSchema = []; // ここにはユーザーが追加したカスタム項目のみ
        const fieldConfigElements = formFieldsContainer.querySelectorAll('.form-field-config');
        let schemaValid = true;
        
        fieldConfigElements.forEach(el => {
            const label = el.querySelector('input[data-config-key="label"]').value.trim();
            const type = el.querySelector('select[data-config-key="type"]').value;
            const required = el.querySelector('input[data-config-key="required"]').checked;
            const name = el.dataset.fieldName; // 自動生成された内部名

            if (!label) { // 名前は自動生成なのでラベルのみチェック
                schemaValid = false;
                return;
            }
            formSchema.push({ name, label, type, required });
        });

        if (!schemaValid) {
            messageArea.innerHTML = '<p class="error-message">追加フォーム項目の「表示ラベル」を入力してください。</p>';
            return;
        }

        const eventData = {
            name: eventName,
            description: eventDescription,
            event_date: eventDate || null,
            location: eventLocation,
            form_schema: formSchema.length > 0 ? formSchema : null,
            // user_id はRLSで自動設定
        };

        try {
            const { data, error } = await supabase
                .from('events')
                .insert([eventData])
                .select();

            if (error) throw error;

            messageArea.innerHTML = '<p class="success-message">イベントが作成されました！ダッシュボードへ移動します。</p>';
            createEventForm.reset();
            formFieldsContainer.innerHTML = ''; 
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Error creating event:', error.message);
            messageArea.innerHTML = `<p class="error-message">イベント作成に失敗しました: ${error.message}</p>`;
        }
    });
});