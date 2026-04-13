/**
 * Core - Бизнес-логика генерации уведомлений
 */

var CONFIG_SYSTEMS = null;
var CONFIG_IMPACTS = null;

// ============================================
// ТИПЫ ДАННЫХ
// ============================================

/** @typedef {'planned' | 'multiday' | 'unplanned' | 'avr'} WorkType */
/** @typedef {'start' | 'extension' | 'completion'} MessageType */
/** @typedef {{label: string, service: string, preset?: {date: string, time: string}}} SystemConfig */

/** @type {Object.<string, string>} */
var systemMessagesFallback = {
    'SRS2': 'Формирование отчётов в SRS2 будет недоступно',
    'ТТК': 'Недоступны подключения по основным ярлыкам',
    'JDE': 'Система JDE будет недоступна',
    'Сети': 'Недоступна сеть локации',
    '1С': 'Работа с 1С будет недоступна',
    'zmail.alidi.ru': 'Возможны частичные затруднения с отправкой и получением почты Zimbra',
    'WMS': 'Система WMS будет недоступна',
    'Phoenix2': 'Феникс 2 будет недоступен',
    'srv89/Phoenix2': 'Феникс 2 будет недоступен',
    '1С+Phoenix': 'Системы 1С и Феникс могут быть недоступны',
    'Оптимум': 'Сложности с загрузкой заказов MRS',
    'Zoom': 'Проблемы с отправкой сообщений и звонками'
};

/** @type {Object.<string, string>} */
var avrSystemMessages = {
    '1С': 'Недоступны подключения к базам 1С',
    '1С+Phoenix': 'Системы 1С и Феникс могут быть недоступны',
    'Оптимум': 'Сложности с загрузкой заказов MRS',
    'Zoom': 'Проблемы с отправкой сообщений и звонками'
};

/** @type {Object.<string, string>} */
var completionMessages = {
    'planned': 'Плановые технические работы завершены. Все сервисы работают в штатном режиме.',
    'multiday': 'Технические работы завершены. Все сервисы работают в штатном режиме.',
    'unplanned': 'Внеплановые технические работы завершены. Сервисы работают в штатном режиме.',
    'avr': 'Аварийно-восстановительные работы завершены. Сервисы работают в штатном режиме.'
};

var jdeCompletionMessage = 'Обновление завершено<br>JDE доступен для работы';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

/**
 * Загрузить конфигурацию из config.json
 * @returns {Promise<void>}
 */
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        if (!response.ok) throw new Error('Config not found');
        const config = await response.json();
        
        if (config.systems) CONFIG_SYSTEMS = config.systems;
        if (config.impacts) CONFIG_IMPACTS = config.impacts;
        
        return config;
    } catch (err) {
        console.warn('Failed to load config:', err);
        return {};
    }
}

/**
 * Получить service для системы
 * @param {string} system 
 * @param {WorkType} workType
 * @returns {string}
 */
function getSystemService(system, workType) {
    if (CONFIG_SYSTEMS && CONFIG_SYSTEMS[system]) {
        return CONFIG_SYSTEMS[system].service || '';
    }
    if (workType === 'avr' || workType === 'multiday') {
        return avrSystemMessages[system] || systemMessagesFallback[system] || '';
    }
    return systemMessagesFallback[system] || '';
}

/**
 * Получить preset для системы
 * @param {string} system
 * @returns {{date: string, time: string}|null}
 */
function getSystemPresets(system) {
    if (CONFIG_SYSTEMS && CONFIG_SYSTEMS[system] && CONFIG_SYSTEMS[system].preset) {
        return CONFIG_SYSTEMS[system].preset;
    }
    return null;
}

/**
 * Получить влияния из конфига
 * @returns {string[]|null}
 */
function getImpacts() {
    return CONFIG_IMPACTS;
}

// ============================================
// ФОРМАattING
// ============================================

/**
 * Получить текущую дату
 * @returns {string}
 */
