/**
 * UI - Обработчики событий и UI-логика
 */

var currentWorkType = 'planned';
var currentMessageType = 'start';
var previousSystem = '';

/** @type {function(string, string=): void} */
// @ts-ignore
var updateServicesBySystem;
// @ts-ignore
var updateEmails;

// ============================================
// DOM HELPERS
// ============================================

/**
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $(id) {
    return document.getElementById(id);
}

// ============================================
// DEBOUNCE
// ============================================

/**
 * @param {Function} func
 * @param {number} delay
 * @returns {Function}
 */
function debounce(func, delay) {
    var timeout;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, delay);
    };
}

// ============================================
// SOUNDS
// ============================================

var soundsEnabled = true;

function playGenerateSound() {
    if (!soundsEnabled) return;
    try {
        var audio = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.1);
        osc.start();
        osc.stop(audio.currentTime + 0.1);
    } catch (e) {}
}

function playCopySound() {
    if (!soundsEnabled) return;
    try {
        var audio = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 600;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.08);
        osc.start();
        osc.stop(audio.currentTime + 0.08);
    } catch (e) {}
}

function playErrorSound() {
    if (!soundsEnabled) return;
    try {
        var audio = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 200;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.1, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.2);
        osc.start();
        osc.stop(audio.currentTime + 0.2);
    } catch (e) {}
}

function playAlertSound() {
    if (!soundsEnabled) return;
    try {
        var audio = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.3);
        osc.start();
        osc.stop(audio.currentTime + 0.3);
    } catch (e) {}
}

function playSwitchSound() {
    if (!soundsEnabled) return;
    try {
        var audio = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 500;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.05, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.05);
        osc.start();
        osc.stop(audio.currentTime + 0.05);
    } catch (e) {}
}

function playZimbraSound() {
    if (!soundsEnabled) return;
    playCopySound();
}

// ============================================
// STATUS BAR
// ============================================

/**
 * @param {string} message
 * @param {string} [type]
 */
function showStatus(message, type) {
    var bar = $('statusBar');
    if (!bar) return;
    bar.textContent = message;
    bar.classList.remove('error');
    if (type === 'error') bar.classList.add('error');
    bar.classList.add('show');
    setTimeout(function() { bar.classList.remove('show'); }, 2500);
}

// ============================================
// ANIMATIONS
// ============================================

/**
 * @param {HTMLElement} element
 */
function triggerWaveAnimation(element) {
    if (!element) return;
    element.classList.remove('wave');
    void element.offsetWidth;
    element.classList.add('wave');
    setTimeout(function() { element.classList.remove('wave'); }, 600);
}

/**
 * @param {HTMLElement} button
 * @param {string} type
 */
function animateCopyButton(button, type) {
    button.classList.add('success');
    setTimeout(function() { button.classList.remove('success'); }, 800);
}

// ============================================
// CLIPBOARD
// ============================================

/**
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Clipboard API failed, using fallback');
        }
    }
    var temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand('copy');
        document.body.removeChild(temp);
        return true;
    } catch (err) {
        document.body.removeChild(temp);
        return false;
    }
}

// ============================================
// SANITIZE
// ============================================

/**
 * @param {string} html
 * @returns {string}
 */
function sanitizeHtml(html) {
    return html
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
        .replace(/<object\b[\s\S]*?<\/object>/gi, '')
        .replace(/<embed\b[\s\S]*?>/gi, '')
        .replace(/<link\b[\s\S]*?>/gi, '')
        .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
        .replace(/\s*javascript:/gi, '')
        .replace(/\s*data:/gi, 'data:');
}

// ============================================
// RIPPLE EFFECT
// ============================================

/**
 * @param {Event} event
 * @param {HTMLElement} button
 */
function createRipple(event, button) {
    var existing = button.querySelectorAll('.ripple');
    existing.forEach(function(r) { r.remove(); });
    
    var ripple = document.createElement('span');
    ripple.classList.add('ripple');
    var rect = button.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    button.appendChild(ripple);
    ripple.addEventListener('animationend', function() { ripple.remove(); });
}

// ============================================
// CUSTOM SELECT
// ============================================

