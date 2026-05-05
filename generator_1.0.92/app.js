        // ============================================
        // ОТЛАДКА - STARTUP LOG
        // ============================================
        console.log('[START] app.js loaded at', new Date().toISOString());
        
        // ============================================
        // ЗВУКОВАЯ СИСТЕМА (Web Audio API)
        // ============================================

        let audioCtx = null;
        let soundsEnabled = true;

        function getAudioContext() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            return audioCtx;
        }

        function loadSoundsSetting() {
            const saved = localStorage.getItem('generator_sounds_enabled');
            if (saved !== null) {
                soundsEnabled = saved === 'true';
            }
        }
        loadSoundsSetting();

        function playTone(frequency, duration, type = 'sine', volume = 0.15, delay = 0) {
            if (!soundsEnabled) return;
            try {
                const ctx = getAudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
                gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + duration);
            } catch (e) { /* silently ignore */ }
        }

        // Звук генерации уведомления — восходящий аккорд
        function playGenerateSound() {
            playTone(523.25, 0.12, 'sine', 0.12, 0);      // C5
            playTone(659.25, 0.12, 'sine', 0.10, 0.06);    // E5
            playTone(783.99, 0.18, 'sine', 0.08, 0.12);    // G5
        }

        // Звук копирования — короткий клик
        function playCopySound() {
            playTone(880, 0.06, 'sine', 0.10, 0);
            playTone(1100, 0.08, 'sine', 0.08, 0.04);
        }

        // Звук отправки в Telegram — ascending chime
        function playTelegramSound() {
            playTone(660, 0.10, 'sine', 0.12, 0);
            playTone(880, 0.10, 'sine', 0.10, 0.08);
            playTone(1100, 0.15, 'sine', 0.08, 0.16);
        }

        // Звук отправки в Zimbra — мягкий двойной тон
        function playZimbraSound() {
            playTone(587.33, 0.12, 'sine', 0.12, 0);       // D5
            playTone(739.99, 0.15, 'sine', 0.10, 0.10);    // F#5
        }

        // Звук добавления в очередь — pop
        function playQueueAddSound() {
            playTone(440, 0.08, 'triangle', 0.15, 0);
            playTone(660, 0.10, 'triangle', 0.12, 0.05);
        }

        // Звук удаления из очереди — нисходящий
        function playQueueRemoveSound() {
            playTone(440, 0.10, 'sine', 0.10, 0);
            playTone(330, 0.12, 'sine', 0.08, 0.06);
        }

        // Звук ошибки — низкий buzz
        function playErrorSound() {
            playTone(200, 0.15, 'square', 0.08, 0);
            playTone(150, 0.20, 'square', 0.06, 0.10);
        }

        // Звук переключения типа — лёгкий tick
        function playSwitchSound() {
            playTone(600, 0.04, 'sine', 0.08, 0);
        }

        // Звук успешной отправки — fanfare
        function playSuccessSound() {
            playTone(523.25, 0.10, 'sine', 0.12, 0);       // C5
            playTone(659.25, 0.10, 'sine', 0.10, 0.08);    // E5
            playTone(783.99, 0.10, 'sine', 0.08, 0.16);    // G5
            playTone(1046.50, 0.20, 'sine', 0.06, 0.24);   // C6
        }

        // Звук уведомления (browser notification) — alert
        function playAlertSound() {
            playTone(800, 0.12, 'sine', 0.15, 0);
            playTone(800, 0.12, 'sine', 0.15, 0.20);
            playTone(1000, 0.20, 'sine', 0.12, 0.40);
        }

        // Глобальные переменные для очереди
        let queue = [];
        let queueIdCounter = 0;

        // Функции форматирования
        function formatDate(dateStr) {
            if (!dateStr || dateStr.trim() === '') return '';
            // Убираем любые разделители и оставляем только цифры
            const digits = dateStr.replace(/[^\d]/g, '');

            // Если меньше 4 цифр - не форматируем, возвращаем как есть
            if (digits.length < 4) return dateStr;

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

            let day, month, year;

            if (digits.length === 4) {
                // 4 цифры: "1011" → "10.11.текущий_год" ИЛИ "0110" → "01.10.текущий_год"
                day = digits.substring(0, 2);
                month = digits.substring(2, 4);
                year = currentYear;
            } else if (digits.length >= 5) {
                // 5+ цифр: полная дата
                day = digits.substring(0, 2).padStart(2, '0');
                month = digits.substring(2, 4).padStart(2, '0');
                year = digits.substring(4, 8);

                // Если год введён двумя цифрами - добавляем 20
                if (year.length === 2) year = '20' + year;
                // Если год не введён (меньше 6 цифр) - используем текущий
                if (year.length === 0) year = String(currentYear);
            }

            return `${day}.${month}.${year}`;
        }

        function formatTime(timeStr) {
            if (!timeStr || timeStr.trim() === '') return '';

            // Убираем всё кроме цифр
            const digits = timeStr.replace(/[^\d]/g, '');

            if (digits.length === 0) return '';

            // 4 цифры = HHMM → HH:MM
            // 8 цифр = HHMMHHMM → HH:MM-HH:MM
            // Больше 8 - обрезаем до 8
            const validDigits = digits.length > 8 ? digits.substring(0, 8) : digits;

            let startTime, endTime;

            if (validDigits.length <= 4) {
                // Одно время (4 или меньше цифр)
                let h = validDigits.substring(0, Math.min(2, validDigits.length));
                let m = validDigits.length > 2 ? validDigits.substring(2, 4) : '00';

                // Ограничение: часы 0-23, минуты 0-59
                h = h.padStart(2, '0');
                if (parseInt(h) > 23) h = '23';
                if (parseInt(m) > 59) m = '59';

                startTime = `${h}:${m}`;
                return startTime;
            } else {
                // Диапазон (больше 4 цифр)
                const startDigits = validDigits.substring(0, 4);
                const endDigits = validDigits.substring(4, 8);

                let sh = startDigits.substring(0, 2);
                let sm = startDigits.substring(2, 4);
                let eh = endDigits.substring(0, 2);
                let em = endDigits.substring(2, 4);

                // Ограничение: часы 0-23, минуты 0-59
                sh = sh.padStart(2, '0');
                if (parseInt(sh) > 23) sh = '23';
                if (parseInt(sm) > 59) sm = '59';
                if (parseInt(eh) > 23) eh = '23';
                if (parseInt(em) > 59) em = '59';

                startTime = `${sh}:${sm}`;
                endTime = `${eh}:${em}`;

                return `${startTime}-${endTime}`;
            }
        }

        function formatDateInput(inputElement, errorElement) {
            const originalValue = inputElement.value;
            const formattedValue = formatDate(originalValue);

            if (formattedValue !== originalValue) {
                inputElement.value = formattedValue;
            }
            // Убираем ошибки - всегда возвращаем true
            inputElement.classList.remove('input-error');
            if (errorElement) {
                errorElement.classList.remove('show');
            }
            return true;
        }

        function formatTimeInput(inputElement, errorElement) {
            const originalValue = inputElement.value;
            // Разрешаем любой текст - не форматируем если не цифры
            const hasOnlyDigits = /^[\d]+$/.test(originalValue.replace(/[\s:]/g, ''));
            if (hasOnlyDigits && originalValue.trim().length >= 3) {
                // Это похоже на время - пробуем отформатировать
                const formattedValue = formatTime(originalValue);
                if (formattedValue && formattedValue !== originalValue) {
                    inputElement.value = formattedValue;
                }
            }
            // Убираем ошибки - всегда возвращаем true
            if (errorElement) {
                errorElement.classList.remove('show');
            }
            inputElement.classList.remove('input-error');
            return true;
        }

        // ============================================
        // КАЛЕНДАРЬ (DATE PICKER)
        // ============================================

        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                           'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const weekdayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

        let currentCalendarDate = new Date();
        let currentCalendarTarget = null;
        let calendarPopup = null;

        // Создание HTML календаря
        function createCalendarPopup() {
            const popup = document.createElement('div');
            popup.className = 'calendar-popup';
            popup.id = 'calendarPopup';
            popup.innerHTML = `
                <div class="calendar-header">
                <button class="calendar-nav-btn" id="calendarPrev" aria-label="Предыдущий месяц">◀</button>
                    <span class="calendar-title" id="calendarTitle" role="heading" aria-live="polite"></span>
                    <button class="calendar-nav-btn" id="calendarNext" aria-label="Следующий месяц">▶</button>
                </div>
                <div class="calendar-weekdays" id="calendarWeekdays"></div>
                <div class="calendar-days" id="calendarDays"></div>
                <div class="calendar-footer">
                    <button class="calendar-today-btn" id="calendarTodayBtn">Сегодня</button>
                </div>
            `;
            document.body.appendChild(popup);
            return popup;
        }

        // Отрисовка календаря
        function renderCalendar(date, targetInput) {
            const year = date.getFullYear();
            const month = date.getMonth();
            
            // Заголовок
            document.getElementById('calendarTitle').textContent = `${monthNames[month]} ${year}`;
            
            // Дни недели
            const weekdaysEl = document.getElementById('calendarWeekdays');
            weekdaysEl.innerHTML = weekdayNames.map((day, i) => 
                `<div class="calendar-weekday ${i >= 5 ? 'weekend' : ''}">${day}</div>`
            ).join('');
            
            // Дни месяца
            const daysEl = document.getElementById('calendarDays');
            daysEl.innerHTML = '';
            
            // Первый день месяца (0 = воскресенье, нужно конвертировать в Пн=0)
            const firstDay = new Date(year, month, 1);
            let startDay = firstDay.getDay() - 1;
            if (startDay < 0) startDay = 6;
            
            // Последний день месяца
            const lastDay = new Date(year, month + 1, 0).getDate();
            
            // Дни предыдущего месяца
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = startDay - 1; i >= 0; i--) {
                const day = prevMonthLastDay - i;
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day other-month';
                dayEl.textContent = day;
                daysEl.appendChild(dayEl);
            }
            
            // Дни текущего месяца
            const today = new Date();
            const selectedDate = targetInput.value ? parseDateString(targetInput.value) : null;
            
            for (let day = 1; day <= lastDay; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day';
                dayEl.textContent = day;
                
                // Проверяем, выходной ли день
                const dayOfWeek = new Date(year, month, day).getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    dayEl.classList.add('weekend');
                }
                
                // Проверяем, сегодня ли
                if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    dayEl.classList.add('today');
                }
                
                // Проверяем, выбранная ли дата
                if (selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
                    dayEl.classList.add('selected');
                }
                
                // Обработчик клика
                dayEl.addEventListener('click', () => {
                    const selectedDate = new Date(year, month, day);
                    const formattedDate = formatDateFromDate(selectedDate);
                    targetInput.value = formattedDate;
                    closeCalendar();
                    autoGenerate();
                });
                
                daysEl.appendChild(dayEl);
            }
            
            // Дни следующего месяца
            const totalCells = startDay + lastDay;
            const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            for (let day = 1; day <= remainingCells; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day other-month';
                dayEl.textContent = day;
                daysEl.appendChild(dayEl);
            }
        }

        // Парсинг строки даты в объект Date
        function parseDateString(dateStr) {
            if (!dateStr) return null;
            const parts = dateStr.split('.');
            if (parts.length !== 3) return null;
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
            return new Date(year, month, day);
        }

        // Форматирование объекта Date в строку ДД.ММ.ГГГГ
        function formatDateFromDate(date) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        }

        // Открытие календаря
        function openCalendar(targetInputId) {
            const targetInput = document.getElementById(targetInputId);
            if (!targetInput) return;
            
            currentCalendarTarget = targetInput;
            
            // Создаём popup если его нет
            if (!calendarPopup) {
                calendarPopup = createCalendarPopup();
                
                // Обработчики навигации
                document.getElementById('calendarPrev').addEventListener('click', () => {
                    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                    renderCalendar(currentCalendarDate, currentCalendarTarget);
                });
                
                document.getElementById('calendarNext').addEventListener('click', () => {
                    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                    renderCalendar(currentCalendarDate, currentCalendarTarget);
                });
                
                document.getElementById('calendarTodayBtn').addEventListener('click', () => {
                    const today = new Date();
                    currentCalendarTarget.value = formatDateFromDate(today);
                    closeCalendar();
                    autoGenerate();
                });
                
                // Keyboard navigation для календаря
                document.addEventListener('keydown', handleCalendarKeyboard);
                
                // Закрытие при клике вне календаря
                document.addEventListener('click', (e) => {
                    if (calendarPopup && calendarPopup.classList.contains('show')) {
                        if (!calendarPopup.contains(e.target) && !e.target.classList.contains('calendar-icon')) {
                            closeCalendar();
                        }
                    }
                });
            }
            
            // Устанавливаем текущую дату из поля или сегодня
            const currentValue = targetInput.value;
            if (currentValue) {
                const parsed = parseDateString(currentValue);
                if (parsed) {
                    currentCalendarDate = parsed;
                } else {
                    currentCalendarDate = new Date();
                }
            } else {
                currentCalendarDate = new Date();
            }
            
            // Позиционируем календарь
            const inputRect = targetInput.getBoundingClientRect();
            calendarPopup.style.top = `${inputRect.bottom + window.scrollY + 8}px`;
            calendarPopup.style.left = `${inputRect.left + window.scrollX}px`;
            
            // Отрисовываем и показываем
            renderCalendar(currentCalendarDate, currentCalendarTarget);
            calendarPopup.classList.add('show');
        }

        // Закрытие календаря
        function closeCalendar() {
            if (calendarPopup) {
                calendarPopup.classList.remove('show');
                document.removeEventListener('keydown', handleCalendarKeyboard);
            }
        }

        // Keyboard navigation для календаря
        function handleCalendarKeyboard(e) {
            if (!calendarPopup || !calendarPopup.classList.contains('show')) return;

            const days = calendarPopup.querySelectorAll('.calendar-day:not(.other-month)');
            const currentSelected = calendarPopup.querySelector('.calendar-day.selected') || 
                                   calendarPopup.querySelector('.calendar-day.today');
            
            if (!currentSelected) return;

            const currentIndex = Array.from(days).indexOf(currentSelected);
            let newIndex = currentIndex;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    newIndex = Math.max(0, currentIndex - 1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    newIndex = Math.min(days.length - 1, currentIndex + 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = Math.max(0, currentIndex - 7);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = Math.min(days.length - 1, currentIndex + 7);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    currentSelected.click();
                    return;
                case 'Escape':
                    e.preventDefault();
                    closeCalendar();
                    return;
                case 'Home':
                    e.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    newIndex = days.length - 1;
                    break;
                default:
                    return;
            }

            // Убираем фокус с текущего дня
            if (currentSelected) {
                currentSelected.classList.remove('selected');
            }

            // Устанавливаем фокус на новый день
            if (days[newIndex]) {
                days[newIndex].classList.add('selected');
                days[newIndex].focus();
            }
        }

        // Инициализация обработчиков иконок календаря
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.calendar-icon').forEach(icon => {
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = icon.getAttribute('data-target');
                    openCalendar(targetId);
                });
            });
        });

        // Сообщения для систем
        const systemMessages = {
            'SRS2': 'Формирование отчётов в SRS2 будет недоступно',
            'ТТК': 'Недоступны подключения по основным ярлыкам',
            'JDE': 'Система JDE будет недоступна',
            'Сети': 'Недоступна сеть локации',
            '1С': 'Работа с 1С будет недоступна',
'zmail.alidi.ru': 'Возможны частичные затруднения с отправкой и получением почты Zimbra, а также с работой календаря',
'WMS': 'Система WMS будет недоступна',
            'Phoenix2': 'Феникс 2 будет недоступен',
            'srv89/Phoenix2': 'Феникс 2 будет недоступен',
            '1С+Phoenix': 'Системы 1С и Феникс могут быть недоступны',
            'Оптимум': 'Сложности с загрузкой заказов MRS',
            'Zoom': 'Проблемы с отправкой сообщений и звонками'
        };

        const avrSystemMessages = {
            '1С': 'Недоступны подключения к базам 1С',
            '1С+Phoenix': 'Системы 1С и Феникс могут быть недоступны',
            'Оптимум': 'Сложности с загрузкой заказов MRS',
            'Zoom': 'Проблемы с отправкой сообщений и звонками'
        };

        const avrCompletionDefault = "Аварийно-восстановительные работы завершены. Сервисы работают в штатном режиме.";

        function isAVRCompletionMessage(message) {
            if (!message || typeof message !== 'string') return false;
            const keywords = ['аварийно-восстановительные работы завершены', 'работы завершены', 'сервисы работают в штатном режиме'];
            const lowerMessage = message.toLowerCase();
            return keywords.some(k => lowerMessage.includes(k));
        }

        function getCurrentDate() {
            const now = new Date();
            return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
        }

        // Кэш элементов
        const $ = (id) => document.getElementById(id);

        let currentWorkType = 'planned';
        let currentMessageType = 'start';
        let lastGeneratedHTML = '';

        // Функция debounce для отложенного вызова
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
            const preview = document.getElementById('colorPreview');
            const input = document.getElementById('colorSchemeInput');
            if (currentColorScheme === 'default') {
                const workType = document.querySelector('input[name="workType"]:checked')?.value;
                const msgType = $('messageType')?.value;
                // Для АВР: красный для start/extension, зеленый для completion
                if (workType === 'avr' && msgType === 'completion') preview.textContent = '🟢';
                else if (workType === 'avr') preview.textContent = '🔴';
                else if (workType === 'unplanned') preview.textContent = '🟡';
                else preview.textContent = '🟢';
            } else {
                preview.textContent = colorEmojis[currentColorScheme];
            }
            input.value = currentColorScheme;
        }

        document.getElementById('colorPickerBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('colorDropdown').classList.toggle('hidden');
        });

        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                currentColorScheme = option.getAttribute('data-value');
                updateColorPreview();
                document.getElementById('colorDropdown').classList.add('hidden');
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

        document.addEventListener('click', () => {
            document.getElementById('colorDropdown').classList.add('hidden');
        });

        // Переключение сегментов Тип сообщения
        document.querySelectorAll('.message-segment').forEach(segment => {
            segment.addEventListener('click', () => {
                const value = segment.getAttribute('data-value');
                const previousMessageType = currentMessageType;

                // Обновить визуальное состояние
                document.querySelectorAll('.message-segment').forEach(s => s.classList.remove('selected'));
                segment.classList.add('selected');

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
                else {
                    $('system').value = systemValue;
                }
                
                // Специальная логика для JDE - подставляем дату субботы и время 12:00-13:30
                if (systemValue === 'JDE') {
                    $('dateStart').value = getSaturdayDate();
                    $('timeRange').value = '12:00-13:30';
                }
                // Если переключились с JDE или Phoenix2 на другую систему (кроме Phoenix2/JDE/1С+Phoenix) - возвращаем сегодняшнюю дату
                else if (systemValue !== 'Phoenix2' && systemValue !== 'JDE' && systemValue !== '1С+Phoenix' && (previousSystem.toLowerCase().includes('jde') || previousSystem.toLowerCase().includes('phoenix'))) {
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
            
            if (isJDE) {
                $('toInput').value = 'jde_users@alidi.ru, dirfil@alidi.ru';
                $('ccInput').value = 'dbadmin@alidi.ru, all_kis_members@alidi.ru, it_top@alidi.ru, support_system@alidi.ru';
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

        // Функция для анимации кнопки копирования
        function animateCopyButton(button, type) {
            // Добавляем класс success для зелёного фона
            button.classList.add('success');
            
            // Отключаем кнопку на время анимации
            button.disabled = true;
            
            // Через 1.5 секунды возвращаем исходное состояние
            setTimeout(() => {
                button.classList.remove('success');
                button.disabled = false;
            }, 1500);
        }

        function showStatus(message, type = 'success') {
            const bar = $('statusBar');
            bar.textContent = message;
            bar.classList.remove('error');
            if (type === 'error') bar.classList.add('error');
            bar.classList.add('show');
            setTimeout(() => bar.classList.remove('show'), 2500);
        }

        // Генерация HTML - с оригинальными размерами из generator0.6
        function generateNotificationHTML(params) {
            // АВР красный при начале и продлении, зелёный только при завершении
            const isAVRCompletion = params.workType === 'avr' && params.msgType === 'completion';

            // Функция конвертации hex в RGB
            function hexToRgb(hex) {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '76, 175, 80';
            }

            const colorSchemes = {
                green: { primary: '#4caf50', secondary: '#66bb6a', light: '#e8f5e8' },
                yellow: { primary: '#ffc107', secondary: '#ffd54f', light: '#fff8e1' },
                red: { primary: '#f44336', secondary: '#ef5350', light: '#ffebee' }
            };

            const typeNames = {
                planned: 'ПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
                multiday: 'ПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
                unplanned: 'ВНЕПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
                avr: 'АВАРИЙНО-ВОССТАНОВИТЕЛЬНЫЕ РАБОТЫ'
            };

            // Определяем цвет: используем выбранный пользователем или дефолтный для типа работ
            let selectedColorScheme = params.colorScheme;
            if (!selectedColorScheme || selectedColorScheme === 'default') {
                // Дефолтные цвета по типу работ
                if (params.workType === 'avr' && params.msgType !== 'completion') {
                    selectedColorScheme = 'red';
                } else if (params.workType === 'unplanned') {
                    selectedColorScheme = 'yellow';
                } else {
                    selectedColorScheme = 'green';
                }
            }

            const color = colorSchemes[selectedColorScheme] || colorSchemes.green;
            const typeName = typeNames[params.workType];
            const emoji = selectedColorScheme === 'green' ? '🟢' : selectedColorScheme === 'yellow' ? '🟡' : '🔴';

            const isAVRStart = params.workType === 'avr' && params.msgType === 'start';
            const isMultidayStart = params.workType === 'multiday' && params.msgType === 'start';
            const isStartWithDetails = isAVRStart || isMultidayStart;
            const isCompletionWithMessage = (params.workType === 'avr' || params.workType === 'multiday') && params.msgType === 'completion';
            const isExtension = params.msgType === 'extension';

            // Проверка на "Уточняется"
            const isTimeUnknown = params.timeCompletion && params.timeCompletion.toLowerCase() === 'уточняется';

            // Время для отображения
            let timeDisplayForTable = '';

            // Для плановых/внеплановых при начале - используем диапазон времени
            if (params.msgType === 'start' && params.workType !== 'avr' && params.workType !== 'multiday') {
                if (params.timeStart && params.timeEnd) {
                    timeDisplayForTable = `${params.timeStart} - ${params.timeEnd}`;
                } else {
                    timeDisplayForTable = params.timeStart || params.timeEnd || '';
                }
            } else if (isExtension) {
                timeDisplayForTable = params.timeEnd;
            } else if (isCompletionWithMessage && params.timeCompletion) {
                timeDisplayForTable = isTimeUnknown ? 'Уточняется' : params.timeCompletion;
            } else if (params.msgType === 'completion' && params.timeCompletion) {
                timeDisplayForTable = isTimeUnknown ? 'Уточняется' : params.timeCompletion;
            } else if (params.workType === 'avr' || params.workType === 'multiday') {
                timeDisplayForTable = params.timeStart;
            } else {
                timeDisplayForTable = params.timeDisplay;
            }

            // Ширина 650px как в оригинале
let html = `<table width="650" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333333; margin: 0; padding: 0; border-collapse: collapse; border: none !important; display: block;">
            <tbody><tr><td style="box-sizing: border-box; padding: 0; margin: 0; border: none;">
            <table width="650" cellpadding="0" cellspacing="0" align="left" style="box-sizing: border-box; background: #ffffff; border-radius: 20px; box-shadow: rgba(${hexToRgb(color.primary)}, 0.15) 0px 8px 40px; margin: 0; padding: 0; border-collapse: collapse; border: none;">
            <tbody><tr><td style="background: linear-gradient(135deg, ${color.primary}, ${color.secondary}); padding: 24px; text-align: center; border-radius: 20px 20px 0px 0px; width: 100%; border: none;">
            <strong style="font-size: 20px; color: #ffffff; letter-spacing: 0.5px;">${emoji} ${typeName}</strong></td></tr>
            <tr><td style="padding: 40px 30px; width: 100%; border: none;">`;

            if (isExtension) {
                html += `<table width="100%" cellpadding="0" cellspacing="0"><tbody><tr><td style="text-align: center; border: none;">
                <div style="color: ${color.primary}; font-size: 52px; margin-bottom: 25px;">⏳</div>
                <div style="color: #2c3e50; font-size: 21px; font-weight: bold; margin-bottom: 20px; line-height: 1.4;">Работы продлены<br />до ${params.timeEnd} МСК</div>
                <div style="background: ${color.light}; padding: 18px 25px; border-radius: 10px; display: inline-block; border: 1px solid ${color.primary === '#f44336' ? '#ffcdd2' : color.primary === '#ffc107' ? '#ffecb3' : '#c8e6c9'}">
                <div style="color: #666; font-size: 14px; margin-bottom: 6px;">Новое время завершения</div>
                <div style="color: ${color.primary}; font-size: 17px; font-weight: bold;">${params.dateCompletion} &bull; ${params.timeEnd} МСК</div></div></td></tr></tbody></table>`;
            } else if (isCompletionWithMessage) {
                const completionMessage = params.additionalMessage.trim() || (params.workType === 'multiday' ? 'Плановые технические работы завершены. Сервисы работают в штатном режиме.' : avrCompletionDefault);
                // Показываем блок времени только если есть дата И время (не пустые)
                const hasCompletionTime = params.dateCompletion && params.timeCompletion && params.dateCompletion.trim() !== '' && params.timeCompletion.trim() !== '';
                html += `<table width="100%" cellpadding="0" cellspacing="0"><tbody><tr><td style="text-align: center; border: none;">
                <div style="color: ${color.primary}; font-size: 48px; margin-bottom: 20px;">✅</div>
                <div style="color: #2c3e50; font-size: 20px; font-weight: bold; margin-bottom: 15px; line-height: 1.4;">${completionMessage}</div>
                ${hasCompletionTime ? `<div style="background: #f8f9fa; padding: 12px 20px; border-radius: 6px; display: inline-block;"><div style="color: #666; font-size: 14px; margin-bottom: 6px;">Время завершения</div><div style="color: ${color.primary}; font-size: 17px; font-weight: bold;">${params.dateCompletion} &bull; ${params.timeCompletion} МСК</div></div>` : ''}</td></tr></tbody></table>`;
            } else if (params.msgType === 'completion') {
                // Сообщение о завершении в зависимости от типа работ
                // Проверка на JDE - в первую очередь!
                const isJDE = params.system.toLowerCase().includes('jde');
                let completionMsg = params.additionalMessage;
                let completionEmoji = '✅';

                // Если это JDE - всегда используем шаблон JDE вне зависимости от additionalMessage
                if (isJDE) {
                    completionMsg = 'Обновление завершено<br>JDE доступен для работы';
                    completionEmoji = '🎉';
                } else if (!completionMsg) {
                    // Только для не-JDE систем используем шаблон по умолчанию если пусто
                    if (params.workType === 'planned' || params.workType === 'multiday') {
                        completionMsg = 'Плановые технические работы завершены. Сервисы работают в штатном режиме.';
                        completionEmoji = '✅';
                    } else if (params.workType === 'unplanned') {
                        completionMsg = 'Внеплановые технические работы завершены. Сервисы работают в штатном режиме.';
                        completionEmoji = '👌';
                    } else if (params.workType === 'avr') {
                        completionMsg = 'Аварийно-восстановительные работы завершены. Сервисы работают в штатном режиме.';
                        completionEmoji = '✅';
                    }
                } else {
                    // Если additionalMessage задано, определяем эмодзи по типу работ
                    if (params.workType === 'unplanned') {
                        completionEmoji = '👌';
                    } else {
                        completionEmoji = '✅';
                    }
                }

                // Показываем блок времени только если есть дата И время
                const hasCompletionTimePlain = params.dateCompletion && params.timeCompletion && params.dateCompletion.trim() !== '' && params.timeCompletion.trim() !== '';
                html += `<table width="100%" cellpadding="0" cellspacing="0"><tbody><tr><td style="text-align: center; border: none;">
                <div style="color: ${color.primary}; font-size: 48px; margin-bottom: 20px;">${completionEmoji}</div>
                <div style="color: #2c3e50; font-size: 20px; font-weight: bold; margin-bottom: 15px; line-height: 1.4;">${completionMsg}</div>
                ${hasCompletionTimePlain ? `<div style="background: #f8f9fa; padding: 12px 20px; border-radius: 6px; display: inline-block;"><div style="color: #666; font-size: 14px; margin-bottom: 6px;">Время завершения</div><div style="color: ${color.primary}; font-size: 17px; font-weight: bold;">${params.dateCompletion} &bull; ${params.timeCompletion} МСК</div></div>` : ''}</td></tr></tbody></table>`;
            } else {
                if (isStartWithDetails) {
                    // Формат для АВР/многодневных - с "Уточняется"
                    const completionDate = params.dateCompletion === 'Уточняется' ? 'Уточняется' : params.dateCompletion;

                    html += `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0; border: none; margin: 0;">
                    <tbody><tr>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 80px; display: inline-block;">🚨</span></div>
                    <div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${params.dateStart}</div>
                    ${params.timeStart ? `<div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${params.timeStart}${(/^[\d:\-]+$/.test(params.timeStart) ? ' МСК' : '')}</div>` : ''}
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Дата и время<br>начала</div></td>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 80px; display: inline-block;">✅</span></div>
                    <div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${completionDate}</div>
                    ${params.timeCompletion && !isTimeUnknown ? `<div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${params.timeCompletion}${(/^[\d:\-]+$/.test(params.timeCompletion) ? ' МСК' : '')}</div>` : (isTimeUnknown ? `<div style="color: #f57c00; font-size: 14px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">(уточняется)</div>` : '')}
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Дата и время<br>завершения</div></td>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 80px; display: inline-block;">🖥️</span></div>
                    <div style="color: #2c3e50; font-size: ${params.system.length > 15 ? '18px' : '18px'}; font-weight: bold; margin-bottom: 6px; line-height: 1.2; padding: 0 5px;">${params.system}</div>
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Система</div></td>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 70px; display: inline-block;">⚠️</span></div>
                    <div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${params.impact}</div>
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Влияние</div></td>
                    </tr></tbody></table>`;
                } else {
                    // Стандартный формат
                    html += `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0; border: none; margin: 0;">
                    <tbody><tr>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 80px; display: inline-block;">📅</span></div>
                    <div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${params.dateStart}</div>
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Дата проведения</div></td>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 80px; display: inline-block;">⏰</span></div>
                    <div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2; white-space: nowrap;">${timeDisplayForTable}</div>
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Время по МСК</div></td>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 80px; display: inline-block;">🖥</span></div>
                    <div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${params.system}</div>
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Система</div></td>
                    <td width="25%" style="text-align: center; padding: 0 8px; vertical-align: top; border: none;">
                    <div style="background: #ffffff; border: 3px solid ${color.primary}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; text-align: center;">
                    <span style="color: ${color.primary}; font-size: 36px; line-height: 70px; display: inline-block;">⚠️</span></div>
                    <div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${params.impact}</div>
                    <div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Влияние</div></td>
                    </tr></tbody></table>`;
                }
            }

            // Показываем блок "Сервисы" только для "Начало работ", не для "Продление" и "Завершение"
if (params.services && params.services.trim() && params.msgType === 'start' && params.includeServices !== false) {
                // Убрали рамку, оставили только фон и тень
                html += `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 25px;"><tbody><tr><td style="text-align: center; border: none; padding: 0;">
<table cellpadding="0" cellspacing="0" style="background: ${color.light}; border-radius: 12px; padding: 16px 20px; border: 2px solid ${color.primary === '#f44336' ? '#ffcdd2' : color.primary === '#ffc107' ? '#ffe0b2' : '#c8e6c9'}; width: 100%; max-width: 600px; margin: 0; border-collapse: separate; border-spacing: 0;">
                <tbody><tr><td style="text-align: center; padding-right: 15px; vertical-align: middle; border: none; width: 50px;">
                <div style="background: #ffffff; border: 2px solid ${color.primary}; width: 50px; height: 50px; border-radius: 50%; text-align: center; margin: 0 auto;">
                <span style="color: ${color.primary}; font-size: 24px; line-height: 50px; display: inline-block;">⚙️</span></div></td>
                <td style="text-align: left; vertical-align: middle; border: none;">
                <div style="color: #2c3e50; font-size: 16px; font-weight: bold; line-height: 1.4;"><span style="color: #95a5a6; font-size: 13px;">Сервисы:</span><br />${params.services}</div></td></tr></tbody></table></td></tr></tbody></table>`;
            }

if (params.includeRec && params.recommendations && params.recommendations.trim()) {
                html += `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;"><tbody><tr><td style="text-align: center; border: none; padding: 0;">
                <table cellpadding="0" cellspacing="0" class="recommendations-block" style="border: 2px solid #dcedc8; background: #f1f8e9; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 12px; padding: 16px 20px; width: 100%; max-width: 600px; margin: 0; border-collapse: separate; border-spacing: 0;">
                <tbody><tr><td style="text-align: center; padding-right: 15px; vertical-align: middle; border: none; width: 50px;">
                <div style="background: #ffffff; border: 2px solid #8bc34a; width: 50px; height: 50px; border-radius: 50%; text-align: center; margin: 0 auto;">
                <span style="color: #8bc34a; font-size: 24px; line-height: 50px; display: inline-block;">✳️</span></div></td>
                <td style="text-align: left; vertical-align: middle; border: none;">
                <div style="color: #2c3e50; font-size: 16px; font-weight: bold; line-height: 1.4;"><span style="color: #95a5a6; font-size: 13px;">Рекомендация:</span><br />${params.recommendations}</div></td></tr></tbody></table></td></tr></tbody></table>`;
            }

if (params.includeAdditional && params.additionalMessage && params.additionalMessage.trim()) {
                html += `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;"><tbody><tr><td style="text-align: center; border: none; padding: 0;">
                <table cellpadding="0" cellspacing="0" class="additional-message-block" style="border: 2px solid #e9ecef; background: #f8f9fa; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 12px; padding: 16px 20px; width: 100%; max-width: 600px; margin: 0; border-collapse: separate; border-spacing: 0;">
                <tbody><tr><td style="text-align: center; padding-right: 15px; vertical-align: middle; border: none; width: 50px;">
                <div style="background: #ffffff; border: 2px solid #17a2b8; width: 50px; height: 50px; border-radius: 50%; text-align: center; margin: 0 auto;">
                <span style="color: #17a2b8; font-size: 24px; line-height: 50px; display: inline-block;">ℹ️</span></div></td>
                <td style="text-align: left; vertical-align: middle; border: none;">
                <div style="color: #2c3e50; font-size: 16px; font-weight: bold; line-height: 1.4;"><span style="color: #95a5a6; font-size: 13px;">Дополнительно:</span><br />${params.additionalMessage}</div></td></tr></tbody></table></td></tr></tbody></table>`;
            }

            html += `</td></tr></tbody></table></td></tr></tbody></table>`;
            return html;
        }

        // Генерация текста
        function generateTextNotification(params) {
            const typeNames = { planned: 'Плановые технические работы', multiday: 'Плановые технические работы', unplanned: 'Внеплановые технические работы', avr: 'Аварийно-восстановительные работы' };
            let colorScheme = params.colorScheme;
            if (!colorScheme || colorScheme === 'default') {
                if (params.workType === 'avr' && params.msgType !== 'completion') colorScheme = 'red';
                else if (params.workType === 'unplanned') colorScheme = 'yellow';
                else colorScheme = 'green';
            }
            const emoji = colorScheme === 'green' ? '🟢' : colorScheme === 'yellow' ? '🟡' : '🔴';
            const typeName = typeNames[params.workType];

            let text = '';

            if (params.msgType === 'start') {
                text += `${emoji} ${typeName}\n\n`;
                // Используем календарь для плановых, многодневных и внеплановых работ, сирену для АВР
                const dateEmoji = params.workType === 'avr' ? '🚨' : '📅';
                text += `${dateEmoji} Дата: ${params.dateStart}\n`;

                if (params.workType === 'avr' || params.workType === 'multiday') {
                    const isTimeUnknown = params.timeCompletion && params.timeCompletion.toLowerCase() === 'уточняется';
                    if (params.timeStart && params.timeCompletion && !isTimeUnknown) text += `⏰ Время: ${params.timeStart} - ${params.timeCompletion} МСК\n`;
                    else if (params.timeStart) text += `⏰ Время: ${params.timeStart} МСК\n`;
                    else if (isTimeUnknown) text += `⏰ Время: Уточняется\n`;
                } else {
                    if (params.timeStart && params.timeCompletion) text += `⏰ Время: ${params.timeStart} - ${params.timeCompletion} МСК\n`;
                    else if (params.timeStart) text += `⏰ Время: ${params.timeStart} МСК\n`;
                }

                text += `🖥 Система: ${params.system}\n`;
                text += `⚙ Сервисы: ${params.services}\n`;
                text += `⚠️ Влияние: ${params.impact}`;

                if (params.includeRec && params.recommendations) text += `\n\n💡 Рекомендация: ${params.recommendations}`;
                if (params.includeAdditional && params.additionalMessage) text += `\n\n${params.additionalMessage}`;
            } else if (params.msgType === 'extension') {
                text += `⏳ Работы продлены до ${params.timeEnd} МСК\n\n📅 Новое время завершения: ${params.dateCompletion} ${params.timeEnd} МСК`;
            } else if (params.msgType === 'completion') {
                // Сообщение о завершении в зависимости от типа работ
                // Проверка на JDE - используем first word как в 0.5
                const isJDE = params.system.toLowerCase().includes('jde');
                let completionMessage = '';
                if (isJDE) {
                    // JDE - всегда используем специальное сообщение с эмодзи
                    const firstWord = params.system.split(' ')[0];
                    completionMessage = params.additionalMessage.trim() || `Обновление завершено. ${firstWord} доступен для работы 🎉`;
                } else if (params.workType === 'planned' || params.workType === 'multiday') {
                    completionMessage = params.additionalMessage.trim() || 'Плановые технические работы завершены. Сервисы работают в штатном режиме.';
                } else if (params.workType === 'unplanned') {
                    completionMessage = params.additionalMessage.trim() || 'Внеплановые технические работы завершены. Сервисы работают в штатном режиме.';
                } else if (params.workType === 'avr') {
                    completionMessage = params.additionalMessage.trim() || 'Аварийно-восстановительные работы завершены. Сервисы работают в штатном режиме.';
                }
                text += completionMessage;
                // Показываем время завершения только если есть дата И время
                const hasCompletionTimeText = params.dateCompletion && params.timeCompletion && params.dateCompletion.trim() !== '' && params.timeCompletion.trim() !== '';
                if (hasCompletionTimeText) text += `\n\n⏰ Время завершения: ${params.dateCompletion} ${params.timeCompletion} МСК`;
            }

            return text;
        }

        // Пресеты завершения - переключают сегменты
        document.querySelectorAll('.completion-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const additionalMsg = btn.getAttribute('data-additional');
                $('additionalMessage').value = additionalMsg;
            });
        });

        // Инициализация
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
            if (soundIcon) {
                soundIcon.textContent = soundsEnabled ? '🔊' : '🔇';
            }
            if (soundToggleBtn) {
                soundToggleBtn.classList.toggle('muted', !soundsEnabled);
            }

            if (soundToggleBtn) {
                soundToggleBtn.addEventListener('click', () => {
                    soundsEnabled = !soundsEnabled;
                    localStorage.setItem('generator_sounds_enabled', soundsEnabled);
                    if (soundIcon) {
                        soundIcon.textContent = soundsEnabled ? '🔊' : '🔇';
                    }
                    soundToggleBtn.classList.toggle('muted', !soundsEnabled);
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
            document.querySelectorAll('.message-segment').forEach(segment => {
                segment.addEventListener('click', () => {
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

            // Beforeinstallprompt — ловим событие установки
            let deferredPrompt = null;
            const installBtn = $('installPwaBtn');

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                if (installBtn) {
                    installBtn.classList.remove('hidden');
                    installBtn.classList.add('visible');
                }
                console.log('[PWA] Install prompt available');
            });

            // Обработчик кнопки установки
            if (installBtn) {
                installBtn.addEventListener('click', async () => {
                    if (!deferredPrompt) return;
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('[PWA] Install outcome:', outcome);
                    deferredPrompt = null;
                    installBtn.classList.remove('visible');
                    installBtn.classList.add('hidden');
                });
            }

            // Слушаем успешную установку
            window.addEventListener('appinstalled', () => {
                console.log('[PWA] App installed successfully');
                deferredPrompt = null;
                if (installBtn) {
                    installBtn.classList.add('hidden');
                    installBtn.classList.remove('visible');
                }
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
