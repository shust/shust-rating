(function () {
    'use strict';

    var PLUGIN_NAME = 'episode-torrent-control';
    var LONG_PRESS_MS = 600; // длительность долгого тапа

    // Ждём загрузку Lampa
    function whenReady(callback) {
        if (window.Lampa && Lampa.Listener) {
            callback();
        } else {
            setTimeout(function () { whenReady(callback); }, 300);
        }
    }

    whenReady(function () {
        console.log('[' + PLUGIN_NAME + '] loaded');

        // ---------- Вспомогательные функции ----------

        // Получить текущий сезон из заголовка блока серий
        function getCurrentSeason() {
            // Ищем активный блок серий: "Сезон 2" и т.п.
            var lines = document.querySelectorAll('.items-line');
            for (var i = lines.length - 1; i >= 0; i--) {
                var titleEl = lines[i].querySelector('.items-line__title');
                if (!titleEl) continue;
                var m = titleEl.textContent.trim().match(/^Сезон\s+(\d+)/i);
                if (m && lines[i].querySelector('.full-episode')) {
                    return parseInt(m[1], 10);
                }
            }
            // fallback: пробуем из кнопки "Продолжить"
            var cont = document.querySelector('.view--continue-torrent-v2');
            if (cont) {
                var m2 = cont.textContent.match(/Сезон\s+(\d+)/i);
                if (m2) return parseInt(m2[1], 10);
            }
            return null;
        }

        // Получить номер серии из карточки
        function getEpisodeNumber(card) {
            var numEl = card.querySelector('.full-episode__num');
            if (!numEl) return null;
            var n = parseInt(numEl.textContent.trim(), 10);
            return isNaN(n) ? null : n;
        }

        // Получить название серии
        function getEpisodeName(card) {
            var el = card.querySelector('.full-episode__name');
            return el ? el.textContent.trim() : '';
        }

        // Пометить серию просмотренной / снять просмотр
        // Lampa хранит просмотренные серии в localStorage (timeline / viewed)
        function setViewed(card, viewed) {
            var epNum = getEpisodeNumber(card);
            if (epNum === null) return;

            // Пробуем через нативный API Lampa, если доступен
            if (window.Lampa && Lampa.Timeline && Lampa.Timeline.viewed) {
                try {
                    // Получаем объект текущего сериала
                    var card_data = getCurrentCardData();
                    if (card_data) {
                        var season = getCurrentSeason() || 1;
                        if (viewed) {
                            Lampa.Timeline.viewed(card_data, {
                                season: season,
                                episode: epNum
                            });
                        } else {
                            Lampa.Timeline.remove(card_data, {
                                season: season,
                                episode: epNum
                            });
                        }
                    }
                } catch (e) {
                    console.warn('[' + PLUGIN_NAME + '] Timeline error', e);
                }
            }

            // Визуально обновляем класс
            if (viewed) {
                card.classList.add('full-episode--viewed');
                if (!card.querySelector('.full-episode__viewed')) {
                    var mark = document.createElement('div');
                    mark.className = 'full-episode__viewed';
                    mark.innerHTML = '<svg><use xlink:href="#sprite-viewed"></use></svg>';
                    card.appendChild(mark);
                }
            } else {
                card.classList.remove('full-episode--viewed');
                var mark = card.querySelector('.full-episode__viewed');
                if (mark) mark.remove();
            }

            // Сохраняем в localStorage Lampa-совместимым способом
            try {
                var key = 'viewed_episodes_' + (getCurrentCardData() ? getCurrentCardData().id : 'unknown');
                var store = JSON.parse(localStorage.getItem(key) || '{}');
                var season = getCurrentSeason() || 1;
                var sKey = 's' + season;
                if (!store[sKey]) store[sKey] = {};
                if (viewed) {
                    store[sKey][epNum] = 1;
                } else {
                    delete store[sKey][epNum];
                }
                localStorage.setItem(key, JSON.stringify(store));
            } catch (e) { /* ignore */ }
        }

        // Получить данные текущего открытого сериала (id, title, etc.)
        function getCurrentCardData() {
            // Lampa хранит активный объект в Lampa.Activity.active
            try {
                if (window.Lampa && Lampa.Activity && Lampa.Activity.active) {
                    var a = Lampa.Activity.active();
                    if (a && a.card) return a.card;
                    if (a && a.movie) return a.movie;
                }
            } catch (e) { /* ignore */ }

            // fallback: пробуем вытащить из DOM
            var titleEl = document.querySelector('.full-start-new__title img');
            var id = null;
            var title = '';
            if (titleEl) {
                title = titleEl.getAttribute('alt') || '';
            } else {
                var t2 = document.querySelector('.full-start-new__title');
                if (t2) title = t2.textContent.trim();
            }
            // id можно попробовать из URL/хэша
            try {
                var hash = location.hash;
                var m = hash.match(/(?:movie|tv)\/(\d+)/);
                if (m) id = m[1];
            } catch (e) { /* ignore */ }

            return { id: id, title: title, name: title };
        }

        // ---------- Открытие торрентов для конкретного сезона/серии ----------

        function openTorrentsForEpisode(season, episode) {
            console.log('[' + PLUGIN_NAME + '] open torrents', season, episode);

            // Lampa ищет кнопку "Торренты" и эмулирует клик,
            // предварительно выставив активный сезон/серию.
            // Проще всего — найти кнопку "Продолжить" и подменить её данные,
            // либо открыть модалку торрентов напрямую.

            var card = getCurrentCardData();

            // Способ 1: через нативный API Lampa (если есть)
            if (window.Lampa && Lampa.Torrent && typeof Lampa.Torrent.open === 'function') {
                try {
                    Lampa.Torrent.open(card, {
                        season: season,
                        episode: episode
                    });
                    return;
                } catch (e) {
                    console.warn('[' + PLUGIN_NAME + '] Lampa.Torrent.open failed', e);
                }
            }

            // Способ 2: эмулируем клик по кнопке "Торренты",
            // предварительно установив сезон/серию в объекте активности
            try {
                if (window.Lampa && Lampa.Activity && Lampa.Activity.active) {
                    var a = Lampa.Activity.active();
                    if (a) {
                        a.season = season;
                        a.episode = episode;
                        // некоторые версии хранят в a.card
                        if (a.card) {
                            a.card.season = season;
                            a.card.episode = episode;
                        }
                    }
                }
            } catch (e) { /* ignore */ }

            // Находим кнопку торрентов на странице
            var torrentBtn = document.querySelector('.full-start__button.view--torrent')
                          || document.querySelector('.full-start__button.button--priority');
            if (torrentBtn) {
                torrentBtn.click();
                return;
            }

            // Способ 3: если есть кнопка "Продолжить" — жмём её
            var contBtn = document.querySelector('.view--continue-torrent-v2');
            if (contBtn) {
                contBtn.click();
                return;
            }

            // Если ничего не нашли — уведомление
            if (window.Lampa && Lampa.Noty) {
                Lampa.Noty.show('Не удалось открыть торренты для S' + season + 'E' + episode);
            }
        }

        // ---------- Попап с действиями ----------

        function showEpisodePopup(card, season, episode) {
            var isViewed = card.classList.contains('full-episode--viewed');
            var name = getEpisodeName(card);

            // Создаём модалку
            var modal = document.createElement('div');
            modal.className = 'episode-popup-layer';
            modal.innerHTML =
                '<div class="episode-popup">' +
                    '<div class="episode-popup__title">Сезон ' + season + ' · Серия ' + episode + '</div>' +
                    '<div class="episode-popup__subtitle">' + (name ? name : '') + '</div>' +
                    '<div class="episode-popup__actions">' +
                        '<div class="episode-popup__btn" data-action="viewed">' +
                            (isViewed ? 'Отменить просмотр' : 'Отметить просмотренной') +
                        '</div>' +
                        '<div class="episode-popup__btn" data-action="torrent">' +
                            'Открыть торренты' +
                        '</div>' +
                        '<div class="episode-popup__btn episode-popup__btn--cancel" data-action="cancel">' +
                            'Отмена' +
                        '</div>' +
                    '</div>' +
                '</div>';

            // Стили
            var style = document.createElement('style');
            style.textContent = `
                .episode-popup-layer {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(0,0,0,0.6);
                    display: flex; align-items: center; justify-content: center;
                }
                .episode-popup {
                    background: #1d1f20; border-radius: 12px;
                    padding: 24px; min-width: 320px; max-width: 90vw;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                    color: #fff;
                }
                .episode-popup__title { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
                .episode-popup__subtitle { font-size: 14px; opacity: 0.7; margin-bottom: 18px; }
                .episode-popup__actions { display: flex; flex-direction: column; gap: 10px; }
                .episode-popup__btn {
                    padding: 12px 16px; border-radius: 8px;
                    background: rgba(255,255,255,0.08);
                    cursor: pointer; text-align: center;
                    transition: background 0.15s;
                    user-select: none;
                }
                .episode-popup__btn:hover, .episode-popup__btn:focus {
                    background: rgba(255,255,255,0.2);
                    outline: none;
                }
                .episode-popup__btn--cancel { opacity: 0.6; }
            `;
            document.head.appendChild(style);
            document.body.appendChild(modal);

            // Фокус для Android TV
            var btns = modal.querySelectorAll('.episode-popup__btn');
            var currentFocus = 0;
            function updateFocus() {
                btns.forEach(function (b, i) {
                    b.classList.toggle('focus', i === currentFocus);
                });
            }
            updateFocus();

            function close() {
                modal.remove();
                style.remove();
                document.removeEventListener('keydown', onKey, true);
            }

            function onKey(e) {
                var key = e.keyCode || e.which;
                if (key === 38) { // up
                    currentFocus = (currentFocus - 1 + btns.length) % btns.length;
                    updateFocus(); e.preventDefault(); e.stopPropagation();
                } else if (key === 40) { // down
                    currentFocus = (currentFocus + 1) % btns.length;
                    updateFocus(); e.preventDefault(); e.stopPropagation();
                } else if (key === 13 || key === 23) { // enter / dpad center
                    btns[currentFocus].click();
                    e.preventDefault(); e.stopPropagation();
                } else if (key === 27 || key === 4) { // back
                    close();
                    e.preventDefault(); e.stopPropagation();
                }
            }
            document.addEventListener('keydown', onKey, true);

            btns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var action = btn.getAttribute('data-action');
                    if (action === 'viewed') {
                        setViewed(card, !isViewed);
                    } else if (action === 'torrent') {
                        openTorrentsForEpisode(season, episode);
                    }
                    close();
                });
            });

            // Закрытие по клику на фон
            modal.addEventListener('click', function (e) {
                if (e.target === modal) close();
            });
        }

        // ---------- Перехват кликов по сериям ----------

        function attachHandlers() {
            var cards = document.querySelectorAll('.full-episode--small:not([data-ep-handled])');
            cards.forEach(function (card) {
                card.setAttribute('data-ep-handled', '1');

                var pressTimer = null;
                var longPressed = false;
                var startX = 0, startY = 0;

                function startPress(e) {
                    longPressed = false;
                    var t = e.touches ? e.touches[0] : e;
                    startX = t.clientX;
                    startY = t.clientY;

                    pressTimer = setTimeout(function () {
                        longPressed = true;
                        var season = getCurrentSeason() || 1;
                        var ep = getEpisodeNumber(card);
                        if (ep !== null) {
                            showEpisodePopup(card, season, ep);
                        }
                    }, LONG_PRESS_MS);
                }

                function cancelPress() {
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                }

                function movePress(e) {
                    var t = e.touches ? e.touches[0] : e;
                    if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
                        cancelPress();
                    }
                }

                // touch события
                card.addEventListener('touchstart', startPress, { passive: true });
                card.addEventListener('touchend', cancelPress);
                card.addEventListener('touchmove', movePress, { passive: true });
                card.addEventListener('touchcancel', cancelPress);

                // mouse события (для отладки на ПК)
                card.addEventListener('mousedown', startPress);
                card.addEventListener('mouseup', cancelPress);
                card.addEventListener('mouseleave', cancelPress);
                card.addEventListener('mousemove', movePress);

                // Перехват обычного клика
                card.addEventListener('click', function (e) {
                    if (longPressed) {
                        longPressed = false;
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }

                    // Обычный клик: открываем торренты на нужной серии
                    var season = getCurrentSeason();
                    var ep = getEpisodeNumber(card);
                    if (season !== null && ep !== null) {
                        e.preventDefault();
                        e.stopPropagation();
                        openTorrentsForEpisode(season, ep);
                        return false;
                    }
                }, true); // capture phase, чтобы перехватить до Lampa

                // Перехват Enter на Android TV (фокус на карточке)
                card.addEventListener('keydown', function (e) {
                    var key = e.keyCode || e.which;
                    if (key === 13 || key === 23) {
                        // Enter — открываем торренты
                        e.preventDefault();
                        e.stopPropagation();
                        var season = getCurrentSeason();
                        var ep = getEpisodeNumber(card);
                        if (season !== null && ep !== null) {
                            openTorrentsForEpisode(season, ep);
                        }
                        return false;
                    }
                }, true);
            });
        }

        // ---------- Наблюдение за DOM ----------

        var observer = new MutationObserver(function () {
            attachHandlers();
        });

        function startObserving() {
            var target = document.querySelector('.wrap__content') || document.body;
            observer.observe(target, { childList: true, subtree: true });
            attachHandlers();
        }

        // Запускаем после открытия страницы сериала
        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite' || e.type === 'render') {
                    setTimeout(startObserving, 500);
                }
            });
        }

        // Также на всякий случай
        setTimeout(startObserving, 2000);

        console.log('[' + PLUGIN_NAME + '] initialized');
    });
})();