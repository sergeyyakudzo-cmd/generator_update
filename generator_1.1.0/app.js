/**
 * Генератор уведомлений о техработах v1.2.0
 * Модульная архитектура
 */

console.log('[START] app.js loaded at', new Date().toISOString());

// ============================================
// MODULES LOADER
// ============================================

// Ждём загрузки DOM
document.addEventListener('DOMContentLoaded', async function() {
    
    // Загружаем конфиг
    console.log('[Config] Loading...');
    await initApiConfig();
    console.log('[Config] Loaded. SYSTEMS:', Object.keys(CONFIG_SYSTEMS || {}).length);
    
    // Инициализируем UI
    initUI();
    console.log('[UI] Initialized');
    
    // Подключаем генератор
    initGenerator();
    console.log('[Generator] Initialized');
    
    // Подключаем кнопки действий
    initActionButtons();
    console.log('[Actions] Initialized');
    
    // Queue
    initQueue();
    console.log('[Queue] Initialized');
    
    // Notifications
    initNotifications();
    
    // PWA
    initPWA();
    
    // Sound toggle
    initSoundToggle();
    
    console.log('[END] DOMContentLoaded');
});

console.log('[END] app.js script finished');


// ============================================
// GENERATOR
// ============================================

function initGenerator() {
    var $ = function(id) { return document.getElementById(id); };
    
    // Generate button
    $('generateBtn').addEventListener('click', function(e) {
        var btn = $('generateBtn');
        createRipple(e, btn);
        
        // Format inputs
        if ($('dateStart').value.trim()) formatDateInput($('dateStart'), $('dateStartError'));
        if ($('dateCompletion').value.trim()) formatDateInput($('dateCompletion'), $('dateCompletionError'));
        if ($('timeRange').value.trim()) formatTimeInput($('timeRange'), $('timeRangeError'));
        if ($('extensionTime').value.trim()) formatTimeInput($('extensionTime'), $('extensionTimeError'));
        if ($('timeCompletion').value.trim()) formatTimeInput($('timeCompletion'), $('timeCompletionError'));
        
        var workType = document.querySelector('input[name="workType"]:checked').value;
        var msgType = $('messageType').value;
        var dateStart = $('dateStart').value;
        var timeInput = $('timeRange').value;
        var dateCompletion = $('dateCompletion').value;
        var timeCompletion = $('timeCompletion').value;
        
        var timeStart, timeEnd, timeDisplay;
        
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
            // Planned/unplanned - диапазон времени
            if (timeInput.includes('-')) {
                var parts = timeInput.split('-');
                timeStart = parts[0] ? parts[0].trim() : '';
                timeEnd = parts[1] ? parts[1].trim() : '';
                timeDisplay = timeStart && timeEnd ? timeStart + ' - ' + timeEnd : (timeStart || timeEnd);
            } else {
                timeStart = timeInput;
                timeEnd = '';
                timeDisplay = timeStart;
            }
        }
        
        // Time completion для completion
        var timeCompletionValue;
        if ((workType === 'planned' || workType === 'unplanned') && msgType === 'completion') {
            timeCompletionValue = timeCompletion && timeCompletion.trim() !== '' ? timeCompletion : '';
        } else if (workType === 'avr' || workType === 'multiday') {
            timeCompletionValue = timeCompletion;
        } else {
            timeCompletionValue = timeEnd;
        }
        
        // Превью
        var params = {
            workType: workType,
            msgType: msgType,
            dateStart: dateStart,
            dateCompletion: dateCompletion,
            timeCompletion: timeCompletionValue,
            timeDisplay: timeDisplay,
            timeStart: timeStart,
            timeEnd: timeEnd,
            system: $('system').value,
            impact: $('impact').value,
            services: $('services').value,
            additionalMessage: $('additionalMessage').value,
            recommendations: $('recommendations').value,
            includeRec: $('includeRecommendations').checked,
            includeAdditional: $('includeAdditionalMessage').checked
        };
        
        $('preview').innerHTML = generateNotificationHTML(params);
        $('previewText').textContent = generateTextNotification(params);
        $('preview').scrollTop = 0;
        
        // Анимация
        btn.classList.remove('error');
        btn.classList.add('success');
        setTimeout(function() { btn.classList.remove('success'); }, 800);
        
        playGenerateSound();
    });
    
    // Copy buttons
    $('copyHtmlBtn').addEventListener('click', async function() {
        var htmlContent = $('preview').innerHTML;
        var success = await copyToClipboard(htmlContent);
        
        animateCopyButton(this, 'HTML');
        
        if (success) {
            playCopySound();
            showStatus('HTML код скопирован в буфер обмена!');
        } else {
            playErrorSound();
            showStatus('Ошибка копирования', 'error');
        }
    });
    
    $('copyTextBtn').addEventListener('click', async function() {
        var text = $('previewText').textContent;
        var success = await copyToClipboard(text);
        
        animateCopyButton(this, 'Text');
        
        if (success) {
            playCopySound();
            showStatus('Текст скопирован в буфер обмена!');
        } else {
            playErrorSound();
            showStatus('Ошибка копирования', 'error');
        }
    });
    
    // Services auto-update
    window.updateServicesBySystem = function(system, workType) {
        $('services').value = getSystemService(system, workType || currentWorkType);
    };
    
    // Emails
    window.updateEmails = function() {
        // Stub - можно расширить
    };
    
    // System change handler
    window.handleSystemChange = function(newSystem, oldSystem) {
        if (currentMessageType === 'completion') {
            var newLower = newSystem.toLowerCase();
            var oldLower = oldSystem.toLowerCase();
            
            if (oldLower.includes('jde') && !newLower.includes('jde')) {
                $('additionalMessage').value = completionMessages[currentWorkType];
            } else if (!oldLower.includes('jde') && newLower.includes('jde')) {
                $('additionalMessage').value = jdeCompletionMessage;
            } else if (oldSystem !== newSystem) {
                if (newLower.includes('jde')) {
                    $('additionalMessage').value = jdeCompletionMessage;
                } else {
                    $('additionalMessage').value = completionMessages[currentWorkType];
                }
            }
        }
        
        window.updateEmails();
    };
    
    // Auto-generate on input changes
    var autoGenerateInputs = ['system', 'services', 'additionalMessage', 'recommendations'];
    autoGenerateInputs.forEach(function(id) {
        var el = $(id);
        if (el) {
            el.addEventListener('input', autoGenerate);
            el.addEventListener('change', autoGenerate);
        }
    });
}