function getCurrentDate() {
    var now = new Date();
    return String(now.getDate()).padStart(2, '0') + '.' + 
           String(now.getMonth() + 1).padStart(2, '0') + '.' + 
           now.getFullYear();
}

/**
 * Получить дату субботы
 * @returns {string}
 */
function getSaturdayDate() {
    var now = new Date();
    var day = now.getDay();
    var diff = day === 0 ? 0 : 6 - day;
    var saturday = new Date(now);
    saturday.setDate(now.getDate() + diff);
    return String(saturday.getDate()).padStart(2, '0') + '.' + 
           String(saturday.getMonth() + 1).padStart(2, '0') + '.' + 
           saturday.getFullYear();
}

/**
 * Получить дату четверга
 * @returns {string}
 */
function getThursdayDate() {
    var now = new Date();
    var day = now.getDay();
    var diff = day <= 4 ? 4 - day : 4 - day + 7;
    var thursday = new Date(now);
    thursday.setDate(now.getDate() + diff);
    return String(thursday.getDate()).padStart(2, '0') + '.' + 
           String(thursday.getMonth() + 1).padStart(2, '0') + '.' + 
           thursday.getFullYear();
}

/**
 * Форматировать дату
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 */
function formatDateInput(input, errorEl) {
    var value = input.value.trim();
    if (!value) return;
    
    var digits = value.replace(/\D/g, '');
    if (digits.length < 8) return;
    
    var day = parseInt(digits.substring(0, 2));
    var month = parseInt(digits.substring(2, 4));
    var year = digits.length === 8 ? parseInt(digits.substring(4)) : new Date().getFullYear();
    
    if (month > 12 || month < 1) {
        if (errorEl) { errorEl.textContent = 'Месяц 01-12'; errorEl.classList.add('show'); }
        return;
    }
    
    var daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
        if (errorEl) { errorEl.textContent = 'День 01-' + daysInMonth; errorEl.classList.add('show'); }
        return;
    }
    
    input.value = String(day).padStart(2, '0') + '.' + String(month).padStart(2, '0') + '.' + year;
    if (errorEl) errorEl.classList.remove('show');
}

/**
 * Форматировать время
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 */
function formatTimeInput(input, errorEl) {
    var value = input.value.trim().toUpperCase();
    if (!value) return;
    
    var regex = /^([01]?\d|2[0-3]):([0-5]\d)([-–]([01]?\d|2[0-3]):([0-5]\d))?$/;
    var match = value.match(regex);
    
    if (!match) {
        if (errorEl) { errorEl.textContent = 'Формат: ЧЧ:ММ или ЧЧ:ММ-ЧЧ:ММ'; errorEl.classList.add('show'); }
        return;
    }
    
    input.value = match[1] + ':' + match[2] + (match[3] ? match[3].substring(0, 1) + match[4] + ':' + match[5] : '');
    if (errorEl) errorEl.classList.remove('show');
}

// ============================================
// ГЕНЕРАЦИЯ HTML
// ============================================

/**
 * Проверить личное сообщение JDE
 * @param {string} system
 * @returns {boolean}
 */
function isJDE(system) {
    return system && system.toLowerCase().includes('jde');
}

/**
 * Сгенерировать HTML уведомления
 * @param {Object} params
 * @returns {string}
 */
