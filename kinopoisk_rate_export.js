(function () {
    'use strict';

    var network = new Lampa.Reguest();

    // ===== ТВОЙ СОБСТВЕННЫЙ CLOUDFLARE WORKER =====
    var CORS_PROXY = 'https://kinopoisk-proxy.shust-blr.workers.dev';

    // Должно совпадать с limit в воркере!
    var RATINGS_PAGE_SIZE = 15;

    // ======================= ИКОНКИ =======================

    // Пустая звезда — обычная белая (наследует currentColor)
    var starIconEmpty = '<svg class="button--kinopoisk_rating_icon" width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M15.6162 7.10981L15.8464 7.55198L16.3381 7.63428L22.2841 8.62965C22.8678 8.72736 23.0999 9.44167 22.6851 9.86381L18.4598 14.1641L18.1104 14.5196L18.184 15.0127L19.0748 20.9752C19.1622 21.5606 18.5546 22.002 18.025 21.738L12.6295 19.0483L12.1833 18.8259L11.7372 19.0483L6.34171 21.738C5.81206 22.002 5.20443 21.5606 5.29187 20.9752L6.18264 15.0127L6.25629 14.5196L5.9069 14.1641L1.68155 9.86381C1.26677 9.44167 1.49886 8.72736 2.08255 8.62965L8.02855 7.63428L8.52022 7.55198L8.75043 7.10981L11.5345 1.76241C11.8078 1.23748 12.5589 1.23748 12.8322 1.76241L15.6162 7.10981Z" stroke="currentColor" stroke-width="2.2"></path>' +
        '</svg>';

    // Лоадер
    var buttonLoader = '<svg class="button--kinopoisk_rating_icon" xmlns="http://www.w3.org/2000/svg" style="margin:auto;background:none;display:block;shape-rendering:auto;" width="24px" height="24px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" fill="none" stroke="#ffffff" stroke-width="5" r="35" stroke-dasharray="164.93361431346415 56.97787143782138"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform></circle></svg>';

    function makeRatingIcon(rating) {
        var fontSize = String(rating).length > 1 ? 10 : 13;
        return '<svg class="button--kinopoisk_rating_icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="12" cy="12" r="11" fill="#ffffff"/>' +
            '<text x="12" y="12" text-anchor="middle" dominant-baseline="central" ' +
            'fill="#1a1a1a" font-size="' + fontSize + '" font-weight="700" ' +
            'font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" ' +
            'style="user-select:none">' + rating + '</text></svg>';
    }

    function getButtonIcon(rating) {
        return rating ? makeRatingIcon(rating) : starIconEmpty;
    }

    // ======================= AUTH =======================

    function getToken(device_code, refresh) {
        var client_id = 'b8b9c7a09b79452094e12f6990009934';
        var token_data;
        if (!refresh) {
            token_data = {
                grant_type: 'device_code',
                code: device_code,
                client_id: client_id,
                client_secret: '0e7001e272944c05ae5a0df16e3ea8bd'
            };
        } else {
            token_data = {
                grant_type: 'refresh_token',
                refresh_token: device_code,
                client_id: client_id,
                client_secret: '0e7001e272944c05ae5a0df16e3ea8bd'
            };
        }

        network.silent('https://oauth.yandex.ru/token', function (data) {
            if (data.access_token) {
                Lampa.Storage.set('kinopoisk_access_token', data.access_token);
                Lampa.Storage.set('kinopoisk_refresh_token', data.refresh_token);
                Lampa.Storage.set('kinopoisk_token_expires', data.expires_in * 1000 + Date.now());
                Lampa.Modal.close();
                getUserEmail();
                Lampa.Noty.show('Авторизация в Кинопоиске успешна');
            } else {
                Lampa.Noty.show('Не удалось получить token');
                console.log('Kinopoisk Ratings', 'Error during OAuth', data.error);
            }
        }, function (data) {
            Lampa.Noty.show(data.responseJSON ? data.responseJSON.error_description : 'Ошибка авторизации');
            console.log('Kinopoisk Ratings', 'Token error', data);
        }, token_data);
    }

    function getDeviceCode() {
        const uuid4 = () => {
            const ho = (n, p) => n.toString(16).padStart(p, 0);
            const data = crypto.getRandomValues(new Uint8Array(16));
            data[6] = (data[6] & 0xf) | 0x40;
            data[8] = (data[8] & 0x3f) | 0x80;
            const view = new DataView(data.buffer);
            return `${ho(view.getUint32(0), 8)}${ho(view.getUint16(4), 4)}${ho(view.getUint16(6), 4)}${ho(view.getUint16(8), 4)}${ho(view.getUint32(10), 8)}${ho(view.getUint16(14), 4)}`;
        };

        Lampa.Storage.set('kinopoisk_deviceid', uuid4());
        var client_id = 'b8b9c7a09b79452094e12f6990009934';
        var device_code_data = {
            client_id: client_id,
            device_id: Lampa.Storage.get('kinopoisk_deviceid', '')
        };

        network.silent('https://oauth.yandex.ru/device/code', function (data) {
            if (data.user_code && data.device_code) {
                let modal = $('<div><div class="about">Перейдите по ссылке <b>https://ya.ru/device</b> на любом устройстве и введите код<br><br><b style="font-size:2em">' + data.user_code + '</b><br><br></div><br><div class="broadcast__device selector" style="text-align:center">Готово</div></div>');
                Lampa.Modal.open({
                    title: 'Авторизация Кинопоиск',
                    html: modal,
                    align: 'center',
                    onBack: () => Lampa.Modal.close(),
                    onSelect: () => getToken(data.device_code, false)
                });
            } else {
                Lampa.Noty.show('Не удалось получить user_code');
                console.log('Kinopoisk Ratings', 'Failed to get user_code', data.error);
            }
        }, function (data) {
            Lampa.Noty.show(data.responseJSON ? data.responseJSON.error_description : 'Ошибка получения кода');
            console.log('Kinopoisk Ratings', 'Failed to get device code', data);
        }, device_code_data);
    }

    function getUserEmail() {
        network.silent('https://login.yandex.ru/info?format=json', function (data) {
            if (data.default_email) {
                Lampa.Storage.set('kinopoisk_email', data.default_email);
                $('div[data-name="kinopoisk_auth"]').find('.settings-param__name').text(data.default_email);
            }
        }, function (data) {
            console.log('Kinopoisk Ratings', 'Failed to get user email', data);
        }, false, {
            type: 'get',
            headers: { 'Authorization': 'OAuth ' + Lampa.Storage.get('kinopoisk_access_token') }
        });
    }

    function checkAndRefreshToken() {
        var token = Lampa.Storage.get('kinopoisk_access_token', '');
        var expires = Lampa.Storage.get('kinopoisk_token_expires', 0);
        if (token && expires < Date.now()) {
            console.log('Kinopoisk Ratings', 'Refreshing token...');
            getToken(Lampa.Storage.get('kinopoisk_refresh_token', ''), true);
        }
    }

    // ======================= RATINGS =======================

    var RATINGS_MAX_RETRIES = 5;
    var RATINGS_RETRY_DELAY = 3000;

    function isTimeoutError(data) {
        if (!data || !data.errors) return false;
        return data.errors.some(function (e) {
            return e.classification === 'TimeoutError' ||
                   e.message === 'TimeoutError' ||
                   (e.extensions && e.extensions.classification === 'TimeoutError');
        });
    }

    function fetchRatingsPage(offset, onSuccess, onError, attempt) {
        attempt = attempt || 1;

        var oauth = Lampa.Storage.get('kinopoisk_access_token');
        if (!oauth) { onError && onError('no_token'); return; }

        console.log('Kinopoisk Ratings',
            'Fetching page offset=' + offset + ' attempt=' + attempt);

        network.silent(CORS_PROXY + '?method=getRated&oauth=' + oauth +
                       '&offset=' + String(offset) + '&limit=' + RATINGS_PAGE_SIZE,
            function (data) {
                if (isTimeoutError(data)) {
                    console.log('Kinopoisk Ratings',
                        'TimeoutError, offset=' + offset + ' attempt=' + attempt);

                    if (attempt < RATINGS_MAX_RETRIES) {
                        setTimeout(function () {
                            fetchRatingsPage(offset, onSuccess, onError, attempt + 1);
                        }, RATINGS_RETRY_DELAY);
                    } else {
                        onError && onError('timeout');
                    }
                    return;
                }

                var userData = data && data.data && data.data.userProfile &&
                               data.data.userProfile.userData;

                if (userData && userData.ratedOrWatchedMovies) {
                    onSuccess && onSuccess(
                        userData.ratedOrWatchedMovies.items || [],
                        userData.ratedOrWatchedMovies.total || 0
                    );
                } else {
                    console.log('Kinopoisk Ratings', 'Unexpected response', data);
                    onError && onError('bad_response');
                }
            },
            function (data) {
                console.log('Kinopoisk Ratings',
                    'Network error offset=' + offset + ' attempt=' + attempt, data);
                if (attempt < RATINGS_MAX_RETRIES) {
                    setTimeout(function () {
                        fetchRatingsPage(offset, onSuccess, onError, attempt + 1);
                    }, RATINGS_RETRY_DELAY);
                } else {
                    onError && onError('network');
                }
            }
        );
    }

    /**
     * Загружает оценки постранично.
     * offset      — с какой записи начинать
     * limit       — true: только первая страница, false: все страницы
     * showResult  — показывать ли уведомления
     * silent      — если true, не показывать уведомления между страницами
     */
    function getKinopoiskRatings(offset, limit, showResult, silent) {
        offset = offset || 0;
        limit = limit !== undefined ? limit : true;
        showResult = showResult !== undefined ? showResult : true;

        fetchRatingsPage(offset, function (items, total) {
            var received = {};
            items.forEach(function (m) {
                if (m.item && m.item.movieUserVote && m.item.movieUserVote.voting.value) {
                    received[m.item.id] = String(m.item.movieUserVote.voting.value);
                }
            });

            var stored = Lampa.Storage.get('kinopoisk_my_ratings', {});
            for (var k in received) stored[k] = received[k];
            Lampa.Storage.set('kinopoisk_my_ratings', stored);

            console.log('Kinopoisk Ratings',
                'Page offset=' + offset + ' received=' + items.length +
                ' total=' + total + ' stored=' + Object.keys(stored).length);

            // Продолжаем пагинацию
            if (!limit && total > offset + RATINGS_PAGE_SIZE) {
                if (!silent) {
                    Lampa.Noty.show('Загружено ' + (offset + items.length) + ' из ' + total);
                }
                // Небольшая пауза между страницами, чтобы не долбить API
                setTimeout(function () {
                    getKinopoiskRatings(offset + RATINGS_PAGE_SIZE, limit, showResult, silent);
                }, 500);
            } else if (showResult) {
                Lampa.Noty.show('Импорт оценок завершён (' + total + ')');
            }
        }, function (reason) {
            if (showResult) {
                Lampa.Noty.show('Не удалось получить оценки с Кинопоиска');
            }
            console.log('Kinopoisk Ratings', 'Import failed', reason);
        });
    }

    function setRating(oauth, kinopoiskId, rating, background) {
        if (!background) $('.button--kinopoisk_rating_icon').replaceWith(buttonLoader);

        network.silent(CORS_PROXY + '?method=setVote&oauth=' + oauth +
                       '&movie=' + String(kinopoiskId) + '&rate=' + rating,
            function (data) {
                if (data && data.data && data.data.movie && data.data.movie.vote &&
                    data.data.movie.vote.set && data.data.movie.vote.set.status === 'SUCCESS') {
                    var ratings = Lampa.Storage.get('kinopoisk_my_ratings', {});
                    ratings[kinopoiskId] = rating;
                    Lampa.Storage.set('kinopoisk_my_ratings', ratings);

                    if (!background) {
                        $('.button--kinopoisk_rating_icon').replaceWith(getButtonIcon(rating));
                        Lampa.Noty.show('Оценка ' + rating + ' установлена');
                    }
                } else {
                    if (!background) {
                        $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                        Lampa.Noty.show('Не удалось обновить оценку');
                    }
                    console.log('Kinopoisk Ratings', 'Error setting rating', data);
                }
            },
            function (data) {
                console.log('Kinopoisk Ratings', 'Error setting rating', data);
                if (!background) $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);

                if (data.statusText && data.statusText === 'timeout') {
                    Lampa.Noty.show('Таймаут, попробуем позже');
                    var postponed = Lampa.Storage.get('kinopoisk_my_ratings_postponed', {});
                    postponed[kinopoiskId] = rating;
                    Lampa.Storage.set('kinopoisk_my_ratings_postponed', postponed);
                } else {
                    Lampa.Noty.show('Не удалось обновить оценку');
                }
            }
        );
    }

    function removeRating(oauth, kinopoiskId) {
        $('.button--kinopoisk_rating_icon').replaceWith(buttonLoader);
        network.silent(CORS_PROXY + '?method=removeVote&oauth=' + oauth +
                       '&movie=' + String(kinopoiskId),
            function (data) {
                if (data && data.data && data.data.movie && data.data.movie.vote &&
                    data.data.movie.vote.remove && data.data.movie.vote.remove.status === 'SUCCESS') {
                    var ratings = Lampa.Storage.get('kinopoisk_my_ratings', {});
                    delete ratings[kinopoiskId];
                    Lampa.Storage.set('kinopoisk_my_ratings', ratings);
                    $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                    Lampa.Noty.show('Оценка удалена');
                } else {
                    $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                    Lampa.Noty.show('Не удалось удалить оценку');
                }
            },
            function (data) {
                $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                Lampa.Noty.show('Не удалось удалить оценку');
                console.log('Kinopoisk Ratings', 'Error removing rating', data);
            }
        );
    }

    // ======================= UI =======================

    function showRatingSelect(kinopoiskId, tmdbId, e) {
        var ratings = Lampa.Storage.get('kinopoisk_my_ratings', {});
        var current = ratings[kinopoiskId];

        let items = [
            { title: '10', selected: current === '10' },
            { title: '9', selected: current === '9' },
            { title: '8', selected: current === '8' },
            { title: '7', selected: current === '7' },
            { title: '6', selected: current === '6' },
            { title: '5', selected: current === '5' },
            { title: '4', selected: current === '4' },
            { title: '3', selected: current === '3' },
            { title: '2', selected: current === '2' },
            { title: '1', selected: current === '1' }
        ];

        if (current) items.push({ title: 'Удалить оценку', delete: true });

        Lampa.Select.show({
            title: 'Оценка на Кинопоиске',
            items: items,
            onSelect: (a) => {
                var oauth = Lampa.Storage.get('kinopoisk_access_token');
                if (!oauth) {
                    Lampa.Noty.show('Авторизуйтесь в настройках Кинопоиска');
                    return;
                }
                if (a.delete) removeRating(oauth, kinopoiskId);
                else setRating(oauth, kinopoiskId, a.title, false);
            },
            onBack: () => Lampa.Controller.toggle('full_start')
        });
    }

    function addRatingButton(e, kinopoiskId) {
        var ratings = Lampa.Storage.get('kinopoisk_my_ratings', {});
        var rate = ratings[kinopoiskId];

        $('.button--kinopoisk_rating').remove();

        $('.full-start-new__buttons')
            .append('<div class="full-start__button selector button--kinopoisk_rating">' +
                getButtonIcon(rate) + '<span>Кинопоиск</span></div>');

        $('.button--kinopoisk_rating').off('hover:enter').on('hover:enter', function () {
            var oauth = Lampa.Storage.get('kinopoisk_access_token');
            if (!oauth) {
                Lampa.Noty.show('Сначала авторизуйтесь в настройках Кинопоиска');
                return;
            }
            showRatingSelect(kinopoiskId, e.data.movie.id, e);
        });
    }

    // ======================= START =======================

    function startPlugin() {
        window.kinopoisk_rating_standalone_ready = true;

        checkAndRefreshToken();

        // Отложенные оценки
        var postponed = Lampa.Storage.get('kinopoisk_my_ratings_postponed', {});
        var delay = 1000;
        Object.keys(postponed).forEach(function (key) {
            setTimeout(setRating, delay,
                Lampa.Storage.get('kinopoisk_access_token'), key, postponed[key], true);
            delay += 1000;
        });

        // Обновление первых 15 оценок при старте (быстро)
        var oauth = Lampa.Storage.get('kinopoisk_access_token');
        if (oauth) getKinopoiskRatings(0, true, false);

        // Хук на карточку фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var kinopoiskId = e.data.movie.kinopoisk_id;
            var tmdbId = e.data.movie.id;

            if (!kinopoiskId && tmdbId) {
                network.silent('https://api.alloha.tv/?token=04941a9a3ca3ac16e2b4327347bbc1&tmdb=' + tmdbId,
                    function (data) {
                        if (data && data.data && data.data.id_kp) {
                            addRatingButton(e, data.data.id_kp);
                        }
                    },
                    function (data) {
                        console.log('Kinopoisk Ratings', 'Failed to get kinopoisk id', data);
                    }
                );
            } else if (kinopoiskId) {
                addRatingButton(e, kinopoiskId);
            }
        });

        // ============= НАСТРОЙКИ =============

        if (!window.lampa_settings.kinopoisk) {
            Lampa.SettingsApi.addComponent({
                component: 'kinopoisk',
                icon: '<svg width="239" height="239" viewBox="0 0 239 239" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M215 121.415l-99.297-6.644 90.943 36.334a106.416 106.416 0 0 0 8.354-29.69z"/><path d="M194.608 171.609C174.933 197.942 143.441 215 107.948 215 48.33 215 0 166.871 0 107.5 0 48.13 48.33 0 107.948 0c35.559 0 67.102 17.122 86.77 43.539l-90.181 48.07L162.57 32.25h-32.169L90.892 86.862V32.25H64.77v150.5h26.123v-54.524l39.509 54.524h32.169l-56.526-57.493 88.564 46.352z"/><path d="M206.646 63.895l-90.308 36.076L215 93.583a106.396 106.396 0 0 0-8.354-29.688z"/></svg>',
                name: 'Кинопоиск'
            });
        }

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'title' },
            field: { name: 'Аккаунт' }
        });

        var kinopoisk_email = Lampa.Storage.get('kinopoisk_email', false);
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_auth' },
            field: { name: kinopoisk_email ? kinopoisk_email : 'Авторизоваться' },
            onChange: () => {
                if (Lampa.Storage.get('kinopoisk_email', false)) {
                    Lampa.Select.show({
                        title: 'Выйти из аккаунта?',
                        items: [{ title: 'Да', confirm: true }, { title: 'Нет' }],
                        onSelect: (a) => {
                            if (a.confirm) {
                                Lampa.Storage.set('kinopoisk_email', '');
                                Lampa.Storage.set('kinopoisk_access_token', '');
                                Lampa.Storage.set('kinopoisk_refresh_token', '');
                                Lampa.Storage.set('kinopoisk_token_expires', 0);
                                $('div[data-name="kinopoisk_auth"]').find('.settings-param__name').text('Авторизоваться');
                            }
                            Lampa.Controller.toggle('settings_component');
                        },
                        onBack: () => Lampa.Controller.toggle('settings_component')
                    });
                } else {
                    Lampa.Controller.toContent();
                    getDeviceCode();
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'title' },
            field: { name: 'Оценки' }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button' },
            field: { name: 'Импортировать все оценки' },
            onChange: () => {
                var oauth = Lampa.Storage.get('kinopoisk_access_token');
                if (!oauth) {
                    Lampa.Noty.show('Сначала авторизуйтесь');
                } else {
                    Lampa.Noty.show('Импорт запущен в фоне (3500 оценок, ~5 минут)...');
                    getKinopoiskRatings(0, false, true, true);
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_clear_ratings' },
            field: { name: 'Очистить локальные оценки' },
            onChange: () => {
                Lampa.Storage.set('kinopoisk_my_ratings', {});
                Lampa.Noty.show('Локальные оценки очищены');
            }
        });
    }

    if (!window.kinopoisk_rating_standalone_ready) startPlugin();
})();
