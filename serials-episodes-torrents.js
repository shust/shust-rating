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

    // Сезон из контекста
    function findSeason(el) {
        // 1. Активный Activity — самый надёжный источник
        try {
            var a = Lampa.Activity.active();
            if (a && a.season) return parseInt(a.season, 10);
        } catch (e) {}

        // 2. Из заголовка .items-line ("Сезон 2")
        var line = el && el.closest ? el.closest('.items-line') : null;
        if (line) {
            var t = line.querySelector('.items-line__title');
            if (t) {
                var m = t.textContent.trim().match(/Сезон\s+(\d+)/i);
                if (m) return parseInt(m[1], 10);
            }
        }

        // 3. Из модалки выбора сезона
        var selectboxItem = document.querySelector('.selectbox-item.selected .selectbox-item__title');
        if (selectboxItem) {
            var sm = selectboxItem.textContent.trim().match(/Сезон\s+(\d+)/i);
            if (sm) return parseInt(sm[1], 10);
        }

        return null;
    }

    // Номер серии — работает для обоих типов карточек
    function getEpNum(el) {
        if (!el) return null;

        // .full-episode__num (страница сериала)
        var n = el.querySelector('.full-episode__num');
        if (n) {
            var v = parseInt(n.textContent.trim(), 10);
            if (!isNaN(v)) return v;
        }

        // .season-episode__episode-number (модалка сезона)
        var sn = el.querySelector('.season-episode__episode-number');
        if (sn) {
            var sv = parseInt(sn.textContent.trim(), 10);
            if (!isNaN(sv)) return sv;
        }

        return null;
    }

    function getEpName(el) {
        if (!el) return '';
        var n = el.querySelector('.full-episode__name') || el.querySelector('.season-episode__title');
        return n ? n.textContent.trim() : '';
    }

    // Сфокусированная серия
    function getFocusedEpisode() {
        return document.querySelector('.season-episode.focus')
            || document.querySelector('.season-episode.hover')
            || document.querySelector('.full-episode--small.focus')
            || document.querySelector('.full-episode--small.hover')
            || document.querySelector('.full-episode.focus')
            || document.querySelector('.full-episode.hover');
    }

    function isPopupOpen() {
        return document.querySelector('.ep-popup-layer') !== null;
    }

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

        var search    = card.title || card.name || '';
        var searchOne = card.original_title || card.original_name || '';
        var searchTwo = card.name || card.title || '';

        setTorrentFilter(season, episode);

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

    // ================= ПАРСЕР .m-general =================

    // Разбирает "S13" / "S1-8" / "S131-3" / "S11-8" / "S2"
    function parseGeneral(raw) {
        if (!raw) return null;

        raw = String(raw).trim();

        // Нормальный случай: "S13" / "S1-8"
        var m1 = raw.match(/^S(\d+)\s*[-–]\s*S?(\d+)$/i);
        if (m1) {
            return {
                season: { from: parseInt(m1[1], 10), to: parseInt(m1[2], 10) },
                from: null, to: null
            };
        }

        // "S13"
        var m2 = raw.match(/^S(\d+)$/i);
        if (m2) {
            return { season: parseInt(m2[1], 10), from: null, to: null };
        }

        // Слипшийся формат: "S131-3", "S11-8", "S41-4"
        var m3 = raw.match(/^S(\d+)\s*[-–]\s*(\d+)$/i);
        if (m3) {
            var left  = m3[1]; // "131", "11", "41"
            var right = m3[2]; // "3", "8", "4"

            var season = null, from = null, to = null;

            if (left.length === 1) {
                // "S1-3" — сезон 1, диапазон 1-3? Или серия 1-3?
                // Скорее всего это "S1" и серия-диапазон не указана, а 1-3 — сезон 1-3
                season = { from: parseInt(left, 10), to: parseInt(right, 10) };
            } else if (left.length === 2) {
                // "S11-8" или "S41-4"
                // Сезон = 1 или 4, серия от = 1 или 1, серия до = 8 или 4
                season = parseInt(left[0], 10);
                from = parseInt(left[1], 10);
                to = parseInt(right, 10);
            } else if (left.length === 3) {
                // "S131-3"
                // Сезон = 13, серия от = 1, серия до = 3
                season = parseInt(left.substring(0, 2), 10);
                from = parseInt(left[2], 10);
                to = parseInt(right, 10);
            } else {
                // 4+ цифр — маловероятно, но пусть будет
                season = parseInt(left.substring(0, left.length - 1), 10);
                from = parseInt(left[left.length - 1], 10);
                to = parseInt(right, 10);
            }

            return { season: season, from: from, to: to };
        }

        return null;
    }

    // ================= ФИЛЬТР ТОРРЕНТОВ =================

    function parseTorrentRange(item) {
        var gen = item.querySelector('.m-general');
        if (gen) {
            var divs = gen.querySelectorAll('div');

            if (divs.length >= 2) {
                // Нормальная структура с двумя div
                var s = divs[0].textContent.trim();
                var e = divs[1].textContent.trim();

                var result = { season: null, from: null, to: null };

                // Сезон
                var sRange = s.match(/^S(\d+)\s*[-–]\s*S?(\d+)$/i);
                if (sRange) {
                    result.season = { from: parseInt(sRange[1], 10), to: parseInt(sRange[2], 10) };
                } else {
                    var sSingle = s.match(/^S(\d+)$/i);
                    if (sSingle) result.season = parseInt(sSingle[1], 10);
                }

                // Серии
                var eRange = e.match(/^(\d+)\s*[-–]\s*(\d+)$/);
                if (eRange) {
                    result.from = parseInt(eRange[1], 10);
                    result.to   = parseInt(eRange[2], 10);
                } else {
                    var eSingle = parseInt(e, 10);
                    if (!isNaN(eSingle)) { result.from = eSingle; result.to = eSingle; }
                }

                if (result.season !== null) return result;
            }

            // Слипшийся формат
            var parsed = parseGeneral(gen.textContent);
            if (parsed) return parsed;
        }

        // Fallback из title
        var title = item.querySelector('.torrent-item__title');
        if (!title) return null;
        var t = title.textContent;

        var season = null, from = null, to = null;

        // Диапазон сезонов "1-8 сезоны"
        var r1 = t.match(/(\d+)\s*[-–]\s*(\d+)\s*сезон/i);
        if (r1) season = { from: parseInt(r1[1], 10), to: parseInt(r1[2], 10) };

        // Одиночный "13 сезон" / "Сезон 13"
        if (season === null) {
            var s1 = t.match(/сезон[ыа]?\s*[:]?\s*(\d+)/i) || t.match(/(\d+)\s*сезон/i);
            if (s1) season = parseInt(s1[1], 10);
        }

        // "13х01-08"
        var r2 = t.match(/(\d+)\s*[хx]\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
        if (r2) {
            if (season === null) season = parseInt(r2[1], 10);
            from = parseInt(r2[2], 10);
            to   = r2[3] ? parseInt(r2[3], 10) : from;
        }

        // "S13E01"
        var r2b = t.match(/S(\d+)\s*E(\d+)(?:\s*[-–]\s*E?(\d+))?/i);
        if (r2b) {
            if (season === null) season = parseInt(r2b[1], 10);
            from = parseInt(r2b[2], 10);
            to   = r2b[3] ? parseInt(r2b[3], 10) : from;
        }

        // "1-4 серии"
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

        if (range.season !== null) {
            if (typeof range.season === 'object') {
                if (season < range.season.from || season > range.season.to) return false;
            } else {
                if (range.season !== season) return false;
            }
        }

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

    function installControllerHook() {
        if (!window.Lampa || !Lampa.Controller) return false;
        if (Lampa.Controller.__epHooked) return true;

        log('installing Controller hooks');

        var origTrigger = Lampa.Controller.trigger;
        if (typeof origTrigger === 'function') {
            Lampa.Controller.trigger = function (name, params) {
                if (name === 'enter' || name === 'select') {
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

        var origEnter = Lampa.Controller.enter;
        if (typeof origEnter === 'function') {
            Lampa.Controller.enter = function () {
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
            var card = e.target.closest ? e.target.closest('.season-episode, .full-episode--small') : null;
            if (!card) return;
            if (card.classList.contains('card-more')) return;
            if (card.classList.contains('season-info')) return;

            var season = findSeason(card);
            var ep = getEpNum(card);
            if (season === null || ep === null) return;

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

        document.addEventListener('mousedown', function (e) {
            var card = e.target.closest ? e.target.closest('.season-episode, .full-episode--small') : null;
            if (!card) return;
            if (card.classList.contains('season-info')) return;
            card.__lpTimer = setTimeout(function () {
                longPressed = true;
                openPopup(card);
            }, LONG_PRESS_MS);
        }, true);
        document.addEventListener('mouseup', function (e) {
            var card = e.target.closest ? e.target.closest('.season-episode, .full-episode--small') : null;
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
