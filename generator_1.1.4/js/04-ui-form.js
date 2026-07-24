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

        // Переключение карточек (Сервисы, Рекомендации, Доп. сообщение)
        document.querySelectorAll('.option-card-header').forEach(header => {
            header.addEventListener('click', function() {
                const card = $(this.dataset.toggle);
                if (!card) return;
                const checkbox = card.querySelector('.switch input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    card.classList.toggle('active', checkbox.checked);
                    autoGenerate();
                }
            });
        });

        document.querySelectorAll('.option-card .switch input').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const card = this.closest('.option-card');
                if (card) {
                    card.classList.toggle('active', this.checked);
                    autoGenerate();
                }
            });
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

        // Переменная для отслеживания предыдущей системы
        let previousSystem = '';

        // Система — вкладки и теги
        function renderSystemTags(tabId) {
            const container = $('systemTags');
            const config = systemTabsConfig[tabId];
            if (!config) return;
            container.innerHTML = '';
            const meta = window._userSystemMeta || {};
            config.systems.forEach(sys => {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display:flex;align-items:center;gap:2px;';
                const tag = document.createElement('button');
                tag.className = 'system-tag';
                tag.setAttribute('data-system', sys);
                tag.textContent = sys;
                if (sys === $('system').value) tag.classList.add('selected');
                tag.addEventListener('click', () => onSystemTagClick(tag, sys));
                wrapper.appendChild(tag);

                // Кнопка удаления — только для пользовательских систем
                const isFav = tabId === 'favorites';
                const isCustom = meta[sys] !== undefined;
                if (isFav || isCustom) {
                    const del = document.createElement('span');
                    del.textContent = '✕';
                    del.style.cssText = 'cursor:pointer;font-size:11px;color:#999;padding:0 3px;user-select:none;flex-shrink:0;';
                    del.title = 'Удалить';
                    del.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (tabId === 'favorites') {
                            config.systems = config.systems.filter(s => s !== sys);
                            saveUserData();
                        } else {
                            config.systems = config.systems.filter(s => s !== sys);
                            delete meta[sys];
                            window._userSystemMeta = meta;
                            saveUserData();
                        }
                        renderSystemTags(tabId);
                        if (config.systems.length > 0) {
                            const first = document.querySelector('#systemTags .system-tag');
                            if (first) first.click();
                        }
                    });
                    wrapper.appendChild(del);
                }
                container.appendChild(wrapper);
            });
        }

        function onSystemTagClick(tag, systemValue) {
            document.querySelectorAll('.system-tag').forEach(t => t.classList.remove('selected'));
            tag.classList.add('selected');
            const oldSystemValue = $('system').value;

            if (systemValue === 'Phoenix2') {
                $('system').value = 'srv89/Phoenix2';
                $('dateStart').value = getThursdayDate();
                $('timeRange').value = '04:30-05:30';
            } else if (systemValue === '1С+Phoenix') {
                $('system').value = 'Сервера 1С и Phoenix';
                $('dateStart').value = getThursdayDate();
                $('timeRange').value = '19:00-20:00';
            } else if (systemValue === 'Автограф') {
                $('system').value = systemValue;
                $('dateStart').value = getCurrentDate();
                $('timeRange').value = '17:00-18:00';
            } else if (systemValue === 'ТТК') {
                $('system').value = 'ТТК (основный канал)';
            } else {
                $('system').value = systemValue;
            }

            if (systemValue === 'JDE') {
                $('dateStart').value = getSaturdayDate();
                $('timeRange').value = '12:00-13:30';
            } else if (systemValue !== 'Phoenix2' && systemValue !== 'JDE' && systemValue !== '1С+Phoenix' && systemValue !== 'Автограф' && (oldSystemValue.toLowerCase().includes('jde') || oldSystemValue.toLowerCase().includes('phoenix'))) {
                $('dateStart').value = getCurrentDate();
                $('timeRange').value = '19:00';
            }

            updateServicesBySystem($('system').value, currentWorkType);
            updateEmails();
            // Убеждаемся, что поле Влияние не пустое
            if (!$('impact').value || $('impact').value.trim() === '') {
                if (selectedPeople) {
                    $('impact').value = selectedPeople;
                } else if (selectedImpacts.size > 0) {
                    $('impact').value = Array.from(selectedImpacts).sort((a, b) => a === 'РФ' ? -1 : b === 'РФ' ? 1 : a.localeCompare(b)).join(', ');
                } else {
                    $('impact').value = 'ГК';
                }
            }
            // Восстанавливаем сохранённые To/CC для пользовательских систем
            const savedMeta = (window._userSystemMeta || {})[systemValue];
            if (savedMeta) {
                if (savedMeta.to) $('toInput').value = savedMeta.to;
                if (savedMeta.cc) $('ccInput').value = savedMeta.cc;
                if (savedMeta.services) $('services').value = savedMeta.services;
            }
            handleSystemChange($('system').value, oldSystemValue);
            previousSystem = $('system').value;

            triggerWaveAnimation($('system'));
            triggerWaveAnimation($('dateStart'));
            triggerWaveAnimation($('services'));
        }

        // Переключение вкладок системы
        document.querySelectorAll('.system-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.system-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderSystemTags(tab.getAttribute('data-tab'));
            });
        });

        // Инициализация — добавляем вкладку избранного и загружаем данные
        systemTabsConfig['favorites'] = { label: '★ Избранное', systems: [] };

        // Загрузка из localStorage
        function loadUserData() {
            try {
                const saved = JSON.parse(localStorage.getItem('generator_user_systems') || '{}');
                if (saved.favorites && Array.isArray(saved.favorites)) {
                    systemTabsConfig['favorites'].systems = saved.favorites;
                }
                if (saved.custom && Array.isArray(saved.custom)) {
                    saved.custom.forEach(item => {
                        const tab = systemTabsConfig[item.tab];
                        if (tab && !tab.systems.includes(item.name)) {
                            tab.systems.push(item.name);
                        }
                    });
                }
                window._userSystemMeta = saved.meta || {};
            } catch(e) {}
        }
        loadUserData();

        function saveUserData() {
            const meta = window._userSystemMeta || {};
            const custom = [];
            Object.keys(meta).forEach(name => {
                if (systemTabsConfig['favorites']?.systems.includes(name)) return;
                for (const [id, tab] of Object.entries(systemTabsConfig)) {
                    if (id !== 'favorites' && tab.systems.includes(name)) {
                        custom.push({ tab: id, name: name });
                        break;
                    }
                }
            });
            try {
                localStorage.setItem('generator_user_systems', JSON.stringify({
                    favorites: systemTabsConfig['favorites'].systems,
                    custom: custom,
                    meta: meta
                }));
            } catch(e) {}
        }

        // Влияние — вкладки и теги (объявления вынесены сюда, чтобы были доступны при инициализации)
        let selectedImpacts = new Set();
        let selectedPeople = null;

        (function initImpact() {
            const tab = document.querySelector('[data-impact-tab].active');
            if (tab) {
                renderImpactTags(tab.getAttribute('data-impact-tab'));
                selectedImpacts.add('ГК');
                $('impact').value = 'ГК';
                const gkTag = document.querySelector('#impactTags .system-tag[data-impact="ГК"]');
                if (gkTag) gkTag.classList.add('selected');
            }
        })();

        // Инициализация первой вкладки (Избранное, если не пусто — иначе Еженедельные)
        const favHasItems = systemTabsConfig['favorites']?.systems?.length > 0;
        const defaultTabId = favHasItems ? 'favorites' : 'weekly';
        const firstTab = document.querySelector('.system-tab[data-tab="' + defaultTabId + '"]');
        if (firstTab) {
            document.querySelectorAll('.system-tab').forEach(t => t.classList.remove('active'));
            firstTab.classList.add('active');
            renderSystemTags(defaultTabId);
            if (!document.querySelector('#systemTags .system-tag.selected')) {
                const firstTag = document.querySelector('#systemTags .system-tag');
                if (firstTag) firstTag.click();
            }
        }

        // Кнопка «+ Добавить систему» — сохраняет введённую систему в активную вкладку с To/CC
        $('systemAddBtn')?.addEventListener('click', () => {
            const name = $('system').value.trim();
            if (!name) return;
            const activeTab = document.querySelector('.system-tab.active');
            if (!activeTab) return;
            const tabId = activeTab.getAttribute('data-tab');
            const config = systemTabsConfig[tabId];
            if (!config) return;
            if (config.systems.includes(name)) {
                showStatus('Система «' + name + '» уже существует в этой вкладке', 'error');
                return;
            }
            config.systems.push(name);
            const meta = window._userSystemMeta || {};
            meta[name] = { to: $('toInput').value, cc: $('ccInput').value, services: $('services').value };
            window._userSystemMeta = meta;
            renderSystemTags(tabId);
            rebuildSystemAutocomplete();
            saveUserData();
            const allTags = document.querySelectorAll('#systemTags .system-tag');
            if (allTags.length > 0) allTags[allTags.length - 1].click();
            showStatus('Система «' + name + '» добавлена', 'success');
        });

        // Кнопка «★ В избранное» — добавляет текущую систему в избранное без переключения вкладки
        $('systemFavBtn')?.addEventListener('click', () => {
            const name = $('system').value.trim();
            if (!name) return;
            const fav = systemTabsConfig['favorites'];
            if (fav.systems.includes(name)) {
                showStatus('Система «' + name + '» уже в избранном', 'error');
                return;
            }
            fav.systems.push(name);
            rebuildSystemAutocomplete();
            saveUserData();
            showStatus('Система «' + name + '» добавлена в избранное', 'success');
        });

        // Экспорт/импорт настроек
        $('exportBtn')?.addEventListener('click', () => {
            const meta = window._userSystemMeta || {};
            const custom = [];
            Object.keys(meta).forEach(name => {
                if (systemTabsConfig['favorites']?.systems.includes(name)) return;
                for (const [id, tab] of Object.entries(systemTabsConfig)) {
                    if (id !== 'favorites' && tab.systems.includes(name)) {
                        custom.push({ tab: id, name: name });
                        break;
                    }
                }
            });
            const data = {
                favorites: systemTabsConfig['favorites']?.systems || [],
                custom: custom,
                meta: meta,
                date: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'generator_backup_' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(url);
            showStatus('Backup скачан', 'success');
        });

        $('importBtn')?.addEventListener('click', () => {
            $('importFileInput')?.click();
        });

        $('importFileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.favorites && Array.isArray(data.favorites)) {
                        systemTabsConfig['favorites'].systems = data.favorites;
                    }
                    if (data.meta) {
                        window._userSystemMeta = data.meta;
                    }
                    if (data.custom && Array.isArray(data.custom)) {
                        data.custom.forEach(item => {
                            const tab = systemTabsConfig[item.tab];
                            if (tab && !tab.systems.includes(item.name)) {
                                tab.systems.push(item.name);
                            }
                        });
                    }
                    rebuildSystemAutocomplete();
                    saveUserData();
                    const activeTab = document.querySelector('.system-tab.active');
                    if (activeTab) renderSystemTags(activeTab.getAttribute('data-tab'));
                    showStatus('Backup загружен', 'success');
                } catch(err) {
                    showStatus('Ошибка загрузки backup', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Автодополнение поля Системы
        function rebuildSystemAutocomplete() {
            const allSystems = new Set();
            Object.values(systemTabsConfig).forEach(tab => tab.systems.forEach(s => allSystems.add(s)));
            const sorted = Array.from(allSystems).sort();
            const input = $('system');
            const listId = 'systemAutocompleteList';
            let list = document.getElementById(listId);
            if (!list) {
                list = document.createElement('datalist');
                list.id = listId;
                document.body.appendChild(list);
            }
            list.innerHTML = '';
            sorted.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                list.appendChild(opt);
            });
            input.setAttribute('list', listId);
        }
        rebuildSystemAutocomplete();

        // Стрелки прокрутки вкладок
        const tabsScroll = $('systemTabsScroll');
        const arrowLeft = $('tabsArrowLeft');
        const arrowRight = $('tabsArrowRight');

        if (arrowLeft) arrowLeft.addEventListener('click', () => {
            if (tabsScroll) tabsScroll.scrollBy({ left: -150, behavior: 'smooth' });
        });
        if (arrowRight) arrowRight.addEventListener('click', () => {
            if (tabsScroll) tabsScroll.scrollBy({ left: 150, behavior: 'smooth' });
        });

        // Переключение popup-окон
        document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const popupId = trigger.getAttribute('data-popup');
                const popup = document.getElementById(popupId);
                if (!popup) return;
                const isOpen = popup.classList.contains('show');
                document.querySelectorAll('.system-popup.show').forEach(p => p.classList.remove('show'));
                if (!isOpen) popup.classList.add('show');
            });
        });

        // Закрытие popup при клике вне
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.system-popup') && !e.target.closest('.dropdown-trigger')) {
                document.querySelectorAll('.system-popup.show').forEach(p => p.classList.remove('show'));
            }
        });

        // Закрытие popup при выборе тега
        document.addEventListener('click', (e) => {
            const tag = e.target.closest('.system-popup .system-tag');
            if (!tag) return;
            const popup = tag.closest('.system-popup');
            // Система — закрываем сразу
            if (popup?.id === 'systemPopup') { popup.classList.remove('show'); return; }
            // Влияние: страны не закрываем (мультивыбор), люди закрываем
            if (popup?.id === 'impactPopup') {
                const activeTab = document.querySelector('[data-impact-tab].active');
                if (activeTab?.getAttribute('data-impact-tab') === 'people') {
                    popup.classList.remove('show');
                }
            }
        });

        // Влияние — вкладки и теги (функции)
        function renderImpactTags(tabId) {
            const container = $('impactTags');
            const config = impactTabsConfig[tabId];
            if (!config) return;
            container.innerHTML = '';
            config.tags.forEach(tagValue => {
                const tag = document.createElement('button');
                tag.className = 'system-tag';
                tag.setAttribute('data-impact', tagValue);
                tag.textContent = tagValue;
                if (config.multi && selectedImpacts.has(tagValue)) tag.classList.add('selected');
                if (!config.multi && selectedPeople === tagValue) tag.classList.add('selected');
                tag.addEventListener('click', () => onImpactTagClick(tagValue, config.multi));
                container.appendChild(tag);
            });
        }

        function onImpactTagClick(value, multi) {
            if (multi) {
                if (value === 'ГК') {
                    if (selectedImpacts.has('ГК')) selectedImpacts.delete('ГК');
                    else { selectedImpacts.clear(); selectedImpacts.add('ГК'); }
                } else {
                    if (selectedImpacts.has('ГК')) { selectedImpacts.clear(); selectedImpacts.add(value); }
                    else {
                        if (selectedImpacts.has(value)) selectedImpacts.delete(value);
                        else selectedImpacts.add(value);
                    }
                }
                if (selectedImpacts.has('РФ') && selectedImpacts.has('РБ') && selectedImpacts.has('РК')) {
                    selectedImpacts.clear();
                    selectedImpacts.add('ГК');
                }
                $('impact').value = selectedImpacts.size ? Array.from(selectedImpacts).sort((a, b) => a === 'РФ' ? -1 : b === 'РФ' ? 1 : a.localeCompare(b)).join(', ') : 'ГК';
            } else {
                selectedPeople = selectedPeople === value ? null : value;
                if (selectedPeople === 'Пользователи JDE') {
                    $('toInput').value = 'jde_users@alidi.ru';
                    $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                } else if (selectedPeople === 'Пользователи 1С') {
                    $('toInput').value = '1c_users@alidi.ru';
                    $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                }
                $('impact').value = selectedPeople || '';
            }
            document.querySelectorAll('#impactTags .system-tag').forEach(t => {
                const val = t.getAttribute('data-impact');
                if (multi) t.classList.toggle('selected', selectedImpacts.has(val));
                else t.classList.toggle('selected', selectedPeople === val);
            });
            updateServicesBySystem($('system').value, currentWorkType);
            updateEmails();
            triggerWaveAnimation($('impact'));
        }

        // Переключение вкладок влияния
        document.querySelectorAll('[data-impact-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('[data-impact-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderImpactTags(tab.getAttribute('data-impact-tab'));
            });
        });

        // Функция обновления email-адресов
        function updateEmails() {
            const system = $('system').value;
            const isJDE = system.toLowerCase().includes('jde');
            const isAutograph = system.toLowerCase() === 'автограф';

            // Приоритет 1: система с жёсткими адресатами (JDE, Автограф)
            if (isJDE) {
                $('toInput').value = 'jde_users@alidi.ru, dirfil@alidi.ru';
                $('ccInput').value = 'dbadmin@alidi.ru, all_kis_members@alidi.ru, it_top@alidi.ru, support_system@alidi.ru';
                return;
            }
            if (isAutograph) {
                $('toInput').value = 'autograph_users@alidi.ru';
                $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                return;
            }

            // Приоритет 1.5: система 1С (без Phoenix) + влияние
            const is1C = (system.toLowerCase().includes('1с') || system.toLowerCase().includes('1c')) && !system.toLowerCase().includes('phoenix');
            if (is1C && !selectedPeople) {
                const impactsArray = Array.from(selectedImpacts);
                if (impactsArray.includes('РК') && impactsArray.includes('РБ')) {
                    $('toInput').value = '1CKZH_users@alidi.ru, 1c_users_min@alidi.ru';
                    $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                    return;
                }
                if (impactsArray.includes('РК')) {
                    $('toInput').value = '1CKZH_users@alidi.ru';
                    $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                    return;
                }
                if (impactsArray.includes('ГК') || impactsArray.includes('РФ')) {
                    $('toInput').value = '1c_users@alidi.ru';
                    $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                    return;
                }
                if (impactsArray.includes('РБ')) {
                    $('toInput').value = '1c_users_min@alidi.ru';
                    $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                    return;
                }
            }

            // Приоритет 2: пользователь из вкладки Люди
            if (selectedPeople === 'Пользователи JDE') {
                $('toInput').value = 'jde_users@alidi.ru';
                $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                return;
            }
            if (selectedPeople === 'Пользователи 1С') {
                $('toInput').value = '1c_users@alidi.ru';
                $('ccInput').value = 'it_top@alidi.ru, support_system@alidi.ru';
                return;
            }

            // Приоритет 3: влияние (Страны)
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
    if (system === 'Сервера 1С и Phoenix') {
        $('services').value = 'Системы 1С и Феникс могут быть недоступны';
        return;
    }
    if (system === 'ТТК (основный канал)') {
        if ((workType === 'avr' || workType === 'multiday') && avrSystemMessages['ТТК']) {
            $('services').value = avrSystemMessages['ТТК'];
        } else if (systemMessages['ТТК']) {
            $('services').value = systemMessages['ТТК'];
        }
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
        const jdeCompletionMessage = 'Обновление завершено. JDE доступен для работы 🎉';
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
                    message: additionalMessage && additionalMessage.trim() ? additionalMessage : jdeCompletionMessage,
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

        // Перемещение блока dateCompletion между группами
        function moveDateCompletionToExtension() {
            const slot = $('extDateCompletionSlot');
            const content = $('cplDateCompletionSlot').querySelector('.date-completion-content');
            if (slot && content) {
                slot.appendChild(content);
            }
        }

        function moveDateCompletionToCompletion() {
            const slot = $('cplDateCompletionSlot');
            const content = $('extDateCompletionSlot').querySelector('.date-completion-content');
            if (slot && content) {
                slot.appendChild(content);
            }
        }

        // Упрощённая функция обновления формы в зависимости от типа сообщения
        function updateFormForMessageType() {
            const isMultiDay = currentWorkType === 'avr' || currentWorkType === 'multiday';
            const isSimpleStart = currentMessageType === 'start' && !isMultiDay;

            // Скрываем все необязательные секции
            $('extensionGroup').classList.add('hidden');
            $('timeCompletionGroup').classList.add('hidden');
            $('completionGroup').classList.add('hidden');

            // Сбрасываем видимость основных полей
            $('dateStart').parentElement.classList.remove('hidden');
            $('timeGroup').classList.remove('hidden');

            // Перемещаем dateCompletion в нужный контейнер
            if (currentMessageType === 'extension') {
                moveDateCompletionToExtension();
            } else {
                moveDateCompletionToCompletion();
            }

            // Переключение между Сервисы и Текст
            if (currentMessageType === 'completion') {
                // Показываем поле "Текст" для завершения работ
                $('servicesContainer').classList.add('hidden');
                $('completionTextContainer').classList.remove('hidden');
                // Подставляем значение по умолчанию в зависимости от системы и типа работ
                const completion = getCompletionMessage($('system').value, currentWorkType, '');
                $('completionText').value = completion.message;
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
                    // Продление - скрываем дату начала, показываем время продления + дату завершения
                    $('dateStart').parentElement.classList.add('hidden');
                    $('timeGroup').classList.add('hidden');
                    $('extensionGroup').classList.remove('hidden');
                    break;

                case 'completion':
                    // Завершение - скрываем дату/время начала, показываем дату/время завершения
                    $('dateStart').parentElement.classList.add('hidden');
                    $('timeGroup').classList.add('hidden');
                    $('completionGroup').classList.remove('hidden');
                    $('timeCompletionGroup').classList.remove('hidden');
                    break;
            }
        }

        // Функция обновления шаблона при смене системы
function handleSystemChange(newSystem, oldSystem) {
    const newSystemLower = newSystem.toLowerCase();
    const oldSystemLower = oldSystem.toLowerCase();

    // Если тип сообщения - завершение, обновляем текст в зависимости от системы
    if (currentMessageType === 'completion' && oldSystem !== newSystem) {
        const completion = getCompletionMessage(newSystem, currentWorkType, '');
        $('completionText').value = completion.message;
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
