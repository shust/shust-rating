(function () {
    'use strict';

    var styleId = 'lampa-4k-sdr-badge-style';
    var css = `
        /* Стиль для бейджа 4K SDR */
        .m-resolution.m-resolution--sdr {
            background-color: rgba(255, 255, 255, 0.85) !important;
            color: #1d1f20 !important;
            font-weight: 700 !important;
            border: none !important;
        }
    `;

    function injectStyles() {
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // Признаки HDR в строке
    function hasHDR(text) {
        if (!text) return false;
        var t = text.toUpperCase();
        return /(HDR10\+|HDR10|HDR\s*10|HDR|DOLBY\s*VISION|\bDV\b|\bHLG\b)/.test(t);
    }

    // Признак SDR в строке
    function hasSDR(text) {
        if (!text) return false;
        return /\bSDR\b/.test(text.toUpperCase());
    }

    // 4K ли раздача
    function is4K(name, badgeContainer) {
        if (name && /(\b4K\b|2160P|UHD)/i.test(name)) return true;
        if (!badgeContainer) return false;
        var resolutions = badgeContainer.querySelectorAll('.m-resolution');
        var found = false;
        resolutions.forEach(function (r) {
            if (r.textContent.trim().toUpperCase() === '4K') found = true;
        });
        return found;
    }

    function processTorrents() {
        var items = document.querySelectorAll('.torrent-item');
        var changed = 0;

        items.forEach(function (item) {
            if (item.dataset.sdrProcessed === '1') return;

            var titleEl = item.querySelector('.torrent-item__title');
            var title = titleEl ? titleEl.textContent : '';

            var block = item.querySelector('.torrent-item__ffprobe');
            if (!block) return;

            var is4k = is4K(title, block);
            if (!is4k) {
                item.dataset.sdrProcessed = '1';
                return;
            }

            // Признак HDR только в названии — защита от ложных SDR
            var titleHasHDR = hasHDR(title);

            // Ищем бейдж 4K и бейдж HDR
            var hasHdrBadge = false;
            var res4kBadge = null;
            var badges = block.querySelectorAll('.m-resolution');
            badges.forEach(function (b) {
                var txt = b.textContent.trim().toUpperCase();
                if (txt === 'HDR') hasHdrBadge = true;
                if (txt === '4K') res4kBadge = b;
            });

            if (!res4kBadge) {
                item.dataset.sdrProcessed = '1';
                return;
            }

            // Логика из первой (рабочей) версии:
            // SDR либо явно указан в названии, либо отсутствует HDR в бейджах.
            // Но если в НАЗВАНИИ есть HDR — никогда не SDR.
            var sdrByName  = hasSDR(title) && !titleHasHDR;
            var sdrByBadge = !hasHdrBadge;

            if (titleHasHDR) {
                // Точный HDR по названию — не трогаем
                item.dataset.sdrProcessed = '1';
                return;
            }

            if (sdrByName || sdrByBadge) {
                res4kBadge.textContent = '4K SDR';
                res4kBadge.classList.add('m-resolution--sdr');
                changed++;
            }

            item.dataset.sdrProcessed = '1';
        });

        return changed;
    }

    function init() {
        injectStyles();

        setTimeout(processTorrents, 300);
        setTimeout(processTorrents, 1000);
        setTimeout(processTorrents, 2500);

        var observer = new MutationObserver(function (mutations) {
            var need = false;
            mutations.forEach(function (m) {
                if (m.addedNodes.length > 0) need = true;
            });
            if (need) processTorrents();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
