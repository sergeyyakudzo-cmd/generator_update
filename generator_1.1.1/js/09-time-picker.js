(function() {
    'use strict';

    var timePopup = null;
    var currentTarget = null;
    var pickerState = 'single';
    var selectedStart = '';

    function createTimePopup() {
        if (timePopup) return timePopup;

        timePopup = document.createElement('div');
        timePopup.className = 'time-popup';
        timePopup.id = 'timePopup';

        var header = document.createElement('div');
        header.className = 'time-popup-header';
        header.innerHTML = '<span class="time-popup-title">Выберите время</span>';

        var body = document.createElement('div');
        body.className = 'time-popup-body';
        body.id = 'timePopupBody';

        var footer = document.createElement('div');
        footer.className = 'time-popup-footer';
        footer.innerHTML = '<button class="time-popup-now-btn" id="timeNowBtn">Сейчас</button><button class="time-popup-clear-btn" id="timeClearBtn">Сбросить</button>';

        timePopup.appendChild(header);
        timePopup.appendChild(body);
        timePopup.appendChild(footer);

        document.body.appendChild(timePopup);

        document.getElementById('timeNowBtn').addEventListener('click', function() {
            if (!currentTarget) return;
            var now = new Date();
            var h = String(now.getHours()).padStart(2, '0');
            var m = String(now.getMinutes()).padStart(2, '0');
            currentTarget.value = h + ':' + m;
            closeTimePicker();
            autoGenerate();
        });

        document.getElementById('timeClearBtn').addEventListener('click', function() {
            if (!currentTarget) return;
            currentTarget.value = '';
            closeTimePicker();
            autoGenerate();
        });

        return timePopup;
    }

    function generateTimeSlots() {
        var slots = [];
        for (var h = 0; h < 24; h++) {
            slots.push(String(h).padStart(2, '0') + ':00');
            slots.push(String(h).padStart(2, '0') + ':30');
        }
        return slots;
    }

    var commonPresets = ['19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    var allSlots = generateTimeSlots();

    function renderTimePicker(targetId) {
        var body = document.getElementById('timePopupBody');
        body.innerHTML = '';

        var isRangeField = targetId === 'timeRange';

        var modeBar = document.createElement('div');
        modeBar.className = 'time-popup-mode';

        if (isRangeField) {
            var singleBtn = document.createElement('button');
            singleBtn.className = 'time-mode-btn' + (pickerState === 'single' ? ' active' : '');
            singleBtn.textContent = 'Одно время';
            singleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                pickerState = 'single';
                selectedStart = '';
                renderTimePicker(targetId);
            });

            var rangeBtn = document.createElement('button');
            rangeBtn.className = 'time-mode-btn' + (pickerState === 'range' ? ' active' : '');
            rangeBtn.textContent = 'Интервал';
            rangeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                pickerState = 'range';
                selectedStart = '';
                renderTimePicker(targetId);
            });

            modeBar.appendChild(singleBtn);
            modeBar.appendChild(rangeBtn);
            body.appendChild(modeBar);
        }

        if (pickerState === 'range' && selectedStart) {
            var hint = document.createElement('div');
            hint.className = 'time-popup-hint';
            hint.textContent = 'Выберите время окончания (начало: ' + selectedStart + ')';
            body.appendChild(hint);
        } else if (pickerState === 'range') {
            var hint = document.createElement('div');
            hint.className = 'time-popup-hint';
            hint.textContent = 'Выберите время начала';
            body.appendChild(hint);
        }

        var presetsGrid = document.createElement('div');
        presetsGrid.className = 'time-popup-presets';

        var presets = isRangeField ? commonPresets : commonPresets;
        presets.forEach(function(time) {
            var btn = document.createElement('button');
            btn.className = 'time-preset-btn';
            btn.textContent = time;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                handleTimeSelect(time, targetId);
            });
            presetsGrid.appendChild(btn);
        });

        body.appendChild(presetsGrid);

        var allLabel = document.createElement('div');
        allLabel.className = 'time-popup-all-label';
        allLabel.textContent = 'Все время';
        body.appendChild(allLabel);

        var allGrid = document.createElement('div');
        allGrid.className = 'time-popup-all';

        allSlots.forEach(function(time) {
            var btn = document.createElement('button');
            btn.className = 'time-all-btn';
            btn.textContent = time;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                handleTimeSelect(time, targetId);
            });
            allGrid.appendChild(btn);
        });

        body.appendChild(allGrid);
    }

    function handleTimeSelect(time, targetId) {
        if (!currentTarget) return;

        if (pickerState === 'range' && targetId === 'timeRange') {
            if (!selectedStart) {
                selectedStart = time;
                renderTimePicker(targetId);
                return;
            } else {
                if (time === selectedStart) return;
                currentTarget.value = selectedStart + '-' + time;
                selectedStart = '';
                pickerState = 'single';
                closeTimePicker();
                autoGenerate();
                return;
            }
        }

        currentTarget.value = time;
        closeTimePicker();
        autoGenerate();
    }

    function openTimePicker(targetInputId) {
        var input = document.getElementById(targetInputId);
        if (!input) return;

        currentTarget = input;
        pickerState = 'single';
        selectedStart = '';

        var popup = createTimePopup();
        renderTimePicker(targetInputId);

        var rect = input.getBoundingClientRect();
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.left = (rect.left + window.scrollX) + 'px';

        requestAnimationFrame(function() {
            popup.classList.add('show');
        });
    }

    function closeTimePicker() {
        if (timePopup) {
            timePopup.classList.remove('show');
        }
        currentTarget = null;
        pickerState = 'single';
        selectedStart = '';
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.clock-icon').forEach(function(icon) {
            icon.addEventListener('click', function(e) {
                e.stopPropagation();
                var targetId = icon.getAttribute('data-target');
                if (targetId) {
                    closeTimePicker();
                    openTimePicker(targetId);
                }
            });
        });

        document.addEventListener('click', function(e) {
            if (timePopup && timePopup.classList.contains('show')) {
                if (!timePopup.contains(e.target) && !e.target.closest('.clock-icon')) {
                    closeTimePicker();
                }
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && timePopup && timePopup.classList.contains('show')) {
                closeTimePicker();
            }
        });
    });
})();
