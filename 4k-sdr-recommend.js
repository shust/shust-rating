(function () {
    'use strict';

    // Защита от повторной загрузки
    if (window.plugin_4k_sdr_recommend_ready) return;
    window.plugin_4k_sdr_recommend_ready = true;

    function startPlugin() {
        console.log('[4K SDR Recommend] Плагин запущен');

        // Функция для проверки и добавления плашки
        function highlightTorrents() {
            // Ищем все элементы списка торрентов
            // Селектор может отличаться в разных версиях Lampa, 
            // обычно это элементы внутри компонента torrents
            var items = document.querySelectorAll('.torrent-item, .torrents__item, .torrent__item');

            items.forEach(function (item) {
                // Если уже обработали, пропускаем
                if (item.dataset.recommendedChecked) return;
                item.dataset.recommendedChecked = 'true';

                // Получаем текст всего элемента для анализа
                var text = item.innerText.toLowerCase();

                // --- УСЛОВИЯ ---
                // 1. Проверяем на 4K (разные варианты написания)
                var is4K = /4k|2160p|uhd/i.test(text);
                
                // 2. Проверяем на SDR. 
                // Обычно HDR/DV явно указываются. Если их нет, а 4K есть — считаем SDR.
                var isHDR = /hdr|dolby.?vision|dv/i.test(text);
                var isSDR = is4K && !isHDR;

                // 3. Проверяем количество сидов (минимум 1)
                // Ищем число рядом со словом "сид" или "seed" или просто любые цифры в конце строки
                // Это упрощенная логика, так как DOM Lampa может меняться.
                var seedMatch = text.match(/(?:сид|seed|s:)\s*(\d+)/i) || text.match(/(\d+)\s*(?:сид|seed|s)/i);
                var seeds = seedMatch ? parseInt(seedMatch[1], 10) : 1; // Если не нашли, предполагаем 1

                // Итоговое условие
                if (isSDR && seeds >= 1) {
                    addBadge(item);
                }
            });
        }

        // Функция добавления плашки
        function addBadge(element) {
            // Проверяем, нет ли уже плашки
            if (element.querySelector('.recommended-badge')) return;

            // Создаем элемент плашки
            var badge = document.createElement('div');
            badge.className = 'recommended-badge';
            badge.innerText = 'Рекомендуем';
            
            // Стили (можно вынести в CSS, но для простоты inline)
            badge.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: #4CAF50; /* Зеленый цвет */
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                z-index: 100;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                pointer-events: none; /* Чтобы не мешала кликам */
            `;

            // Делаем родителя позиционированным, если это не так
            if (getComputedStyle(element).position === 'static') {
                element.style.position = 'relative';
            }

            element.appendChild(badge);
        }

        // Наблюдаем за изменениями в DOM, чтобы ловить появление новых элементов
        var observer = new MutationObserver(function (mutations) {
            highlightTorrents();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Запускаем проверку сразу
        highlightTorrents();
        
        // Периодический таймер на всякий случай (если DOM обновляется не через мутации)
        setInterval(highlightTorrents, 2000);
    }

    // Стандартная инициализация плагина Lampa
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

})();