function generateNotificationHTML(params) {
    var workType = params.workType;
    var msgType = params.msgType;
    var dateStart = params.dateStart;
    var dateCompletion = params.dateCompletion;
    var timeStart = params.timeStart;
    var timeEnd = params.timeEnd;
    var timeDisplay = params.timeDisplay;
    var system = params.system;
    var impact = params.impact;
    var services = params.services;
    var additionalMessage = params.additionalMessage;
    var recommendations = params.recommendations;
    var includeRec = params.includeRec;
    var includeAdditional = params.includeAdditional;
    
    var isAVRCompletion = workType === 'avr' && msgType === 'completion';
    var isJDESystem = isJDE(system);
    
    var colors = {
        planned: { primary: '#4caf50', secondary: '#66bb6a', light: '#e8f5e8' },
        multiday: { primary: '#4caf50', secondary: '#66bb6a', light: '#e8f5e8' },
        unplanned: { primary: '#ffc107', secondary: '#ffd54f', light: '#fff8e1' },
        avr: isAVRCompletion ? 
            { primary: '#4caf50', secondary: '#66bb6a', light: '#e8f5e8' } : 
            { primary: '#f44336', secondary: '#ef5350', light: '#ffebee' }
    };
    
    var typeNames = {
        planned: 'ПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
        multiday: 'ПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
        unplanned: 'ВНЕПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
        avr: 'АВАРИЙНО-ВОССТАНОВИТЕЛЬНЫЕ РАБОТЫ'
    };
    
    var typeEmoji = {
        planned: '🟢',
        multiday: '🟢',
        unplanned: '🟡',
        avr: '🔴'
    };
    
    var color = colors[workType];
    var typeName = typeNames[workType];
    var type = typeEmoji[workType];
    
    var html = '<table width="650" cellpadding="0" cellspacing="0" style="font-family: \'helvetica neue\', \'arial\', sans-serif; margin: 0 auto; padding: 0; border-collapse: collapse; border: none !important; display: inline-table;">';
    
    // Header
    html += '<tr><td style="background: linear-gradient(135deg, ' + color.primary + ' 0%, ' + color.secondary + ' 100%); padding: 20px 25px; border-radius: 12px 12px 0 0;">';
    html += '<strong style="font-size: 20px; color: #ffffff; letter-spacing: 0.5px;">' + type + ' ' + typeName + '</strong>';
    html += '</td></tr>';
    
    // Body
    html += '<tr><td style="background: #ffffff; padding: 25px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">';
    
    // Date block
    if (msgType === 'extension') {
        html += buildDateBlock(dateCompletion, timeEnd, 'Дата завершения:', '⏰', color);
    } else {
        html += buildDateBlock(dateStart, timeDisplay || timeStart, msgType === 'start' ? 'Дата начала:' : 'Дата проведения:', '📅', color);
    }
    
    // Time block (если есть отдельное время)
    if ((workType === 'avr' || workType === 'multiday') && msgType === 'start' && timeStart) {
        html += buildTimeBlock(timeStart, 'Время начала:', '⏰', color);
    }
    
    // Completion block
    if ((workType === 'avr' || workType === 'multiday') && msgType === 'completion' && dateCompletion) {
        html += buildDateBlock(dateCompletion, timeEnd, 'Дата завершения:', '✅', color);
    }
    
    // System block
    html += buildInfoBlock(system, 'Система:', '🖥', color);
    
    // Impact block
    if (impact) {
        html += buildInfoBlock(impact, 'Влияние:', '⚠️', color);
    }
    
    // Services block
    if (services) {
        html += '<tr><td style="padding: 20px 0 10px;">';
        html += '<span style="color: #24b314; font-size: 24px;">⚙️</span>';
        html += '</td><td style="padding: 20px 0 10px;">';
        html += '<div style="color: #2c3e50; font-size: 16px; font-weight: bold; line-height: 1.4;"><span style="color: #95a5a6; font-size: 13px;">Сервисы:</span><br>' + services + '</div>';
        html += '</td></tr>';
    }
    
    // Additional message
    if (includeAdditional && additionalMessage) {
        html += '<tr><td colspan="2" style="padding: 15px 0; border-top: 1px solid #eee; margin-top: 10px;">';
        html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px; color: #555;">' + additionalMessage + '</div>';
        html += '</td></tr>';
    }
    
    // Recommendations
    if (includeRec && recommendations) {
        html += '<tr><td colspan="2" style="padding: 15px 0;">';
        html += '<div style="border: 2px solid #dcedc8; background: #f1f8e9; padding: 15px; border-radius: 8px;">';
        html += '<div style="font-weight: bold; color: #558b2f; margin-bottom: 8px;">📋 Рекомендации:</div>';
        html += '<div style="color: #33691e; font-size: 14px;">' + recommendations + '</div>';
        html += '</div>';
        html += '</td></tr>';
    }
    
    html += '</td></tr></table>';
    
    return html;
}