// ============================================
// ACTION BUTTONS
// ============================================

function initActionButtons() {
    var $ = function(id) { return document.getElementById(id); };
    
    // Send to Telegram
    $('sendToTelegramBtn').addEventListener('click', async function() {
        var btn = this;
        btn.disabled = true;
        
        try {
            var text = $('previewText').textContent;
            var replyTo = getStartMessageId($('system').value, $('dateStart').value);
            
            var result = await sendToMax(text, replyTo);
            
            if (result.ok) {
                playCopySound();
                btn.classList.add('success');
                btn.innerHTML = '<span class="btn-telegram-icon">✓</span> Отправлено!';
                showStatus('Отправлено в Telegram!', 'success');
                
                if (currentMessageType === 'start') {
                    saveStartMessageId($('system').value, $('dateStart').value, result.result.message_id);
                }
                
                addTgHistoryItem({
                    system: $('system').value,
                    dateStart: $('dateStart').value,
                    message_id: result.result.message_id,
                    msgType: currentMessageType,
                    time: Date.now()
                });
                
                setTimeout(function() {
                    btn.classList.remove('success');
                    btn.innerHTML = '<span class="btn-telegram-icon">✈️</span> Telegram';
                    btn.disabled = false;
                }, 2000);
            } else {
                throw new Error(result.description || 'Error');
            }
        } catch (err) {
            playErrorSound();
            btn.classList.add('error');
            btn.innerHTML = '<span class="btn-telegram-icon">✗</span> Ошибка';
            showStatus('Ошибка: ' + err.message, 'error');
            
            setTimeout(function() {
                btn.classList.remove('error');
                btn.innerHTML = '<span class="btn-telegram-icon">✈️</span> Telegram';
                btn.disabled = false;
            }, 2000);
        }
    });
    
    // Send to Zimbra
    $('sendToZimbraBtn').addEventListener('click', async function() {
        var btn = this;
        btn.disabled = true;
        
        try {
            var htmlContent = $('preview').innerHTML;
            var txtContent = $('previewText').textContent;
            
            await sendToZimbra({
                html: htmlContent,
                msgType: currentMessageType,
                subject: $('subject').value,
                to: $('to').value,
                cc: $('cc').value
            });
            
            playZimbraSound();
            btn.classList.add('success');
            btn.innerHTML = '<span class="btn-zimbra-icon">✓</span> Отправлено!';
            showStatus('Отправлено в Zimbra!', 'success');
            
            setTimeout(function() {
                btn.classList.remove('success');
                btn.innerHTML = '<span class="btn-zimbra-icon">📧</span> Zimbra';
                btn.disabled = false;
            }, 2000);
        } catch (err) {
            playErrorSound();
            btn.classList.add('error');
            btn.innerHTML = '<span class="btn-zimbra-icon">✗</span> Ошибка';
            showStatus('Ошибка: ' + err.message, 'error');
            
            setTimeout(function() {
                btn.classList.remove('error');
                btn.innerHTML = '<span class="btn-zimbra-icon">📧</span> Zimbra';
                btn.disabled = false;
            }, 2000);
        }
    });
}


