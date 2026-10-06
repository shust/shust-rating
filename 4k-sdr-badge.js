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
        // HDR10+, HDR10, HDR 10, HDR, Dolby Vision, DV (отдельным словом), HLG
        return /(HDR10\+|HDR10|HDR\s*10|HDR|DOLBY\s*VISION|\bDV\b|\bHLG\b)/.test(t);
    }

    // Проверка: является ли раздача 4K (по названию или по бейджу)
    function is4K(text, badgeContainer) {
        if (text && /(\b4K\b|2160P|UHD)/i.test(text)) return true;
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

            // 1. Это 4K?
            var is4k = is4K(title, block);
            if (!is4k) {
                // Не 4K — помечаем, чтобы больше не дёргать эту раздачу
                item.dataset.sdrProcessed = '1';
                return;
            }

            // 2. Есть ли признаки HDR?
            var blockText = block.textContent || '';
            var itemText  = item.textContent  || '';

            var titleHasHDR = hasHDR(title);
            var blockHasHDR = hasHDR(blockText);
            var itemHasHDR  = hasHDR(itemText);

            var hasHdrBadge = false;
            var res4kBadge = null;
            var badges = block.querySelectorAll('.m-resolution');
            badges.forEach(function (b) {
                var txt = b.textContent.trim().toUpperCase();
                if (txt === 'HDR') hasHdrBadge = true;
                if (txt === '4K') res4kBadge = b;
            });

            // 3. SDR = нет ни одного признака HDR
            var isSDR = !titleHasHDR && !blockHasHDR && !itemHasHDR && !hasHdrBadge;

            if (isSDR && res4kBadge) {
                res4kBadge.textContent = '4K SDR';
                res4kBadge.classList.add('m-resolution--sdr');
                changed++;
            }

            item.dataset.sdrProcessed = '1';
        });

        return changed;
    }

    // Многократный прогон — на случай поздней подгрузки
    function runRepeatedly() {
        var tries = 0;
        var maxTries = 10; // 10 попыток × 500 мс = 5 секунд
        var timer = setInterval(function () {
            tries++;
            processTorrents();
            if (tries >= maxTries) {
                clearInterval(timer);
            }
        }, 500);
    }

    function init() {
        injectStyles();

        // Первый прогон сразу и через короткие интервалы
        setTimeout(processTorrents, 300);
        setTimeout(processTorrents, 1000);
        setTimeout(processTorrents, 2000);
        runRepeatedly();

        // Следим за изменениями DOM (переключение вкладок, обновление списка)
        var observer = new MutationObserver(function (mutations) {
            var need = false;
            mutations.forEach(function (m) {
                if (m.addedNodes.length > 0) need = true;
            });
            if (need) processTorrents();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Обработка кликов/фокуса — Lampa может перерисовывать список
        document.addEventListener('click', function () {
            setTimeout(processTorrents, 150);
        }, true);

        // Клавиатура (пульт ТВ)
        document.addEventListener('keyup', function (e) {
            // Стрелки, Enter — основные клавиши навигации
            if ([37, 38, 39, 40, 13].indexOf(e.keyCode) !== -1) {
                setTimeout(processTorrents, 150);
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
