(function () {
    'use strict';

    if (window.plugin_4k_sdr_recommend_v3) return;
    window.plugin_4k_sdr_recommend_v3 = true;

    var DEBUG = true;
    function log() {
        if (DEBUG) console.log('[4K SDR Recommend]', ...arguments);
    }

    function startPlugin() {
        log('Плагин запущен');

        function processTorrents() {
            // Берём именно карточки раздач
            var items = document.querySelectorAll('.torrent-item.selector');
            log('Найдено карточек:', items.length);

            items.forEach(function (item) {
                // Если уже обрабатывали — пропускаем
                if (item.dataset.k4sdrDone) return;

                // Название раздачи
                var titleEl = item.querySelector('.torrent-item__title');
                var title = titleEl ? titleEl.innerText : '';

                // Разрешение из ffprobe (там есть отдельный блок .m-resolution с текстом "4K")
                var resolutionEls = item.querySelectorAll('.m-resolution');
                var has4K = false;
                resolutionEls.forEach(function (r) {
                    var t = (r.innerText || '').trim();
                    if (/^4K$/i.test(t) || /2160/i.test(t)) has4K = true;
                });

                // На всякий случай проверим и title
                if (!has4K && /(4K|2160p|UHD)/i.test(title)) has4K = true;

                if (!has4K) return;

                // Проверяем HDR/DV — в разметке это отдельные .m-resolution с текстом "HDR"
                // или упоминание в title
                var isHDR = false;
                resolutionEls.forEach(function (r) {
                    var t = (r.innerText || '').trim();
                    if (/HDR|Dolby|DoVi|DV/i.test(t)) isHDR = true;
                });
                if (!isHDR && /(HDR10\+?|HDR|Dolby\s*Vision|DoVi|\bDV\b)/i.test(title)) {
                    isHDR = true;
                }

                if (isHDR) return; // нам нужен только SDR

                // Сиды — берём из .torrent-item__seeds span
                var seedsEl = item.querySelector('.torrent-item__seeds span');
                var seeds = seedsEl ? parseInt(seedsEl.innerText, 10) : 0;
                if (isNaN(seeds) || seeds < 1) return;

                // Помечаем и добавляем бейдж
                item.dataset.k4sdrDone = 'true';
                log('Подходит:', { title: title.substring(0, 60), seeds: seeds });
                addBadge(item);
            });
        }

        function addBadge(item) {
            if (item.querySelector('.k4sdr-badge')) return;

            // Нам нужен контейнер, который позиционируется относительно карточки.
            // Карточка .torrent-item — самый надёжный вариант.
            if (getComputedStyle(item).position === 'static') {
                item.style.position = 'relative';
            }

            var badge = document.createElement('div');
            badge.className = 'k4sdr-badge';
            badge.innerText = 'Рекомендуем';
            badge.style.cssText = [
                'position:absolute',
                'top:6px',
                'right:6px',
                'background:linear-gradient(135deg,#43a047,#2e7d32)',
                'color:#fff',
                'padding:3px 10px',
                'border-radius:6px',
                'font-size:12px',
                'font-weight:700',
                'letter-spacing:0.3px',
                'z-index:50',
                'box-shadow:0 2px 6px rgba(0,0,0,.6)',
                'pointer-events:none',
                'text-transform:uppercase'
            ].join(';');

            item.appendChild(badge);
        }

        // MutationObserver
        var observer = new MutationObserver(function () {
            processTorrents();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        processTorrents();
        setInterval(processTorrents, 1500);
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
