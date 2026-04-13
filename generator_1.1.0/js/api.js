/**
 * API - Интеграция с Max (Telegram) и Zimbra
 */

var MAX_TOKEN = '';
var MAX_CHAT_ID = '';

// ============================================
// MAX (TELEGRAM)
// ============================================

/**
 * Отправить сообщение в Max
 * @param {string} text
 * @param {number|null} replyToMessageId
 * @returns {Promise<Object>}
 */
async function sendToMax(text, replyToMessageId) {
    var body = {
        token: MAX_TOKEN,
        text: text
    };
    if (replyToMessageId) {
        body.reply_to_message_id = replyToMessageId;
    }
    
    var response;
    try {
        response = await fetch('/send-to-max', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (netErr) {
        throw new Error('Не удалось подключиться к Max. Проверьте подключение к интернету');
    }
    if (!response.ok) {
        throw new Error('Ошибка: ' + response.status);
    }
    return await response.json();
}

/**
 * @returns {Object}
 */
function getStartMessageIds() {
    try { 
        return JSON.parse(localStorage.getItem('generator_start_msg_ids') || '{}'); 
    }
    catch { 
        return {}; 
    }
}

/**
 * @param {string} system
 * @param {string} dateStart
 * @param {number} msgId
 */
function saveStartMessageId(system, dateStart, msgId) {
    var ids = getStartMessageIds();
    ids[system] = { message_id: msgId, dateStart: dateStart, time: Date.now() };
    localStorage.setItem('generator_start_msg_ids', JSON.stringify(ids));
}

/**
 * @param {string} system
 * @param {string} dateStart
 * @returns {number|null}
 */
function getStartMessageId(system, dateStart) {
    var ids = getStartMessageIds();
    if (ids[system] && ids[system].dateStart === dateStart) return ids[system].message_id;
    if (ids[system]) return ids[system].message_id;
    return null;
}

var TG_HISTORY_KEY = 'generator_tg_history';
var TG_HISTORY_MAX = 15;

/**
 * @returns {Array}
 */
function getTgHistory() {
    try { return JSON.parse(localStorage.getItem(TG_HISTORY_KEY) || '[]'); }
    catch { return []; }
}

/**
 * @param {Object} item
 */
function addTgHistoryItem(item) {
    var hist = getTgHistory();
    hist.unshift(item);
    if (hist.length > TG_HISTORY_MAX) hist.length = TG_HISTORY_MAX;
    localStorage.setItem(TG_HISTORY_KEY, JSON.stringify(hist));
}

/**
 */
function clearTgHistory() {
    localStorage.removeItem(TG_HISTORY_KEY);
}

// ============================================
// ZIMBRA
// ============================================

/**
 * Отправить в Zimbra
 * @param {Object} params
 * @returns {Promise<void>}
 */
async function sendToZimbra(params) {
    var html = params.html;
    var msgType = params.msgType;
    var subject = params.subject;
    var to = params.to;
    var cc = params.cc;
    
    // Minify HTML
    var minified_html = html
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
    
    var payload;
    if (msgType === 'start') {
        payload = { html: minified_html, subject: subject, to: to, cc: cc };
    } else {
        payload = { html: minified_html, subject: null, to: null, cc: null };
    }
    
    var resp, result;
    try {
        resp = await fetch('http://localhost:8000/send-to-zimbra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(payload)
        });
        result = await resp.json();
    } catch (netErr) {
        throw new Error('Не удалось подключиться к серверу. Проверьте, что server.ps1 запущен');
    }
    
    if (!resp.ok) {
        throw new Error('Ошибка сервера: ' + resp.status);
    }
    
    if (!result.success) {
        throw new Error(result.error || 'Unknown error');
    }
}

// ============================================
// INIT CONFIG
// ============================================

/**
 * Инициализировать API конфиг
 * @returns {Promise<void>}
 */
async function initApiConfig() {
    var defaultToken = 'f9LHodD0cOIsuFM7s3BgTcIw2zTV3ZfC7UFn0NPNy7Xb8nBln-UvBnSNASjw-5w671OMv0G7QUsKJoLTGr-A';
    var defaultChatId = '-1003692249032';
    
    MAX_TOKEN = defaultToken;
    MAX_CHAT_ID = defaultChatId;
    
    try {
        var response = await fetch('config.json');
        if (!response.ok) throw new Error('Config not found');
        var config = await response.json();
        
        if (config.max) {
            if (config.max.token && config.max.token !== 'ВАШ_ТОКЕН') {
                MAX_TOKEN = config.max.token;
            }
            if (config.max.chat_id && config.max.chat_id !== 'ВАШ_CHAT_ID') {
                MAX_CHAT_ID = config.max.chat_id;
            }
        }
        
        if (MAX_CHAT_ID === '-1003864932841') {
            MAX_CHAT_ID = '-1003692249032';
        }
        
        if (config.systems) CONFIG_SYSTEMS = config.systems;
        if (config.impacts) CONFIG_IMPACTS = config.impacts;
        
    } catch (err) {
        console.warn('Failed to load config:', err);
    }
}