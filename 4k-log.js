(function () {
    'use strict';

    if (window.plugin_4k_sdr_debug) return;
    window.plugin_4k_sdr_debug = true;

    function startPlugin() {
        console.log('[4K SDR] Плагин запущен');

        // Создаём маленькую панель для логов прямо в UI Lampa (на случай, если нет доступа к консоли)
        function makePanel() {
            if (document.getElementById('k4sdr-panel')) return;
            var p = document.createElement('div');
            p.id = 'k4sdr-panel';
            p.style.cssText = [
                'position:fixed',
                'left:10px',
                'bottom:10px',
                'max-width:60%',
                'max-height:40%',
                'overflow:auto',
                'background:rgba(0,0,0,.85)',
                'color:#0f0',
                'font:12px monospace',
                'padding:8px',
                'border-radius:6px',
                'z-index:99999',
                'white-space:pre-wrap',
                'pointer-events:none'
            ].join(';');
            document.body.appendChild(p);
            return p;
        }

        function say(msg) {
            console.log('[4K SDR]', msg);
            var p = makePanel();
            if (p) {
                p.textContent += msg + '\n';
                // Ограничим размер
                if (p.textContent.length > 4000) {
                    p.textContent = p.textContent.slice(-3000);
                }
            }
        }

        function processTorrents() {
            var items = document.querySelectorAll('.torrent-item.selector');
            say('Карточек найдено: ' + items.length);

            items.forEach(function (item, i) {
                if (item.dataset.k4sdrDone) return;

                var titleEl = item.querySelector('.torrent-item__title');
                var title = titleEl ? titleEl.innerText : '';

                // 4K
                var resolutionEls = item.querySelectorAll('.m-resolution');
                var resTexts = [];
                resolutionEls.forEach(function (r) { resTexts.push((r.innerText || '').trim()); });

                var has4K = resTexts.some(function (t) { return /^4K$/i.test(t) || /2160/i.test(t); });
                if (!has4K && /(4K|2160p|UHD)/i.test(title)) has4K = true;

                // HDR
                var isHDR = resTexts.some(function (t) { return /HDR|Dolby|DoVi|\bDV\b/i.test(t); });
                if (!isHDR && /(HDR10\+?|HDR|Dolby\s*Vision|DoVi|\bDV\b)/i.test(title)) isHDR = true;

                // Сиды
                var seedsEl = item.querySelector('.torrent-item__seeds span');
                var seeds = seedsEl ? parseInt(seedsEl.innerText, 10) : 0;

                say(
                    '#' + i +
                    ' | 4K=' + has4K +
                    ' | HDR=' + isHDR +
                    ' | seeds=' + seeds +
                    ' | res=[' + resTexts.join(',') + ']' +
                    ' | ' + title.substring(0, 50)
                );

                if (!has4K) return;
                if (isHDR) return;
                if (isNaN(seeds) || seeds < 1) return;

                item.dataset.k4sdrDone = 'true';
                addBadge(item);
                say('>>> БЕЙДЖ ДОБАВЛЕН: ' + title.substring(0, 50));
            });
        }

        function addBadge(item) {
            if (item.querySelector('.k4sdr-badge')) return;
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
                'z-index:50',
                'box-shadow:0 2px 6px rgba(0,0,0,.6)',
                'pointer-events:none',
                'text-transform:uppercase'
            ].join(';');
            item.appendChild(badge);
        }

        // Наблюдатель
        var observer = new MutationObserver(function () { processTorrents(); });
        observer.observe(document.body, { childList: true, subtree: true });

        // Запускаем один раз через секунду, чтобы Lampa успела отрисовать
        setTimeout(processTorrents, 1000);
        setInterval(processTorrents, 2000);
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();