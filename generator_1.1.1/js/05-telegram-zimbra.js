        // Загрузка конфигурации из config.json
        let TELEGRAM_TOKEN = '8542040998:AAGuwymgAEPeB43PoHFNPyJPJxG-EzntzaI';
        let TELEGRAM_CHAT_ID = '-1003692249032';
        
        // Попытка загрузить конфигурацию из config.json
        fetch('config.json')
            .then(response => {
                if (!response.ok) throw new Error('Config not found');
                return response.json();
            })
            .then(config => {
                if (config.telegram) {
                    if (config.telegram.token && config.telegram.token !== 'ВАШ_ТОКЕН') {
                        TELEGRAM_TOKEN = config.telegram.token;
                    }
                    if (config.telegram.chat_id && config.telegram.chat_id !== 'ВАШ_CHAT_ID') {
                        TELEGRAM_CHAT_ID = config.telegram.chat_id;
                    }
                }
                console.log('Config loaded:', { token: TELEGRAM_TOKEN ? 'SET' : 'MISSING', chat_id: TELEGRAM_CHAT_ID ? 'SET' : 'MISSING' });
            })
            .catch(err => {
                console.log('Using default config:', err.message);
            });

        // Хранилище telegram_message_id по системам (для привязки ответов)
        function getStartMessageIds() {
            try { return JSON.parse(localStorage.getItem('generator_start_msg_ids') || '{}'); }
            catch { return {}; }
        }
        function saveStartMessageId(system, dateStart, msgId) {
            const ids = getStartMessageIds();
            ids[system] = { message_id: msgId, dateStart: dateStart, time: Date.now() };
            localStorage.setItem('generator_start_msg_ids', JSON.stringify(ids));
        }
        function getStartMessageId(system, dateStart) {
            const ids = getStartMessageIds();
            if (ids[system] && ids[system].dateStart === dateStart) return ids[system].message_id;
            if (ids[system]) return ids[system].message_id;
            return null;
        }

        // История отправленных сообщений (для выбора ответа)
        const TG_HISTORY_KEY = 'generator_tg_history';
        const TG_HISTORY_MAX = 15;
        function getTgHistory() {
            try { return JSON.parse(localStorage.getItem(TG_HISTORY_KEY) || '[]'); }
            catch { return []; }
        }
        function addTgHistoryItem(item) {
            const hist = getTgHistory();
            hist.unshift(item);
            if (hist.length > TG_HISTORY_MAX) hist.length = TG_HISTORY_MAX;
            localStorage.setItem(TG_HISTORY_KEY, JSON.stringify(hist));
        }
        function clearTgHistory() {
            localStorage.removeItem(TG_HISTORY_KEY);
        }

        // Функция отправки сообщения в Telegram (универсальная)
        async function sendToTelegram(text, replyToMessageId = null) {
            const body = {
                token: TELEGRAM_TOKEN,
                chat_id: TELEGRAM_CHAT_ID,
                text: text
            };
            if (replyToMessageId) {
                body.reply_to_message_id = replyToMessageId;
            }
            const response = await fetch('/send-to-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return await response.json();
        }

        // Reply picker state
        let replyPickerResolve = null;

        function openReplyPicker(history) {
            const overlay = $('replyPickerOverlay');
            const list = $('replyPickerList');
            list.innerHTML = '';
            let selectedId = null;

            if (history.length === 0) {
                list.innerHTML = '<div class="reply-picker-empty">История сообщений пуста.<br>Отправьте сообщение, чтобы оно появилось здесь.</div>';
            }

            history.forEach(item => {
                const div = document.createElement('div');
                div.className = 'reply-picker-item';
                div.dataset.msgId = item.message_id;
                const typeLabels = { start: 'Начало', completion: 'Завершение', extension: 'Продление' };
                const typeClass = item.msgType || 'other';
                const typeLabel = typeLabels[item.msgType] || item.msgType || '—';
                const system = item.system || '—';
                const preview = (item.text || '').substring(0, 80).replace(/\n/g, ' ');
                const date = item.time ? new Date(item.time).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';

                // Даты начала и завершения работ
                let dateInfo = '';
                if (item.dateStart) {
                    dateInfo += `<span style="color:#2e7d32">Начало: ${item.dateStart}${item.timeRange ? ' ' + item.timeRange : ''}</span>`;
                }
                if (item.dateCompletion) {
                    if (dateInfo) dateInfo += ' · ';
                    dateInfo += `<span style="color:#e65100">Заверш: ${item.dateCompletion}${item.timeCompletion ? ' ' + item.timeCompletion : ''}</span>`;
                }

                div.innerHTML = `
                    <div class="reply-picker-item-id">#${item.message_id}</div>
                    <div class="reply-picker-item-body">
                        <span class="reply-picker-item-type ${typeClass}">${typeLabel}</span>
                        <div class="reply-picker-item-system">${system}</div>
                        ${dateInfo ? `<div class="reply-picker-item-dates" style="font-size:11px;margin:2px 0">${dateInfo}</div>` : ''}
                        <div class="reply-picker-item-preview" title="${(item.text || '').replace(/"/g, '&quot;')}">${preview}</div>
                    </div>
                    <div class="reply-picker-item-date">${date}</div>
                `;

                div.addEventListener('click', () => {
                    list.querySelectorAll('.reply-picker-item').forEach(el => el.classList.remove('selected'));
                    div.classList.add('selected');
                    selectedId = item.message_id;
                    $('replyPickerSend').disabled = false;
                });

                list.appendChild(div);
            });

            overlay.classList.add('show');

            return new Promise(resolve => {
                replyPickerResolve = resolve;

                $('replyPickerSend').onclick = () => {
                    overlay.classList.remove('show');
                    resolve(selectedId);
                };
                $('replyPickerSkip').onclick = () => {
                    overlay.classList.remove('show');
                    resolve(null);
                };
                $('replyPickerCancel').onclick = () => {
                    overlay.classList.remove('show');
                    resolve(undefined);
                };
                $('replyPickerClose').onclick = () => {
                    overlay.classList.remove('show');
                    resolve(undefined);
                };
            });
        }

        async function doSendTelegram(btn, text, replyToMessageId) {
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-telegram-icon">⏳</span> Отправка...';
            try {
                const result = await sendToTelegram(text, replyToMessageId);
                if (result.success) {
                    playTelegramSound();
                    btn.classList.add('success');
                    btn.innerHTML = '<span style="font-size: 14px;">✓</span> Отправлено!';
                    showStatus('Уведомление отправлено в Telegram!');
                    return result;
                } else {
                    playErrorSound();
                    btn.classList.add('error');
                    btn.innerHTML = '<span style="font-size: 14px;">✗</span> Ошибка';
                    showStatus('Ошибка отправки: ' + (result.error || 'Неизвестная ошибка'), 'error');
                    return null;
                }
            } catch (err) {
                playErrorSound();
                btn.classList.add('error');
                btn.innerHTML = '<span style="font-size: 14px;">✗</span> Ошибка';
                showStatus('Ошибка соединения с сервером: ' + err.message, 'error');
                return null;
            } finally {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.classList.remove('success', 'error');
                    btn.innerHTML = '<span class="btn-telegram-icon">✈️</span> Telegram';
                }, 2000);
            }
        }

        $('sendToTelegramBtn').addEventListener('click', async function() {
            const btn = this;
            const text = $('previewText').textContent;
            const msgType = $('messageType').value;
            const system = $('system').value;

            if (!text || text.trim() === '') {
                playErrorSound();
                showStatus('Сначала сгенерируйте уведомление!', 'error');
                return;
            }
            if (TELEGRAM_TOKEN === 'ВАШ_ТОКЕН' || TELEGRAM_CHAT_ID === 'ВАШ_CHAT_ID') {
                playErrorSound();
                showStatus('Настройте TELEGRAM_TOKEN и TELEGRAM_CHAT_ID в коде!', 'error');
                return;
            }

            let replyToMessageId = null;

            if (msgType === 'completion' || msgType === 'extension') {
                const history = getTgHistory();
                const chosen = await openReplyPicker(history);
                if (chosen === undefined) return; // отмена
                replyToMessageId = chosen;
            }

            const result = await doSendTelegram(btn, text, replyToMessageId);

            if (result && result.success) {
                // Сохраняем в историю
                addTgHistoryItem({
                    message_id: result.message_id,
                    text: text,
                    system: system,
                    msgType: msgType,
                    time: Date.now(),
                    dateStart: $('dateStart').value,
                    timeRange: $('timeRange').value,
                    dateCompletion: $('dateCompletion').value,
                    timeCompletion: $('timeCompletion').value
                });
                // Сохраняем message_id для привязки, если это начало работ
                if (msgType === 'start') {
                    const dateStart = $('dateStart').value;
                    saveStartMessageId(system, dateStart, result.message_id);
                    const queueItem = queue.find(q =>
                        q.msgType === 'start' && q.system === system && q.dateStart === dateStart
                    );
                    if (queueItem) {
                        queueItem.telegram_message_id = result.message_id;
                        saveQueueToStorage();
                        updateQueueUI();
                    }
                }
            }
        });

        $('sendToZimbraBtn').addEventListener('click', async function() {
            const btn = this;
            const html = $('preview').innerHTML;
            const msgType = $('messageType').value;

            if (!html || html.trim() === '') {
                playErrorSound();
                showStatus('Сначала сгенерируйте уведомление!', 'error');
                return;
            }

            const minified_html = html.replace(/>\s+</g, '><').trim();
            const subject = $('subjectInput').value;
            const to = $('toInput').value;
            const cc = $('ccInput').value;

            btn.disabled = true;
            btn.innerHTML = '<span class="btn-zimbra-icon">⏳</span> Отправка...';

            try {
                let payload;
                if (msgType === 'start') {
                    console.log('Sending to Zimbra: with subject and recipients');
                    payload = { html: minified_html, subject: subject, to: to, cc: cc };
                } else {
                    console.log('Sending to Zimbra: HTML only (extension/completion)');
                    payload = { html: minified_html, subject: null, to: null, cc: null };
                }
                
                const resp = await fetch('http://localhost:8000/send-to-zimbra', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                const result = await resp.json();

                if (result.success) {
                    playZimbraSound();
                    btn.classList.add('success');
                    btn.innerHTML = '<span class="btn-zimbra-icon">✓</span> Отправлено!';
                    if (msgType === 'start') {
                        showStatus('Тема и адресаты вставлены в Zimbra!', 'success');
                    } else {
                        showStatus('HTML скопирован в Zimbra!', 'success');
                    }
                    setTimeout(() => {
                        btn.classList.remove('success');
                        btn.innerHTML = '<span class="btn-zimbra-icon">📧</span> Zimbra';
                        btn.disabled = false;
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (e) {
                playErrorSound();
                btn.classList.add('error');
                btn.innerHTML = '<span class="btn-zimbra-icon">✗</span> Ошибка';
                showStatus('Ошибка: ' + e.message, 'error');
                setTimeout(() => {
                    btn.classList.remove('error');
                    btn.innerHTML = '<span class="btn-zimbra-icon">📧</span> Zimbra';
                    btn.disabled = false;
                }, 3000);
            }
        });