function initCustomSelects() {
    document.querySelectorAll('.custom-select-trigger').forEach(function(trigger) {
        trigger.addEventListener('click', function() {
            var dropdown = trigger.nextElementSibling;
            var isActive = trigger.classList.contains('active');
            
            document.querySelectorAll('.custom-select-trigger').forEach(function(t) {
                t.classList.remove('active');
            });
            document.querySelectorAll('.custom-select-dropdown').forEach(function(d) {
                d.classList.remove('show');
            });
            
            if (!isActive) {
                trigger.classList.add('active');
                dropdown.classList.add('show');
            }
        });
    });
    
    document.querySelectorAll('.custom-select-option').forEach(function(option) {
        option.addEventListener('click', function() {
            var trigger = option.parentElement.previousElementSibling;
            var value = option.dataset.value;
            var label = option.textContent;
            
            trigger.querySelector('.custom-select-value').textContent = label;
            trigger.querySelector('input').value = value;
            
            option.parentElement.classList.remove('show');
            trigger.classList.remove('active');
        });
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select-trigger').forEach(function(t) {
                t.classList.remove('active');
            });
            document.querySelectorAll('.custom-select-dropdown').forEach(function(d) {
                d.classList.remove('show');
            });
        }
    });
}

// ============================================
// CALENDAR
// ============================================

function initCalendar() {
    var calendarIcons = document.querySelectorAll('.calendar-icon');
    calendarIcons.forEach(function(icon) {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            var popup = icon.nextElementSibling;
            if (popup && popup.classList.contains('calendar-popup')) {
                popup.classList.toggle('show');
            }
        });
    });
}

// ============================================
// SEGMENTS
// ============================================

function initSegments() {
    document.querySelectorAll('.segment-group').forEach(function(group) {
        var labels = group.querySelectorAll('.segment-label');
        labels.forEach(function(label) {
            label.addEventListener('click', function() {
                var input = label.querySelector('input[type="radio"]');
                if (input) {
                    labels.forEach(function(l) { l.classList.remove('selected'); });
                    label.classList.add('selected');
                    input.checked = true;
                    
                    if (typeof updateFormForMessageType === 'function') {
                        currentWorkType = input.value;
                        updateFormForMessageType();
                    }
                }
            });
        });
    });
}

// ============================================
// PRESET BUTTONS
// ============================================

function initPresetButtons() {
    // System presets
    document.querySelectorAll('.preset-btn[data-system]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var systemValue = btn.getAttribute('data-system');
            var previousSystem = $('system').value;
            
            $('system').value = systemValue;
            
            var presets = getSystemPresets(systemValue);
            if (presets) {
                if (presets.date === 'saturday') $('dateStart').value = getSaturdayDate();
                else if (presets.date === 'thursday') $('dateStart').value = getThursdayDate();
                else if (presets.date === 'current') $('dateStart').value = getCurrentDate();
                if (presets.time) $('timeRange').value = presets.time;
            } else if (previousSystem.toLowerCase().includes('jde') || previousSystem.toLowerCase().includes('phoenix')) {
                $('dateStart').value = getCurrentDate();
                $('timeRange').value = '19:00';
            }
            
            if (typeof updateServicesBySystem === 'function') {
                updateServicesBySystem($('system').value, currentWorkType);
            }
            if (typeof updateEmails === 'function') {
                updateEmails();
            }
            
            triggerWaveAnimation($('system'));
            triggerWaveAnimation($('dateStart'));
            triggerWaveAnimation($('services'));
        });
    });
    
    // Impact presets (multi-select)
    var selectedImpacts = new Set();
    document.querySelectorAll('.preset-btn[data-impact]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var impact = btn.getAttribute('data-impact');
            if (selectedImpacts.has(impact)) {
                selectedImpacts.delete(impact);
                btn.classList.remove('pressed');
            } else {
                selectedImpacts.add(impact);
                btn.classList.add('pressed');
            }
            $('impact').value = Array.from(selectedImpacts).join(', ');
        });
    });
}

// ============================================
// AUTO-GENERATE
// ============================================

var debouncedAutoGenerate = debounce(function() {
    var btn = $('generateBtn');
    if (btn && $('system').value && $('dateStart').value) {
        btn.click();
    }
}, 500);

function autoGenerate() {
    debouncedAutoGenerate();
}

// ============================================
// FORM UPDATES
// ============================================

