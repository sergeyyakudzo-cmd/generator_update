        function debounce(func, delay) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        }

        // Wave animation on preset fill — triggers color ripple on target input
        function triggerWaveAnimation(inputElement) {
            if (!inputElement) return;
            // Remove class to restart animation if already playing
            inputElement.classList.remove('input-wave');
            // Force reflow so the animation restarts
            void inputElement.offsetWidth;
            inputElement.classList.add('input-wave');
            // Clean up after animation completes
            setTimeout(() => inputElement.classList.remove('input-wave'), 750);
        }

        // Функция автообновления превью
        function autoGenerate() {
            // Форматирование происходит только по blur или при нажатии кнопки "Сгенерировать"
            // Здесь только обновляем превью без форматирования полей

            const workType = document.querySelector('input[name="workType"]:checked').value;
            const msgType = $('messageType').value;
            const dateStart = $('dateStart').value;
            const timeInput = $('timeRange').value;
            let dateCompletion = $('dateCompletion').value;
            const timeCompletion = $('timeCompletion').value;

            let timeStart, timeEnd, timeDisplay;
            if (msgType === 'extension') {
                timeEnd = $('extensionTime').value;
                timeStart = '';
                timeDisplay = timeEnd;
            } else if ((workType === 'avr' || workType === 'multiday') && msgType === 'start') {
                timeStart = timeInput;
                timeEnd = '';
                timeDisplay = timeStart;
            } else if ((workType === 'avr' || workType === 'multiday') && msgType === 'completion') {
                timeEnd = timeCompletion;
                timeStart = '';
                timeDisplay = timeEnd;
            } else {
                if (timeInput.includes('-')) {
                    const parts = timeInput.split('-');
                    timeStart = parts[0]?.trim() || '';
                    timeEnd = parts[1]?.trim() || '';
                    timeDisplay = timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : (timeStart || timeEnd);
                } else {
                    timeStart = timeInput;
                    timeEnd = '';
                    timeDisplay = timeStart;
                }
            }

            let timeCompletionValue;
            if ((workType === 'planned' || workType === 'unplanned') && msgType === 'completion') {
                timeCompletionValue = timeCompletion && timeCompletion.trim() !== '' ? timeCompletion : '';
            } else if (workType === 'avr' || workType === 'multiday') {
                timeCompletionValue = timeCompletion;
            } else {
                timeCompletionValue = timeEnd;
            }

            const params = {
                workType, msgType, dateStart, dateCompletion,
                timeCompletion: timeCompletionValue,
                timeDisplay, timeStart, timeEnd,
                system: $('system').value,
                impact: $('impact').value,
                services: $('services').value,
                completionText: $('completionText').value,
                additionalMessage: $('additionalMessage').value,
                recommendations: $('recommendations').value,
                includeRec: $('includeRecommendations').checked,
                includeAdditional: $('includeAdditionalMessage').checked,
                includeServices: $('includeServices')?.checked ?? true,
                colorScheme: $('colorSchemeInput')?.value || 'default'
            };

            $('preview').innerHTML = generateNotificationHTML(params);
            $('previewText').textContent = generateTextNotification(params);
        }

        // Debounced версия для текстовых полей (300мс задержка)
        const debouncedAutoGenerate = debounce(autoGenerate, 300);

        // Переключение доп. параметров
        $('optionsToggle').addEventListener('click', () => {
            $('optionsContent').classList.toggle('hidden');
            $('optionsToggle').querySelector('span').textContent =
                $('optionsContent').classList.contains('hidden') ? '▼ Дополнительные параметры' : '▲ Дополнительные параметры';
        });

        // Табы - с переключением кнопок копирования
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabType = tab.getAttribute('data-tab');
                const copyHtmlBtn = $('copyHtmlBtn');
                const copyTextBtn = $('copyTextBtn');
                if (tabType === 'text') {
                    $('htmlPreview').classList.add('hidden');
                    $('textPreview').classList.remove('hidden');
                    copyHtmlBtn.style.display = 'none';
                    copyTextBtn.style.display = 'inline-block';
                    $('sendToTelegramBtn').style.display = 'inline-flex';
                    $('sendToZimbraBtn').style.display = 'none';
                } else {
                    $('htmlPreview').classList.remove('hidden');
                    $('textPreview').classList.add('hidden');
                    copyHtmlBtn.style.display = 'inline-block';
                    copyTextBtn.style.display = 'none';
                    $('sendToTelegramBtn').style.display = 'none';
                    $('sendToZimbraBtn').style.display = 'inline-flex';
                }
            });
        });

        // Показать правильную кнопку при загрузке - по умолчанию HTML
        $('copyHtmlBtn').style.display = 'inline-block';
        $('copyTextBtn').style.display = 'none';
        $('sendToTelegramBtn').style.display = 'none';
        $('sendToZimbraBtn').style.display = 'inline-flex';

        // Pill-табы переключения HTML/Текст
        let isTextMode = false;

        function switchPreviewMode(mode) {
            isTextMode = mode === 'text';
            
            // Обновляем визуально активных табов
            document.querySelectorAll('.pill-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.mode === mode);
            });

            if (isTextMode) {
                $('htmlPreview').classList.add('hidden');
                $('textPreview').classList.remove('hidden');
                $('copyHtmlBtn').style.display = 'none';
                $('copyTextBtn').style.display = 'inline-block';
                $('sendToTelegramBtn').style.display = 'inline-flex';
                $('sendToZimbraBtn').style.display = 'none';
            } else {
                $('htmlPreview').classList.remove('hidden');
                $('textPreview').classList.add('hidden');
                $('copyHtmlBtn').style.display = 'inline-block';
                $('copyTextBtn').style.display = 'none';
                $('sendToTelegramBtn').style.display = 'none';
                $('sendToZimbraBtn').style.display = 'inline-flex';
            }
        }

        // Обработчики кликов по pill-табам
        document.querySelectorAll('.pill-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchPreviewMode(tab.dataset.mode);
            });
        });

        // Переключение сегментов Тип работ
        document.querySelectorAll('.segment-label').forEach(label => {
            label.addEventListener('click', () => {
                const value = label.getAttribute('data-value');

                // Обновить визуальное состояние
                document.querySelectorAll('.segment-label').forEach(l => l.classList.remove('selected'));
                label.classList.add('selected');

                // Обновить radio
                const radio = label.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    // Триггер события change
                    currentWorkType = value;
                    updateSubjectByType(currentWorkType);
                    updatePreviewType();
                    updateServicesBySystem($('system').value, currentWorkType);

                    // Настройка полей для АВР
                    if (currentWorkType === 'avr') {
                        $('dateStartLabel').textContent = 'Дата начала:';
                        $('timeLabel').textContent = 'Время начала:';
                        if (currentMessageType === 'start') {
                            $('dateCompletion').value = 'Уточняется';
                            $('timeCompletion').value = '';
                        }
                    }
                    else if (currentWorkType === 'multiday') {
                        $('dateStartLabel').textContent = 'Дата начала:';
                        $('timeLabel').textContent = 'Время начала:';
                        if (currentMessageType === 'start') {
                            $('dateCompletion').value = 'Уточняется';
                            $('timeCompletion').value = '';
                        }
                    } else {
                        $('dateStartLabel').textContent = 'Дата проведения:';
                        $('timeLabel').textContent = 'Время:';
                    }

                    updateFormForMessageType();
                    // Обновляем превью цвета при смене типа работ (если выбрано "Авто")
                    if (currentColorScheme === 'default') {
                        updateColorPreview();
                    }
                }
            });
        });

        // Переключение меню выбора цвета
        let currentColorScheme = 'default';
        const colorEmojis = { green: '🟢', yellow: '🟡', red: '🔴', default: '⚡' };

        function updateColorPreview() {
            const input = document.getElementById('colorSchemeInput');
            if (input) {
                input.value = currentColorScheme;
            }
        }

        document.querySelectorAll('.color-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                currentColorScheme = btn.getAttribute('data-value');
                updateColorPreview();
                // Обновляем превью при смене цвета
                if (typeof autoGenerate === 'function') {
                    const workType = document.querySelector('input[name="workType"]:checked')?.value;
                    if (currentColorScheme !== 'default' && (typeof generatePreview === 'function')) {
                        generatePreview();
                    } else if (typeof autoGenerate === 'function') {
                        autoGenerate();
                    }
                }
            });
        });

        // Переключение сегментов Тип сообщения
        document.querySelectorAll('.message-radio').forEach(radio => {
            radio.addEventListener('change', () => {
                const value = radio.value;
                const previousMessageType = currentMessageType;

                // Обновить скрытый select
                $('messageType').value = value;
                currentMessageType = value;

                // Если переключились на "Завершение" и в поле "Время продления" есть цифры - переносим
                if (currentMessageType === 'completion' && previousMessageType === 'extension') {
                    const extensionTimeValue = $('extensionTime').value.trim();
                    // Проверяем что это только цифры (возможно с разделителями)
                    if (extensionTimeValue && /^[\d:\-\s]+$/.test(extensionTimeValue)) {
                        $('timeCompletion').value = extensionTimeValue;
                    }
                }

                // Обновить форму
                updateFormForMessageType();
                updatePreviewType();
                // Обновляем превью цвета при смене типа сообщения (если выбрано "Авто")
                if (currentColorScheme === 'default') {
                    updateColorPreview();
                }
            });
        });

        // Функция получения даты субботы текущей недели
        function getSaturdayDate() {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = воскресенье, 6 = суббота
            let daysUntilSaturday = (6 - dayOfWeek + 7) % 7; // Дней до субботы
            const saturday = new Date(now);
            saturday.setDate(now.getDate() + daysUntilSaturday);
            
            const day = String(saturday.getDate()).padStart(2, '0');
            const month = String(saturday.getMonth() + 1).padStart(2, '0');
            const year = saturday.getFullYear();
            
            return `${day}.${month}.${year}`;
        }

        

        // Функция получения даты четверга текущей недели
        function getThursdayDate() {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = воскресенье, 4 = четверг
            let daysUntilThursday = (4 - dayOfWeek + 7) % 7; // Дней до четверга
            const thursday = new Date(now);
            thursday.setDate(now.getDate() + daysUntilThursday);
            
            const day = String(thursday.getDate()).padStart(2, '0');
            const month = String(thursday.getMonth() + 1).padStart(2, '0');
            const year = thursday.getFullYear();
            
            return `${day}.${month}.${year}`;
        }

        // Пресеты системы
        document.querySelectorAll('.preset-btn[data-system]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn[data-system]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                const systemValue = btn.getAttribute('data-system');
                const previousSystem = $('system').value;
                
                // Специальная логика для Phoenix2
                if (systemValue === 'Phoenix2') {
                    $('system').value = 'srv89/Phoenix2';
                    // Подставляем дату среды и время 04:30-05:30
                    $('dateStart').value = getThursdayDate();
                    $('timeRange').value = '04:30-05:30';
                }
                // Специальная логика для 1С+Phoenix
                else if (systemValue === '1С+Phoenix') {
                    $('system').value = 'Сервера 1С и Phoenix';
                    // Подставляем дату четверга и время 19:00-20:00
                    $('dateStart').value = getThursdayDate();
                    $('timeRange').value = '19:00-20:00';
                }
                // Специальная логика для Автограф
                else if (systemValue === 'Автограф') {
                    $('system').value = systemValue;
                    // Подставляем сегодняшнюю дату и время 17:00-18:00
                    $('dateStart').value = getCurrentDate();
                    $('timeRange').value = '17:00-18:00';
                }
                else {
                    $('system').value = systemValue;
                }
                
                // Специальная логика для JDE - подставляем дату субботы и время 12:00-13:30
                if (systemValue === 'JDE') {
                    $('dateStart').value = getSaturdayDate();
                    $('timeRange').value = '12:00-13:30';
                }
                // Если переключились с JDE или Phoenix2 на другую систему (кроме Phoenix2/JDE/1С+Phoenix) - возвращаем сегодняшнюю дату
                else if (systemValue !== 'Phoenix2' && systemValue !== 'JDE' && systemValue !== '1С+Phoenix' && systemValue !== 'Автограф' && (previousSystem.toLowerCase().includes('jde') || previousSystem.toLowerCase().includes('phoenix'))) {
                    $('dateStart').value = getCurrentDate();
                    $('timeRange').value = '19:00';
                }
                
                updateServicesBySystem($('system').value, currentWorkType);
                updateEmails();

                // Wave animation on filled fields
                triggerWaveAnimation($('system'));
                triggerWaveAnimation($('dateStart'));
                triggerWaveAnimation($('services'));
            });
        });

        // Пресеты влияния - с возможностью комбинирования
        const impactButtons = document.querySelectorAll('.preset-btn[data-impact]');
        let selectedImpacts = new Set();

        // Функция для обновления поля влияния и визуального состояния кнопок
        function updateImpactField() {
            const impactsArray = Array.from(selectedImpacts);
            
            // Кастомная сортировка: РФ всегда первый, остальные как есть
            impactsArray.sort((a, b) => {
                if (a === 'РФ') return -1;
                if (b === 'РФ') return 1;
                return a.localeCompare(b);
            });

            if (impactsArray.length === 0) {
                $('impact').value = 'ГК'; // Значение по умолчанию
            } else {
                $('impact').value = impactsArray.join(', ');
            }

            // Обновляем визуальное состояние кнопок
            impactButtons.forEach(btn => {
                const impactValue = btn.getAttribute('data-impact');
                if (selectedImpacts.has(impactValue)) {
                    btn.classList.add('pressed');
                } else {
                    btn.classList.remove('pressed');
                }
            });

            // Обновляем сервисы по системе
            updateServicesBySystem($('system').value, currentWorkType);
            
            // Обновляем email-адреса
            updateEmails();
        }

        // Обработчик клика для пресетов влияния
        impactButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const impactValue = btn.getAttribute('data-impact');

                // ГК нельзя комбинировать - если выбран ГК, сбрасываем все остальные
                if (impactValue === 'ГК') {
                    if (selectedImpacts.has('ГК')) {
                        // Если ГК уже выбран, отжимаем его
                        selectedImpacts.delete('ГК');
                    } else {
                        // Если выбираем ГК, сбрасываем все остальные
                        selectedImpacts.clear();
                        selectedImpacts.add('ГК');
                    }
                } else {
                    // Для РФ, РБ, РК - проверяем, не выбран ли ГК
                    if (selectedImpacts.has('ГК')) {
                        // Если выбран ГК, заменяем его на новое влияние
                        selectedImpacts.clear();
                        selectedImpacts.add(impactValue);
                    } else {
                        // Тогглим выбранное влияние
                        if (selectedImpacts.has(impactValue)) {
                            selectedImpacts.delete(impactValue);
                        } else {
                            selectedImpacts.add(impactValue);
                        }
                    }
                }

                // Проверка: если выбраны все три (РФ+РБ+РК) → автоматически переключиться на ГК
                if (selectedImpacts.has('РФ') && selectedImpacts.has('РБ') && selectedImpacts.has('РК')) {
                    selectedImpacts.clear();
                    selectedImpacts.add('ГК');
                }

                updateImpactField();
                triggerWaveAnimation($('impact'));
            });
        });

        // Инициализация - устанавливаем ГК как выбранное по умолчанию
        selectedImpacts.add('ГК');
        updateImpactField();

        // Функция обновления email-адресов
        function updateEmails() {
            const system = $('system').value;
            const isJDE = system.toLowerCase().includes('jde');
            const isAutograph = system.toLowerCase() === 'автограф';
            
            if (isJDE) {
                $('toInput').value = 'jde_users@alidi.ru, dirfil@alidi.ru';
                $('ccInput').value = 'dbadmin@alidi.ru, all_kis_members@alidi.ru, it_top@alidi.ru, support_system@alidi.ru';
            } else if (isAutograph) {
                $('toInput').value = 'autograph_users@alidi.ru';
                $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
            } else {
                const impactsArray = Array.from(selectedImpacts);
                impactsArray.sort((a, b) => {
                    if (a === 'РФ') return -1;
                    if (b === 'РФ') return 1;
                    return a.localeCompare(b);
                });
                
                let toEmails = '';
                if (impactsArray.includes('ГК')) {
                    toEmails = 'all_gk@alidi.ru';
                } else if (impactsArray.length === 1) {
                    if (impactsArray.includes('РФ')) toEmails = 'all-rf@alidi.ru';
                    else if (impactsArray.includes('РБ')) toEmails = 'all-rb@alidi.ru';
                    else if (impactsArray.includes('РК')) toEmails = 'all-rk@alidi.ru';
                } else if (impactsArray.length === 2) {
                    if (impactsArray.includes('РФ') && impactsArray.includes('РБ')) {
                        toEmails = 'all-rf@alidi.ru, all-rb@alidi.ru';
                    } else if (impactsArray.includes('РБ') && impactsArray.includes('РК')) {
                        toEmails = 'all-rb@alidi.ru, all-rk@alidi.ru';
                    } else if (impactsArray.includes('РФ') && impactsArray.includes('РК')) {
                        toEmails = 'all-rf@alidi.ru, all-rk@alidi.ru';
                    }
                } else if (impactsArray.length === 3) {
                    toEmails = 'all_gk@alidi.ru';
                }
                
                $('toInput').value = toEmails;
                
                if (impactsArray.includes('ГК')) {
                    $('ccInput').value = '';
                } else if (impactsArray.length > 0) {
                    $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                } else {
                    $('ccInput').value = '';
                }
            }
        }

        // Вызов updateEmails при инициализации
        updateEmails();

        // Пресеты рекомендаций
        document.querySelectorAll('.rec-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $('recommendations').value = btn.getAttribute('data-rec');
                triggerWaveAnimation($('recommendations'));
            });
        });

        // Пресеты дополнительных сообщений
        document.querySelectorAll('.completion-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $('additionalMessage').value = btn.getAttribute('data-additional');
                triggerWaveAnimation($('additionalMessage'));
            });
        });

        // Обновление сервисов по системе
