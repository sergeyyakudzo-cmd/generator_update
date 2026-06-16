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
            'Zoom': 'Проблемы с отправкой сообщений и звонками',
            'Mattermost': 'Работа с Mattermost будет недоступна',
            'Автограф': 'Работа с системой Автограф будет недоступна'
        };

        const avrSystemMessages = {
            '1С': 'Недоступны подключения к базам 1С',
            '1С+Phoenix': 'Системы 1С и Феникс могут быть недоступны',
            'Оптимум': 'Сложности с загрузкой заказов MRS',
            'Zoom': 'Проблемы с отправкой сообщений и звонками',
            'Mattermost': 'Работа с Mattermost будет недоступна',
            'Автограф': 'Работа с системой Автограф будет недоступна'
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
