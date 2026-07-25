(function() {
    'use strict';

    const POLL_URL = 'http://localhost:8000/poll-zimbra';
    const POLL_INTERVAL = 2000;
    let pollFailCount = 0;

    function log(msg) {
        console.log('[ZimbraInserter] ' + msg);
    }

    log('Script started on ' + location.href);

    function findComposeEditor() {
        const selectors = [
            // Classic UI - iframe
            'iframe[id*="com_zimbra_email"]',
            'iframe[id*="compose"]',
            '#ziframe',
            'iframe.zmiframe',
            '.ZmHtmlEditor iframe',
            // Classic UI - contenteditable
            '.ZmHtmlEditor-body[contenteditable="true"]',
            '.mceContentBody',
            // Modern UI
            'div[contenteditable="true"][data-placeholder]',
            '.editor-body[contenteditable="true"]',
            '.composeEditor div[contenteditable="true"]',
            'div[contenteditable="true"].notranslate',
            // Generic
            'div[contenteditable="true"]'
        ];

        for (const sel of selectors) {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
                if (el.offsetParent !== null) {
                    return { element: el, selector: sel, isIframe: el.tagName === 'IFRAME' };
                }
            }
        }
        return null;
    }

    function findSubjectInput() {
        // Специфичные селекторы Zimbra
        const selectors = [
            // Classic UI
            'input[id*="subject"]',
            'input[name="subject"]',
            'input[id*="Subject"]',
            'input[class*="Subject"]',
            'input[class*="subject"]',
            'input.ZmSubjectField',
            '.SubjectField input',
            'input[data-addr*="subject"]',
            // Modern UI
            'input[placeholder*="Тема"]',
            'input[placeholder*="Subject"]',
            'input[placeholder*="тема"]',
            'input[data-placeholder*="Тема"]',
            'input[data-placeholder*="Subject"]',
            'input[aria-label*="Тема"]',
            'input[aria-label*="Subject"]',
            // Generic
            'input.subject',
            '#subject',
            // Zimbra specific IDs
            '#zv__COMPOSE-1_subject',
            'input[id^="zv__COMPOSE"]'
        ];

        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                log('Found subject input: ' + sel);
                return el;
            }
        }

        // Fallback: ищем input рядом с лейблом "Тема" или "Subject"
        const labels = document.querySelectorAll('label, span, div');
        for (const label of labels) {
            const text = label.textContent.trim().toLowerCase();
            if (text === 'тема' || text === 'subject' || text === 'тема:') {
                const parent = label.closest('div, td, tr');
                if (parent) {
                    const input = parent.querySelector('input[type="text"], input:not([type])');
                    if (input) {
                        log('Found subject input via label');
                        return input;
                    }
                }
            }
        }

        log('No subject input found. All inputs on page:');
        document.querySelectorAll('input[type="text"]').forEach((inp, i) => {
            log(`  input[${i}]: id="${inp.id}" name="${inp.name}" class="${inp.className}" placeholder="${inp.placeholder}"`);
        });

        return null;
    }

    function findToInput() {
        // First try by name attribute (most reliable)
        const byName = document.querySelector('input[name="to"]');
        if (byName && byName.offsetParent !== null) {
            log('Found TO by name: ' + byName.id);
            return byName;
        }

        // Try Zimbra-specific IDs
        const zimbraIds = ['zv__COMPOSE-1_to', 'zv__COMPOSE-2_to', 'to'];
        for (const id of zimbraIds) {
            const el = document.getElementById(id);
            if (el && el.offsetParent !== null) {
                log('Found TO by Zimbra ID: ' + id);
                return el;
            }
        }

        // Look for visible inputs with TO-related attributes
        const allInputs = document.querySelectorAll('input');
        for (const el of allInputs) {
            if (el.offsetParent === null) continue;
            const id = el.id || '';
            const name = el.name || '';
            const placeholder = el.placeholder || '';
            
            // Check various indicators
            if (name === 'to' || name === 'To' || 
                id.toLowerCase().includes('_to') || id.toLowerCase().includes('-to') ||
                placeholder.toLowerCase().includes('кому') || placeholder.toLowerCase().includes(' to')) {
                log('Found TO: id=' + id + ', name=' + name + ', placeholder=' + placeholder);
                return el;
            }
        }
        
        log('TO input not found');
        return null;
    }

    function findCcInput() {
        // First try by name attribute
        const byName = document.querySelector('input[name="cc"]');
        if (byName && byName.offsetParent !== null) {
            log('Found CC by name: ' + byName.id);
            return byName;
        }

        // Try Zimbra-specific IDs
        const zimbraIds = ['zv__COMPOSE-1_cc', 'zv__COMPOSE-2_cc', 'cc'];
        for (const id of zimbraIds) {
            const el = document.getElementById(id);
            if (el && el.offsetParent !== null) {
                log('Found CC by Zimbra ID: ' + id);
                return el;
            }
        }

        // Look for visible inputs with CC-related attributes
        const allInputs = document.querySelectorAll('input');
        for (const el of allInputs) {
            if (el.offsetParent === null) continue;
            const id = el.id || '';
            const name = el.name || '';
            const placeholder = el.placeholder || '';
            
            if (name === 'cc' || name === 'Cc' || 
                id.toLowerCase().includes('_cc') || id.toLowerCase().includes('-cc') ||
                placeholder.toLowerCase().includes('копия') || placeholder.toLowerCase().includes(' cc')) {
                log('Found CC: id=' + id + ', name=' + name + ', placeholder=' + placeholder);
                return el;
            }
        }
        
        log('CC input not found');
        return null;
    }

    function insertToField(to) {
        const input = findToInput();
        if (!input) {
            log('No TO input found');
            return false;
        }
        try {
            // Try different methods - use direct value assignment first
            input.value = to;
            
            // Dispatch events
            ['input', 'change', 'blur', 'keyup'].forEach(evtType => {
                input.dispatchEvent(new Event(evtType, { bubbles: true, cancelable: true }));
            });
            
            // If still empty, try setting style width
            if (input.value !== to) {
                log('Direct value set failed, trying workarounds');
                input.style.width = '500px';
                input.value = to;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            log('TO inserted: ' + to + ', actual value: ' + input.value);
            return true;
        } catch (e) {
            log('TO insert error: ' + e.message);
            return false;
        }
    }

    function insertCcField(cc) {
        const input = findCcInput();
        if (!input) {
            log('No CC input found');
            return false;
        }
        try {
            // Try different methods
            input.value = cc;
            
            // Dispatch events
            ['input', 'change', 'blur', 'keyup'].forEach(evtType => {
                input.dispatchEvent(new Event(evtType, { bubbles: true, cancelable: true }));
            });
            
            // If still empty, try setting style width
            if (input.value !== cc) {
                log('Direct value set failed, trying workarounds');
                input.style.width = '500px';
                input.value = cc;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            log('CC inserted: ' + cc + ', actual value: ' + input.value);
            return true;
        } catch (e) {
            log('CC insert error: ' + e.message);
            return false;
        }
    }

    function getEditorDoc(editor) {
        if (editor.isIframe) {
            return editor.element.contentDocument || editor.element.contentWindow?.document;
        }
        return document;
    }

    function getEditorBody(editor) {
        if (editor.isIframe) {
            const doc = getEditorDoc(editor);
            return doc ? doc.body : null;
        }
        return editor.element;
    }

    function insertHtml(html) {
        const editor = findComposeEditor();
        if (!editor) {
            log('No compose editor found');
            return false;
        }

        const body = getEditorBody(editor);
        if (!body) {
            log('Cannot access editor body');
            return false;
        }

        try {
            if (editor.isIframe) {
                const doc = getEditorDoc(editor);
                if (doc) {
                    doc.execCommand('insertHTML', false, html);
                    log('Inserted via execCommand (iframe)');
                    return true;
                }
            }

            body.focus();

            if (body.innerHTML.trim() === '' || body.innerHTML === '<br>' || body.innerHTML === '<div><br></div>') {
                body.innerHTML = html;
                log('Inserted as innerHTML (empty editor)');
                return true;
            }

            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const temp = document.createElement('div');
                temp.innerHTML = html;
                const frag = document.createDocumentFragment();
                while (temp.firstChild) {
                    frag.appendChild(temp.firstChild);
                }
                range.insertNode(frag);
                selection.collapseToEnd();
                log('Inserted via Range API');
                return true;
            }

            body.innerHTML += html;
            log('Appended via innerHTML');
            return true;
        } catch (e) {
            log('Insert error: ' + e.message);
            return false;
        }
    }

    function insertSubject(subject) {
        const input = findSubjectInput();
        if (!input) {
            log('No subject input found');
            return false;
        }
        try {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, subject);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            log('Subject inserted: ' + subject);
            return true;
        } catch (e) {
            log('Subject insert error: ' + e.message);
            return false;
        }
    }

    async function pollForHtml() {
        try {
            const resp = await fetch(POLL_URL, { method: 'GET' });
            if (!resp.ok) return;
            const data = await resp.json();
            log('Poll response: to="' + (data.to || '') + '", cc="' + (data.cc || '') + '", subject="' + (data.subject || '') + '", html=' + (data.html ? 'present(' + data.html.length + ')' : 'null'));
            
            const val = (v) => v && typeof v === 'string' && v.trim() ? v.trim() : null;
            const hasHtml = val(data.html);
            const hasRecipients = val(data.to) || val(data.cc);
            const hasSubject = val(data.subject);
            
            log('Check: hasHtml=' + !!hasHtml + ', hasRecipients=' + !!hasRecipients + ', hasSubject=' + !!hasSubject + ', to="' + data.to + '"');
            
            if (hasHtml || hasRecipients || hasSubject) {
                if (hasHtml) {
                    log('Received HTML (' + hasHtml.length + ' chars), subject: "' + hasSubject + '"');
                } else {
                    log('Received recipients only: to="' + hasRecipients + '", cc="' + val(data.cc) + '", subject="' + hasSubject + '"');
                }
                
                // Insert TO and CC first with delay
                if (val(data.to)) {
                    setTimeout(() => {
                        const result = insertToField(val(data.to));
                        log('TO insert result: ' + result);
                    }, 100);
                } else {
                    log('No TO in response');
                }
                if (val(data.cc)) {
                    setTimeout(() => {
                        const result = insertCcField(val(data.cc));
                        log('CC insert result: ' + result);
                    }, 200);
                } else {
                    log('No CC in response');
                }
                
                // Insert subject after
                if (val(data.subject)) {
                    setTimeout(() => insertSubject(val(data.subject)), 300);
                } else {
                    log('No subject in response');
                }
                
                // Insert HTML last (only if HTML exists)
                if (hasHtml) {
                    setTimeout(() => {
                        const ok = insertHtml(hasHtml);
                        if (ok) {
                            log('HTML inserted successfully');
                        } else {
                            log('Failed to insert HTML');
                        }
                    }, 400);
                }
            }
        } catch (e) {
            pollFailCount++;
            if (pollFailCount <= 3) {
                log('Poll error: ' + e.message);
            }
        }
    }

    log('Polling started, interval: ' + POLL_INTERVAL + 'ms');
    setInterval(pollForHtml, POLL_INTERVAL);
})();
