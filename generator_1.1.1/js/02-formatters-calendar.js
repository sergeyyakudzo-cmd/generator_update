
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

