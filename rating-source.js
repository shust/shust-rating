/*
 * rating-source.js
 * Заменяет рейтинг TMDB на Кинопоиск или IMDb.
 * Работает везде, кроме заголовка открытой карточки.
 * Источники: rating.kinopoisk.ru (XML) + kinopoiskapiunofficial.tech (fallback)
 *            OMDb (для IMDb)
 */

(function () {
    'use strict';

    if (window.ratingSourcePlugin) return;
    window.ratingSourcePlugin = true;

    // ============================================================
    // НАСТРОЙКИ
    // ============================================================
    var SETTINGS = {
        source: 'rating_source_plugin_source',   // 'kp' | 'imdb'
        hideIcon: 'rating_source_plugin_hide_icon',
        cache: 'rating_source_plugin_cache'
    };

    var CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней
    var KP_API_KEY = '3c47e3a8-a70f-447c-80a7-8ce15d93e66e';
    var OMDB_KEY = '73ff4450';
    var REQUEST_TIMEOUT = 5000;

    // SVG-иконки
    var KP_ICON =
        '<svg viewBox="0 0 202 202" xmlns="http://www.w3.org/2000/svg" style="width:1em;height:1em;vertical-align:-0.15em;margin-right:0.25em;">' +
        '<path fill="#FF5500" fill-rule="evenodd" clip-rule="evenodd" d="M45 0H157C181.853 0 202 20.1472 202 45V157C202 181.853 181.853 202 157 202H45C20.1472 202 0 181.853 0 157V45C0 20.1472 20.1472 0 45 0ZM41 41H61.7432V84.5449L93.1143 41H118.657L72.5771 88.3301L161 41V63.2861L81.9473 94.9971L161 89.8574V112.143L81.4434 106.798L161 138.714V161L73.7734 115.158L118.657 161H93.1143L61.7432 117.526V161H41V41Z"/>' +
        '</svg>';

    var IMDB_ICON =
        '<svg viewBox="0 0 202 202" xmlns="http://www.w3.org/2000/svg" style="width:1em;height:1em;vertical-align:-0.15em;margin-right:0.25em;">' +
        '<rect width="202" height="202" rx="20" fill="#F5C518"/>' +
        '<text x="101" y="135" font-family="Arial Black, Arial" font-size="90" font-weight="900" fill="#000" text-anchor="middle">IMDb</text>' +
        '</svg>';

    // ============================================================
    // УТИЛИТЫ
    // ============================================================
    function getSource() {
        return Lampa.Storage.get(SETTINGS.source, 'kp');
    }

    function isIconHidden() {
        return Lampa.Storage.get(SETTINGS.hideIcon, false) === true;
    }

    function formatRating(value) {
        if (value === null || value === undefined || value === '') return '--';
        var num = parseFloat(value);
        if (isNaN(num) || num <= 0) return '--';
        return num.toFixed(1);
    }

    function getCardType(card) {
        if (card.media_type === 'movie' || card.media_type === 'tv') return card.media_type;
        if (card.type === 'movie' || card.type === 'tv') return card.type;
        if (card.first_air_date || card.name || card.original_name || card.number_of_seasons) return 'tv';
        return 'movie';
    }

    function getCache() {
        return Lampa.Storage.get(SETTINGS.cache, {}) || {};
    }

    function getCached(key) {
        var cache = getCache();
        var item = cache[key];
        if (!item) return null;
        if (Date.now() - item.timestamp > CACHE_TTL) {
            delete cache[key];
            Lampa.Storage.set(SETTINGS.cache, cache);
            return null;
        }
        return item;
    }

    function setCached(key, value) {
        var cache = getCache();
        cache[key] = { value: value, timestamp: Date.now() };
        Lampa.Storage.set(SETTINGS.cache, cache);
    }

    // ============================================================
    // ЗАПРОСЫ
    // ============================================================

    // Кинопоиск: XML + API параллельно, берём первый успешный ответ
    function fetchKinopoisk(filmId, callback) {
        var done = false;
        var result = { kp: null, imdb: null };

        function finish() {
            if (done) return;
            done = true;
            if (result.kp || result.imdb) callback(result);
            else callback(null);
        }

        var timer = setTimeout(finish, REQUEST_TIMEOUT);

        // XML (быстрее всего)
        fetch('https://rating.kinopoisk.ru/' + filmId + '.xml')
            .then(function (r) { return r.text(); })
            .then(function (xml) {
                try {
                    var doc = new DOMParser().parseFromString(xml, 'text/xml');
                    var kpNode = doc.getElementsByTagName('kp_rating')[0];
                    var imdbNode = doc.getElementsByTagName('imdb_rating')[0];
                    if (kpNode) result.kp = parseFloat(kpNode.textContent) || null;
                    if (imdbNode) result.imdb = parseFloat(imdbNode.textContent) || null;
                } catch (e) {}
                clearTimeout(timer);
                finish();
            })
            .catch(function () {});

        // API (параллельно)
        fetch('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + filmId, {
            headers: { 'X-API-KEY': KP_API_KEY }
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!result.kp && data.ratingKinopoisk) result.kp = data.ratingKinopoisk;
                if (!result.imdb && data.ratingImdb) result.imdb = data.ratingImdb;
                clearTimeout(timer);
                finish();
            })
            .catch(function () {});
    }

    // Поиск filmId по названию (если kinopoisk_id нет)
    function searchKinopoisk(title, year, callback) {
        var url = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' +
            encodeURIComponent(title);

        fetch(url, { headers: { 'X-API-KEY': KP_API_KEY } })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.films || !data.films.length) return callback(null);
                var best = data.films[0];
                if (year) {
                    for (var i = 0; i < data.films.length; i++) {
                        var f = data.films[i];
                        if (f.year && parseInt(f.year.substring(0, 4), 10) === parseInt(year, 10)) {
                            best = f;
                            break;
                        }
                    }
                }
                callback(best.filmId || null);
            })
            .catch(function () { callback(null); });
    }

    // IMDb через OMDb
    function fetchImdb(imdbId, callback) {
        var url = 'https://www.omdbapi.com/?apikey=' + OMDB_KEY + '&i=' + imdbId;
        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A') {
                    var val = parseFloat(data.imdbRating);
                    callback(isNaN(val) ? null : val);
                } else {
                    callback(null);
                }
            })
            .catch(function () { callback(null); });
    }

    // ============================================================
    // ПОЛУЧЕНИЕ РЕЙТИНГА ДЛЯ КАРТОЧКИ
    // ============================================================
    function getRatingForCard(card, callback) {
        var source = getSource();
        var cacheKey = source + '_' + (card.imdb_id || card.kinopoisk_id || card.id);
        var cached = getCached(cacheKey);
        if (cached) return callback(cached.value);

        var done = false;
        function finish(val) {
            if (done) return;
            done = true;
            setCached(cacheKey, val);
            callback(val);
        }

        var timer = setTimeout(function () { finish(null); }, REQUEST_TIMEOUT + 500);

        if (source === 'imdb') {
            if (card.imdb_id) {
                fetchImdb(card.imdb_id, function (val) {
                    clearTimeout(timer);
                    finish(val);
                });
            } else {
                // Нет imdb_id — пробуем через Кинопоиск
                tryKinopoiskForImdb(card, function (val) {
                    clearTimeout(timer);
                    finish(val);
                });
            }
        } else {
            // Кинопоиск
            if (card.kinopoisk_id) {
                fetchKinopoisk(card.kinopoisk_id, function (res) {
                    clearTimeout(timer);
                    finish(res ? res.kp : null);
                });
            } else {
                var title = card.original_title || card.title || card.original_name || card.name || '';
                var year = (card.release_date || card.first_air_date || '').substring(0, 4);
                if (!title) { clearTimeout(timer); return finish(null); }
                searchKinopoisk(title, year, function (filmId) {
                    if (!filmId) { clearTimeout(timer); return finish(null); }
                    fetchKinopoisk(filmId, function (res) {
                        clearTimeout(timer);
                        finish(res ? res.kp : null);
                    });
                });
            }
        }

        function tryKinopoiskForImdb(card, cb) {
            var title = card.original_title || card.title || card.original_name || card.name || '';
            var year = (card.release_date || card.first_air_date || '').substring(0, 4);
            if (!title) return cb(null);
            searchKinopoisk(title, year, function (filmId) {
                if (!filmId) return cb(null);
                fetchKinopoisk(filmId, function (res) {
                    cb(res ? res.imdb : null);
                });
            });
        }
    }

    // ============================================================
    // ОТРИСОВКА
    // ============================================================
    function buildRatingHtml(value) {
        var text = formatRating(value);
        if (isIconHidden() || text === '--') return text;
        var icon = getSource() === 'imdb' ? IMDB_ICON : KP_ICON;
        return icon + '<span>' + text + '</span>';
    }

    // Заменяем рейтинг в карточке-постере
    function processPosterCard(cardEl) {
        var $card = $(cardEl);
        if (!$card.length) return;

        var $vote = $card.find('.card__vote').first();
        if (!$vote.length) return;
        if ($vote.data('rating-source-done')) return;

        var data = $card.data('card') || $card.data('movie');
        if (!data || !data.id) {
            // Пробуем вытащить из Lampa
            try {
                var active = Lampa.Activity.active();
                if (active && active.card) data = active.card;
            } catch (e) {}
        }
        if (!data || !data.id) return;

        $vote.data('rating-source-done', true);

        getRatingForCard(data, function (value) {
            $vote.html(buildRatingHtml(value));
        });
    }

    // Обработка всех карточек внутри контейнера
    function processCardsIn(container) {
        var $container = $(container);
        if (!$container.length) return;
        $container.find('.card').each(function () {
            processPosterCard(this);
        });
    }

    // ============================================================
    // НАСТРОЙКИ
    // ============================================================
    function initSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'rating_source_plugin',
            name: 'Источник рейтинга',
            icon: KP_ICON
        });

        Lampa.SettingsApi.addParam({
            component: 'rating_source_plugin',
            param: {
                name: SETTINGS.source,
                type: 'select',
                values: { kp: 'Кинопоиск', imdb: 'IMDb' },
                default: 'kp'
            },
            field: {
                name: 'Источник рейтинга',
                description: 'Какой рейтинг показывать вместо TMDB'
            },
            onChange: function () {
                // Сбрасываем кэш и перерисовываем
                Lampa.Storage.set(SETTINGS.cache, {});
                $('.card__vote').removeData('rating-source-done');
                processCardsIn(document.body);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'rating_source_plugin',
            param: {
                name: SETTINGS.hideIcon,
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Скрыть иконку рейтинга',
                description: 'Оставить только цифры, без логотипа источника'
            },
            onChange: function () {
                $('.card__vote').removeData('rating-source-done');
                processCardsIn(document.body);
            }
        });
    }

    // ============================================================
    // ПЕРЕХВАТЫ
    // ============================================================
    function start() {
        initSettings();

        // 1. Полное открытие карточки — обрабатываем ТОЛЬКО вложенные карточки,
        //    НЕ трогаем заголовок (.full-start-new__rate-line)
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;
            var render = e.object.activity.render();
            setTimeout(function () {
                processCardsIn(render);
            }, 200);
        });

        // 2. Отрисовка карточек через событие card
        Lampa.Listener.follow('card', function (e) {
            if (e.type === 'render' || e.type === 'visible') {
                setTimeout(function () {
                    processPosterCard(e.object);
                }, 100);
            }
        });

        // 3. MutationObserver — ловим все новые .card
        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes || [];
                for (var j = 0; j < nodes.length; j++) {
                    var node = nodes[j];
                    if (!node || node.nodeType !== 1) continue;
                    if (node.classList && node.classList.contains('card')) {
                        processPosterCard(node);
                    } else {
                        processCardsIn(node);
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // 4. Первичный проход
        setTimeout(function () { processCardsIn(document.body); }, 500);
        setTimeout(function () { processCardsIn(document.body); }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();