(function () {
    'use strict';

    var PLUGIN_ID = 'rating_icons_toggle';
    var SETTING = 'rating_icons_show';
    var HIDE_CLASS = 'lampa-rating-provider-icon-hidden';
    var BODY_CLASS = 'lampa-rating-provider-icons-off';
    var observer = null;
    var scanTimer = null;

    function boolValue(value, fallback) {
        if (value === undefined || value === null) return fallback;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return fallback;
    }

    function addStyles() {
        if (document.getElementById('lampa-rating-icons-toggle-style')) return;

        var style = document.createElement('style');
        style.id = 'lampa-rating-icons-toggle-style';
        style.textContent = [
            '.' + HIDE_CLASS + '{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;max-width:0!important;margin:0!important;padding:0!important;}',

            /* Common rating layouts: hide image/SVG provider badges, never the rating container itself */
            'body.' + BODY_CLASS + ' .card__rate img,',
            'body.' + BODY_CLASS + ' .card__rate svg,',
            'body.' + BODY_CLASS + ' .full-start__rate img,',
            'body.' + BODY_CLASS + ' .full-start__rate svg,',
            'body.' + BODY_CLASS + ' [class*="rating"] img,',
            'body.' + BODY_CLASS + ' [class*="rating"] svg,',
            'body.' + BODY_CLASS + ' [class*="rate"] img,',
            'body.' + BODY_CLASS + ' [class*="rate"] svg{display:none!important;}',

            /* Providers commonly used by Lampa rating plugins */
            'body.' + BODY_CLASS + ' [class*="imdb" i]::before,',
            'body.' + BODY_CLASS + ' [class*="imdb" i]::after,',
            'body.' + BODY_CLASS + ' [class*="kinopoisk" i]::before,',
            'body.' + BODY_CLASS + ' [class*="kinopoisk" i]::after,',
            'body.' + BODY_CLASS + ' [class*="kp-rate" i]::before,',
            'body.' + BODY_CLASS + ' [class*="kp-rate" i]::after,',
            'body.' + BODY_CLASS + ' [class*="tmdb" i]::before,',
            'body.' + BODY_CLASS + ' [class*="tmdb" i]::after,',
            'body.' + BODY_CLASS + ' [class*="metacritic" i]::before,',
            'body.' + BODY_CLASS + ' [class*="metacritic" i]::after,',
            'body.' + BODY_CLASS + ' [class*="letterboxd" i]::before,',
            'body.' + BODY_CLASS + ' [class*="letterboxd" i]::after{display:none!important;content:none!important;background:none!important;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function isRatingContainer(el) {
        if (!el || el.nodeType !== 1) return false;
        var cls = String(el.className || '').toLowerCase();
        return cls.indexOf('rate') !== -1 || cls.indexOf('rating') !== -1;
    }

    function providerHint(el) {
        if (!el || el.nodeType !== 1) return false;
        var s = [
            el.className || '',
            el.id || '',
            el.getAttribute('alt') || '',
            el.getAttribute('title') || '',
            el.getAttribute('aria-label') || '',
            el.getAttribute('data-source') || '',
            el.getAttribute('data-provider') || ''
        ].join(' ').toLowerCase();

        return /(imdb|kinopoisk|кино?поиск|\bkp\b|tmdb|rottentomatoes|rotten|metacritic|letterboxd|trakt|mdblist|shikimori|myshows|rating[-_]?logo|rate[-_]?logo)/i.test(s);
    }

    function hasNumericRating(text) {
        text = String(text || '').replace(/\s+/g, ' ').trim();
        return /\d(?:[\.,]\d)?/.test(text);
    }

    function markIcons(root) {
        if (!root || !root.querySelectorAll) return;

        var containers = [];
        if (isRatingContainer(root)) containers.push(root);

        var found = root.querySelectorAll('.card__rate,.full-start__rate,[class*="rating"],[class*="rate"]');
        for (var i = 0; i < found.length; i++) containers.push(found[i]);

        for (var c = 0; c < containers.length; c++) {
            var box = containers[c];
            if (!box || !box.querySelectorAll) continue;

            /* Images/SVGs inside a rating badge are provider artwork in the common plugins. */
            var graphics = box.querySelectorAll('img,svg,picture');
            for (var g = 0; g < graphics.length; g++) graphics[g].classList.add(HIDE_CLASS);

            /* Handle icon spans/divs rendered with a CSS background image. */
            var children = box.querySelectorAll('span,i,b,em,div');
            for (var j = 0; j < children.length; j++) {
                var child = children[j];
                if (child === box) continue;

                if (providerHint(child)) {
                    /* Keep an element if it itself contains the numeric score. */
                    if (!hasNumericRating(child.textContent)) child.classList.add(HIDE_CLASS);
                    continue;
                }

                try {
                    var cs = window.getComputedStyle(child);
                    var bg = cs && cs.backgroundImage ? cs.backgroundImage : 'none';
                    if (bg !== 'none' && !hasNumericRating(child.textContent)) {
                        var rect = child.getBoundingClientRect();
                        if (rect.width <= 90 && rect.height <= 90) child.classList.add(HIDE_CLASS);
                    }
                } catch (e) {}
            }
        }
    }

    function clearMarks() {
        var marked = document.querySelectorAll('.' + HIDE_CLASS);
        for (var i = 0; i < marked.length; i++) marked[i].classList.remove(HIDE_CLASS);
    }

    function iconsEnabled() {
        return boolValue(Lampa.Storage.get(SETTING, true), true);
    }

    function applySetting() {
        addStyles();

        if (iconsEnabled()) {
            document.body.classList.remove(BODY_CLASS);
            clearMarks();
        } else {
            document.body.classList.add(BODY_CLASS);
            markIcons(document.body);
        }
    }

    function observeDom() {
        if (observer || typeof MutationObserver === 'undefined') return;

        observer = new MutationObserver(function (mutations) {
            if (iconsEnabled()) return;

            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes || [];
                for (var j = 0; j < nodes.length; j++) {
                    if (nodes[j] && nodes[j].nodeType === 1) markIcons(nodes[j]);
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function rescanBurst() {
        if (scanTimer) clearInterval(scanTimer);
        var count = 0;
        scanTimer = setInterval(function () {
            applySetting();
            count++;
            if (count >= 12) {
                clearInterval(scanTimer);
                scanTimer = null;
            }
        }, 500);
    }

    function startPlugin() {
        if (window.__lampa_rating_icons_toggle_loaded) return;
        window.__lampa_rating_icons_toggle_loaded = true;

        if (Lampa.Manifest && Lampa.Manifest.plugins) {
            Lampa.Manifest.plugins = {
                type: 'other',
                version: '1.0.0',
                name: 'Иконки рейтингов',
                description: 'Показывать или скрывать логотипы IMDb, Кинопоиска и других источников возле рейтинга',
                component: PLUGIN_ID
            };
        }

        /* The switch is placed directly in Settings -> Interface. */
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: SETTING,
                type: 'trigger',
                'default': true
            },
            field: {
                name: 'Иконки возле рейтинга',
                description: 'Показывать логотипы IMDb, Кинопоиска и других источников рядом с цифрами рейтинга'
            },
            onChange: function () {
                setTimeout(function () {
                    applySetting();
                    rescanBurst();
                }, 50);
            }
        });

        Lampa.Storage.listener.follow('change', function (event) {
            if (!event) return;
            if (event.name === SETTING || event.name === 'activity') {
                setTimeout(function () {
                    applySetting();
                    if (!iconsEnabled()) rescanBurst();
                }, event.name === 'activity' ? 350 : 30);
            }
        });

        addStyles();
        applySetting();
        observeDom();
        rescanBurst();
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
