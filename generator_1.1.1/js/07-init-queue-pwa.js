        document.addEventListener('DOMContentLoaded', () => {
            // Принудительно запрещаем выделение кнопки генерации
            const generateBtn = $('generateBtn');
            if (generateBtn) {
                generateBtn.style.userSelect = 'none';
                generateBtn.style.webkitUserSelect = 'none';
                generateBtn.style.mozUserSelect = 'none';
                generateBtn.style.msUserSelect = 'none';
                // Также для всех дочерних элементов
                generateBtn.querySelectorAll('*').forEach(el => {
                    el.style.userSelect = 'none';
                    el.style.webkitUserSelect = 'none';
                    el.style.mozUserSelect = 'none';
                    el.style.msUserSelect = 'none';
                });
                
                // Предотвращаем выделение при клике на кнопку
                generateBtn.addEventListener('selectstart', (e) => {
                    e.preventDefault();
                    return false;
                });
                
                generateBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    return false;
                });
            }
            
            // Также предотвращаем выделение на кнопках копирования
            document.querySelectorAll('.btn-copy, .btn-copy-subject').forEach(btn => {
                btn.addEventListener('selectstart', (e) => {
                    e.preventDefault();
                    return false;
                });
                
                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    return false;
                });
            });
            
            // Предотвращаем выделение на кнопках очереди и звука
            document.querySelectorAll('.queue-add-btn, .queue-toggle-btn, .queue-close-btn, .sound-toggle-btn').forEach(btn => {
                btn.addEventListener('selectstart', (e) => {
                    e.preventDefault();
                    return false;
                });
                
                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    return false;
                });
            });
            
            $('dateStart').value = getCurrentDate();
            updateServicesBySystem($('system').value, currentWorkType);
            updateSubjectByType(currentWorkType);
            updateEmails();
            // Инициализация previousSystem при загрузке
            previousSystem = $('system').value;
            // Обновить видимость полей при загрузке
            updateFormForMessageType();
            $('generateBtn').click();

            // Генерация по Enter
            document.querySelectorAll('input, textarea, select').forEach(el => {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        $('generateBtn').click();
                    }
                });
            });

            // ============================================
            // ПЕРЕКЛЮЧАТЕЛЬ ЗВУКОВ
            // ============================================

            // Обновляем иконку при загрузке
            const soundIcon = $('soundIcon');
            const soundToggleBtn = $('soundToggleBtn');
            function updateSoundIcon() {
                if (soundIcon) {
                    soundIcon.src = soundsEnabled ? 'icons/volume.svg' : 'icons/volume-off.svg';
                    soundIcon.alt = soundsEnabled ? 'Звук вкл' : 'Звук выкл';
                }
                if (soundToggleBtn) {
                    soundToggleBtn.classList.toggle('muted', !soundsEnabled);
                }
            }
            updateSoundIcon();

            if (soundToggleBtn) {
                soundToggleBtn.addEventListener('click', () => {
                    soundsEnabled = !soundsEnabled;
                    localStorage.setItem('generator_sounds_enabled', soundsEnabled);
                    updateSoundIcon();
                    if (soundsEnabled) {
                        playSwitchSound();
                    }
                });
            }

        // ============================================
        // ОЧИСТКА СТАРОГО КЭША ПРИ ЗАГРУЗКЕ
        // ============================================
        
        async function clearOldCache() {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.startsWith('generator-v1.0.8')) {
                        console.log('[Cache] Deleting old cache:', cacheName);
                        await caches.delete(cacheName);
                    }
                }
            }
        }
        clearOldCache();

        // ============================================
        // ОБНОВЛЕНИЕ (Auto-Update)
        // ============================================

        // Run immediately since script is at end of body
        console.log('[Update] Script running, looking for button...');
        
        function initUpdateButton() {
            const updateBtn = document.getElementById('updateBtn');
            console.log('[Update] Button element:', updateBtn);
            
            if (updateBtn) {
                console.log('[Update] Button found, attaching handler');
                updateBtn.addEventListener('click', async () => {
                    console.log('[Update] Button clicked');
                    updateBtn.classList.add('checking');
                    updateBtn.disabled = true;
                    
try {
                        console.log('[Update] Fetching check-update...');
                        const response = await fetch('check-update');
                        console.log('[Update] Response status:', response.status);
                        const data = await response.json();
                        console.log('[Update] Response data:', data);
                        
                        if (data.updateAvailable) {
                            const confirmUpdate = confirm(
                                `Доступна новая версия: ${data.latestVersion}\n` +
                                `Текущая версия: ${data.currentVersion}\n\n` +
                                `Обновить сейчас?`
                            );
                            
                            if (confirmUpdate) {
                                showStatus('Запускаю обновление...', 'info');
                                
                                const updateResponse = await fetch('do-update', { 
                                    method: 'POST' 
                                });
                                const updateResult = await updateResponse.json();
                                console.log('[Update] Update result:', updateResult);
                                alert('Результат: ' + JSON.stringify(updateResult));
                                
                                if (updateResult.success) {
                                    showStatus('Обновление скачано! Перезапустите генератор.', 'success');
                                } else {
                                    showStatus('Ошибка: ' + updateResult.error, 'error');
                                }
                            }
                        } else if (data.error) {
                            showStatus('Ошибка: ' + data.error, 'error');
                            alert('Ошибка: ' + data.error);
                        } else {
                            showStatus('У вас последняя версия!', 'success');
                            alert('Версия ' + data.currentVersion + ' актуальна');
                        }
                    } catch (err) {
                        console.error('[Update] Error:', err);
                        showStatus('Ошибка: ' + err.message, 'error');
                    } finally {
                        updateBtn.classList.remove('checking');
                        updateBtn.disabled = false;
                    }
                });
            } else {
                console.error('[Update] Button not found, retrying in 1s...');
                setTimeout(initUpdateButton, 1000);
            }
        }
        
        // Start immediately
        initUpdateButton();

            // ============================================
            // АВТООБНОВЛЕНИЕ ПРЕВЬЮ В РЕАЛЬНОМ ВРЕМЕНИ
            // ============================================

            // Текстовые поля - с задержкой 300мс
            const textFields = ['dateStart', 'timeRange', 'dateCompletion', 'timeCompletion', 
                               'extensionTime', 'system', 'services', 'impact', 
                               'recommendations', 'additionalMessage', 'subjectInput'];
            
            textFields.forEach(fieldId => {
                const field = $(fieldId);
                if (field) {
                    field.addEventListener('input', debouncedAutoGenerate);
                }
            });

            // Чекбоксы - мгновенная реакция
            $('includeRecommendations').addEventListener('change', autoGenerate);
            $('includeAdditionalMessage').addEventListener('change', autoGenerate);

            // Сегменты типов работ - добавляем автообновление
            document.querySelectorAll('.segment-label').forEach(label => {
                label.addEventListener('click', () => {
                    setTimeout(autoGenerate, 50);
                });
            });

            // Сегменты типов сообщений - добавляем автообновление
            document.querySelectorAll('.message-radio').forEach(radio => {
                radio.addEventListener('change', () => {
                    setTimeout(autoGenerate, 50);
                });
            });

            // Пресеты системы - НЕ добавляем автообновление, так как значения уже установлены в обработчике выше

            // Пресеты влияния - добавляем автообновление
            document.querySelectorAll('.preset-btn[data-impact]').forEach(btn => {
                btn.addEventListener('click', () => {
                    setTimeout(debouncedAutoGenerate, 50);
                });
            });

            // Пресеты рекомендаций - добавляем автообновление
            document.querySelectorAll('.rec-preset-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    setTimeout(debouncedAutoGenerate, 50);
                });
            });

            // Пресеты завершения - добавляем автообновление
            document.querySelectorAll('.completion-preset-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    setTimeout(debouncedAutoGenerate, 50);
                });
            });

            // ============================================
            // СИСТЕМА ОЧЕРЕДИ УВЕДОМЛЕНИЙ
            // ============================================

            let countdownInterval = null;

            // Загружаем очередь из localStorage при инициализации
            loadQueueFromStorage();
            updateQueueUI();
            
            // Если в очереди есть элементы - запускаем таймер
            if (queue.length > 0) {
                startCountdownTimer();
            }

            // Функции сохранения и загрузки очереди в localStorage
            function saveQueueToStorage() {
                try {
                    const queueData = {
                        queue: queue,
                        queueIdCounter: queueIdCounter,
                        timestamp: new Date().toISOString()
                    };
                    localStorage.setItem('generator_queue_data', JSON.stringify(queueData));
                    console.log('Очередь сохранена в localStorage:', queue.length, 'элементов');
                } catch (e) {
                    console.error('Ошибка сохранения очереди:', e);
                }
            }

            function loadQueueFromStorage() {
                try {
                    const data = localStorage.getItem('generator_queue_data');
                    if (!data) {
                        console.log('Очередь в localStorage не найдена');
                        return;
                    }

                    const queueData = JSON.parse(data);
                    
                    // Восстанавливаем счётчик ID
                    queueIdCounter = queueData.queueIdCounter || 0;
                    
                    // Восстанавливаем очередь, конвертируя строки дат обратно в объекты Date
                    const now = new Date();
                    queue = (queueData.queue || []).map(item => {
                        // Конвертируем строковые даты обратно в объекты Date
                        if (item.endTime && typeof item.endTime === 'string') {
                            item.endTime = new Date(item.endTime);
                        }
                        if (item.createdAt && typeof item.createdAt === 'string') {
                            item.createdAt = new Date(item.createdAt);
                        }
                        return item;
                    }).filter(item => {
                        // Удаляем элементы, у которых время уже прошло более 24 часов назад
                        if (item.endTime) {
                            const hoursPassed = (now - item.endTime) / (1000 * 60 * 60);
                            if (hoursPassed > 24) {
                                console.log('Удалён устаревший элемент:', item.system);
                                return false;
                            }
                        }
                        return true;
                    });

                    // Ограничиваем очередь 15 элементами (оставляем самые новые)
                    if (queue.length > 15) {
                        queue = queue.slice(-15);
                    }

                    console.log('Очередь загружена из localStorage:', queue.length, 'элементов');
                } catch (e) {
                    console.error('Ошибка загрузки очереди:', e);
                    queue = [];
                    queueIdCounter = 0;
                }
            }

            // Открытие/закрытие окна очереди
            $('queueToggleBtn').addEventListener('click', () => {
                $('queueWindow').classList.add('open');
                $('queueOverlay').classList.add('show');
            });

            $('queueCloseBtn').addEventListener('click', closeQueueWindow);
            $('queueOverlay').addEventListener('click', closeQueueWindow);

            // Очистка всей очереди
            if ($('queueClearBtn')) {
                $('queueClearBtn').addEventListener('click', () => {
                    if (queue.length === 0) return;
                    queue = [];
                    saveQueueToStorage();
                    updateQueueUI();
                    if (countdownInterval) {
                        clearInterval(countdownInterval);
                        countdownInterval = null;
                    }
                    playQueueRemoveSound();
                    showStatus('Очередь очищена', 'success');
                });
            }

            function closeQueueWindow() {
                $('queueWindow').classList.remove('open');
                $('queueOverlay').classList.remove('show');
            }

            // Добавление в очередь
            $('queueBtn').addEventListener('click', () => {
                const workType = document.querySelector('input[name="workType"]:checked').value;
                const msgType = $('messageType').value;
                const dateStart = $('dateStart').value;
                const timeRange = $('timeRange').value;
                const dateCompletion = $('dateCompletion').value;
                const timeCompletion = $('timeCompletion').value;
                const system = $('system').value;
                const impact = $('impact').value;
                const services = $('services').value;
                const subject = $('subjectInput').value;

                // Определяем время окончания работ
                let endTime = null;
                let endTimeDisplay = '';

                if (msgType === 'start') {
                    if (workType === 'avr' || workType === 'multiday') {
                        if (timeCompletion && timeCompletion.trim() !== '' && timeCompletion.toLowerCase() !== 'уточняется') {
                            endTime = parseEndTime(dateCompletion, timeCompletion);
                            endTimeDisplay = `${dateCompletion} ${timeCompletion}`;
                        }
                    } else {
                        // Для плановых/внеплановых - конец диапазона времени
                        if (timeRange.includes('-')) {
                            const parts = timeRange.split('-');
                            const endPart = parts[1]?.trim();
                            if (endPart) {
                                endTime = parseEndTime(dateStart, endPart);
                                endTimeDisplay = `${dateStart} ${endPart}`;
                            }
                        } else if (timeRange.trim()) {
                            endTime = parseEndTime(dateStart, timeRange);
                            endTimeDisplay = `${dateStart} ${timeRange}`;
                        }
                    }
                } else if (msgType === 'extension') {
                    const extensionTime = $('extensionTime').value;
                    if (extensionTime && extensionTime.trim()) {
                        endTime = parseEndTime(dateCompletion, extensionTime);
                        endTimeDisplay = `${dateCompletion} ${extensionTime}`;
                    }
                } else if (msgType === 'completion') {
                    if (timeCompletion && timeCompletion.trim()) {
                        endTime = parseEndTime(dateCompletion, timeCompletion);
                        endTimeDisplay = `${dateCompletion} ${timeCompletion}`;
                    }
                }

                // Определяем время начала работ (для напоминаний)
                let startTime = null;
                let startTimeDisplay = '';
                
                if (msgType === 'start') {
                    if (workType === 'avr' || workType === 'multiday') {
                        // Для АВР/многодневных - начало из dateStart + timeStart
                        if (dateStart && timeRange) {
                            startTime = parseEndTime(dateStart, timeRange);
                            startTimeDisplay = `${dateStart} ${timeRange}`;
                        }
                    } else {
                        // Для плановых/внеплановых - начало из dateStart + начало диапазона времени
                        if (dateStart && timeRange) {
                            let startPart = timeRange;
                            if (timeRange.includes('-')) {
                                startPart = timeRange.split('-')[0]?.trim();
                            }
                            startTime = parseEndTime(dateStart, startPart);
                            startTimeDisplay = `${dateStart} ${startPart}`;
                        }
                    }
                }

                const queueItem = {
                    id: ++queueIdCounter,
                    workType,
                    msgType,
                    dateStart,
                    timeRange,
                    dateCompletion,
                    timeCompletion,
                    system,
                    impact,
                    services,
                    subject,
                    includeServices: $('includeServices')?.checked ?? true,
                    colorScheme: $('colorSchemeInput')?.value || 'default',
                    startTime,           // Время начала работ
                    startTimeDisplay,    // Отображение времени начала
                    endTime,
                    endTimeDisplay,
                    reminderSent: false,              // Напоминание за 10 мин отправлено
                    startedNotificationSent: false,   // Уведомление о начале отправлено
                    notified: false,
                    createdAt: new Date()
                };

                queue.push(queueItem);
                // Ограничиваем очередь 15 элементами (удаляем самые старые)
                while (queue.length > 15) {
                    queue.shift();
                }
                saveQueueToStorage(); // Сохраняем очередь
                updateQueueUI();
                startCountdownTimer();

                // Анимация кнопки
                $('queueBtn').style.transform = 'scale(0.95)';
                setTimeout(() => {
                    $('queueBtn').style.transform = '';
                }, 150);

                // Звук добавления в очередь
                playQueueAddSound();
                showStatus('Уведомление добавлено в очередь!', 'success');
            });

            // Парсинг времени окончания
            function parseEndTime(dateStr, timeStr) {
                if (!dateStr || !timeStr) return null;

                const dateParts = dateStr.split('.');
                if (dateParts.length !== 3) return null;

                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                const year = parseInt(dateParts[2]);

                // Извлекаем время (берём последнее время если диапазон)
                let timeToUse = timeStr;
                if (timeStr.includes('-')) {
                    const parts = timeStr.split('-');
                    timeToUse = parts[1]?.trim() || parts[0]?.trim();
                }

                const timeParts = timeToUse.replace(/[^\d:]/g, '').split(':');
                if (timeParts.length < 2) return null;

                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);

                if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hours) || isNaN(minutes)) return null;

                return new Date(year, month, day, hours, minutes, 0);
            }

            // Обновление UI очереди
            function updateQueueUI() {
                const count = queue.length;
                $('queueBadge').textContent = count;
                $('queueCount').textContent = count;

                // Очищаем контент
                $('queueContent').innerHTML = '';

                if (count === 0) {
                    // Создаём элемент "Очередь пуста" заново
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'queue-empty';
                    emptyDiv.id = 'queueEmpty';
                    emptyDiv.innerHTML = `
                        <div class="queue-empty-icon">📭</div>
                        <div>Очередь пуста</div>
                        <div style="margin-top: 8px; font-size: 12px;">Нажмите "Поставить в очередь" чтобы добавить уведомление</div>
                    `;
                    $('queueContent').appendChild(emptyDiv);
                    return;
                }

                queue.forEach(item => {
                    const itemEl = createQueueItemElement(item);
                    $('queueContent').appendChild(itemEl);
                });
            }

            // Создание элемента миниатюры
            function createQueueItemElement(item) {
                const div = document.createElement('div');
                div.className = `queue-item ${item.workType}`;
                div.dataset.id = item.id;

                const typeNames = {
                    planned: 'Плановые',
                    multiday: 'Многодневные',
                    unplanned: 'Внеплановые',
                    avr: 'АВР'
                };

                const msgTypeNames = {
                    start: 'Начало',
                    extension: 'Продление',
                    completion: 'Завершение'
                };

                let countdownText = '';
                let countdownClass = '';

                if (item.endTime) {
                    const now = new Date();
                    const diff = item.endTime - now;
                    const minutesLeft = Math.floor(diff / 60000);

                    if (minutesLeft <= 0) {
                        countdownText = 'Время вышло';
                        countdownClass = 'critical';
                    } else if (minutesLeft <= 10) {
                        countdownText = `${minutesLeft} мин`;
                        countdownClass = 'critical';
                    } else if (minutesLeft <= 30) {
                        countdownText = `${minutesLeft} мин`;
                        countdownClass = 'warning';
                    } else {
                        countdownText = `${minutesLeft} мин`;
                    }
                }

                // Вычисляем время до начала
                let startCountdownText = '';
                let startCountdownClass = '';
                if (item.startTime && item.msgType === 'start') {
                    const now = new Date();
                    const startDiff = item.startTime - now;
                    const minutesToStart = Math.floor(startDiff / 60000);
                    
                    if (minutesToStart <= 0) {
                        startCountdownText = '🚀 Началось';
                        startCountdownClass = 'started';
                    } else if (minutesToStart <= 10) {
                        startCountdownText = `🚀 Через ${minutesToStart} мин`;
                        startCountdownClass = 'warning';
                    } else {
                        startCountdownText = `🚀 Через ${minutesToStart} мин`;
                        startCountdownClass = '';
                    }
                }

                div.innerHTML = `
                    <div class="queue-item-header">
                        <span class="queue-item-type ${item.workType}">${typeNames[item.workType]}</span>
                        <button class="queue-item-delete" data-id="${item.id}">×</button>
                    </div>
                    <div class="queue-item-system">${item.system}</div>
                    <div class="queue-item-details">
                        <div>${msgTypeNames[item.msgType]} • ${item.impact}</div>
                        ${item.services ? `<div style="margin-top: 4px;">${item.services}</div>` : ''}
                        ${item.telegram_message_id ? `<div style="margin-top: 4px; color: #229ED9; font-size: 11px;">✈️ Ответ привязан к сообщению #${item.telegram_message_id}</div>` : ''}
                    </div>
                    <div class="queue-item-time">
                        ${item.startTimeDisplay ? `<span class="queue-item-time-icon">🚀</span><span class="queue-item-time-text">Начало: ${item.startTimeDisplay}</span>` : ''}
                        ${startCountdownText ? `<span class="queue-item-start-countdown ${startCountdownClass}">${startCountdownText}</span>` : ''}
                    </div>
                    ${item.endTimeDisplay ? `
                    <div class="queue-item-time" style="margin-top: 4px;">
                        <span class="queue-item-time-icon">⏰</span>
                        <span class="queue-item-time-text">Окончание: ${item.endTimeDisplay}</span>
                        ${countdownText ? `<span class="queue-item-countdown ${countdownClass}" data-end="${item.endTime?.getTime()}">${countdownText}</span>` : ''}
                    </div>
                    ` : ''}
                `;

                // Обработчик удаления
                div.querySelector('.queue-item-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    const id = parseInt(btn.dataset.id);
                    queue = queue.filter(q => q.id !== id);
                    saveQueueToStorage(); // Сохраняем после удаления
                    updateQueueUI();
                    playQueueRemoveSound();
                    showStatus('Уведомление удалено из очереди', 'success');
                });

                return div;
            }

            // Таймер обратного отсчёта
            function startCountdownTimer() {
                if (countdownInterval) return;

                countdownInterval = setInterval(() => {
                    let needsUpdate = false;
                    const now = new Date();

                    queue.forEach(item => {
                        // === УВЕДОМЛЕНИЯ О НАЧАЛЕ РАБОТ ===
                        if (item.startTime && item.msgType === 'start') {
                            const startDiff = item.startTime - now;
                            const minutesToStart = Math.floor(startDiff / 60000);

                            // Напоминание за 10 минут до начала (только один раз)
                            if (minutesToStart <= 10 && minutesToStart > 0 && !item.reminderSent) {
                                item.reminderSent = true;
                                showNotification(
                                    '⏰ Скоро начало работ!',
                                    `${item.system} - через ${minutesToStart} мин`
                                );
                                saveQueueToStorage();
                                needsUpdate = true;
                            }

                            // Уведомление о начале работ (только один раз)
                            if (minutesToStart <= 0 && minutesToStart > -2 && !item.startedNotificationSent) {
                                item.startedNotificationSent = true;
                                showNotification(
                                    '🚀 Работы начались!',
                                    `${item.system} - работы начались`
                                );
                                saveQueueToStorage();
                                needsUpdate = true;
                            }
                        }

                        // === УВЕДОМЛЕНИЯ ОБ ОКОНЧАНИИ РАБОТ ===
                        if (item.endTime) {
                            const diff = item.endTime - now;
                            const minutesLeft = Math.floor(diff / 60000);

                            // Уведомление за 10 минут до окончания (только один раз)
                            if (minutesLeft <= 10 && minutesLeft > 0 && !item.tenMinuteNotificationSent) {
                                item.tenMinuteNotificationSent = true;
                                showNotification(
                                    '⏰ Скоро окончание работ!',
                                    `${item.system} - ${minutesLeft} мин до окончания`
                                );
                                saveQueueToStorage();
                                needsUpdate = true;
                            }

                            // Уведомление в момент окончания работ (только один раз)
                            if (minutesLeft <= 0 && !item.completedNotificationSent) {
                                item.completedNotificationSent = true;
                                showNotification(
                                    '✅ Время работ истекло!',
                                    `${item.system} - работы должны быть завершены`
                                );
                                saveQueueToStorage();
                                needsUpdate = true;
                            }

                            // Обновляем отображение времени до окончания
                            const countdownEl = document.querySelector(`.queue-item[data-id="${item.id}"] .queue-item-countdown`);
                            if (countdownEl) {
                                if (minutesLeft <= 0) {
                                    countdownEl.textContent = 'Время вышло';
                                    countdownEl.className = 'queue-item-countdown critical';
                                } else if (minutesLeft <= 10) {
                                    countdownEl.textContent = `${minutesLeft} мин`;
                                    countdownEl.className = 'queue-item-countdown critical';
                                } else if (minutesLeft <= 30) {
                                    countdownEl.textContent = `${minutesLeft} мин`;
                                    countdownEl.className = 'queue-item-countdown warning';
                                } else {
                                    countdownEl.textContent = `${minutesLeft} мин`;
                                    countdownEl.className = 'queue-item-countdown';
                                }
                            }
                        }

                        // === ОТОБРАЖЕНИЕ ВРЕМЕНИ ДО НАЧАЛА ===
                        if (item.startTime && item.msgType === 'start') {
                            const startDiff = item.startTime - now;
                            const minutesToStart = Math.floor(startDiff / 60000);
                            
                            // Находим или создаём элемент для отображения времени до начала
                            let startCountdownEl = document.querySelector(`.queue-item[data-id="${item.id}"] .queue-item-start-countdown`);
                            if (!startCountdownEl && minutesToStart > -2) {
                                // Создаём элемент если его нет
                                const timeContainer = document.querySelector(`.queue-item[data-id="${item.id}"] .queue-item-time`);
                                if (timeContainer) {
                                    const startSpan = document.createElement('span');
                                    startSpan.className = 'queue-item-start-countdown';
                                    startSpan.style.marginLeft = '8px';
                                    startSpan.style.fontSize = '11px';
                                    startSpan.style.padding = '3px 8px';
                                    startSpan.style.borderRadius = '8px';
                                    timeContainer.appendChild(startSpan);
                                    startCountdownEl = startSpan;
                                }
                            }
                            
                            if (startCountdownEl) {
                                if (minutesToStart <= 0) {
                                    startCountdownEl.textContent = '🚀 Началось';
                                    startCountdownEl.style.background = 'rgba(76, 175, 80, 0.3)';
                                    startCountdownEl.style.color = '#81c784';
                                } else if (minutesToStart <= 10) {
                                    startCountdownEl.textContent = `🚀 Через ${minutesToStart} мин`;
                                    startCountdownEl.style.background = 'rgba(255, 152, 0, 0.3)';
                                    startCountdownEl.style.color = '#ffb74d';
                                    startCountdownEl.style.animation = 'pulse-warning 1s ease-in-out infinite';
                                } else {
                                    startCountdownEl.textContent = `🚀 Через ${minutesToStart} мин`;
                                    startCountdownEl.style.background = 'rgba(255, 255, 255, 0.1)';
                                    startCountdownEl.style.color = 'rgba(255, 255, 255, 0.6)';
                                    startCountdownEl.style.animation = 'none';
                                }
                            }
                        }
                    });

                    if (needsUpdate) {
                        saveQueueToStorage();
                    }

                    // Останавливаем таймер если очередь пуста
                    if (queue.length === 0) {
                        clearInterval(countdownInterval);
                        countdownInterval = null;
                    }
                }, 30000); // Обновляем каждые 30 секунд
            }

            // Показать уведомление в браузере (Notification API)
            function showNotification(title, text) {
                // Звук уведомления
                playAlertSound();

                console.log('=== showNotification ===');
                console.log('Title:', title);
                console.log('Text:', text);
                console.log('Notification в window:', 'Notification' in window);
                console.log('Notification.permission:', Notification.permission);

                // Проверяем поддержку Notification API
                if (!('Notification' in window)) {
                    console.log('Браузер не поддерживает уведомления, используем alert');
                    alert(`${title}\n\n${text}`);
                    return;
                }

                // Проверяем разрешение
                if (Notification.permission === 'granted') {
                    console.log('Разрешение получено, создаём Notification...');
                    try {
                        const notification = new Notification(title, {
                            body: text
                        });
                        console.log('Notification создан:', notification);
                        console.log('Notification.permission после создания:', Notification.permission);
                        
                        notification.onshow = () => {
                            console.log('Notification.onshow сработало - уведомление показано');
                        };
                        
                        notification.onerror = (e) => {
                            console.error('Notification.onerror сработало:', e);
                        };
                        
                        notification.onclose = () => {
                            console.log('Notification.onclose сработало - уведомление закрыто');
                        };
                        
                        notification.onclick = () => {
                            console.log('Notification.onclick сработало');
                            window.focus();
                            notification.close();
                        };
                        
                        console.log('Уведомление создано успешно');
                    } catch (e) {
                        console.error('Ошибка создания Notification:', e);
                        console.error('Stack trace:', e.stack);
                        alert(`${title}\n\n${text}`);
                    }
                } else if (Notification.permission === 'default') {
                    console.log('Разрешение не запрошено, запрашиваем...');
                    Notification.requestPermission().then(permission => {
                        console.log('Результат запроса разрешения:', permission);
                        if (permission === 'granted') {
                            try {
                                const notification = new Notification(title, {
                                    body: text
                                });
                                console.log('Notification создан после запроса разрешения:', notification);
                                
                                notification.onshow = () => {
                                    console.log('Notification.onshow сработало после запроса разрешения');
                                };
                                
                                notification.onerror = (e) => {
                                    console.error('Notification.onerror сработало после запроса разрешения:', e);
                                };
                                
                                notification.onclick = () => {
                                    window.focus();
                                    notification.close();
                                };
                                
                                console.log('Уведомление отправлено успешно после запроса разрешения');
                            } catch (e) {
                                console.error('Ошибка отправки уведомления:', e);
                                alert(`${title}\n\n${text}`);
                            }
                        } else {
                            console.log('Разрешение отклонено, используем alert');
                            alert(`${title}\n\n${text}`);
                        }
                    });
                } else {
                    console.log('Разрешение запрещено, используем alert');
                    alert(`${title}\n\n${text}`);
                }
            }

            // Кнопка теста уведомления
            $('testNotificationBtn').addEventListener('click', () => {
                console.log('Кнопка теста уведомления нажата');
                console.log('Notification в window:', 'Notification' in window);
                console.log('Notification.permission:', Notification.permission);

                // Запрашиваем разрешение на уведомления
                if ('Notification' in window && Notification.permission === 'default') {
                    console.log('Запрашиваем разрешение на уведомления...');
                    Notification.requestPermission().then(permission => {
                        console.log('Результат запроса разрешения:', permission);
                        if (permission === 'granted') {
                            sendTestNotification();
                        }
                    });
                } else {
                    sendTestNotification();
                }
            });

            function sendTestNotification() {
                console.log('Отправляем тестовое уведомление');
                showNotification(
                    '🔔 Тестовое уведомление',
                    'Это тестовое уведомление из генератора. Если вы видите это - уведомления работают!'
                );
                showStatus('Тестовое уведомление отправлено!', 'success');
            }

            // ============================================
            // PWA — Service Worker Registration + Install
            // ============================================

            // Регистрация Service Worker
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                        .then((reg) => {
                            console.log('[PWA] SW registered:', reg.scope);
                        })
                        .catch((err) => {
                            console.warn('[PWA] SW registration failed:', err.message);
                        });
                });
            }

            // Слушаем успешную установку
            window.addEventListener('appinstalled', () => {
                console.log('[PWA] App installed successfully');
                showStatus('Приложение установлено!', 'success');
            });

            // Проверка: запущено ли как PWA
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                || window.navigator.standalone === true;
            if (isStandalone) {
                console.log('[PWA] Running as installed app (standalone mode)');
                // В режиме PWA скрываем кнопку установки
                if (installBtn) installBtn.classList.add('hidden');
            }

            // Запрашиваем разрешение на уведомления при загрузке страницы
            if ('Notification' in window) {
                console.log('Notification API доступен');
                console.log('Текущее разрешение:', Notification.permission);
                if (Notification.permission === 'default') {
                    console.log('Запрашиваем разрешение на уведомления при загрузке...');
                    Notification.requestPermission().then(permission => {
                        console.log('Результат запроса разрешения при загрузке:', permission);
                    });
                }
            } else {
                console.log('Notification API не доступен');
            }
            
            console.log('[END] DOMContentLoaded handler finished');
            
            // Инициализация цвета при загрузке
            if (typeof updateColorPreview === 'function') {
                updateColorPreview();
            }
        });
        
        console.log('[END] app.js script finished');
