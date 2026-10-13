/*
 * Continue Torrent — полка "Продолжить торренты" на главной
 * Версия: 2.0.0 — через Lampa.ContentRows (штатный механизм Lampa)
 */
(function () {
    'use strict';

    if (window.__lampa_continue_torrent_main) return;
    window.__lampa_continue_torrent_main = true;

    var STORAGE = 'lampa_continue_torrent_v2';
    var MAX_CARDS = 20;
    var ROW_NAME = 'ctv-main-line';

    var currentRow = null;
    var currentScreen = null;

    function t(v) { return v === undefined || v === null ? '' : String(v).trim(); }
    function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }

    function debug() {
        try {
            if (localStorage.getItem('lampa_continue_torrent_debug') !== 'true') return;
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[ContinueTorrent-main v2.0.0]');
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
                (series ? ' card--tv' : '') + '" ' +
                'data-ctv-key="' + escapeAttr(key) + '">' +
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

        rows.sort(function (a, b) { return b.updated - a.updated; });
        return rows.slice(0, MAX_CARDS);
    }

    function buildScreen() {
        var rows = collectRecords();
        if (!rows.length) return '';
        return rows.map(function (r) { return cardHtml(r.record, r.key); }).join('');
    }

    function rowObject() {
        return {
            name: ROW_NAME,
            title: 'Продолжить торренты',
            screen: function () {
                return buildScreen();
            }
        };
    }

    function removeRow() {
        if (!Lampa.ContentRows || typeof Lampa.ContentRows.remove !== 'function') return;
        if (!currentRow) return;
        try {
            Lampa.ContentRows.remove(currentRow);
            debug('content row removed');
        } catch (e) {
            debug('ContentRows.remove failed', e);
        }
        currentRow = null;
    }

    function installRow() {
        if (!Lampa.ContentRows || typeof Lampa.ContentRows.add !== 'function') {
            debug('ContentRows API unavailable');
            return;
        }

        removeRow();

        // Если нет записей — не добавляем пустую полку.
        if (!collectRecords().length) {
            debug('no records, skip content row');
            return;
        }

        try {
            currentRow = rowObject();
            Lampa.ContentRows.add(currentRow);
            debug('content row added');
            bindCardHandlers();
        } catch (e) {
            debug('ContentRows.add failed', e);
            currentRow = null;
        }
    }

    function bindCardHandlers() {
        // Lampa создаёт DOM позже, поэтому вешаем делегированный обработчик
        // на весь документ один раз.
        if (window.__ctv_main_click_bound) return;
        window.__ctv_main_click_bound = true;

        $(document).on('hover:enter', '.ctv-main-card', function () {
            var key = t($(this).attr('data-ctv-key'));
            if (!key) return;
            openCard(key);
        });

        $(document).on('click', '.ctv-main-card', function () {
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

        try {
            if (Lampa.Activity && Lampa.Activity.push) {
                // Передаём id и source на верхнем уровне,
                // чтобы Lampa сама сформировала TMDB-запрос.
                Lampa.Activity.push({
                    url: '',
                    component: 'full',
                    id: id,
                    source: source,
                    card: {
                        id: id,
                        source: source,
                        title: t(record.card_title) || t(record.torrent_title) || '',
                        name: t(record.card_title) || t(record.torrent_title) || ''
                    }
                });
                return;
            }
        } catch (e) { debug('Activity.push failed', e); }

        if (Lampa.Noty) Lampa.Noty.show('Не удалось открыть торрент');
    }

    function init() {
        if (!Lampa || !Lampa.Listener) return;

        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                installRow();
                bindCardHandlers();
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (!event || event.type !== 'complite') return;
            var active = event.object && event.object.activity;
            if (!active) return;
            if (active.component === 'main' || active.url === 'main') {
                installRow();
            }
        });

        installRow();
        bindCardHandlers();
        debug('ready');
    }

    if (window.appready) init();
    else if (Lampa.Listener) Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
    else setTimeout(init, 1000);
})();
