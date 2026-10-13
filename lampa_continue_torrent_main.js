/*
 * Continue Torrent — полка "Продолжить торренты" на главной
 * Зависит от lampa_continue_torrent_v2.js (читает его localStorage).
 * Версия: 1.2.0 — защита от перерисовки, только на главной странице.
 */
(function () {
    'use strict';

    if (window.__lampa_continue_torrent_main) return;
    window.__lampa_continue_torrent_main = true;

    var STORAGE = 'lampa_continue_torrent_v2';
    var MAX_CARDS = 20;
    var REFRESH_DELAYS = [0, 300, 1000, 2500];
    var SORT_MODE = 'recent'; // 'recent' | 'series-first' | 'movies-first'

    var mainObserver = null;
    var bodyObserver = null;
    var watchTimer = null;
    var currentBody = null;
    var lastRenderKey = '';

    function t(v) { return v === undefined || v === null ? '' : String(v).trim(); }
    function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }

    function debug() {
        try {
            if (localStorage.getItem('lampa_continue_torrent_debug') !== 'true') return;
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[ContinueTorrent-main v1.2.0]');
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
        if (h) return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        return m + ':' + String(s).padStart(2,'0');
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

    function remainingLabel(record) {
        var time = n(record.time);
        var duration = n(record.duration);
        if (!duration || !time) return '';
        var left = Math.max(0, duration - time);
        if (!left) return '';
        return 'осталось ' + formatTime(left);
    }

    function guessCardFromRecord(key, record) {
        var source = 'tmdb';
        var id = '';
        var parts = t(key).split(':');
        if (parts.length === 2) {
            source = parts[0];
            id = parts[1];
        }

        return {
            source: source,
            id: id,
            tmdb_id: source === 'tmdb' ? id : undefined,
            imdb_id: source === 'imdb' ? id : undefined,
            kinopoisk_id: (source === 'kinopoisk' || source === 'kp') ? id : undefined,
            title: record.torrent_title || '',
            name: record.torrent_title || ''
        };
    }

    function findExistingCardInDom(card) {
        var found = null;
        $('.card').each(function () {
            if (found) return;
            var vote = $(this).find('.card__vote');
            var mid = t(vote.attr('data-movie-id'));
            var msrc = t(vote.attr('data-source'));
            var same = false;

            if (msrc === 'kp' && t(card.kinopoisk_id) === mid) same = true;
            if (msrc === 'tmdb' && t(card.tmdb_id) === mid) same = true;
            if (msrc === 'imdb' && t(card.imdb_id) === mid) same = true;

            if (same) {
                var img = $(this).find('.card__img').attr('src') || '';
                var title = t($(this).find('.card__title').text());
                var age = t($(this).find('.card__age').text());
                found = {img: img, title: title, age: age};
            }
        });
        return found;
    }

    function cardHtml(record, key) {
        var card = guessCardFromRecord(key, record);
        var dom = findExistingCardInDom(card);

        var img = dom && dom.img ? dom.img : './img/img_load.svg';
        var title = dom && dom.title ? dom.title : (record.torrent_title || 'Без названия');
        var year = dom && dom.age ? dom.age : '';

        var series = isSeriesRecord(record);
        var percent = progressPercent(record);
        var time = n(record.time) > 0 ? formatTime(record.time) : '';

        var subtitleParts = [];
        if (series) {
            var ep = episodeLabel(record);
            if (ep) subtitleParts.push(ep);
        }
        if (time) subtitleParts.push(time);
        else if (!series) {
            var rem = remainingLabel(record);
            if (rem) subtitleParts.push(rem);
        }
        var subtitle = subtitleParts.join(' · ');

        return '' +
            '<div class="card selector layer--visible layer--render card--loaded ctv-main-card' +
                (series ? ' card--tv' : '') + '" data-ctv-key="' + escapeAttr(key) + '">' +
                '<div class="card__view" style="position:relative;">' +
                    '<img src="' + escapeAttr(img) + '" class="card__img">' +
                    '<div class="card__icons">' +
                        '<div class="card__icons-inner"></div>' +
                    '</div>' +
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
                        escapeHtml(subtitle) +
                      '</div>'
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

    // === ГЛАВНАЯ ПРОВЕРКА: мы действительно на главной? ===
    function isMainActivity() {
        try {
            if (!Lampa.Activity || typeof Lampa.Activity.active !== 'function') return false;
            var active = Lampa.Activity.active();
            if (!active) return false;
            if (active.component === 'main') return true;
            if (active.url === 'main') return true;
            // Иногда component может быть вложен
            if (active.activity && active.activity.component === 'main') return true;
        } catch (e) {}
        // Резервный признак: в текущем .scroll__body есть полка «Сейчас смотрят»
        var body = $('.activity.activity--active .scroll__body').first();
        if (body.length) {
            var hasNowWatching = false;
            body.find('.items-line .items-line__title').each(function () {
                var txt = t($(this).text()).toLowerCase();
                if (txt === 'сейчас смотрят') hasNowWatching = true;
            });
            return hasNowWatching;
        }
        return false;
    }

    function findMainBody() {
        if (!isMainActivity()) return null;
        var active = $('.activity.activity--active').first();
        if (!active.length) return null;
        var body = active.find('.scroll__body').first();
        return body.length ? body : null;
    }

    // === Наблюдаем за конкретным .scroll__body ===
    function attachBodyObserver(body) {
        if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
        if (!body || !body.length || typeof MutationObserver === 'undefined') return;

        bodyObserver = new MutationObserver(function (mutations) {
            // Если нашу .items-line удалили — вставим снова
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'childList' && m.removedNodes && m.removedNodes.length) {
                    for (var j = 0; j < m.removedNodes.length; j++) {
                        var node = m.removedNodes[j];
                        if (node && node.classList && node.classList.contains('ctv-main-line')) {
                            debug('our line was removed, reinserting');
                            setTimeout(render, 50);
                            return;
                        }
                    }
                }
            }
        });

        bodyObserver.observe(body[0], {childList: true});
    }

    function render() {
        // Не на главной — убираем свой блок, если он где-то остался
        if (!isMainActivity()) {
            $('.items-line.ctv-main-line').remove();
            if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
            currentBody = null;
            lastRenderKey = '';
            return;
        }

        var body = findMainBody();
        if (!body || !body.length) return;

        // Если body сменился — перевесим наблюдатель
        if (!currentBody || currentBody[0] !== body[0]) {
            currentBody = body;
            attachBodyObserver(body);
        }

        var rows = collectRecords();
        var key = renderKey(rows);

        var existing = body.find('.items-line.ctv-main-line');
        if (existing.length && existing.attr('data-ctv-key') === key) return;

        existing.remove();

        if (!rows.length) return;

        var cardsHtml = rows.map(function (r) { return cardHtml(r.record, r.key); }).join('');

        var html = '' +
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

        body.prepend(html);
        lastRenderKey = key;
        bindCardHandlers(body);
    }

    function bindCardHandlers(body) {
        var line = body.find('.items-line.ctv-main-line');
        if (!line.length) return;

        line.find('.ctv-main-card').off('hover:enter.ctv').on('hover:enter.ctv', function () {
            var key = t($(this).attr('data-ctv-key'));
            if (!key) return;
            debug('card activated', key);
            openCard(key);
        });
    }

    function openCard(key) {
        var history = loadHistory();
        var record = history[key];
        if (!record) return;

        var card = guessCardFromRecord(key, record);

        try {
            if (Lampa.Activity && Lampa.Activity.push) {
                Lampa.Activity.push({
                    url: '',
                    component: 'full',
                    card: card,
                    movie: card,
                    source: card.source || 'tmdb'
                });
                return;
            }
        } catch (e) {
            debug('Activity.push failed', e);
        }

        if (Lampa.Noty) Lampa.Noty.show('Не удалось открыть торрент');
    }

    function scheduleRender() {
        REFRESH_DELAYS.forEach(function (wait) {
            setTimeout(render, wait);
        });
    }

    // === Общий наблюдатель за сменой activity ===
    function watchWrap() {
        if (mainObserver) { mainObserver.disconnect(); mainObserver = null; }
        if (typeof MutationObserver === 'undefined') return;

        var wrap = document.querySelector('.wrap__content') || document.body;
        if (!wrap) return;

        mainObserver = new MutationObserver(function () {
            if (watchTimer) clearTimeout(watchTimer);
            watchTimer = setTimeout(function () {
                render();
            }, 200);
        });
        mainObserver.observe(wrap, {childList: true, subtree: true});
    }

    function init() {
        if (!Lampa || !Lampa.Listener) return;

        Lampa.Listener.follow('activity', function (event) {
            if (!event || event.type !== 'complite') return;
            // Проверяем именно компонент
            var active = event.object && event.object.activity;
            if (!active) return;
            if (active.component === 'main' || active.url === 'main') {
                debug('main activity complite');
                scheduleRender();
                watchWrap();
            } else {
                // Ушли с главной — убираем блок
                $('.items-line.ctv-main-line').remove();
            }
        });

        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                scheduleRender();
                watchWrap();
            }
        });

        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('focus', function () {
                if (isMainActivity()) scheduleRender();
            });
        }

        debug('ready');
    }

    if (window.appready) init();
    else if (Lampa.Listener) Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
    else setTimeout(init, 1000);
})();