function updateFormForMessageType() {
    var isMultiDay = currentWorkType === 'avr' || currentWorkType === 'multiday';
    var isSimpleStart = currentMessageType === 'start' && !isMultiDay;
    
    $('extensionTimeGroup').classList.add('hidden');
    $('timeCompletionGroup').classList.add('hidden');
    $('completionGroup').classList.add('hidden');
    
    $('dateStart').parentElement.classList.remove('hidden');
    $('timeGroup').classList.remove('hidden');
    
    switch (currentMessageType) {
        case 'start':
            if (isMultiDay) {
                $('timeCompletionGroup').classList.remove('hidden');
                $('completionGroup').classList.remove('hidden');
                $('dateStartLabel').textContent = 'Дата начала:';
                $('timeLabel').textContent = 'Время начала:';
                if ($('dateCompletion').value === '') {
                    $('dateCompletion').value = 'Уточняется';
                }
            } else {
                $('timeLabel').textContent = 'Время проведения:';
            }
            break;
        case 'extension':
            $('dateStart').parentElement.classList.add('hidden');
            $('timeGroup').classList.add('hidden');
            $('extensionTimeGroup').classList.remove('hidden');
            $('completionGroup').classList.remove('hidden');
            break;
        case 'completion':
            $('dateStart').parentElement.classList.add('hidden');
            $('timeGroup').classList.add('hidden');
            $('timeCompletionGroup').classList.remove('hidden');
            $('completionGroup').classList.remove('hidden');
            break;
    }
}

function updatePreviewType() {
    var isCompletionAVR = currentWorkType === 'avr' && currentMessageType === 'completion';
    var typeNames = { 
        planned: 'Плановые', 
        multiday: 'Многодневные', 
        unplanned: 'Внеплановые', 
        avr: isCompletionAVR ? 'Завершение АВР' : 'АВР' 
    };
    var typeClasses = { 
        planned: 'type-planned', 
        multiday: 'type-multiday', 
        unplanned: 'type-unplanned', 
        avr: isCompletionAVR ? 'type-planned' : 'type-avr' 
    };
    $('previewType').textContent = typeNames[currentWorkType];
    $('previewType').className = 'notification-type ' + typeClasses[currentWorkType];
}

// ============================================
// VALIDATION
// ============================================

/**
 * @param {HTMLInputElement} inputElement
 * @param {HTMLElement} errorElement
 * @param {string} fieldName
 * @returns {boolean}
 */
function validateDateField(inputElement, errorElement, fieldName) {
    var value = inputElement.value.trim();
    if (value === '') {
        inputElement.classList.remove('input-error');
        if (errorElement) errorElement.classList.remove('show');
        return true;
    }
    
    var dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(value)) {
        inputElement.classList.add('input-error');
        if (errorElement) {
            errorElement.textContent = 'Формат: ДД.ММ.ГГГГ';
            errorElement.classList.add('show');
        }
        return false;
    }
    
    var parts = value.split('.');
    var day = parseInt(parts[0]);
    var month = parseInt(parts[1]);
    var year = parseInt(parts[2]);
    
    if (month < 1 || month > 12) {
        inputElement.classList.add('input-error');
        if (errorElement) {
            errorElement.textContent = 'Месяц: 01-12';
            errorElement.classList.add('show');
        }
        return false;
    }
    
    var daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
        inputElement.classList.add('input-error');
        if (errorElement) {
            errorElement.textContent = 'День: 01-' + daysInMonth;
            errorElement.classList.add('show');
        }
        return false;
    }
    
    inputElement.classList.remove('input-error');
    if (errorElement) errorElement.classList.remove('show');
    return true;
}

/**
 * @param {HTMLInputElement} inputElement
 * @param {HTMLElement} errorElement
 * @returns {boolean}
 */
function validateTimeField(inputElement, errorElement) {
    var value = inputElement.value.trim();
    if (value === '') {
        inputElement.classList.remove('input-error');
        if (errorElement) errorElement.classList.remove('show');
        return true;
    }
    
    var timeRegex = /^([01]?\d|2[0-3]):[0-5]\d(-([01]?\d|2[0-3]):[0-5]\d)?$/;
    if (!timeRegex.test(value)) {
        inputElement.classList.add('input-error');
        if (errorElement) {
            errorElement.textContent = 'Формат: ЧЧ:ММ или ЧЧ:ММ-ЧЧ:ММ';
            errorElement.classList.add('show');
        }
        return false;
    }
    
    inputElement.classList.remove('input-error');
    if (errorElement) errorElement.classList.remove('show');
    return true;
}