// ============================================
// QUEUE
// ============================================

var queue = [];

function initQueue() {
    var $ = function(id) { return document.getElementById(id); };
    var queueBadge = $('queueBadge');
    var queueWindow = $('queueWindow');
    var queueContent = $('queueContent');
    
    // Queue button - guard against missing element
    if (!$('queueBtn') || !queueContent) {
        console.log('[Queue] Elements not found, skipping queue init');
        return;
    }
    
    // Load existing queue
    try {
        var saved = localStorage.getItem('generator_queue');
        if (saved) {
            var now = Date.now();
            queue = JSON.parse(saved).filter(function(item) {
                return now - item.timestamp < 7 * 24 * 60 * 60 * 1000;
            });
            saveQueue();
        }
    } catch (e) {
        queue = [];
    }
    
    function saveQueue() {
        localStorage.setItem('generator_queue', JSON.stringify(queue));
    }
    
    function renderQueue() {
        if (queue.length === 0) {
            queueContent.innerHTML = '<div class="queue-empty"><div class="queue-empty-icon">📋</div>Очередь пуста<br>Нажмите "Поставить в очередь"</div>';
            if (queueBadge) queueBadge.textContent = '0';
            return;
        }
        if (queueBadge) queueBadge.textContent = queue.length;
        
        queueContent.innerHTML = queue.map(function(item, index) {
            var typeClass = item.workType === 'avr' ? 'avr' : (item.workType === 'unplanned' ? 'unplanned' : '');
            var timeText = item.time || '—';
            return '<div class="queue-item ' + typeClass + '" data-index="' + index + '">' +
                '<div class="queue-item-header">' +
                    '<span class="queue-item-type ' + item.workType + '">' + item.workType.toUpperCase() + '</span>' +
                    '<button class="queue-item-delete" data-index="' + index + '">✕</button>' +
                '</div>' +
                '<div class="queue-item-system">' + item.system + '</div>' +
                '<div class="queue-item-time">' +
                    '<span class="queue-item-time-icon">📅</span>' +
                    '<span class="queue-item-time-text">' + item.dateStart + ' ' + timeText + '</span>' +
                '</div>' +
            '</div>';
        }).join('');
        
        // Delete handlers
        queueContent.querySelectorAll('.queue-item-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.dataset.index);
                queue.splice(idx, 1);
                saveQueue();
                renderQueue();
                showStatus('Удалено из очереди');
            });
        });
        
        // Click to restore
        queueContent.querySelectorAll('.queue-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(this.dataset.index);
                var q = queue[idx];
                document.querySelectorAll('input[name="workType"]').forEach(function(radio) {
                    if (radio.value === q.workType) {
                        radio.checked = true;
                        currentWorkType = q.workType;
                    }
                });
                $('system').value = q.system;
                $('dateStart').value = q.dateStart;
                $('timeRange').value = q.time || '';
                $('services').value = q.services || '';
                $('impact').value = q.impact || '';
                $('additionalMessage').value = q.additionalMessage || '';
                if (typeof updateServicesBySystem === 'function') {
                    updateServicesBySystem(q.system, q.workType);
                }
                if (queueWindow) queueWindow.classList.remove('open');
                showStatus('Загружено из очереди');
            });
        });
    }
    
    // Initial render
    renderQueue();
    
    // Add click handler
    $('queueBtn').addEventListener('click', function() {
        var system = $('system').value;
        var dateStart = $('dateStart').value;
        var time = $('timeRange').value;
        
        if (!system || !dateStart) {
            showStatus('Заполните систему и дату', 'error');
            return;
        }
        
        queue.push({
            system: system,
            dateStart: dateStart,
            time: time,
            workType: currentWorkType,
            msgType: currentMessageType,
            services: $('services').value,
            impact: $('impact').value,
            additionalMessage: $('additionalMessage').value,
            timestamp: Date.now()
        });
        
        saveQueue();
        renderQueue();
        showStatus('Добавлено в очередь!', 'success');
    });
    
    // Toggle queue window
    if ($('queueToggleBtn')) {
        $('queueToggleBtn').addEventListener('click', function() {
            queueWindow.classList.toggle('open');
        });
    }
    
    if ($('queueCloseBtn')) {
        $('queueCloseBtn').addEventListener('click', function() {
            queueWindow.classList.remove('open');
        });
    }
    
    if ($('queueClearBtn')) {
        $('queueClearBtn').addEventListener('click', function() {
            queue = [];
            saveQueue();
            renderQueue();
            showStatus('Очередь очищена');
        });
    }
                '<div class="queue-item-header">' +
                    '<span class="queue-item-type ' + item.workType + '">' + item.workType.toUpperCase() + '</span>' +
                    '<button class="queue-item-delete" data-index="' + index + '">✕</button>' +
                '</div>' +
                '<div class="queue-item-system">' + item.system + '</div>' +
                '<div class="queue-item-time">' +
                    '<span class="queue-item-time-icon">📅</span>' +
                    '<span class="queue-item-time-text">' + item.dateStart + ' ' + timeText + '</span>' +
                '</div>' +
            '</div>';
        }).join('');
        
        // Delete handlers
        queueContent.querySelectorAll('.queue-item-delete').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(this.dataset.index);
                queue.splice(idx, 1);
                saveQueue();
                renderQueue();
                showStatus('Удалено из очереди');
            });
        });
        
        // Click to restore
        queueContent.querySelectorAll('.queue-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(this.dataset.index);
                var q = queue[idx];
                
                // Find and check work type
                document.querySelectorAll('input[name="workType"]').forEach(function(radio) {
                    if (radio.value === q.workType) {
                        radio.checked = true;
                        currentWorkType = q.workType;
                    }
                });
                
                // Fill form
                $('system').value = q.system;
                $('dateStart').value = q.dateStart;
                $('timeRange').value = q.time || '';
                $('services').value = q.services || '';
                $('impact').value = q.impact || '';
                $('additionalMessage').value = q.additionalMessage || '';
                
                updateServicesBySystem(q.system, q.workType);
                
                queueWindow.classList.remove('open');
                showStatus('Загружено из очереди');
            });
        });
    }
    
    // Expose
    window.renderQueue = renderQueue;
    
    // Init render
    if ($('queueContent')) {
        renderQueue();
    }
}