function updateServicesBySystem(system, workType) {
    // Специальная логика для "Сервера 1С и Phoenix"
    if (system === 'Сервера 1С и Phoenix') {
        $('services').value = 'Системы 1С и Феникс могут быть недоступны';
        return;
    }
    
    if ((workType === 'avr' || workType === 'multiday') && avrSystemMessages[system]) {
        $('services').value = avrSystemMessages[system];
    } else if (systemMessages[system]) {
        $('services').value = systemMessages[system];
    } else if (system.trim()) {
        $('services').value = workType === 'avr' ? `Проблемы с ${system}` : `Работа с ${system} недоступна`;
    }
}
        // Обновление темы
        function updateSubjectByType(workType) {
            const emoji = workType === 'planned' || workType === 'multiday' ? '🟢' : workType === 'unplanned' ? '🟡' : '🔴';
            let text;
            if (workType === 'avr') {
                text = 'АВАРИЙНО-ВОССТАНОВИТЕЛЬНЫЕ РАБОТЫ';
            } else if (workType === 'unplanned') {
                text = 'ВНЕПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ';
            } else {
                text = 'ПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ';
            }
            $('subjectInput').value = `${emoji} ${text}`;
        }

        // Шаблоны сообщений при завершении
        const completionMessages = {
            planned: 'Плановые технические работы завершены. Сервисы работают в штатном режиме.',
            multiday: 'Плановые технические работы завершены. Сервисы работают в штатном режиме.',
            unplanned: 'Внеплановые технические работы завершены. Сервисы работают в штатном режиме.',
            avr: 'Аварийно-восстановительные работы завершены. Сервисы работают в штатном режиме.'
        };

        // Шаблон для JDE при завершении
        const jdeCompletionMessage = 'Обновление завершено<br>JDE доступен для работы';
        const jdeCompletionEmoji = '🎉';

        // Функция проверки JDE
        function isJDE(system) {
            return system.toLowerCase().includes('jde');
        }

        // Функция получения текста завершения в зависимости от системы
        function getCompletionMessage(system, workType, additionalMessage) {
            const isJDESystem = isJDE(system);

            if (isJDESystem) {
                return {
                    message: additionalMessage && additionalMessage.trim() ? additionalMessage : `Обновление завершено<br>${system.split(' ')[0]} доступен для работы`,
                    emoji: '🎉'
                };
            }

            // Для остальных систем используем completionMessages
            const defaultMsg = completionMessages[workType];
            return {
                message: additionalMessage && additionalMessage.trim() ? additionalMessage : defaultMsg,
                emoji: workType === 'unplanned' ? '👌' : '✅'
            };
        }

        // Переменная для отслеживания предыдущей системы
        let previousSystem = '';

        // Упрощённая функция обновления формы в зависимости от типа сообщения
        function updateFormForMessageType() {
            const isMultiDay = currentWorkType === 'avr' || currentWorkType === 'multiday';
            const isSimpleStart = currentMessageType === 'start' && !isMultiDay;

            // Скрываем все необязательные секции
            $('extensionTimeGroup').classList.add('hidden');
            $('timeCompletionGroup').classList.add('hidden');
            $('completionGroup').classList.add('hidden');

            // Сбрасываем видимость основных полей
            $('dateStart').parentElement.classList.remove('hidden');
            $('timeGroup').classList.remove('hidden');

            // Переключение между Сервисы и Текст
            if (currentMessageType === 'completion') {
                // Показываем поле "Текст" для завершения работ
                $('servicesContainer').classList.add('hidden');
                $('completionTextContainer').classList.remove('hidden');
                // Подставляем значение по умолчанию если пустое
                if (!$('completionText').value.trim()) {
                    const defaultMsg = completionMessages[currentWorkType] || 'Технические работы завершены. Сервисы работают в штатном режиме.';
                    $('completionText').value = defaultMsg;
                }
            } else {
                // Показываем поле "Сервисы" для начала и продления
                $('servicesContainer').classList.remove('hidden');
                $('completionTextContainer').classList.add('hidden');
            }

            switch (currentMessageType) {
                case 'start':
                    if (isMultiDay) {
                        // АВР/Многодневные - показываем дату завершения
                        $('timeCompletionGroup').classList.remove('hidden');
                        $('completionGroup').classList.remove('hidden');
                        $('dateStartLabel').textContent = 'Дата начала:';
                        $('timeLabel').textContent = 'Время начала:';
                        if ($('dateCompletion').value === '') {
                            $('dateCompletion').value = 'Уточняется';
                        }
                    } else {
                        // Простой старт - только дата и время
                        $('timeLabel').textContent = 'Время проведения:';
                    }
                    break;

                case 'extension':
                    // Продление - скрываем дату начала, показываем время продления
                    $('dateStart').parentElement.classList.add('hidden');
                    $('timeGroup').classList.add('hidden');
                    $('extensionTimeGroup').classList.remove('hidden');
                    $('completionGroup').classList.remove('hidden');
                    break;

                case 'completion':
                    // Завершение - скрываем дату/время начала, показываем дату/время завершения
                    $('dateStart').parentElement.classList.add('hidden');
                    $('timeGroup').classList.add('hidden');
                    $('timeCompletionGroup').classList.remove('hidden');
                    $('completionGroup').classList.remove('hidden');
                    break;
            }
        }

        // Функция обновления шаблона при смене системы
