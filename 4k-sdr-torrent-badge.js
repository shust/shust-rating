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

    // Проверка признаков HDR в строке
    function hasHDR(text) {
        if (!text) return false;
        var t = text.toUpperCase();
        // Ищем HDR, HDR10, HDR10+, Dolby Vision, DV (как отдельное слово), HLG
        return /(HDR10\+|HDR10|HDR|DOLBY\s*VISION|\bDV\b|HLG)/.test(t);
    }

    // Проверка признака SDR в строке
    function hasSDR(text) {
        if (!text) return false;
        return /\bSDR\b/.test(text.toUpperCase());
    }

    // Проверка: является ли раздача 4K (по названию или по бейджу)
    function is4K(name, block) {
        // 1. По названию
        if (name && /\b4K\b|2160P|UHD/i.test(name)) return true;
        // 2. По бейджу разрешения
        var resolutions = block.querySelectorAll('.m-resolution');
        var found = false;
        resolutions.forEach(function (r) {
            if (r.textContent.trim().toUpperCase() === '4K') found = true;
        });
        return found;
    }

    function processTorrents() {
        var items = document.querySelectorAll('.torrent-item');

        items.forEach(function (item) {
            // Пропускаем уже обработанные
            if (item.dataset.sdrProcessed === '1') return;

            var titleEl = item.querySelector('.torrent-item__title');
            var title = titleEl ? titleEl.textContent : '';

            var block = item.querySelector('.torrent-item__ffprobe');
            if (!block) return;

            // Условие: это 4K, в названии есть SDR, и нет признаков HDR
            var is4k = is4K(title, block);
            var sdrByName = hasSDR(title) && !hasHDR(title);

            // Запасной вариант: 4K-бейдж есть, HDR-бейджа нет
            var badges = block.querySelectorAll('.m-resolution');
            var hasHdrBadge = false;
            var res4kBadge = null;
            badges.forEach(function (b) {
                var txt = b.textContent.trim().toUpperCase();
                if (txt === 'HDR') hasHdrBadge = true;
                if (txt === '4K') res4kBadge = b;
            });

            var sdrByBadge = res4kBadge && !hasHdrBadge;

            if (is4k && (sdrByName || sdrByBadge) && res4kBadge) {
                res4kBadge.textContent = '4K SDR';
                res4kBadge.classList.add('m-resolution--sdr');
                item.dataset.sdrProcessed = '1';
            }
        });
    }

    function init() {
        injectStyles();
        setTimeout(processTorrents, 500);

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