// ============================================
// NOTIFICATIONS
// ============================================

function initNotifications() {
    // Test notification button
    var testBtn = document.getElementById('testNotificationBtn');
    if (testBtn) {
        testBtn.addEventListener('click', function() {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then(function(permission) {
                    if (permission === 'granted') {
                        sendTestNotification();
                    }
                });
            } else {
                sendTestNotification();
            }
        });
    }
    
    function sendTestNotification() {
        showNotification(
            '🔔 Тестовое уведомление',
            'Это тестовое уведомление из генератора!'
        );
        showStatus('Тестовое уведомление отправлено!', 'success');
    }
    
    function showNotification(title, text) {
        playAlertSound();
        
        if (!('Notification' in window)) {
            alert(title + '\n\n' + text);
            return;
        }
        
        if (Notification.permission === 'granted') {
            try {
                var notification = new Notification(title, { body: text });
                notification.onclick = function() {
                    window.focus();
                    notification.close();
                };
            } catch (e) {
                alert(title + '\n\n' + text);
            }
        } else if (Notification.permission === 'default') {
            Notification.requestPermission().then(function(permission) {
                if (permission === 'granted') {
                    try {
                        var notification = new Notification(title, { body: text });
                        notification.onclick = function() {
                            window.focus();
                            notification.close();
                        };
                    } catch (e) {
                        alert(title + '\n\n' + text);
                    }
                } else {
                    alert(title + '\n\n' + text);
                }
            });
        } else {
            alert(title + '\n\n' + text);
        }
    }
    
    window.showNotification = showNotification;
}


