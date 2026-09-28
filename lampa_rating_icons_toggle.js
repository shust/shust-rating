(function () {
    'use strict';

    var PLUGIN_ID = 'rating_icons_toggle';
    var SETTING = 'rating_icons_show';
    var STYLE_ID = 'lampa-rating-icons-toggle-style';
    var HIDE_CLASS = 'lampa-rating-provider-icon-hidden';
    var observer = null;
    var rescanTimer = null;

    function boolValue(value, fallback) {
        if (value === undefined || value === null) return fallback;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return fallback;
    }

    function iconsEnabled() {
        return boolValue(Lampa.Storage.get(SETTING, true), true);
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            /* Only elements explicitly marked by this plugin are hidden. */
            '.' + HIDE_CLASS + '{',
            '  display:none!important;',
            '  visibility:hidden!important;',
            '  width:0!important;',
            '  min-width:0!important;',
            '  max-width:0!important;',
            '  height:0!important;',
            '  min-height:0!important;',
            '  max-height:0!important;',
            '  margin:0!important;',
            '  padding:0!important;',
            '  border:0!important;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function providerHint(el) {
        if (!el || el.nodeType !== 1) return false;

        var attrs = [
            el.className || '',
            el.id || '',
            el.getAttribute('alt') || '',
            el.getAttribute('title') || '',
            el.getAttribute('aria-label') || '',
            el.getAttribute('data-source') || '',
            el.getAttribute('data-provider') || '',
            el.getAttribute('src') || ''
        ].join(' ').toLowerCase();

        return /(imdb|kinopoisk|kinopoisk|кинопоиск|kp[_-]?(?:logo|rate|rating)|tmdb|rottentomatoes|rotten[_-]?tomatoes|metacritic|letterboxd|trakt|mdblist|shikimori|myshows|rating[_-]?logo|rate[_-]?logo)/i.test(attrs);
    }

    function hasNumericRating(text) {
        return /\d(?:[\.,]\d)?/.test(String(text || '').replace(/\s+/g, ' ').trim());
    }

    function isCard(el) {
        return !!(el && el.nodeType === 1 && el.matches && el.matches('.card, .card--small, .card--wide, [class~="card"]'));
    }

    function closestCard(el) {
        if (!el || el.nodeType !== 1) return null;
        if (isCard(el)) return el;
        return el.closest ? el.closest('.card, .card--small, .card--wide, [class~="card"]') : null;
    }

    /*
     * IMPORTANT: We only inspect rating areas that live INSIDE movie/series cards.
     * Nothing in menus, settings, buttons, player controls, posters, etc. is scanned.
     */
    function ratingBoxes(card) {
        if (!card || !card.querySelectorAll) return [];

        var selectors = [
            '.card__rate',
            '.card__rating',
            '.card__vote',
            '.card__vote-rate',
            '.card__vote-number',
            '[class^="card__rate-"]',
            '[class*=" card__rate-"]',
            '[class^="card__rating-"]',
            '[class*=" card__rating-"]'
        ].join(',');

        return Array.prototype.slice.call(card.querySelectorAll(selectors));
    }

    function markProviderIconsInBox(box) {
        if (!box || !box.querySelectorAll) return;

        /* Provider logos rendered as images/SVGs inside the rating badge. */
        var graphics = box.querySelectorAll('img,svg,picture');
        for (var i = 0; i < graphics.length; i++) {
            var graphic = graphics[i];

            /* In card rating boxes, small graphics are provider icons. Never touch poster images. */
            var rect = null;
            try { rect = graphic.getBoundingClientRect(); } catch (e) {}

            var smallGraphic = !rect || ((rect.width || 0) <= 80 && (rect.height || 0) <= 80);
            if (providerHint(graphic) || smallGraphic) graphic.classList.add(HIDE_CLASS);
        }

        /* Provider logos may be spans/divs with background-image or pseudo-element. */
        var children = box.querySelectorAll('span,i,b,em,div');
        for (var j = 0; j < children.length; j++) {
            var child = children[j];
            if (hasNumericRating(child.textContent)) continue;

            if (providerHint(child)) {
                child.classList.add(HIDE_CLASS);
                continue;
            }

            try {
                var cs = window.getComputedStyle(child);
                var bg = cs && cs.backgroundImage ? cs.backgroundImage : 'none';
                var rect2 = child.getBoundingClientRect();

                /* Only tiny background-image elements inside a known card rating box. */
                if (bg !== 'none' && rect2.width <= 80 && rect2.height <= 80) {
                    child.classList.add(HIDE_CLASS);
                }
            } catch (e2) {}
        }
    }

    function scanCard(card) {
        if (!card || !card.querySelectorAll) return;
        var boxes = ratingBoxes(card);
        for (var i = 0; i < boxes.length; i++) markProviderIconsInBox(boxes[i]);
    }

    function scan(root) {
        if (iconsEnabled() || !root || !root.querySelectorAll) return;

        var ownCard = closestCard(root);
        if (ownCard) scanCard(ownCard);

        var cards = root.querySelectorAll('.card, .card--small, .card--wide, [class~="card"]');
        for (var i = 0; i < cards.length; i++) scanCard(cards[i]);
    }

    function clearMarks() {
        var marked = document.querySelectorAll('.' + HIDE_CLASS);
        for (var i = 0; i < marked.length; i++) marked[i].classList.remove(HIDE_CLASS);
    }

    function applySetting() {
        addStyles();
        clearMarks();
        if (!iconsEnabled()) scan(document.body);
    }

    function observeDom() {
        if (observer || typeof MutationObserver === 'undefined' || !document.body) return;

        observer = new MutationObserver(function (mutations) {
            if (iconsEnabled()) return;

            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes || [];
                for (var j = 0; j < nodes.length; j++) {
                    if (nodes[j] && nodes[j].nodeType === 1) scan(nodes[j]);
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function rescanBurst() {
        if (rescanTimer) clearInterval(rescanTimer);
        var n = 0;
        rescanTimer = setInterval(function () {
            if (!iconsEnabled()) scan(document.body);
            n++;
            if (n >= 10) {
                clearInterval(rescanTimer);
                rescanTimer = null;
            }
        }, 500);
    }

    function startPlugin() {
        if (window.__lampa_rating_icons_toggle_fixed_loaded) return;
        window.__lampa_rating_icons_toggle_fixed_loaded = true;

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: SETTING,
                type: 'trigger',
                'default': true
            },
            field: {
                name: 'Иконки возле рейтинга',
                description: 'Показывать логотипы IMDb, Кинопоиска и других источников только на карточках фильмов и сериалов'
            },
            onChange: function () {
                setTimeout(function () {
                    applySetting();
                    rescanBurst();
                }, 50);
            }
        });

        if (Lampa.Storage && Lampa.Storage.listener && Lampa.Storage.listener.follow) {
            Lampa.Storage.listener.follow('change', function (event) {
                if (!event) return;
                if (event.name === SETTING || event.name === 'activity') {
                    setTimeout(function () {
                        applySetting();
                        if (!iconsEnabled()) rescanBurst();
                    }, event.name === 'activity' ? 300 : 30);
                }
            });
        }

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
