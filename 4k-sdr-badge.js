(function () {
    'use strict';

    var DEBUG = true; // ← включить отладку в консоли

    var styleId = 'lampa-4k-sdr-badge-style';
    var css = `
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

    function hasHDR(text) {
        if (!text) return false;
        var t = text.toUpperCase();
        return /(HDR10\+|HDR10|HDR\s*10|HDR|DOLBY\s*VISION|\bDV\b|\bHLG\b)/.test(t);
    }

    function hasSDR(text) {
        if (!text) return false;
        return /\bSDR\b/.test(text.toUpperCase());
    }

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

        if (DEBUG) console.log('[4k-sdr] processTorrents: найдено .torrent-item =', items.length);

        items.forEach(function (item, idx) {
            if (item.dataset.sdrProcessed === '1') {
                if (DEBUG) console.log('[4k-sdr] #' + idx + ' уже обработано, пропуск');
                return;
            }

            var titleEl = item.querySelector('.torrent-item__title');
            var title = titleEl ? titleEl.textContent : '';

            var block = item.querySelector('.torrent-item__ffprobe');
            if (!block) {
                if (DEBUG) console.log('[4k-sdr] #' + idx + ' нет .torrent-item__ffprobe');
                return;
            }

            var is4k = is4K(title, block);
            var titleHasHDR = hasHDR(title);
            var titleHasSDR = hasSDR(title);

            var hasHdrBadge = false;
            var res4kBadge = null;
            var badgeTexts = [];
            block.querySelectorAll('.m-resolution').forEach(function (b) {
                var txt = b.textContent.trim().toUpperCase();
                badgeTexts.push(txt);
                if (txt === 'HDR') hasHdrBadge = true;
                if (txt === '4K') res4kBadge = b;
            });

            if (DEBUG) {
                console.log('[4k-sdr] #' + idx, {
                    title: title.substring(0, 80) + '...',
                    is4k: is4k,
                    titleHasHDR: titleHasHDR,
                    titleHasSDR: titleHasSDR,
                    hasHdrBadge: hasHdrBadge,
                    has4kBadge: !!res4kBadge,
                    badges: badgeTexts
                });
            }

            if (!is4k || !res4kBadge) {
                item.dataset.sdrProcessed = '1';
                return;
            }

            var sdrByName = titleHasSDR && !titleHasHDR;
            var sdrByBadge = !hasHdrBadge;

            if (titleHasHDR) {
                if (DEBUG) console.log('[4k-sdr] #' + idx + ' → HDR по названию, не трогаем');
                item.dataset.sdrProcessed = '1';
                return;
            }

            if (sdrByName || sdrByBadge) {
                res4kBadge.textContent = '4K SDR';
                res4kBadge.classList.add('m-resolution--sdr');
                changed++;
                if (DEBUG) console.log('[4k-sdr] #' + idx + ' → ПОМЕЧЕНО как 4K SDR');
            }

            item.dataset.sdrProcessed = '1';
        });

        if (DEBUG) console.log('[4k-sdr] изменено:', changed);
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

    // Ручной триггер для отладки
    window.__4kSdrDebug = function () {
        document.querySelectorAll('.torrent-item').forEach(function (x) {
            delete x.dataset.sdrProcessed;
        });
        return processTorrents();
    };

})();
