(function () {
    'use strict';

    if (window.plugin_4k_sdr_v4) return;
    window.plugin_4k_sdr_v4 = true;

    function startPlugin() {
        console.log('[4K SDR v4] Плагин запущен');

        // Панель логов
        function makePanel() {
            if (document.getElementById('k4sdr-panel')) return;
            var p = document.createElement('div');
            p.id = 'k4sdr-panel';
            p.style.cssText = [
                'position:fixed','left:10px','bottom:10px','max-width:70%','max-height:40%',
                'overflow:auto','background:rgba(0,0,0,.85)','color:#0f0','font:12px monospace',
                'padding:8px','border-radius:6px','z-index:99999','white-space:pre-wrap','pointer-events:none'
            ].join(';');
            document.body.appendChild(p);
            return p;
        }
        function say(msg) {
            console.log('[4K SDR v4]', msg);
            var p = makePanel();
            if (p) {
                p.textContent += msg + '\n';
                if (p.textContent.length > 4000) p.textContent = p.textContent.slice(-3000);
            }
        }

        // Возможные селекторы карточек (от более специфичного к более общему)
        var SELECTORS = [
            '.torrent-item.selector',
            '.torrent-item',
            '.torrents__item',
            '.torrent__item',
            '[class*="torrent-item"]',
            '[class*="torrent"][class*="item"]'
        ];

        function findCards() {
            for (var i = 0; i < SELECTORS.length; i++) {
                var list = document.querySelectorAll(SELECTORS[i]);
                if (list.length > 0) {
                    // Фильтруем: у настоящих карточек должен быть .torrent-item__title
                    var real = [];
                    list.forEach(function (el) {
                        if (el.querySelector('.torrent-item__title') ||
                            el.querySelector('[class*="torrent-item__title"]')) {
                            real.push(el);
                        }
                    });
                    if (real.length > 0) {
                        say('Селектор "' + SELECTORS[i] + '" дал ' + real.length + ' карточек');
                        return real;
                    }
                }
            }
            say('Ни один селектор не дал карточек');
            return [];
        }

        function processTorrents() {
            var items = findCards();

            items.forEach(function (item, i) {
                if (item.dataset.k4sdrDone) return;

                // Заголовок
                var titleEl = item.querySelector('.torrent-item__title') ||
                              item.querySelector('[class*="torrent-item__title"]');
                var title = titleEl ? titleEl.innerText : '';

                // .m-resolution
                var resolutionEls = item.querySelectorAll('.m-resolution, [class*="m-resolution"]');
                var resTexts = [];
                resolutionEls.forEach(function (r) { resTexts.push((r.innerText || '').trim()); });

                var has4K = resTexts.some(function (t) { return /^4K$/i.test(t) || /2160/i.test(t); });
                if (!has4K && /(4K|2160p|UHD)/i.test(title)) has4K = true;

                var isHDR = resTexts.some(function (t) { return /HDR|Dolby|DoVi|\bDV\b/i.test(t); });
                if (!isHDR && /(HDR10\+?|HDR|Dolby\s*Vision|DoVi|\bDV\b)/i.test(title)) isHDR = true;

                // Сиды — сначала по span, потом регуляркой из всего блока
                var seedsEl = item.querySelector('.torrent-item__seeds span') ||
                              item.querySelector('[class*="torrent-item__seeds"] span');
                var seeds = seedsEl ? parseInt(seedsEl.innerText, 10) : NaN;
                if (isNaN(seeds)) {
                    var seedsBlock = item.querySelector('.torrent-item__seeds, [class*="torrent-item__seeds"]');
                    if (seedsBlock) {
                        var m = (seedsBlock.innerText || '').match(/(\d+)/);
                        if (m) seeds = parseInt(m[1], 10);
                    }
                }

                say('#' + i +
                    ' 4K=' + has4K +
                    ' HDR=' + isHDR +
                    ' seeds=' + seeds +
                    ' res=[' + resTexts.join(',') + '] ' +
                    title.substring(0, 40));

                if (!has4K || isHDR || isNaN(seeds) || seeds < 1) return;

                item.dataset.k4sdrDone = 'true';
                addBadge(item);
                say('>>> БЕЙДЖ: ' + title.substring(0, 50));
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
                'position:absolute','top:6px','right:6px',
                'background:linear-gradient(135deg,#43a047,#2e7d32)','color:#fff',
                'padding:3px 10px','border-radius:6px','font-size:12px','font-weight:700',
                'z-index:50','box-shadow:0 2px 6px rgba(0,0,0,.6)','pointer-events:none',
                'text-transform:uppercase'
            ].join(';');
            item.appendChild(badge);
        }

        var observer = new MutationObserver(function () { processTorrents(); });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(processTorrents, 1000);
        setInterval(processTorrents, 2000);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') startPlugin();
    });
})();
