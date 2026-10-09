(function () {
    'use strict';

    Lampa.Platform.tv();

    // ================== НАСТРОЙКИ ==================
    const SETTINGS = {
        source: 'rating_source',      // ключ настройки источника
        hideIcon: 'hide_rating_icon', // ключ настройки скрытия иконки
    };

    // ================== КЭШ ==================
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа
    const cache = {
        get(key, id) {
            const store = Lampa.Storage.get(key, {});
            const item = store[id];
            if (!item) return null;
            if (Date.now() - item.timestamp > CACHE_TTL) {
                delete store[id];
                Lampa.Storage.set(key, store);
                return null;
            }
            return item;
        },
        set(key, id, value) {
            const store = Lampa.Storage.get(key, {});
            value.timestamp = Date.now();
            store[id] = value;
            Lampa.Storage.set(key, store);
        }
    };

    // ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================
    function getSource() {
        return Lampa.Storage.get(SETTINGS.source, 'tmdb');
    }

    function isIconHidden() {
        return Lampa.Storage.get(SETTINGS.hideIcon, false);
    }

    function formatRating(value) {
        if (!value || value === 0 || isNaN(value)) return '--';
        return parseFloat(value).toFixed(1);
    }

    // ================== API ЗАПРОСЫ ==================
    function fetchKinopoisk(filmId, callback) {
        const url = `https://kinopoiskapiunofficial.tech/api/v2.2/films/${filmId}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 5000;
        xhr.setRequestHeader('X-API-KEY', '14342b35-714b-449d-bf10-30d0d9ac22e6');
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    callback({
                        kp: data.ratingKinopoisk || 0,
                        imdb: data.ratingImdb || 0
                    });
                } catch (e) {
                    callback(null);
                }
            } else {
                callback(null);
            }
        };
        xhr.onerror = xhr.ontimeout = () => callback(null);
        xhr.send();
    }

    function fetchImdb(imdbId, callback) {
        const url = `https://rating.kinopoisk.ru/${imdbId}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 5000;
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    callback({
                        kp: data.ratingKinopoisk || 0,
                        imdb: data.ratingImdb || 0
                    });
                } catch (e) {
                    callback(null);
                }
            } else {
                callback(null);
            }
        };
        xhr.onerror = xhr.ontimeout = () => callback(null);
        xhr.send();
    }

    // ================== ОТРИСОВКА РЕЙТИНГА ==================
    function renderRating(card, data, callback) {
        const source = getSource();
        const hideIcon = isIconHidden();

        let rating = '--';
        if (source === 'kp') rating = formatRating(data.kp);
        else if (source === 'imdb') rating = formatRating(data.imdb);
        else if (source === 'tmdb') rating = formatRating(data.tmdb);

        let html = rating;
        if (!hideIcon) {
            // добавляем иконку (звёздочку) только если не скрыта
            html = `<span class="rating-icon">★</span> ${rating}`;
        }

        callback(html);
    }

    // ================== ОБРАБОТКА КАРТОЧКИ ==================
    function processCard(card) {
        const data = card.data || card.card_data || {};
        if (!data.id) return;

        const source = getSource();
        const cacheKey = `rating_${data.id}_${source}`;
        const cached = cache.get('rating_cache', cacheKey);
        if (cached) {
            renderRating(card, cached, (html) => {
                updateCardElement(card, html);
            });
            return;
        }

        // Параллельные запросы
        let results = { kp: 0, imdb: 0, tmdb: data.vote_average || 0 };
        let completed = 0;

        const tryFinish = () => {
            completed++;
            if (completed >= 2) {
                cache.set('rating_cache', cacheKey, results);
                renderRating(card, results, (html) => {
                    updateCardElement(card, html);
                });
            }
        };

        // Кинопоиск
        if (data.kinopoisk_id || data.kp_id) {
            fetchKinopoisk(data.kinopoisk_id || data.kp_id, (res) => {
                if (res) {
                    results.kp = res.kp;
                    results.imdb = res.imdb;
                }
                tryFinish();
            });
        } else {
            tryFinish();
        }

        // IMDB
        if (data.imdb_id) {
            fetchImdb(data.imdb_id, (res) => {
                if (res) {
                    results.kp = res.kp || results.kp;
                    results.imdb = res.imdb || results.imdb;
                }
                tryFinish();
            });
        } else {
            tryFinish();
        }
    }

    function updateCardElement(card, html) {
        const element = card.html || card;
        if (!element) return;
        const voteEl = element.querySelector('.card__vote') || element;
        if (voteEl) {
            voteEl.innerHTML = html;
        }
    }

    // ================== НАСТРОЙКИ В LAMPA ==================
    function initSettings() {
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: SETTINGS.source,
                type: 'select',
                values: {
                    tmdb: 'TMDB',
                    kp: 'КиноПоиск',
                    imdb: 'IMDB',
                    bylampa: 'ByLAMPA',
                    lampa: 'Lampa'
                },
                default: 'tmdb'
            },
            field: {
                name: 'Источник рейтинга на карточках',
                description: 'Выберите, какой рейтинг отображать'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: SETTINGS.hideIcon,
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Скрыть иконку рейтинга',
                description: 'Оставить только цифры, без звёздочек и логотипов'
            }
        });
    }

    // ================== ЗАПУСК ==================
    function start() {
        if (window.rating_plugin_loaded) return;
        window.rating_plugin_loaded = true;

        initSettings();

        // Перехват создания карточек
        const Card = Lampa.Component.get('Card');
        if (Card && Card.prototype && Card.prototype.onVisible) {
            const original = Card.prototype.onVisible;
            Card.prototype.onVisible = function () {
                original.apply(this);
                processCard({ data: this.card_data, html: this.html });
            };
        }

        // Подписка на событие ready
        if (window.appready) {
            start();
        } else {
            Lampa.Listener.follow('app', (e) => {
                if (e.type === 'ready') start();
            });
        }
    }

    // ================== СТИЛИ ==================
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .card__vote {
                display: inline-flex !important;
                align-items: center !important;
                font-size: 1.3em;
                font-weight: 700;
                color: #fff;
            }
            .card__vote .rating-icon {
                color: #ffd700;
                margin-right: 4px;
                font-size: 0.9em;
            }
        `;
        document.head.appendChild(style);
    }

    injectStyles();
    start();
})();