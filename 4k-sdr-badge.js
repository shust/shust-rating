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

    // Универсальная обработка одного контейнера раздачи
    function processItem(item, titleSelector, blockSelector) {
        if (item.dataset.sdrProcessed === '1') return;

        var titleEl = item.querySelector(titleSelector);
        var title = titleEl ? titleEl.textContent : '';

        // Контейнер с бейджами может называться по-разному,
        // поэтому ищем его гибко
        var block = item.querySelector(blockSelector);
        if (!block) {
            // Запасной вариант — взять любой из известных контейнеров
            block = item.querySelector('.torrent-item__ffprobe, .torrent-serial__ffprobe, .torrent-serial__info');
        }
        if (!block) return;

        // 1. Это 4K?
        var is4k = is4K(title, block);
        if (!is4k) return;

        // 2. Есть ли признаки HDR? Проверяем везде
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

        // Если бейдж 4K не нашли в основном блоке — попробуем найти во всём item
        if (!res4kBadge) {
            var allBadges = item.querySelectorAll('.m-resolution');
            allBadges.forEach(function (b) {
                var txt = b.textContent.trim().toUpperCase();
                if (txt === 'HDR') hasHdrBadge = true;
                if (txt === '4K' && !res4kBadge) res4kBadge = b;
            });
        }

        // 3. SDR = нет ни одного признака HDR
        var isSDR = !titleHasHDR && !blockHasHDR && !itemHasHDR && !hasHdrBadge;

        if (isSDR && res4kBadge) {
            res4kBadge.textContent = '4K SDR';
            res4kBadge.classList.add('m-resolution--sdr');
            item.dataset.sdrProcessed = '1';
        }
    }

    function processTorrents() {
        // Обычные торренты (фильмы)
        document.querySelectorAll('.torrent-item').forEach(function (item) {
            processItem(item, '.torrent-item__title', '.torrent-item__ffprobe');
        });

        // Сериальные торренты
        document.querySelectorAll('.torrent-serial').forEach(function (item) {
            processItem(item, '.torrent-serial__title, .torrent-item__title', '.torrent-serial__ffprobe, .torrent-serial__info');
        });
    }

    function init() {
        injectStyles();
        setTimeout(processTorrents, 500);
        setTimeout(processTorrents, 1500); // на случай поздней подгрузки

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
