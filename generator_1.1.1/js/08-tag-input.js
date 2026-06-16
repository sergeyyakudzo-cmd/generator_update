(function() {
    'use strict';

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function initTagInput(inputId) {
        var input = document.getElementById(inputId);
        if (!input || input.dataset.tagInputInitialized) return;

        var container = document.createElement('div');
        container.className = 'tag-input-container';

        var tagsWrapper = document.createElement('div');
        tagsWrapper.className = 'tag-input-tags';

        var textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'tag-input-field';
        textInput.placeholder = 'Введите адрес и нажмите Enter или запятую';

        var hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = inputId + '-hidden';
        hiddenInput.value = input.value;

        container.appendChild(tagsWrapper);
        container.appendChild(textInput);
        container.appendChild(hiddenInput);

        input.parentNode.insertBefore(container, input.nextSibling);
        input.style.display = 'none';
        input.setAttribute('data-hidden-tag-input', 'true');

        var currentValue = hiddenInput.value;

        Object.defineProperty(input, 'value', {
            get: function() { return hiddenInput.value; },
            set: function(val) {
                hiddenInput.value = val || '';
                currentValue = hiddenInput.value;
                renderTags();
            },
            configurable: true
        });

        function parseTags(str) {
            return str.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
        }

        function renderTags() {
            tagsWrapper.innerHTML = '';
            var tags = parseTags(hiddenInput.value);
            tags.forEach(function(tag) {
                var chip = document.createElement('span');
                chip.className = 'tag-chip';
                chip.innerHTML = '<span class="tag-chip-text">' + escapeHtml(tag) + '</span><span class="tag-chip-remove" data-tag="' + escapeHtml(tag) + '">&times;</span>';
                chip.querySelector('.tag-chip-remove').addEventListener('click', function(e) {
                    e.stopPropagation();
                    removeTag(tag);
                });
                tagsWrapper.appendChild(chip);
            });
            tagsWrapper.appendChild(textInput);
        }

        function addTag(tag) {
            tag = tag.trim();
            if (!tag) return;
            var tags = parseTags(hiddenInput.value);
            if (tags.indexOf(tag) !== -1) return;
            tags.push(tag);
            hiddenInput.value = tags.join(', ');
            currentValue = hiddenInput.value;
            renderTags();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        function removeTag(tag) {
            var tags = parseTags(hiddenInput.value);
            tags = tags.filter(function(t) { return t !== tag; });
            hiddenInput.value = tags.join(', ');
            currentValue = hiddenInput.value;
            renderTags();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        textInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                var val = textInput.value.replace(/,/g, '').trim();
                if (val) addTag(val);
                textInput.value = '';
            }
            if (e.key === 'Backspace' && textInput.value === '' && textInput.selectionStart === 0 && textInput.selectionEnd === 0) {
                var tags = parseTags(hiddenInput.value);
                if (tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                }
            }
        });

        textInput.addEventListener('blur', function() {
            var val = textInput.value.trim();
            if (val) {
                addTag(val);
                textInput.value = '';
            }
        });

        textInput.addEventListener('paste', function() {
            setTimeout(function() {
                var val = textInput.value;
                if (val.indexOf(',') !== -1) {
                    var parts = val.split(',');
                    parts.forEach(function(p) {
                        var trimmed = p.trim();
                        if (trimmed) addTag(trimmed);
                    });
                    textInput.value = '';
                }
            }, 0);
        });

        input.dataset.tagInputInitialized = 'true';
        renderTags();
    }

    document.addEventListener('DOMContentLoaded', function() {
        var inputs = document.querySelectorAll('[data-tag-input="true"]');
        inputs.forEach(function(input) {
            initTagInput(input.id);
        });
    });
})();