function handleSystemChange(newSystem, oldSystem) {
    const newSystemLower = newSystem.toLowerCase();
    const oldSystemLower = oldSystem.toLowerCase();

    // Если тип сообщения - завершение
    if (currentMessageType === 'completion') {
        // Если сменили с JDE на другую систему - сбрасываем на стандартный шаблон
        if (oldSystemLower.includes('jde') && !newSystemLower.includes('jde')) {
            const defaultMsg = completionMessages[currentWorkType];
            $('additionalMessage').value = defaultMsg;
        }
        // Если сменили на JDE - подставляем шаблон JDE
        else if (!oldSystemLower.includes('jde') && newSystemLower.includes('jde')) {
            $('additionalMessage').value = jdeCompletionMessage;
        }
        // Если сменили систему, но тип работ изменился - обновляем шаблон
        else if (oldSystem !== newSystem) {
            if (newSystemLower.includes('jde')) {
                $('additionalMessage').value = jdeCompletionMessage;
            } else {
                const defaultMsg = completionMessages[currentWorkType];
                $('additionalMessage').value = defaultMsg;
            }
        }
    }
    
    updateEmails();
}
        // Обработчики событий
        let systemInputTimeout;
$('system').addEventListener('input', () => {
    console.log('Событие input для системы сработало');
    console.log('Текущее значение поля системы:', $('system').value);
    console.log('previousSystem:', previousSystem);

    updateServicesBySystem($('system').value, currentWorkType);
    updateEmails();

    // Отложенная обработка смены системы (чтобы не срабатывало на каждую букву)
    clearTimeout(systemInputTimeout);
    systemInputTimeout = setTimeout(() => {
        const oldSystem = previousSystem;
        console.log('Таймер сработал, oldSystem:', oldSystem);
        console.log('Текущее значение поля системы:', $('system').value);

        if (oldSystem !== $('system').value) {
            console.log('Система изменилась, вызываем handleSystemChange');
            handleSystemChange($('system').value, oldSystem);
            previousSystem = $('system').value;
            console.log('previousSystem обновлён:', previousSystem);
        } else {
            console.log('Система не изменилась, handleSystemChange не вызывается');
        }
    }, 300);
});
        // Обработчик для поля completionText (Текст при завершении работ)
        $('completionText').addEventListener('input', () => {
            debouncedAutoGenerate();
        });
        document.querySelectorAll('input[name="workType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                currentWorkType = radio.value;
                updateSubjectByType(currentWorkType);
                updatePreviewType();
                updateServicesBySystem($('system').value, currentWorkType);

                // Настройка полей для АВР
                if (currentWorkType === 'avr') {
                    $('dateStartLabel').textContent = 'Дата начала:';
                    $('timeLabel').textContent = 'Время начала:';
                    $('timeRange').placeholder = "08:00";
                    // Для АВР - дата завершения по умолчанию "Уточняется", время пустое
                    if (currentMessageType === 'start') {
                        $('dateCompletion').value = 'Уточняется';
                        $('timeCompletion').value = '';
                    }
                    // Показываем дату начала для АВР при любом типе сообщения
                    $('dateStart').parentElement.classList.remove('hidden');
                }
                // Настройка полей для многодневных
                else if (currentWorkType === 'multiday') {
                    $('dateStartLabel').textContent = 'Дата начала:';
                    $('timeLabel').textContent = 'Время начала:';
                    $('timeRange').placeholder = "08:00";
                    // Для многодневных - дата завершения по умолчанию "Уточняется", время пустое
                    if (currentMessageType === 'start') {
                        $('dateCompletion').value = 'Уточняется';
                        $('timeCompletion').value = '';
                    }
                    // Показываем дату начала для многодневных при любом типе сообщения
                    $('dateStart').parentElement.classList.remove('hidden');
                } else {
                    $('dateStartLabel').textContent = 'Дата проведения:';
                    $('timeLabel').textContent = 'Время:';
                    $('timeRange').placeholder = "19:00-20:00";
                }

                // Обновляем шаблон при смене типа работ
                updateFormForMessageType();
            });
        });

        function updatePreviewType() {
            const isCompletionAVR = currentWorkType === 'avr' && currentMessageType === 'completion';
            const typeNames = { planned: 'Плановые', multiday: 'Многодневные', unplanned: 'Внеплановые', avr: isCompletionAVR ? 'Завершение АВР' : 'АВР' };
            const typeClasses = { planned: 'type-planned', multiday: 'type-multiday', unplanned: 'type-unplanned', avr: isCompletionAVR ? 'type-planned' : 'type-avr' };
            $('previewType').textContent = typeNames[currentWorkType];
            $('previewType').className = 'notification-type ' + typeClasses[currentWorkType];
        }

        $('messageType').addEventListener('change', () => {
            const previousMessageType = currentMessageType;
            currentMessageType = $('messageType').value;
            
            // Если переключились на "Завершение" и в поле "Время продления" есть цифры - переносим
            if (currentMessageType === 'completion' && previousMessageType === 'extension') {
                const extensionTimeValue = $('extensionTime').value.trim();
                // Проверяем что это только цифры (возможно с разделителями)
                if (extensionTimeValue && /^[\d:\-\s]+$/.test(extensionTimeValue)) {
                    $('timeCompletion').value = extensionTimeValue;
                }
            }
            
            updateFormForMessageType();
            updatePreviewType();
            // Обновляем превью цвета при смене типа сообщения (если выбрано "Авто")
            if (currentColorScheme === 'default') {
                updateColorPreview();
            }
        });

        // Inline-валидация с debounce для полей ввода
        function validateDateField(inputElement, errorElement, fieldName) {
            const value = inputElement.value.trim();
            
            if (value === '') {
                // Поле пустое - не показываем ошибку
                inputElement.classList.remove('input-error');
                if (errorElement) errorElement.classList.remove('show');
                return true;
            }
            
            // Проверка формата даты
            const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
            if (!dateRegex.test(value)) {
                inputElement.classList.add('input-error');
                if (errorElement) {
                    errorElement.textContent = 'Формат: ДД.ММ.ГГГГ';
                    errorElement.classList.add('show');
                }
                return false;
            }
            
            // Проверка валидности даты
            const parts = value.split('.');
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            if (month < 1 || month > 12) {
                inputElement.classList.add('input-error');
                if (errorElement) {
                    errorElement.textContent = 'Месяц: 01-12';
                    errorElement.classList.add('show');
                }
                return false;
            }
            
            const daysInMonth = new Date(year, month, 0).getDate();
            if (day < 1 || day > daysInMonth) {
                inputElement.classList.add('input-error');
                if (errorElement) {
                    errorElement.textContent = `День: 01-${daysInMonth}`;
                    errorElement.classList.add('show');
                }
                return false;
            }
            
            // Всё ок
            inputElement.classList.remove('input-error');
            if (errorElement) errorElement.classList.remove('show');
            return true;
        }

        function validateTimeField(inputElement, errorElement, fieldName) {
            const value = inputElement.value.trim();
            
            if (value === '') {
                // Поле пустое - не показываем ошибку
                inputElement.classList.remove('input-error');
                if (errorElement) errorElement.classList.remove('show');
                return true;
            }
            
            // Проверка формата времени
            const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d(-([01]?\d|2[0-3]):[0-5]\d)?$/;
            if (!timeRegex.test(value)) {
                inputElement.classList.add('input-error');
                if (errorElement) {
                    errorElement.textContent = 'Формат: ЧЧ:ММ или ЧЧ:ММ-ЧЧ:ММ';
                    errorElement.classList.add('show');
                }
                return false;
            }
            
            // Всё ок
            inputElement.classList.remove('input-error');
            if (errorElement) errorElement.classList.remove('show');
            return true;
        }

        // Debounced валидация при вводе
        const debouncedValidateDate = debounce(function(inputElement, errorElement, fieldName) {
            validateDateField(inputElement, errorElement, fieldName);
        }, 500);

        const debouncedValidateTime = debounce(function(inputElement, errorElement, fieldName) {
            validateTimeField(inputElement, errorElement, fieldName);
        }, 500);

        // Валидация дат при вводе
        $('dateStart').addEventListener('input', function() {
            debouncedValidateDate(this, $('dateStartError'), 'Дата начала');
        });
        $('dateCompletion').addEventListener('input', function() {
            debouncedValidateDate(this, $('dateCompletionError'), 'Дата завершения');
        });

        // Валидация времени при вводе
        $('timeRange').addEventListener('input', function() {
            debouncedValidateTime(this, $('timeRangeError'), 'Время');
        });
        $('extensionTime').addEventListener('input', function() {
            debouncedValidateTime(this, $('extensionTimeError'), 'Время продления');
        });
        $('timeCompletion').addEventListener('input', function() {
            debouncedValidateTime(this, $('timeCompletionError'), 'Время завершения');
        });

        // Форматирование при blur
        $('dateStart').addEventListener('blur', function() {
            console.log('blur dateStart');
            formatDateInput($('dateStart'), $('dateStartError'));
            autoGenerate();
        });
        $('dateCompletion').addEventListener('blur', function() {
            console.log('blur dateCompletion');
            formatDateInput($('dateCompletion'), $('dateCompletionError'));
            autoGenerate();
        });
        $('timeRange').addEventListener('blur', function() {
            console.log('blur timeRange');
            formatTimeInput($('timeRange'), $('timeRangeError'));
            autoGenerate();
        });
        $('extensionTime').addEventListener('blur', function() {
            console.log('blur extensionTime');
            formatTimeInput($('extensionTime'), $('extensionTimeError'));
            autoGenerate();
        });
        $('timeCompletion').addEventListener('blur', function() {
            console.log('blur timeCompletion');
            formatTimeInput($('timeCompletion'), $('timeCompletionError'));
            autoGenerate();
        });

        // Ripple-эффект для кнопки генерации
        function createRipple(event, button) {
            const existingRipples = button.querySelectorAll('.ripple');
            existingRipples.forEach(r => r.remove());

            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
            button.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        }

        // Генерация (без валидации обязательных полей)
        $('generateBtn').addEventListener('click', (e) => {
            // Ripple-эффект
            createRipple(e, $('generateBtn'));

            // Форматируем значения при генерации (если поля заполнены)
            if ($('dateStart').value.trim()) {
                formatDateInput($('dateStart'), $('dateStartError'));
            }
            if ($('dateCompletion').value.trim()) {
                formatDateInput($('dateCompletion'), $('dateCompletionError'));
            }
            if ($('timeRange').value.trim()) {
                formatTimeInput($('timeRange'), $('timeRangeError'));
            }
            if ($('extensionTime').value.trim()) {
                formatTimeInput($('extensionTime'), $('extensionTimeError'));
            }
            if ($('timeCompletion').value.trim()) {
                formatTimeInput($('timeCompletion'), $('timeCompletionError'));
            }

            const workType = document.querySelector('input[name="workType"]:checked').value;
            const msgType = $('messageType').value;
            const dateStart = $('dateStart').value;
            const timeInput = $('timeRange').value;
            let dateCompletion = $('dateCompletion').value;
            const timeCompletion = $('timeCompletion').value;

            let timeStart, timeEnd, timeDisplay;
            if (msgType === 'extension') {
                timeEnd = $('extensionTime').value;
                timeStart = '';
                timeDisplay = timeEnd;
            } else if ((workType === 'avr' || workType === 'multiday') && msgType === 'start') {
                timeStart = timeInput;
                timeEnd = '';
                timeDisplay = timeStart;
            } else if ((workType === 'avr' || workType === 'multiday') && msgType === 'completion') {
                timeEnd = timeCompletion;
                timeStart = '';
                timeDisplay = timeEnd;
            } else {
            // Для плановых/внеплановых при начале - используем диапазон времени
            if (timeInput.includes('-')) {
                const parts = timeInput.split('-');
                timeStart = parts[0]?.trim() || '';
                timeEnd = parts[1]?.trim() || '';
                // Формируем отображение: start - end
                timeDisplay = timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : (timeStart || timeEnd);
            } else {
                timeStart = timeInput;
                timeEnd = '';
                timeDisplay = timeStart;
            }
        }

        // Для совместимости с generateNotificationHTML используем timeEnd как timeCompletion
        // Для плановых/внеплановых при completion - используем пустую строку если timeCompletion пустое
        let timeCompletionValue;
        if ((workType === 'planned' || workType === 'unplanned') && msgType === 'completion') {
            timeCompletionValue = timeCompletion && timeCompletion.trim() !== '' ? timeCompletion : '';
        } else if (workType === 'avr' || workType === 'multiday') {
            timeCompletionValue = timeCompletion;
        } else {
            timeCompletionValue = timeEnd;
        }

            const params = {
                workType, msgType, dateStart, dateCompletion,
                timeCompletion: timeCompletionValue,
                timeDisplay, timeStart, timeEnd,
                system: $('system').value,
                impact: $('impact').value,
                services: $('services').value,
                completionText: $('completionText').value,
                additionalMessage: $('additionalMessage').value,
                recommendations: $('recommendations').value,
                includeRec: $('includeRecommendations').checked,
                includeAdditional: $('includeAdditionalMessage').checked,
                includeServices: $('includeServices')?.checked ?? true,
                colorScheme: $('colorSchemeInput')?.value || 'default'
            };

            $('preview').innerHTML = generateNotificationHTML(params);
            $('previewText').textContent = generateTextNotification(params);
            $('preview').scrollTop = 0;

            // Анимация успешной генерации
            const btn = $('generateBtn');
            btn.classList.remove('error');
            btn.classList.add('success');
            setTimeout(() => btn.classList.remove('success'), 800);

            // Звук генерации
            playGenerateSound();
        });

        // Универсальная функция копирования в буфер обмена (с fallback для старых браузеров)
        async function copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(text);
                    return true;
                } catch (err) {
                    console.warn('navigator.clipboard.writeText failed, using fallback:', err);
                }
            }
            // Fallback для старых браузеров
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = text;
            tempTextArea.style.position = 'fixed';
            tempTextArea.style.left = '-9999px';
            tempTextArea.style.top = '-9999px';
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(tempTextArea);
                return true;
            } catch (err) {
                console.error('Fallback copy failed:', err);
                document.body.removeChild(tempTextArea);
                return false;
            }
        }

        // Санитизация HTML для защиты от XSS
        function sanitizeHtml(html) {
            // Убираем потенциально опасные теги и атрибуты
            return html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
                .replace(/on\w+\s*=\s*'[^']*'/gi, '')
                .replace(/javascript:/gi, '');
        }

        $('copyHtmlBtn').addEventListener('click', async function() {
            const htmlContent = $('preview').innerHTML;
            const success = await copyToClipboard(htmlContent);
            
            // Визуальная обратная связь
            animateCopyButton(this, 'HTML');
            
            // Показываем статус
            if (success) {
                playCopySound();
                showStatus('HTML код скопирован в буфер обмена!');
            } else {
                playErrorSound();
                showStatus('Ошибка копирования. Попробуйте вручную.', 'error');
            }
        });

        $('copyTextBtn').addEventListener('click', async function() {
            const text = $('previewText').textContent;
            const success = await copyToClipboard(text);
            
            // Визуальная обратная связь
            animateCopyButton(this, 'Текст');
            
            // Показываем статус
            if (success) {
                playCopySound();
                showStatus('Текст скопирован!');
            } else {
                playErrorSound();
                showStatus('Ошибка копирования. Попробуйте вручную.', 'error');
            }
        });

        $('copySubjectBtn').addEventListener('click', async function() {
            const btn = this;
            const subject = $('subjectInput').value;

            if (!subject) {
                playErrorSound();
                showStatus('Тема пуста!', 'error');
                return;
            }

            const success = await copyToClipboard(subject);
            
            if (success) {
                playCopySound();
                btn.classList.add('success');
                showStatus('Тема скопирована в буфер обмена!');
                setTimeout(() => {
                    btn.classList.remove('success');
                    btn.disabled = false;
                }, 1500);
            } else {
                playErrorSound();
                btn.classList.add('error');
                btn.innerHTML = '<span class="btn-copy-icon">✗</span> Ошибка';
                showStatus('Ошибка копирования.', 'error');
                setTimeout(() => {
                    btn.classList.remove('error');
                    btn.innerHTML = '<span class="btn-copy-icon">✉️</span> Тема';
                    btn.disabled = false;
                }, 2000);
            }
        });

        // === Отправка в Telegram ===
