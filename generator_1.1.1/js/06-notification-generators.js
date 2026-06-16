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
                const completionMessage = (params.completionText && params.completionText.trim()) ? params.completionText.trim() : (params.workType === 'multiday' ? 'Плановые технические работы завершены. Сервисы работают в штатном режиме.' : avrCompletionDefault);
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
                // Используем completionText из поля ввода
                let completionMsg = (params.completionText && params.completionText.trim()) ? params.completionText.trim() : '';
                let completionEmoji = '✅';

                // Если это JDE - всегда используем шаблон JDE вне зависимости от completionText
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
                    // Если completionText задано, определяем эмодзи по типу работ
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
                // Используем completionText из поля ввода
                const inputText = params.completionText || '';
                if (isJDE) {
                    // JDE - всегда используем специальное сообщение с эмодзи
                    const firstWord = params.system.split(' ')[0];
                    completionMessage = inputText.trim() || `Обновление завершено. ${firstWord} доступен для работы 🎉`;
                } else if (inputText.trim()) {
                    // Если пользователь ввёл свой текст - используем его
                    completionMessage = inputText.trim();
                } else if (params.workType === 'planned' || params.workType === 'multiday') {
                    completionMessage = 'Плановые технические работы завершены. Сервисы работают в штатном режиме.';
                } else if (params.workType === 'unplanned') {
                    completionMessage = 'Внеплановые технические работы завершены. Сервисы работают в штатном режиме.';
                } else if (params.workType === 'avr') {
                    completionMessage = 'Аварийно-восстановительные работы завершены. Сервисы работают в штатном режиме.';
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
