(function () {
    'use strict';

    var PLUGIN = 'episode-torrent-control';
    var LONG_PRESS_MS = 700;

    var longPressed = false;
    var longPressTimer = null;
    var currentFilter = null;        // { season, episode }
    var filterObserver = null;

    function log() {
        console.log.apply(console, ['[' + PLUGIN + ']'].concat([].slice.call(arguments)));
    }

    // ================= УТИЛИТЫ =================

    function getActiveCard() {
        try {
            if (window.Lampa && Lampa.Activity && Lampa.Activity.active) {
                var a = Lampa.Activity.active();
                return (a && (a.card || a.movie)) || null;
            }
        } catch (e) {}
        return null;
    }

    function findSeason(el) {
        var line = el.closest ? el.closest('.items-line') : null;
        if (!line) return null;
        var t = line.querySelector('.items-line__title');
        if (!t) return null;
        var m = t.textContent.trim().match(/Сезон\s+(\d+)/i);
        return m ? parseInt(m[1], 10) : null;
    }

    function getEpNum(el) {
        var n = el.querySelector('.full-episode__num');
        if (!n) return null;
        var v = parseInt(n.textContent.trim(), 10);
        return isNaN(v) ? null : v;
    }

    function getEpName(el) {
        var n = el.querySelector('.full-episode__name');
        return n ? n.textContent.trim() : '';
    }

    function getFocusedEpisode() {
        return document.querySelector('.full-episode--small.focus')
            || document.querySelector('.full-episode.focus')
            || document.querySelector('.full-episode--small.hover');
    }

    // ================= ДИАГНОСТИКА =================

    function diagnoseLampa() {
        if (!window.Lampa) {
            log('DIAG: Lampa not defined');
            return;
        }
        log('DIAG Lampa keys:', Object.keys(Lampa).join(', '));
        log('DIAG Lampa.Parser:', Lampa.Parser ? Object.keys(Lampa.Parser).join(', ') : 'no');
        log('DIAG Lampa.Torrent:', Lampa.Torrent ? Object.keys(Lampa.Torrent).join(', ') : 'no');
        log('DIAG Lampa.Activity:', Lampa.Activity ? Object.keys(Lampa.Activity).join(', ') : 'no');
        log('DIAG Lampa.Controller:', Lampa.Controller ? Object.keys(Lampa.Controller).join(', ') : 'no');
        log('DIAG Lampa.Select:', Lampa.Select ? Object.keys(Lampa.Select).join(', ') : 'no');

        // Активный контроллер
        try {
            if (Lampa.Controller && Lampa.Controller.enabled) {
                var en = Lampa.Controller.enabled();
                log('DIAG enabled controller:', en && en.name ? en.name : en);
            }
        } catch (e) { log('DIAG enabled error', e); }

        // Проверка типов ключевых методов
        if (Lampa.Parser) {
            log('DIAG typeof Parser.open:', typeof Lampa.Parser.open);
        }
        if (Lampa.Torrent) {
            log('DIAG typeof Torrent.open:', typeof Lampa.Torrent.open);
        }
        if (Lampa.Activity) {
            log('DIAG typeof Activity.push:', typeof Lampa.Activity.push);
        }
    }

    // ================= ОТКРЫТИЕ ТОРРЕНТОВ =================

    function openTorrents(season, episode) {
        log('open torrents S' + season + 'E' + episode);

        var card = getActiveCard();
        if (!card) {
            log('no active card');
            return;
        }

        season  = parseInt(season, 10)  || 1;
        episode = parseInt(episode, 10) || 1;

        // Контекст в карточку и активность
        card.season  = season;
        card.episode = episode;

        try {
            var a = Lampa.Activity.active();
            if (a) {
                a.season  = season;
                a.episode = episode;
                if (a.card)  { a.card.season  = season; a.card.episode  = episode; }
                if (a.movie) { a.movie.season = season; a.movie.episode = episode; }
            }
        } catch (e) {}

        if (card.hash && typeof card.hash !== 'string') {
            log('WARN: card.hash is not a string, resetting');
            delete card.hash;
        }

        // --- 1. Прямой вызов API Lampa ---
        try {
            if (window.Lampa) {
                // Parser.open
                if (Lampa.Parser && typeof Lampa.Parser.open === 'function') {
                    log('using Lampa.Parser.open');
                    Lampa.Parser.open({
                        movie: card,
                        season: season,
                        episode: episode
                    });
                    setTorrentFilter(season, episode);
                    return;
                }
                // Torrent.open
                if (Lampa.Torrent && typeof Lampa.Torrent.open === 'function') {
                    log('using Lampa.Torrent.open');
                    Lampa.Torrent.open(card, { season: season, episode: episode });
                    setTorrentFilter(season, episode);
                    return;
                }
                // Activity.push
                if (Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                    log('using Lampa.Activity.push torrents');
                    Lampa.Activity.push({
                        url: '',
                        component: 'torrents',
                        title: 'Торренты',
                        movie: card,
                        season: season,
                        episode: episode
                    });
                    setTorrentFilter(season, episode);
                    return;
                }
            }
        } catch (e) {
            log('native open failed', e);
        }

        // --- 2. Фолбэк: клик по нативной кнопке торрентов ---
        var btn = document.querySelector('.full-start__button.view--torrent')
               || document.querySelector('.full-start__button.button--priority')
               || document.querySelector('.full-start__button.view--online');

        if (btn) {
            log('fallback: click native torrent button');
            try { btn.click(); } catch (e) { log('btn.click error', e); }
            setTorrentFilter(season, episode);
            return;
        }

        log('torrent button not found');
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show('Не удалось открыть торренты');
    }

    // ================= ФИЛЬТР ТОРРЕНТОВ =================

    function parseTorrentRange(item) {
        var gen = item.querySelector('.m-general');
        if (gen) {
            var divs = gen.querySelectorAll('div');
            var season = null, from = null, to = null;

            if (divs[0]) {
                var sm = divs[0].textContent.trim().match(/S(\d+)/i);
                if (sm) season = parseInt(sm[1], 10);
            }
            if (divs[1]) {
                var e = divs[1].textContent.trim();
                var rm = e.match(/^(\d+)\s*[-–]\s*(\d+)$/);
                if (rm) {
                    from = parseInt(rm[1], 10);
                    to   = parseInt(rm[2], 10);
                } else {
                    var single = parseInt(e, 10);
                    if (!isNaN(single)) { from = single; to = single; }
                }
            }
            if (season !== null) return { season: season, from: from, to: to };
        }

        // Fallback: из title
        var title = item.querySelector('.torrent-item__title');
        if (!title) return null;
        var t = title.textContent;

        var season = null, from = null, to = null;

        var m1 = t.match(/(\d+)\s*сезон/i);
        if (m1) season = parseInt(m1[1], 10);

        var m2 = t.match(/(\d+)\s*[хx]\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
        if (m2) {
            if (season === null) season = parseInt(m2[1], 10);
            from = parseInt(m2[2], 10);
            to   = m2[3] ? parseInt(m2[3], 10) : from;
        }

        var m3 = t.match(/(\d+)\s*[-–]\s*(\d+)\s*сери/i);
        if (m3) {
            from = parseInt(m3[1], 10);
            to   = parseInt(m3[2], 10);
        }

        if (from === null) {
            var m4 = t.match(/(\d+)\s*серия/i);
            if (m4) { from = parseInt(m4[1], 10); to = from; }
        }

        if (season === null && from === null) return null;
        return { season: season, from: from, to: to };
    }

    function matchFilter(range, season, episode) {
        if (!range) return true;
        if (range.season !== null && range.season !== season) return false;
        if (range.from !== null && range.to !== null) {
            return episode >= range.from && episode <= range.to;
        }
        return true;
    }

    function applyTorrentFilter() {
        if (!currentFilter) return;
        var season  = currentFilter.season;
        var episode = currentFilter.episode;

        var items = document.querySelectorAll('.torrent-item');
        if (!items.length) return;

        var visible = 0;
        items.forEach(function (item) {
            var range = parseTorrentRange(item);
            var ok = matchFilter(range, season, episode);
            item.style.display = ok ? '' : 'none';
            if (ok) visible++;
        });

        log('filter S' + season + 'E' + episode + ' → visible ' + visible + '/' + items.length);

        ensureBadge(season, episode);

        if (visible === 0 && window.Lampa && Lampa.Noty) {
            if (!applyTorrentFilter._warned) {
                Lampa.Noty.show('Нет раздач для S' + season + 'E' + episode);
                applyTorrentFilter._warned = true;
                setTimeout(function(){ applyTorrentFilter._warned = false; }, 3000);
            }
        }
    }

    function ensureBadge(season, episode) {
        var head = document.querySelector('.explorer__files-head');
        if (!head) return;

        var old = head.querySelector('.ep-filter-badge');
        if (old) old.remove();

        var badge = document.createElement('div');
        badge.className = 'ep-filter-badge selector';
        badge.textContent = 'S' + season + 'E' + episode + ' ✕';
        badge.style.cssText = 'display:inline-flex;align-items:center;' +
            'padding:.4em 1em;margin:.4em;border-radius:.5em;' +
            'background:rgba(255,255,255,.18);cursor:pointer;font-size:1em;' +
            'white-space:nowrap;';

        badge.addEventListener('click', function (e) {
            e.stopPropagation();
            resetFilter();
        });

        var toolbar = head.querySelector('.torrent-filter') || head;
        toolbar.appendChild(badge);
    }

    function resetFilter() {
        currentFilter = null;
        document.querySelectorAll('.torrent-item').forEach(function (el) {
            el.style.display = '';
        });
        var b = document.querySelector('.ep-filter-badge');
        if (b) b.remove();
        if (filterObserver) { filterObserver.disconnect(); filterObserver = null; }
        log('filter reset');
    }

    function setTorrentFilter(season, episode) {
        currentFilter = { season: season, episode: episode };
        log('set filter S' + season + 'E' + episode);
        applyTorrentFilter._warned = false;

        var tries = 0;
        var t = setInterval(function () {
            tries++;
            if (document.querySelectorAll('.torrent-item').length) {
                clearInterval(t);
                watchTorrents();
                applyTorrentFilter();
            } else if (tries > 40) {
                clearInterval(t);
                log('torrents did not appear');
            }
        }, 250);
    }

    function watchTorrents() {
        if (filterObserver) filterObserver.disconnect();

        filterObserver = new MutationObserver(function () {
            if (currentFilter && document.querySelectorAll('.torrent-item').length) {
                applyTorrentFilter();
            }
        });

        var target = document.querySelector('.explorer__files-body') || document.body;
        filterObserver.observe(target, { childList: true, subtree: true });
    }

    // ================= ПОМЕТКА ПРОСМОТРА =================

    function markViewed(cardEl, viewed) {
        var card = getActiveCard();
        var season = findSeason(cardEl) || 1;
        var ep = getEpNum(cardEl);
        if (ep === null) return;

        try {
            if (window.Lampa && Lampa.Timeline) {
                if (viewed && Lampa.Timeline.viewed) {
                    Lampa.Timeline.viewed(card, { season: season, episode: ep });
                } else if (!viewed && Lampa.Timeline.remove) {
                    Lampa.Timeline.remove(card, { season: season, episode: ep });
                }
            }
        } catch (e) { log('Timeline error', e); }

        if (viewed) {
            cardEl.classList.add('full-episode--viewed');
            if (!cardEl.querySelector('.full-episode__viewed')) {
                var mk = document.createElement('div');
                mk.className = 'full-episode__viewed';
                mk.innerHTML = '<svg><use xlink:href="#sprite-viewed"></use></svg>';
                cardEl.appendChild(mk);
            }
        } else {
            cardEl.classList.remove('full-episode--viewed');
            var old = cardEl.querySelector('.full-episode__viewed');
            if (old) old.remove();
        }
    }

    // ================= ПОПАП =================

    function openPopup(cardEl) {
        var season = findSeason(cardEl) || 1;
        var ep = getEpNum(cardEl);
        var name = getEpName(cardEl);
        if (ep === null) return;

        var isViewed = cardEl.classList.contains('full-episode--viewed');

        var items = [
            {
                title: (isViewed ? '↺  Отменить просмотр' : '✓  Отметить просмотренной'),
                _toggle: true
            },
            {
                title: '⛊  Открыть торренты',
                _torrent: true
            }
        ];

        var subtitle = 'Сезон ' + season + ' · Серия ' + ep + (name ? ' · ' + name : '');

        if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
            Lampa.Select.show({
                title: 'Серия',
                subtitle: subtitle,
                items: items,
                onSelect: function (item) {
                    if (item._toggle) {
                        markViewed(cardEl, !isViewed);
                    } else if (item._torrent) {
                        openTorrents(season, ep);
                    }
                    if (Lampa.Controller && Lampa.Controller.toggle) {
                        Lampa.Controller.toggle('content');
                    }
                },
                onBack: function () {
                    if (Lampa.Controller && Lampa.Controller.toggle) {
                        Lampa.Controller.toggle('content');
                    }
                }
            });
            return;
        }

        log('Lampa.Select not available');
    }

    // ================= ПЕРЕХВАТ SELECT КОНТРОЛЛЕРА =================

    function installControllerHook() {
        if (!window.Lampa || !Lampa.Controller) return false;
        if (Lampa.Controller.__epHooked) return true;

        log('installing Controller.add hook');

        var origAdd = Lampa.Controller.add;
        if (typeof origAdd !== 'function') {
            log('Lampa.Controller.add not found');
            return false;
        }

        Lampa.Controller.add = function (name, methods) {
            if (methods && typeof methods.select === 'function') {
                var origSelect = methods.select;
                methods.select = function () {
                    var focused = getFocusedEpisode();
                    if (focused) {
                        if (longPressed) {
                            longPressed = false;
                            return;
                        }
                        var season = findSeason(focused);
                        var ep = getEpNum(focused);
                        if (season !== null && ep !== null) {
                            log('intercept select → torrents S' + season + 'E' + ep);
                            openTorrents(season, ep);
                            return;
                        }
                    }
                    return origSelect.apply(this, arguments);
                };
            }
            return origAdd.apply(this, arguments);
        };

        Lampa.Controller.__epHooked = true;
        return true;
    }

    // ================= ДОЛГОЕ УДЕРЖАНИЕ OK =================

    function installLongPress() {
        if (installLongPress.done) return;
        installLongPress.done = true;

        document.addEventListener('keydown', function (e) {
            var k = e.keyCode || e.which;
            if (k !== 13 && k !== 23) return;

            var focused = getFocusedEpisode();
            if (!focused) return;
            if (longPressTimer) return;

            longPressed = false;

            longPressTimer = setTimeout(function () {
                longPressTimer = null;
                longPressed = true;
                log('LONG PRESS');
                openPopup(focused);
            }, LONG_PRESS_MS);
        }, true);

        document.addEventListener('keyup', function (e) {
            var k = e.keyCode || e.which;
            if (k !== 13 && k !== 23) return;
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, true);
    }

    // ================= FALLBACK: КЛИК МЫШЬЮ =================

    function installClickFallback() {
        if (installClickFallback.done) return;
        installClickFallback.done = true;

        document.addEventListener('click', function (e) {
            var card = e.target.closest ? e.target.closest('.full-episode--small') : null;
            if (!card) return;
            if (card.classList.contains('card-more')) return;

            var season = findSeason(card);
            var ep = getEpNum(card);
            if (season === null || ep === null) return;

            if (document.querySelector('.explorer__files')) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (longPressed) { longPressed = false; return false; }

            log('fallback click → torrents S' + season + 'E' + ep);
            openTorrents(season, ep);
            return false;
        }, true);

        document.addEventListener('mousedown', function (e) {
            var card = e.target.closest ? e.target.closest('.full-episode--small') : null;
            if (!card) return;
            card.__lpTimer = setTimeout(function () {
                longPressed = true;
                openPopup(card);
            }, LONG_PRESS_MS);
        }, true);
        document.addEventListener('mouseup', function (e) {
            var card = e.target.closest ? e.target.closest('.full-episode--small') : null;
            if (card && card.__lpTimer) {
                clearTimeout(card.__lpTimer);
                card.__lpTimer = null;
            }
        }, true);
    }

    // ================= ИНИЦИАЛИЗАЦИЯ =================

    function boot() {
        if (!window.Lampa || !Lampa.Controller) {
            setTimeout(boot, 500);
            return;
        }
        diagnoseLampa();
        installControllerHook();
        installLongPress();
        installClickFallback();
        log('boot done');
    }

    if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') boot();
        });
    }

    var tries = 0;
    var t = setInterval(function () {
        tries++;
        if (window.Lampa && Lampa.Controller && Lampa.Controller.add) {
            boot();
            clearInterval(t);
        } else if (tries > 60) clearInterval(t);
    }, 500);

    log('loaded');
})();