// ============================================
// INIT
// ============================================

function initUI() {
    initCustomSelects();
    initCalendar();
    initSegments();
    initPresetButtons();
    
    // System input
    var systemInputTimeout;
    $('system').addEventListener('input', function() {
        if (typeof updateServicesBySystem === 'function') {
            updateServicesBySystem($('system').value, currentWorkType);
        }
        if (typeof updateEmails === 'function') {
            updateEmails();
        }
        
        clearTimeout(systemInputTimeout);
        systemInputTimeout = setTimeout(function() {
            var oldSystem = previousSystem;
            if (oldSystem !== $('system').value) {
                if (typeof handleSystemChange === 'function') {
                    handleSystemChange($('system').value, oldSystem);
                }
                previousSystem = $('system').value;
            }
        }, 300);
    });
    
    // Work type
    document.querySelectorAll('input[name="workType"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            currentWorkType = radio.value;
            
            if (currentWorkType === 'avr') {
                $('dateStartLabel').textContent = 'Дата начала:';
                $('timeLabel').textContent = 'Время начала:';
                $('timeRange').placeholder = '08:00';
                if (currentMessageType === 'start') {
                    $('dateCompletion').value = 'Уточняется';
                    $('timeCompletion').value = '';
                }
                $('dateStart').parentElement.classList.remove('hidden');
            } else if (currentWorkType === 'multiday') {
                $('dateStartLabel').textContent = 'Дата начала:';
                $('timeLabel').textContent = 'Время начала:';
                $('timeRange').placeholder = '08:00';
                if (currentMessageType === 'start') {
                    $('dateCompletion').value = 'Уточняется';
                    $('timeCompletion').value = '';
                }
                $('dateStart').parentElement.classList.remove('hidden');
            } else {
                $('dateStartLabel').textContent = 'Дата проведения:';
                $('timeLabel').textContent = 'Время:';
                $('timeRange').placeholder = '19:00-20:00';
            }
            
            if (typeof updateFormForMessageType === 'function') {
                updateFormForMessageType();
            }
        });
    });
    
    // Message type
    $('messageType').addEventListener('change', function() {
        currentMessageType = $('messageType').value;
        
        if (currentMessageType === 'completion' && currentMessageType === 'extension') {
            var extensionTimeValue = $('extensionTime').value.trim();
            if (extensionTimeValue && /^[\d:\-\s]+$/.test(extensionTimeValue)) {
                $('timeCompletion').value = extensionTimeValue;
            }
        }
        
        if (typeof updateFormForMessageType === 'function') {
            updateFormForMessageType();
        }
    });
    
    // Validation
    var debouncedValidateDate = debounce(function(inputElement, errorElement) {
        validateDateField(inputElement, errorElement);
    }, 500);
    
    var debouncedValidateTime = debounce(function(inputElement, errorElement) {
        validateTimeField(inputElement, errorElement);
    }, 500);
    
    $('dateStart').addEventListener('input', function() {
        debouncedValidateDate(this, $('dateStartError'));
    });
    $('dateCompletion').addEventListener('input', function() {
        debouncedValidateDate(this, $('dateCompletionError'));
    });
    $('timeRange').addEventListener('input', function() {
        debouncedValidateTime(this, $('timeRangeError'));
    });
    $('extensionTime').addEventListener('input', function() {
        debouncedValidateTime(this, $('extensionTimeError'));
    });
    $('timeCompletion').addEventListener('input', function() {
        debouncedValidateTime(this, $('timeCompletionError'));
    });
    
    // Blur handlers
    $('dateStart').addEventListener('blur', function() {
        formatDateInput($('dateStart'), $('dateStartError'));
        autoGenerate();
    });
    $('dateCompletion').addEventListener('blur', function() {
        formatDateInput($('dateCompletion'), $('dateCompletionError'));
        autoGenerate();
    });
    $('timeRange').addEventListener('blur', function() {
        formatTimeInput($('timeRange'), $('timeRangeError'));
        autoGenerate();
    });
    $('extensionTime').addEventListener('blur', function() {
        formatTimeInput($('extensionTime'), $('extensionTimeError'));
        autoGenerate();
    });
    $('timeCompletion').addEventListener('blur', function() {
        formatTimeInput($('timeCompletion'), $('timeCompletionError'));
        autoGenerate();
    });
}