// ============================================
// PWA
// ============================================

function initPWA() {
    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(function(err) {
            console.warn('[PWA] SW registration failed:', err.message);
        });
    }
    
    // Install prompt
    var deferredPrompt = null;
    var installBtn = document.getElementById('installPwaBtn');
    
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) {
            installBtn.classList.remove('hidden');
            installBtn.classList.add('visible');
        }
    });
    
    if (installBtn) {
        installBtn.addEventListener('click', async function() {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBtn.classList.remove('visible');
            installBtn.classList.add('hidden');
        });
    }
    
    window.addEventListener('appinstalled', function() {
        if (installBtn) {
            installBtn.classList.add('hidden');
            installBtn.classList.remove('visible');
        }
        showStatus('Приложение установлено!', 'success');
    });
    
    // Standalone mode
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true;
    if (isStandalone && installBtn) {
        installBtn.classList.add('hidden');
    }
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}


// ============================================
// SOUND TOGGLE
// ============================================

function initSoundToggle() {
    var soundBtn = document.getElementById('soundToggleBtn');
    var soundIcon = document.getElementById('soundIcon');
    
    // Load saved preference
    var saved = localStorage.getItem('generator_sounds');
    if (saved !== null) {
        soundsEnabled = saved === 'true';
    }
    
    if (soundBtn) {
        soundBtn.addEventListener('click', function() {
            soundsEnabled = !soundsEnabled;
            localStorage.setItem('generator_sounds', soundsEnabled);
            if (soundIcon) {
                soundIcon.textContent = soundsEnabled ? '🔊' : '🔇';
            }
            if (!soundsEnabled) {
                // Mute indicator
                soundBtn.classList.add('muted');
            } else {
                soundBtn.classList.remove('muted');
            }
        });
        
        // Init state
        if (!soundsEnabled && soundIcon) {
            soundIcon.textContent = '🔇';
            soundBtn.classList.add('muted');
        }
    }
}

// ============================================
// UPDATE
// ============================================

function initUpdateButton() {
    var updateBtn = document.getElementById('updateBtn');
    if (!updateBtn) return;
    
    updateBtn.addEventListener('click', async function() {
        updateBtn.classList.add('checking');
        updateBtn.disabled = true;
        
        var data;
        try {
            var checkResp = await fetch('/check-update');
            if (!checkResp.ok) {
                if (checkResp.status === 407) {
                    showStatus('Требуется VPN/прокси для обновлений', 'error');
                } else {
                    showStatus('Сервер недоступен', 'error');
                }
                updateBtn.disabled = false;
                return;
            }
            data = await checkResp.json();
        } catch (err) {
            showStatus('Нет связи. Проверьте интернет.', 'error');
            updateBtn.disabled = false;
            return;
        }
        
        try {
            if (data.error) {
                showStatus(data.error, 'error');
                updateBtn.disabled = false;
                return;
            }
            if (data.updateAvailable) {
                var confirmUpdate = confirm(
                    'Доступна новая версия: ' + data.latestVersion + '\n' +
                    'Текущая версия: ' + data.currentVersion + '\n\n' +
                    'Обновить сейчас?'
                );
                
                if (confirmUpdate) {
                    showStatus('Запускаю обновление...', 'info');
                    
                    var updateResponse = await fetch('do-update', { method: 'POST' });
                    var updateResult = await updateResponse.json();
                    
                    if (updateResult.success) {
                        showStatus('Обновление скачано! Перезапустите генератор.', 'success');
                    } else {
                        showStatus('Ошибка: ' + updateResult.error, 'error');
                    }
                }
            } else if (data.error) {
                showStatus('Ошибка: ' + data.error, 'error');
            } else {
                showStatus('У вас последняя версия!', 'success');
            }
        } catch (err) {
            console.error('[Update] Error:', err);
            showStatus('Ошибка: ' + err.message, 'error');
        } finally {
            updateBtn.disabled = false;
            updateBtn.classList.remove('checking');
        }
    });
}

initUpdateButton();