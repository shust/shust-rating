(function () {
    'use strict';

    var styleId = 'lampa-4k-sdr-badge-style';
    var css = `
        /* ===== Стиль для бейджа 4K SDR ===== */
        .m-resolution.m-resolution--sdr {
            background-color: rgba(255, 255, 255, 0.85) !important;
            color: #1d1f20 !important;
            font-weight: 700 !important;
            border: none !important;

            /* Фикс разметки */
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            flex: 0 0 auto !important;
            align-self: flex-start !important;
            margin: 0 !important;
            padding: 0 0.4em !important;
            min-width: 2.6em !important;
            box-sizing: border-box !important;
            line-height: 1.6 !important;
        }

        /* Контейнер бейджей: прижимаем элементы к верху,
           чтобы длинный бейдж не растягивал строку по вертикали */
        .torrent-item__ffprobe {
            align-items: flex-start !important;
        }

        /* Убираем лишний отступ у бейджа, идущего сразу после 4K SDR */
        .m-resolution.m-resolution--sdr + .m-video {
            margin-left: 0 !important;
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
        return /(HDR10\+|HDR10|HDR|DOLBY\s*VISION|\bDV\b|HLG)/.test(t);
    }

    // Проверка признака SDR в строке
    function hasSDR(text) {
        if (!text) return false;
        return /\bSDR\b/.test(text.toUpperCase());
    }

    // Проверка: является ли раздача 4K
    function is4K(name, block) {
        if (name && /(\b4K\b|2160P|UHD)/i.test(name)) return true;
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
            if (item.dataset.sdrProcessed === '1') return;

            var titleEl = item.querySelector('.torrent-item__title');
            var title = titleEl ? titleEl.textContent : '';

            var block = item.querySelector('.torrent-item__ffprobe');
            if (!block) return;

            var is4k = is4K(title, block);
            var sdrByName = hasSDR(title) && !hasHDR(title);

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