/**
 * @param {string} date
 * @param {string} time
 * @param {string} label
 * @param {string} icon
 * @param {Object} color
 * @returns {string}
 */
function buildDateBlock(date, time, label, icon, color) {
    var html = '<tr><td style="padding: 15px 0; width: 50px;">';
    html += '<span style="color: ' + color.primary + '; font-size: 36px; line-height: 80px; display: inline-block;">' + icon + '</span>';
    html += '</td><td style="padding: 15px 0;">';
    html += '<div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">' + (date || '—') + '</div>';
    html += '<div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">' + label + '</div>';
    if (time) {
        html += '<div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-top: 10px;">' + time + '</div>';
    }
    html += '</td></tr>';
    return html;
}

/**
 * @param {string} time
 * @param {string} label
 * @param {string} icon
 * @param {Object} color
 * @returns {string}
 */
function buildTimeBlock(time, label, icon, color) {
    var html = '<tr><td style="padding: 15px 0; width: 50px;">';
    html += '<span style="color: ' + color.primary + '; font-size: 36px; line-height: 80px; display: inline-block;">' + icon + '</span>';
    html += '</td><td style="padding: 15px 0;">';
    html += '<div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">' + time + '</div>';
    html += '<div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">Время:</div>';
    html += '</td></tr>';
    return html;
}

/**
 * @param {string} value
 * @param {string} label
 * @param {string} icon
 * @param {Object} color
 * @returns {string}
 */
function buildInfoBlock(value, label, icon, color) {
    var html = '<tr><td style="padding: 15px 0; width: 50px;">';
    html += '<span style="color: ' + color.primary + '; font-size: 36px; line-height: 70px; display: inline-block;">' + icon + '</span>';
    html += '</td><td style="padding: 15px 0;">';
    html += '<div style="color: #2c3e50; font-size: 18px; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">' + (value || '—') + '</div>';
    html += '<div style="color: #95a5a6; font-size: 13px; font-weight: 500; line-height: 1.3;">' + label + '</div>';
    html += '</td></tr>';
    return html;
}

/**
 * Сгенерировать текстовое уведомление
 * @param {Object} params
 * @returns {string}
 */
function generateTextNotification(params) {
    var workType = params.workType;
    var msgType = params.msgType;
    var dateStart = params.dateStart;
    var dateCompletion = params.dateCompletion;
    var timeDisplay = params.timeDisplay;
    var system = params.system;
    var impact = params.impact;
    var services = params.services;
    var additionalMessage = params.additionalMessage;
    var recommendations = params.recommendations;
    var includeRec = params.includeRec;
    var includeAdditional = params.includeAdditional;
    
    var typeNames = {
        planned: 'ПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
        multiday: 'ПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
        unplanned: 'ВНЕПЛАНОВЫЕ ТЕХНИЧЕСКИЕ РАБОТЫ',
        avr: 'АВАРИЙНО-ВОССТАНОВИТЕЛЬНЫЕ РАБОТЫ'
    };
    
    var text = typeNames[workType] + '\n\n';
    
    if (dateStart) {
        text += '📅 ' + (msgType === 'completion' ? 'Дата завершения:' : 'Дата:') + ' ' + dateStart + '\n';
    }
    if (timeDisplay) {
        text += '⏰ Время: ' + timeDisplay + '\n';
    }
    if (system) {
        text += '🖥 Система: ' + system + '\n';
    }
    if (impact) {
        text += '⚠️ Влияние: ' + impact + '\n';
    }
    if (services) {
        text += '⚙️ Сервисы: ' + services + '\n';
    }
    if (includeAdditional && additionalMessage) {
        text += '\n' + additionalMessage.replace(/<br>/g, '\n') + '\n';
    }
    if (includeRec && recommendations) {
        text += '\n📋 Рекомендации:\n' + recommendations + '\n';
    }
    
    return text.trim();
}