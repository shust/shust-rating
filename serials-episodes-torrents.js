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

    // Сфокусированная серия. Ищем по классам .focus и .hover
    function getFocusedEpisode() {
        return document.querySelector('.full-episode--small.focus')
            || document.querySelector('.full-episode--small.hover')
            || document.querySelector('.full-episode.focus')
            || document.querySelector('.full-episode.hover')
            || document.querySelector('.full-episode--small.selector.focus');
    }

    // Открыт ли попап выбора действия на серии
    function isPopupOpen() {
        return document.querySelector('.ep-popup-layer') !== null;
    }

    // Находимся ли на странице торрентов
    function isTorrentsOpen() {
        return document.querySelector('.explorer__files') !== null;
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

        // Метаданные для поиска
        var search    = card.title || card.name || '';
        var searchOne = card.original_title || card.original_name || '';
        var searchTwo = card.name || card.title || '';

        // Сохраняем фильтр
        setTorrentFilter(season, episode);

        // Открываем торренты через Activity.push
        try {
            log('using Activity.push torrents');
            Lampa.Activity.push({
                url: '',
                component: 'torrents',
                title: 'Торренты',
                movie: card,
                season: season,
                episode: episode,
                search: search,
                search_one: searchOne,
                search_two: searchTwo
            });
            return;
        } catch (e) {
            log('Activity.push failed', e);
        }

        // Fallback — клик по кнопке
        var btn = document.querySelector('.full-start__button.view--torrent')
               || document.querySelector('.full-start__button.button--priority');
        if (btn) {
            log('fallback: click torrent button');
            try { btn.click(); } catch (e) {}
            return;
        }

        log('no way to open torrents');
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show('Не удалось открыть торренты');
    }

    // ================= ФИЛЬТР ТОРРЕНТОВ =================

    function parseTorrentRange(item) {
        var gen = item.querySelector('.m-general');
        if (gen) {
            var divs = gen.querySelectorAll('div');
            var season = null, from = null, to = null;

            if (divs[0]) {
                var s = divs[0].textContent.trim();
                // Поддерживаем "S8", "S1-8"
                var single = s.match(/^S(\d+)$/i);
                var range  = s.match(/^S(\d+)\s*[-–]\s*S?(\d+)$/i);
                if (range) {
                    season = { from: parseInt(range[1], 10), to: parseInt(range[2], 10) };
                } else if (single) {
                    season = parseInt(single[1], 10);
                }
            }
            if (divs[1]) {
                var e = divs[1].textContent.trim();
                var rm = e.match(/^(\d+)\s*[-–]\s*(\d+)$/);
                if (rm) {
                    from = parseInt(rm[1], 10);
                    to   = parseInt(rm[2], 10);
                } else {
                    var one = parseInt(e, 10);
                    if (!isNaN(one)) { from = one; to = one; }
                }
            }
            if (season !== null) return { season: season, from: from, to: to };
        }

        // Fallback из title
        var title = item.querySelector('.torrent-item__title');
        if (!title) return null;
        var t = title.textContent;

        var season = null, from = null, to = null;

        // "2 сезон" / "1-8 сезоны" / "Сезон 2" / "5-8 сезон"
        var r1 = t.match(/(\d+)\s*[-–]\s*(\d+)\s*сезон/i);
        if (r1) season = { from: parseInt(r1[1], 10), to: parseInt(r1[2], 10) };
        if (season === null) {
            var s1 = t.match(/сезон[ыа]?\s*[:]?\s*(\d+)/i) || t.match(/(\d+)\s*сезон/i);
            if (s1) season = parseInt(s1[1], 10);
        }

        // "02х01-03" / "S02E01"
        var r2 = t.match(/(\d+)\s*[хx]\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
        if (r2) {
            if (season === null) season = parseInt(r2[1], 10);
            from = parseInt(r2[2], 10);
            to   = r2[3] ? parseInt(r2[3], 10) : from;
        }
        var r2b = t.match(/S(\d+)\s*E(\d+)(?:\s*[-–]\s*E?(\d+))?/i);
        if (r2b) {
            if (season === null) season = parseInt(r2b[1], 10);
            from = parseInt(r2b[2], 10);
            to   = r2b[3] ? parseInt(r2b[3], 10) : from;
        }

        // "1-4 серии" / "1-73 серии"
        var r3 = t.match(/(\d+)\s*[-–]\s*(\d+)\s*сери/i);
        if (r3) { from = parseInt(r3[1], 10); to = parseInt(r3[2], 10); }

        // "Серии: 1-4 из"
        var r3b = t.match(/серии?[:\s]+(\d+)\s*[-–]\s*(\d+)/i);
        if (r3b && from === null) { from = parseInt(r3b[1], 10); to = parseInt(r3b[2], 10); }

        // "серия 4"
        if (from === null) {
            var r4 = t.match(/серия[:\s]+(\d+)/i);
            if (r4) { from = parseInt(r4[1], 10); to = from; }
        }

        if (season === null && from === null) return null;
        return { season: season, from: from, to: to };
    }

    function matchFilter(range, season, episode) {
        if (!range) return true;

        // Сезон
        if (range.season !== null) {
            if (typeof range.season === 'object') {
                // диапазон сезонов: S1-8
                if (season < range.season.from || season > range.season.to) return false;
            } else {
                if (range.season !== season) return false;
            }
        }

        // Серия
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
            item.style.visibility = ok ? '' : 'hidden';
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
            el.style.visibility = '';
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

        // Ждём появления торрентов
        var tries = 0;
        var t = setInterval(function () {
            tries++;
            if (document.querySelectorAll('.torrent-item').length) {
                clearInterval(t);
                watchTorrents();
                applyTorrentFilter();
            } else if (tries > 60) {
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
                title: 'Открыть торренты',
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
                        // Закрываем попап и только потом открываем торренты
                        if (Lampa.Controller && Lampa.Controller.toggle) {
                            Lampa.Controller.toggle('content');
                        }
                        setTimeout(function () {
                            openTorrents(season, ep);
                        }, 300);
                        return;
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

    // ================= ПЕРЕХВАТ OK =================
    // Активный контроллер в Lampa на странице сериала — 'full_start'.
    // Перехватываем его через Controller.trigger('enter') и Controller.enter.

    function installControllerHook() {
        if (!window.Lampa || !Lampa.Controller) return false;
        if (Lampa.Controller.__epHooked) return true;

        log('installing Controller hooks');

        // --- Перехват trigger('enter'/'select') ---
        var origTrigger = Lampa.Controller.trigger;
        if (typeof origTrigger === 'function') {
            Lampa.Controller.trigger = function (name, params) {
                if (name === 'enter' || name === 'select') {
                    // Не перехватываем если открыт попап или торренты
                    if (isPopupOpen() || isTorrentsOpen()) {
                        return origTrigger.apply(this, arguments);
                    }

                    var focused = getFocusedEpisode();
                    if (focused) {
                        if (longPressed) {
                            longPressed = false;
                            return;
                        }
                        var season = findSeason(focused);
                        var ep = getEpNum(focused);
                        if (season !== null && ep !== null) {
                            log('intercept trigger → torrents S' + season + 'E' + ep);
                            openTorrents(season, ep);
                            return;
                        }
                    }
                }
                return origTrigger.apply(this, arguments);
            };
        }

        // --- Перехват enter() ---
        var origEnter = Lampa.Controller.enter;
        if (typeof origEnter === 'function') {
            Lampa.Controller.enter = function () {
                // Не перехватываем если открыт попап или торренты
                if (isPopupOpen() || isTorrentsOpen()) {
                    return origEnter.apply(this, arguments);
                }

                var focused = getFocusedEpisode();
                if (focused) {
                    if (longPressed) {
                        longPressed = false;
                        return;
                    }
                    var season = findSeason(focused);
                    var ep = getEpNum(focused);
                    if (season !== null && ep !== null) {
                        log('intercept enter → torrents S' + season + 'E' + ep);
                        openTorrents(season, ep);
                        return;
                    }
                }
                return origEnter.apply(this, arguments);
            };
        }

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

            // Не срабатываем на странице торрентов
            if (isTorrentsOpen()) return;
            if (isPopupOpen()) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (longPressed) { longPressed = false; return false; }

            log('fallback click → torrents S' + season + 'E' + ep);
            openTorrents(season, ep);
            return false;
        }, true);

        // Долгий тап мышью
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
        if (window.Lampa && Lampa.Controller && Lampa.Controller.trigger) {
            boot();
            clearInterval(t);
        } else if (tries > 60) clearInterval(t);
    }, 500);

    log('loaded');
})();
