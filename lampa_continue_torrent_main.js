/*
 * Continue Torrent — полка "Продолжить торренты" на главной
 * Версия: 1.6.0 — вставка после первой нативной полки
 */
(function () {
    'use strict';

    if (window.__lampa_continue_torrent_main) return;
    window.__lampa_continue_torrent_main = true;

    var STORAGE = 'lampa_continue_torrent_v2';
    var MAX_CARDS = 20;
    var SORT_MODE = 'recent';
    var WATCHDOG_INTERVAL = 500;

    var watchdog = null;
    var currentBody = null;
    var lastRenderKey = '';
    var pendingReinsert = false;

    function t(v) { return v === undefined || v === null ? '' : String(v).trim(); }
    function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }

    function debug() {
        try {
            if (localStorage.getItem('lampa_continue_torrent_debug') !== 'true') return;
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[ContinueTorrent-main v1.6.0]');
            console.log.apply(console, args);
        } catch (e) {}
    }

    function loadHistory() {
        try {
            var value = Lampa.Storage.get(STORAGE, {});
            return value && typeof value === 'object' ? value : {};
        } catch (e) { return {}; }
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(n(seconds)));
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        return m + ':' + String(s).padStart(2, '0');
    }

    function isSeriesRecord(record) {
        return Boolean(n(record && record.season) && n(record && record.episode));
    }

    function episodeLabel(record) {
        var s = n(record.season), e = n(record.episode);
        if (s && e) return 'Сезон ' + s + ' · Серия ' + e;
        if (e) return 'Серия ' + e;
        return '';
    }

    function progressPercent(record) {
        var percent = n(record.percent);
        var time = n(record.time);
        var duration = n(record.duration);
        if ((!percent || percent < 0) && time > 0 && duration > 0) percent = time / duration * 100;
        return Math.max(0, Math.min(100, percent));
    }

    function cardHtml(record, key) {
        var series = isSeriesRecord(record);
        var percent = progressPercent(record);
        var time = n(record.time) > 0 ? formatTime(record.time) : '';

        var poster = t(record.poster) || './img/img_load.svg';
        var title = t(record.card_title) || t(record.torrent_title) || 'Без названия';
        var year = t(record.card_year) || '';

        var subtitleParts = [];
        if (series) {
            var ep = episodeLabel(record);
            if (ep) subtitleParts.push(ep);
        }
        if (time) subtitleParts.push(time);
        var subtitle = subtitleParts.join(' · ');

        return '' +
            '<div class="card selector layer--visible layer--render card--loaded ctv-main-card' +
                (series ? ' card--tv' : '') + '" data-ctv-key="' + escapeAttr(key) + '">' +
                '<div class="card__view" style="position:relative;">' +
                    '<img src="' + escapeAttr(poster) + '" class="card__img">' +
                    '<div class="card__icons"><div class="card__icons-inner"></div></div>' +
                    (series ? '<div class="card__type">TV</div>' : '') +
                    (percent > 0
                        ? '<div class="ctv-main-progress" style="position:absolute;left:0;right:0;bottom:0;height:0.3em;background:rgba(0,0,0,0.5);">' +
                            '<div style="height:100%;width:' + percent.toFixed(2) + '%;background:#fff;"></div>' +
                          '</div>'
                        : '') +
                '</div>' +
                '<div class="card__title">' + escapeHtml(title) + '</div>' +
                (year ? '<div class="card__age">' + escapeHtml(year) + '</div>' : '') +
                (subtitle
                    ? '<div class="ctv-main-card__sub" style="font-size:1.1em;opacity:0.75;margin-top:0.3em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
                        escapeHtml(subtitle) + '</div>'
                    : '') +
            '</div>';
    }

    function escapeHtml(v) {
        return String(v === undefined || v === null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeAttr(v) {
        return String(v === undefined || v === null ? '' : v)
            .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function collectRecords() {
        var history = loadHistory();
        var rows = [];

        Object.keys(history).forEach(function (key) {
            var record = history[key];
            if (!record) return;
            if (!record.infohash && !record.magnet) return;
            if (!n(record.time) && !n(record.percent)) return;

            rows.push({
                key: key,
                record: record,
                updated: n(record.updated_at) || n(record.timeline_updated) || 0,
                series: isSeriesRecord(record)
            });
        });

        rows.sort(function (a, b) {
            if (SORT_MODE === 'series-first' && a.series !== b.series) return a.series ? -1 : 1;
            if (SORT_MODE === 'movies-first' && a.series !== b.series) return a.series ? 1 : -1;
            return b.updated - a.updated;
        });

        return rows.slice(0, MAX_CARDS);
    }

    function renderKey(rows) {
        return rows.map(function (r) {
            return r.key + ':' + n(r.record.time) + ':' + n(r.record.percent) + ':' + n(r.record.updated_at);
        }).join('|');
    }

    function findMainBody() {
        var result = null;
        $('.activity.activity--active .scroll__body').each(function () {
            if (result) return;
            var hasNativeLine = false;
            $(this).children('.items-line').each(function () {
                if ($(this).hasClass('ctv-main-line')) return;
                var title = t($(this).find('.items-line__title').first().text()).toLowerCase();
                if (title === 'сейчас смотрят' ||
                    title === 'продолжить просмотр' ||
                    title === 'последнее добавление' ||
                    title === 'недавние выходы эпизодов') {
                    hasNativeLine = true;
                }
            });
            if (hasNativeLine && !$(this).closest('.items-line').length) {
                result = $(this);
            }
        });
        return result;
    }

    function removeOurLineEverywhere() {
        $('.items-line.ctv-main-line').remove();
    }

    function buildLineHtml(rows, key) {
        var cardsHtml = rows.map(function (r) { return cardHtml(r.record, r.key); }).join('');
        return '' +
            '<div class="items-line layer--visible layer--render items-line--type-default ctv-main-line" data-ctv-key="' + escapeAttr(key) + '">' +
                '<div class="items-line__head">' +
                    '<div class="items-line__title">Продолжить торренты</div>' +
                '</div>' +
                '<div class="items-line__body">' +
                    '<div class="scroll scroll--horizontal">' +
                        '<div class="scroll__content">' +
                            '<div class="scroll__body mapping--line">' + cardsHtml + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    function insertOurLine() {
        var body = findMainBody();
        if (!body || !body.length) {
            if (currentBody) {
                removeOurLineEverywhere();
                currentBody = null;
                lastRenderKey = '';
            }
            return;
        }
        currentBody = body;

        var rows = collectRecords();
        var key = renderKey(rows);

        var existing = body.children('.items-line.ctv-main-line');
        if (existing.length && existing.attr('data-ctv-key') === key) return;

        existing.remove();

        if (!rows.length) {
            lastRenderKey = key;
            return;
        }

        var html = buildLineHtml(rows, key);

        // Вставляем сразу ПОСЛЕ первой нативной полки, а не перед ней.
        // Иначе наша полка уезжает вверх за границу видимости при скролле.
        var firstNative = body.children('.items-line').not('.ctv-main-line').first();
        if (firstNative.length) {
            firstNative.after(html);
        } else {
            body.prepend(html);
        }

        lastRenderKey = key;
        bindCardHandlers(body);
        debug('inserted line, key=', key);
    }

    function bindCardHandlers(body) {
        var line = body.children('.items-line.ctv-main-line');
        if (!line.length) return;

        line.find('.ctv-main-card').off('hover:enter.ctv').on('hover:enter.ctv', function () {
            var key = t($(this).attr('data-ctv-key'));
            if (!key) return;
            openCard(key);
        });
    }

    function openCard(key) {
        var history = loadHistory();
        var record = history[key];
        if (!record) return;

        var parts = t(key).split(':');
        var source = parts[0] || 'tmdb';
        var id = parts[1] || '';

        var card = {
            source: source,
            id: id,
            title: t(record.card_title) || t(record.torrent_title) || '',
            name: t(record.card_title) || t(record.torrent_title) || ''
        };
        if (source === 'tmdb') card.tmdb_id = id;
        if (source === 'imdb') card.imdb_id = id;
        if (source === 'kp' || source === 'kinopoisk') card.kinopoisk_id = id;

        try {
            if (Lampa.Activity && Lampa.Activity.push) {
                Lampa.Activity.push({
                    url: '',
                    component: 'full',
                    card: card,
                    movie: card,
                    source: source
                });
                return;
            }
        } catch (e) { debug('Activity.push failed', e); }

        if (Lampa.Noty) Lampa.Noty.show('Не удалось открыть торрент');
    }

    function scheduleInsert() {
        if (pendingReinsert) return;
        pendingReinsert = true;
        Promise.resolve().then(function () {
            pendingReinsert = false;
            try { insertOurLine(); } catch (e) { debug('insert error', e); }
        });
    }

    function attachWrapObserver() {
        if (typeof MutationObserver === 'undefined') return;
        var wrap = document.querySelector('.wrap__content');
        if (!wrap) {
            setTimeout(attachWrapObserver, 300);
            return;
        }

        var observer = new MutationObserver(function (mutations) {
            var needReinsert = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type !== 'childList') continue;
                if (m.removedNodes && m.removedNodes.length) {
                    for (var j = 0; j < m.removedNodes.length; j++) {
                        var node = m.removedNodes[j];
                        if (!node || !node.classList) continue;
                        if (node.classList.contains('ctv-main-line') ||
                            (node.querySelector && node.querySelector('.ctv-main-line'))) {
                            needReinsert = true;
                            break;
                        }
                    }
                }
                if (m.addedNodes && m.addedNodes.length) {
                    for (var k = 0; k < m.addedNodes.length; k++) {
                        var add = m.addedNodes[k];
                        if (!add || !add.classList) continue;
                        if (add.classList.contains('items-line') ||
                            (add.querySelector && add.querySelector('.items-line'))) {
                            needReinsert = true;
                            break;
                        }
                    }
                }
                if (needReinsert) break;
            }
            if (needReinsert) scheduleInsert();
        });

        observer.observe(wrap, {childList: true, subtree: true});
        debug('wrap observer attached');
    }

    function startWatchdog() {
        if (watchdog) return;
        watchdog = setInterval(function () {
            try { insertOurLine(); } catch (e) { debug('watchdog error', e); }
        }, WATCHDOG_INTERVAL);
        setTimeout(insertOurLine, 0);
        setTimeout(insertOurLine, 100);
        setTimeout(insertOurLine, 400);
        setTimeout(insertOurLine, 1200);
    }

    function init() {
        if (!Lampa || !Lampa.Listener) return;

        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                attachWrapObserver();
                startWatchdog();
            }
        });

        Lampa.Listener.follow('activity', function () {
            setTimeout(insertOurLine, 0);
            setTimeout(insertOurLine, 200);
            setTimeout(insertOurLine, 800);
        });

        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('focus', function () {
                setTimeout(insertOurLine, 50);
            });
        }

        attachWrapObserver();
        startWatchdog();
        debug('ready');
    }

    if (window.appready) init();
    else if (Lampa.Listener) Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
    else setTimeout(init, 1000);
})();
