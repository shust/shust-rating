(function () {
    'use strict';

    var network = new Lampa.Reguest();
    var CORS_PROXY = 'https://kinopoisk-proxy.shust-blr.workers.dev';
    var SYNC_LOG_KEY = 'kinopoisk_history_sync_log';

    // ======================= УТИЛИТЫ =======================

    function normalizeTitle(title) {
        if (!title) return '';
        return String(title)
            .toLowerCase()
            .replace(/[\s\u00a0\u2009\u2003\u2002\u200b\u200c\u200d]+/g, ' ')
            .replace(/ё/g, 'е')
            .replace(/[^\wа-я0-9\s]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extractYear(yearStr) {
        if (!yearStr) return 0;
        var m = String(yearStr).match(/(\d{4})/);
        return m ? parseInt(m[1], 10) : 0;
    }

    function makeKey(title, year) {
        var normTitle = normalizeTitle(title);
        if (!normTitle) return '';
        return normTitle + '_' + year;
    }

    function parseCSV(text) {
        var rows = [];
        var current = [];
        var field = '';
        var inQuotes = false;

        for (var i = 0; i < text.length; i++) {
            var char = text[i];
            var next = text[i + 1];

            if (inQuotes) {
                if (char === '"' && next === '"') { field += '"'; i++; }
                else if (char === '"') { inQuotes = false; }
                else { field += char; }
            } else {
                if (char === '"') { inQuotes = true; }
                else if (char === '\t') { current.push(field); field = ''; }
                else if (char === '\n') { current.push(field); rows.push(current); current = []; field = ''; }
                else if (char === '\r') { /* ignore */ }
                else { field += char; }
            }
        }
        if (field.length > 0 || current.length > 0) {
            current.push(field);
            rows.push(current);
        }
        return rows;
    }

    function isSameFilm(card, title, year, originalTitle) {
        var cardYear = extractYear(card.release_date || card.first_air_date);
        if (year && cardYear) {
            if (Math.abs(cardYear - year) > 1) return false;
        }

        var normInput = normalizeTitle(title);
        var normInputOrig = normalizeTitle(originalTitle);
        var normCardTitle = normalizeTitle(card.title || card.name);
        var normCardOrig = normalizeTitle(card.original_title || card.original_name);

        if (!normInput) return false;

        function match(a, b) {
            if (!a || !b) return false;
            if (a === b) return true;
            if (a.indexOf(b) === 0 || b.indexOf(a) === 0) return true;
            var aShort = a.split(' ').slice(0, 4).join(' ');
            var bShort = b.split(' ').slice(0, 4).join(' ');
            return aShort === bShort;
        }

        if (match(normInput, normCardTitle)) return true;
        if (normInputOrig && match(normInputOrig, normCardOrig)) return true;
        if (normInputOrig && match(normInputOrig, normCardTitle)) return true;
        if (match(normInput, normCardOrig)) return true;

        return false;
    }

    function pickBestMatch(results, title, year, originalTitle) {
        if (!results || !results.length) return null;

        for (var i = 0; i < results.length; i++) {
            if (isSameFilm(results[i], title, year, originalTitle)) {
                return results[i];
            }
        }

        for (var j = 0; j < results.length; j++) {
            if (isSameFilm(results[j], title, 0, originalTitle)) {
                return results[j];
            }
        }

        return null;
    }

    // ======================= ИКОНКИ =======================

    function makeRatingIcon(rating) {
        var fontSize = String(rating).length > 1 ? 10 : 13;
        return '<svg class="button--kinopoisk_rating_icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="12" cy="12" r="11" fill="#ffffff"/>' +
            '<text x="12" y="12" text-anchor="middle" dominant-baseline="central" ' +
            'fill="#1a1a1a" font-size="' + fontSize + '" font-weight="700" ' +
            'font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" ' +
            'style="user-select:none">' + rating + '</text>' +
            '</svg>';
    }

    var starIconEmpty = '<svg class="button--kinopoisk_rating_icon" width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.6162 7.10981L15.8464 7.55198L16.3381 7.63428L22.2841 8.62965C22.8678 8.72736 23.0999 9.44167 22.6851 9.86381L18.4598 14.1641L18.1104 14.5196L18.184 15.0127L19.0748 20.9752C19.1622 21.5606 18.5546 22.002 18.025 21.738L12.6295 19.0483L12.1833 18.8259L11.7372 19.0483L6.34171 21.738C5.81206 22.002 5.20443 21.5606 5.29187 20.9752L6.18264 15.0127L6.25629 14.5196L5.9069 14.1641L1.68155 9.86381C1.26677 9.44167 1.49886 8.72736 2.08255 8.62965L8.02855 7.63428L8.52022 7.55198L8.75043 7.10981L11.5345 1.76241C11.8078 1.23748 12.5589 1.23748 12.8322 1.76241L15.6162 7.10981Z" stroke="currentColor" stroke-width="2.2"></path></svg>';

    var buttonLoader = '<svg class="button--kinopoisk_rating_icon" xmlns="http://www.w3.org/2000/svg" style="margin:auto;background:none;display:block;shape-rendering:auto;" width="24px" height="24px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" fill="none" stroke="#ffffff" stroke-width="5" r="35" stroke-dasharray="164.93361431346415 56.97787143782138"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform></circle></svg>';

    function getButtonIcon(rating) {
        return rating ? makeRatingIcon(rating) : starIconEmpty;
    }

    // ======================= ЖУРНАЛ СИНХРОНИЗАЦИИ =======================

    function getSyncLog() {
        var log = Lampa.Storage.get(SYNC_LOG_KEY, []);
        return Array.isArray(log) ? log : [];
    }

    function appendSyncLog(entries) {
        var log = getSyncLog();
        log = log.concat(entries);
        Lampa.Storage.set(SYNC_LOG_KEY, log);
    }

    function clearSyncLog() {
        Lampa.Storage.set(SYNC_LOG_KEY, []);
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
                console.log('Kinopoisk', 'Error during OAuth', data.error);
            }
        }, function (data) {
            Lampa.Noty.show(data.responseJSON ? data.responseJSON.error_description : 'Ошибка авторизации');
            console.log('Kinopoisk', 'Token error', data);
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
                console.log('Kinopoisk', 'Failed to get user_code', data.error);
            }
        }, function (data) {
            Lampa.Noty.show(data.responseJSON ? data.responseJSON.error_description : 'Ошибка получения кода');
            console.log('Kinopoisk', 'Failed to get device code', data);
        }, device_code_data);
    }

    function getUserEmail() {
        network.silent('https://login.yandex.ru/info?format=json', function (data) {
            if (data.default_email) {
                Lampa.Storage.set('kinopoisk_email', data.default_email);
                $('div[data-name="kinopoisk_auth"]').find('.settings-param__name').text(data.default_email);
            }
        }, function (data) {
            console.log('Kinopoisk', 'Failed to get user email', data);
        }, false, {
            type: 'get',
            headers: { 'Authorization': 'OAuth ' + Lampa.Storage.get('kinopoisk_access_token') }
        });
    }

    function checkAndRefreshToken() {
        var token = Lampa.Storage.get('kinopoisk_access_token', '');
        var expires = Lampa.Storage.get('kinopoisk_token_expires', 0);
        if (token && expires < Date.now()) {
            console.log('Kinopoisk', 'Refreshing token...');
            getToken(Lampa.Storage.get('kinopoisk_refresh_token', ''), true);
        }
    }

    // ======================= RATINGS =======================

    function setRating(oauth, kinopoiskId, rating, background) {
        if (!background) $('.button--kinopoisk_rating_icon').replaceWith(buttonLoader);

        network.silent(CORS_PROXY + '?method=setVote&oauth=' + oauth + '&movie=' + String(kinopoiskId) + '&rate=' + rating,
            function (data) {
                if (data && data.data && data.data.movie && data.data.movie.vote &&
                    data.data.movie.vote.set && data.data.movie.vote.set.status === 'SUCCESS') {
                    if (!background) {
                        $('.button--kinopoisk_rating_icon').replaceWith(getButtonIcon(rating));
                        Lampa.Noty.show('Оценка ' + rating + ' синхронизирована с Кинопоиском');
                    }
                } else {
                    if (!background) {
                        $('.button--kinopoisk_rating_icon').replaceWith(getButtonIcon(rating));
                        Lampa.Noty.show('Оценка ' + rating + ' сохранена локально (не удалось синхронизировать)');
                    }
                    console.log('Kinopoisk', 'Error setting rating on Kinopoisk', data);
                }
            },
            function (data) {
                console.log('Kinopoisk', 'Error setting rating', data);
                if (!background) {
                    $('.button--kinopoisk_rating_icon').replaceWith(getButtonIcon(rating));
                    Lampa.Noty.show('Оценка сохранена локально, но не синхронизирована');
                }
            }
        );
    }

    function removeRating(oauth, kinopoiskId, background) {
        if (!background) $('.button--kinopoisk_rating_icon').replaceWith(buttonLoader);
        network.silent(CORS_PROXY + '?method=removeVote&oauth=' + oauth + '&movie=' + String(kinopoiskId),
            function (data) {
                if (data && data.data && data.data.movie && data.data.movie.vote &&
                    data.data.movie.vote.remove && data.data.movie.vote.remove.status === 'SUCCESS') {
                    if (!background) {
                        $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                        Lampa.Noty.show('Оценка удалена');
                    }
                } else {
                    if (!background) {
                        $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                        Lampa.Noty.show('Оценка удалена локально');
                    }
                }
            },
            function (data) {
                if (!background) {
                    $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                    Lampa.Noty.show('Оценка удалена локально');
                }
                console.log('Kinopoisk', 'Error removing rating', data);
            }
        );
    }

    // ======================= ПОИСК ОЦЕНКИ =======================

    function findRating(movie) {
        var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
        var ratingsById = Lampa.Storage.get('kinopoisk_my_ratings', {});

        var kpId = movie.kinopoisk_id;
        if (kpId && ratingsById[kpId]) {
            return { rate: ratingsById[kpId], matchedKey: kpId, matchType: 'byKinopoiskId' };
        }

        var titles = [
            movie.title,
            movie.name,
            movie.original_title,
            movie.original_name
        ].filter(Boolean);

        var yearStr = movie.release_date || movie.first_air_date || movie.year || '';
        var baseYear = extractYear(yearStr);
        var years = baseYear ? [baseYear, baseYear - 1, baseYear + 1] : [0];

        for (var t = 0; t < titles.length; t++) {
            for (var y = 0; y < years.length; y++) {
                var key = makeKey(titles[t], years[y]);
                if (key && ratingsByKey[key]) {
                    return { rate: ratingsByKey[key], matchedKey: key, matchType: 'byKey' };
                }
            }
        }

        if (baseYear) {
            var normTitles = titles.map(normalizeTitle).filter(Boolean);
            var allKeys = Object.keys(ratingsByKey);

            for (var i = 0; i < normTitles.length; i++) {
                var normT = normTitles[i];
                for (var k = 0; k < allKeys.length; k++) {
                    var parts = allKeys[k].split('_');
                    var keyYear = parseInt(parts[parts.length - 1], 10);
                    var keyTitle = parts.slice(0, -1).join('_');
                    if (keyYear !== baseYear) continue;

                    if (keyTitle === normT ||
                        keyTitle.indexOf(normT + ' ') === 0 ||
                        normT.indexOf(keyTitle + ' ') === 0) {
                        return { rate: ratingsByKey[allKeys[k]], matchedKey: allKeys[k], matchType: 'startsWith' };
                    }
                }
            }
        }

        return null;
    }

    // ======================= ИМПОРТ CSV =======================

    function importFromCSV(csvText, onProgress, onComplete) {
        var t0 = Date.now();
        console.log('Kinopoisk Import CSV', 'Начинаю парсинг (' + (csvText.length / 1024).toFixed(1) + ' КБ)...');

        var rows = parseCSV(csvText);
        console.log('Kinopoisk Import CSV', 'Строк:', rows.length, 'за', (Date.now() - t0) + ' мс');

        if (rows.length < 2) {
            onComplete({ error: 'CSV пустой или некорректный' });
            return;
        }

        var headers = rows[0].map(function (h) { return h.trim(); });
        var idxRating = headers.indexOf('My rating');
        var idxTitle = headers.indexOf('Title');
        var idxOriginal = headers.indexOf('Original Title');
        var idxType = headers.indexOf('Type');
        var idxYear = headers.indexOf('Year');
        var idxBackupId = headers.indexOf('backup_id');

        if (idxRating === -1 || idxTitle === -1 || idxYear === -1) {
            onComplete({ error: 'В CSV нет колонок "My rating", "Title" или "Year"' });
            return;
        }

        var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
        var ratingsByBackupId = Lampa.Storage.get('kinopoisk_my_ratings', {});
        var beforeCount = Object.keys(ratingsByKey).length;

        var total = rows.length - 1;
        var processed = 0;
        var added = 0;
        var updated = 0;
        var skipped = 0;
        var skippedDetails = [];
        var typeBreakdown = { movie: 0, tv: 0 };

        for (var i = 1; i < rows.length; i++) {
            var row = rows[i];
            if (!row || row.length < 2) continue;
            processed++;

            var rating = (row[idxRating] || '').trim();
            var title = (row[idxTitle] || '').trim();
            var originalTitle = idxOriginal !== -1 ? (row[idxOriginal] || '').trim() : '';
            var year = extractYear(row[idxYear]);
            var type = (row[idxType] || '').trim();
            var backupId = idxBackupId !== -1 ? (row[idxBackupId] || '').trim() : '';

            if (!rating || (!title && !originalTitle) || !year) {
                skipped++;
                if (skippedDetails.length < 20) {
                    skippedDetails.push({
                        title: title || originalTitle || '?',
                        reason: !rating ? 'нет оценки' : (!title && !originalTitle ? 'нет названия' : 'нет года')
                    });
                }
                continue;
            }

            var numRating = parseInt(rating, 10);
            if (isNaN(numRating) || numRating < 1 || numRating > 10) {
                skipped++;
                if (skippedDetails.length < 20) {
                    skippedDetails.push({ title: title || originalTitle, reason: 'некорректная оценка: "' + rating + '"' });
                }
                continue;
            }

            var keys = [];
            if (title) keys.push(makeKey(title, year));
            if (originalTitle && originalTitle !== title) keys.push(makeKey(originalTitle, year));
            keys = keys.filter(Boolean);
            if (!keys.length) { skipped++; continue; }

            var isUpdate = false;
            keys.forEach(function (k) { if (ratingsByKey[k]) isUpdate = true; });
            if (isUpdate) updated++; else added++;

            keys.forEach(function (k) { ratingsByKey[k] = String(numRating); });
            if (backupId) ratingsByBackupId[backupId] = String(numRating);

            var lowType = type.toLowerCase();
            if (lowType.indexOf('сериал') !== -1) typeBreakdown.tv++;
            else typeBreakdown.movie++;

            if (onProgress && processed % 100 === 0) onProgress(processed, total);
        }

        Lampa.Storage.set('kinopoisk_ratings_by_key', ratingsByKey);
        Lampa.Storage.set('kinopoisk_my_ratings', ratingsByBackupId);

        var afterCount = Object.keys(ratingsByKey).length;

        console.log('Kinopoisk Import CSV', 'Импорт за', (Date.now() - t0) + ' мс');
        console.log('Kinopoisk Import CSV', 'Новых:', added, '| Обновлено:', updated, '| Пропущено:', skipped);

        onComplete({
            added: added,
            updated: updated,
            skipped: skipped,
            total: total,
            beforeCount: beforeCount,
            afterCount: afterCount,
            typeBreakdown: typeBreakdown,
            skippedDetails: skippedDetails
        });
    }

    function showImportDialog() {
        var modal = $(
            '<div style="padding: 15px;">' +
            '  <div class="about" style="margin-bottom: 12px; font-size: 13px; line-height: 1.6;">' +
            '    1. Открой CSV-файл из Кинориума в текстовом редакторе.<br>' +
            '    2. Выдели <b>всё</b> содержимое (Ctrl+A), скопируй (Ctrl+C).<br>' +
            '    3. Вставь в поле ниже и нажми «Импортировать».<br>' +
            '    <br>' +
            '    Оценки сохранятся <b>только в Lampa</b>. На Кинопоиск ничего не отправится.<br>' +
            '    <span style="color: #f39c12;">Для 4000+ записей удобнее делать это с ПК.</span>' +
            '  </div>' +
            '  <textarea id="csv-input" style="width: 100%; height: 180px; background: #1a1a1a; color: #ddd; border: 1px solid #444; padding: 10px; font-family: monospace; font-size: 11px; resize: vertical;" placeholder="Вставь сюда содержимое CSV..."></textarea>' +
            '  <div id="import-status" style="margin-top: 10px; font-size: 13px; color: #aaa; min-height: 40px;"></div>' +
            '  <div id="import-actions" style="margin-top: 10px;"></div>' +
            '</div>'
        );

        Lampa.Modal.open({
            title: 'Импорт оценок из Кинориума',
            html: modal,
            size: 'large',
            onBack: function () { Lampa.Modal.close(); },
            onSelect: function () {}
        });

        setTimeout(function () {
            var button = $('<div class="broadcast__device selector" style="display:inline-block; padding: 10px 24px; background: #4c6ef5; color: #fff; border-radius: 6px; cursor: pointer; font-weight: 600;">Импортировать</div>');
            $('#import-actions').append(button);

            button.on('hover:enter click', function () {
                var csvText = $('#csv-input').val();
                if (!csvText || csvText.length < 50) {
                    $('#import-status').text('Сначала вставь CSV').css('color', '#e74c3c');
                    return;
                }

                button.css('opacity', '0.5').css('pointer-events', 'none');
                $('#import-status').html('Парсинг...').css('color', '#f39c12');

                setTimeout(function () {
                    importFromCSV(csvText,
                        function (processed, total) {
                            var percent = Math.floor(processed / total * 100);
                            $('#import-status').html('Обработано: <b>' + processed + '</b> / ' + total + ' (' + percent + '%)').css('color', '#f39c12');
                        },
                        function (result) {
                            if (result.error) {
                                $('#import-status').text('Ошибка: ' + result.error).css('color', '#e74c3c');
                                button.css('opacity', '1').css('pointer-events', 'auto');
                                return;
                            }

                            var html = '<b style="color: #79D29E; font-size: 15px;">Импорт завершён ✓</b><br><br>' +
                                'Всего строк: <b>' + result.total + '</b><br>' +
                                'Новых: <b style="color: #79D29E;">' + result.added + '</b><br>' +
                                'Обновлено: <b>' + result.updated + '</b><br>' +
                                'Пропущено: <b style="color: #f39c12;">' + result.skipped + '</b><br><br>' +
                                'Фильмов/мультфильмов: <b>' + result.typeBreakdown.movie + '</b><br>' +
                                'Сериалов/мультсериалов: <b>' + result.typeBreakdown.tv + '</b><br><br>' +
                                'Было в Lampa: <b>' + result.beforeCount + '</b><br>' +
                                'Стало в Lampa: <b style="color: #79D29E;">' + result.afterCount + '</b>';

                            if (result.skippedDetails && result.skippedDetails.length > 0) {
                                html += '<br><br><b>Примеры пропущенных:</b><br>';
                                result.skippedDetails.slice(0, 5).forEach(function (d) {
                                    html += '<span style="color: #888; font-size: 12px;">• ' + d.title + ' — ' + d.reason + '</span><br>';
                                });
                            }

                            $('#import-status').html(html).css('color', '#ddd');
                            Lampa.Noty.show('Импортировано ' + result.added + ' новых оценок');

                            setTimeout(function () { Lampa.Modal.close(); }, 5000);
                        }
                    );
                }, 100);
            });
        }, 200);
    }

    // ======================= МЕНЮ ОЦЕНКИ =======================

    function showRatingSelect(movie, currentRate) {
        var title = movie.title || movie.name || movie.original_title || movie.original_name;
        var year = extractYear(movie.release_date || movie.first_air_date || movie.year);
        var key = makeKey(title, year);

        let items = [
            { title: '10', selected: currentRate === '10' },
            { title: '9', selected: currentRate === '9' },
            { title: '8', selected: currentRate === '8' },
            { title: '7', selected: currentRate === '7' },
            { title: '6', selected: currentRate === '6' },
            { title: '5', selected: currentRate === '5' },
            { title: '4', selected: currentRate === '4' },
            { title: '3', selected: currentRate === '3' },
            { title: '2', selected: currentRate === '2' },
            { title: '1', selected: currentRate === '1' }
        ];

        if (currentRate) {
            items.push({ title: 'Удалить оценку', delete: true });
        }

        Lampa.Select.show({
            title: 'Оценка на Кинопоиске',
            items: items,
            onSelect: function (a) {
                var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
                var oauth = Lampa.Storage.get('kinopoisk_access_token');

                if (a.delete) {
                    delete ratingsByKey[key];
                    Lampa.Storage.set('kinopoisk_ratings_by_key', ratingsByKey);

                    if (oauth && movie.kinopoisk_id) {
                        removeRating(oauth, movie.kinopoisk_id, false);
                    } else {
                        $('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                        Lampa.Noty.show('Оценка удалена локально');
                    }
                } else {
                    ratingsByKey[key] = a.title;
                    Lampa.Storage.set('kinopoisk_ratings_by_key', ratingsByKey);
                    $('.button--kinopoisk_rating_icon').replaceWith(makeRatingIcon(a.title));

                    if (oauth && movie.kinopoisk_id) {
                        setRating(oauth, movie.kinopoisk_id, a.title, false);
                    } else {
                        Lampa.Noty.show('Оценка ' + a.title + ' сохранена локально');
                    }
                }

                Lampa.Controller.toggle('full_start');
            },
            onBack: function () { Lampa.Controller.toggle('full_start'); }
        });
    }

    // ======================= ДИАГНОСТИКА =======================

    function showDiagnostics(movie) {
        if (!movie) {
            Lampa.Noty.show('Откройте карточку фильма');
            return;
        }

        var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
        var ratingsById = Lampa.Storage.get('kinopoisk_my_ratings', {});

        var titles = [movie.title, movie.name, movie.original_title, movie.original_name].filter(Boolean);
        var yearStr = movie.release_date || movie.first_air_date || movie.year || '';
        var baseYear = extractYear(yearStr);

        var candidateKeys = [];
        titles.forEach(function (t) {
            [baseYear, baseYear - 1, baseYear + 1].forEach(function (y) {
                if (y) candidateKeys.push(makeKey(t, y));
            });
        });

        var result = findRating(movie);

        var html = '<div style="padding: 20px; font-family: monospace; font-size: 12px; line-height: 1.6; max-height: 70vh; overflow-y: auto;">';

        html += '<b style="color: #79D29E;">— ДАННЫЕ ФИЛЬМА —</b><br>';
        html += 'title: ' + (movie.title || '—') + '<br>';
        html += 'original_title: ' + (movie.original_title || '—') + '<br>';
        html += 'release_date: ' + (movie.release_date || '—') + '<br>';
        html += 'baseYear: ' + baseYear + '<br>';
        html += 'kinopoisk_id: ' + (movie.kinopoisk_id || '—') + '<br>';

        html += '<br><b style="color: #79D29E;">— ХРАНИЛИЩА —</b><br>';
        html += 'kinopoisk_ratings_by_key: ' + Object.keys(ratingsByKey).length + '<br>';
        html += 'kinopoisk_my_ratings: ' + Object.keys(ratingsById).length + '<br>';

        html += '<br><b style="color: #79D29E;">— КЛЮЧИ-КАНДИДАТЫ —</b><br>';
        candidateKeys.forEach(function (k) {
            html += (ratingsByKey[k] ? '✅ ' : '❌ ') + JSON.stringify(k) + (ratingsByKey[k] ? ' = ' + ratingsByKey[k] : '') + '<br>';
        });

        html += '<br><b style="color: #79D29E;">— РЕЗУЛЬТАТ findRating —</b><br>';
        if (result) {
            html += '<span style="color: #79D29E;">✅ Найдено: ' + result.rate + ' (' + result.matchType + ')</span><br>';
            html += 'Ключ: ' + JSON.stringify(result.matchedKey) + '<br>';
        } else {
            html += '<span style="color: #e74c3c;">❌ Не найдено</span><br>';
        }

        html += '</div>';

        Lampa.Modal.open({
            title: 'Диагностика карточки',
            html: $('<div>' + html + '</div>'),
            size: 'large',
            onBack: function () { Lampa.Modal.close(); },
            onSelect: function () {}
        });
    }

    // ======================= ХУК КАРТОЧКИ =======================

    function hookFullCard() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var movie = e.data.movie;

            var tryShow = function (kpId) {
                if (kpId) {
                    movie.kinopoisk_id = kpId;
                }

                var result = findRating(movie);

                console.log('Kinopoisk',
                    'Карточка:', movie.title || movie.name,
                    '| kp_id:', movie.kinopoisk_id || 'нет',
                    '| Оценка:', result ? (result.rate + ' (' + result.matchType + ')') : 'не найдено');

                addOrUpdateButton(movie, result);
            };

            if (movie.kinopoisk_id) {
                tryShow(movie.kinopoisk_id);
            } else {
                var tmdbId = movie.id;
                if (tmdbId) {
                    network.silent('https://api.alloha.tv/?token=04941a9a3ca3ac16e2b4327347bbc1&tmdb=' + tmdbId,
                        function (data) {
                            if (data && data.data && data.data.id_kp) {
                                tryShow(data.data.id_kp);
                            } else {
                                tryShow(null);
                            }
                        },
                        function (data) {
                            console.log('Kinopoisk', 'Failed to get kinopoisk_id', data);
                            tryShow(null);
                        }
                    );
                } else {
                    tryShow(null);
                }
            }
        });
    }

    function addOrUpdateButton(movie, result) {
        var $existing = $('.button--kinopoisk_rating');
        if ($existing.length) {
            $existing.find('.button--kinopoisk_rating_icon').replaceWith(getButtonIcon(result ? result.rate : null));
            return;
        }

        var $container = $('.full-start-new__buttons');
        if (!$container.length) $container = $('.full-start__buttons');
        if (!$container.length) {
            console.log('Kinopoisk', 'Контейнер кнопок не найден');
            return;
        }

        var icon = getButtonIcon(result ? result.rate : null);
        var $newBtn = $(
            '<div class="full-start__button selector button--kinopoisk_rating">' +
                icon +
                '<span>Кинопоиск</span>' +
            '</div>'
        );

        $newBtn.on('hover:enter', function () {
            var oauth = Lampa.Storage.get('kinopoisk_access_token');
            if (!oauth) {
                Lampa.Noty.show('Авторизуйтесь в настройках Кинопоиска');
                return;
            }
            showRatingSelect(movie, result ? result.rate : null);
        });

        $container.append($newBtn);
    }

    // ======================= МАССОВАЯ ИСТОРИЯ ПРОСМОТРОВ =======================

    function markAllAsHistoryLocal(onProgress, onComplete) {
        var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
        var keys = Object.keys(ratingsByKey);

        if (!keys.length) {
            onComplete({ error: 'Нет импортированных оценок' });
            return;
        }

        var total = keys.length;
        var processed = 0;
        var okCount = 0;
        var failCount = 0;
        var skipCount = 0;
        var failDetails = [];
        var addedEntries = [];
        var BATCH = 2;
        var DELAY = 400;

        var queue = keys.slice();

        function parseKey(key) {
            var m = key.match(/^(.+)_(\d{4})$/);
            if (!m) return null;
            return {
                title: m[1].replace(/_/g, ' ').trim(),
                originalTitle: null,
                year: parseInt(m[2], 10),
                key: key
            };
        }

        function normalizeCard(card, isTv) {
            return {
                id: card.id,
                title: card.title || card.name,
                name: card.name || card.title,
                original_title: card.original_title || card.original_name,
                original_name: card.original_name || card.original_title,
                release_date: card.release_date || card.first_air_date,
                first_air_date: card.first_air_date || card.release_date,
                poster_path: card.poster_path,
                backdrop_path: card.backdrop_path,
                vote_average: card.vote_average,
                media_type: card.media_type || (isTv ? 'tv' : 'movie'),
                source: 'tmdb'
            };
        }

        function extractResults(arr) {
            if (!arr) return [];
            if (Array.isArray(arr)) {
                if (arr.length && arr[0] && Array.isArray(arr[0].results)) {
                    var out = [];
                    arr.forEach(function (part) {
                        if (part && Array.isArray(part.results)) {
                            out = out.concat(part.results);
                        }
                    });
                    return out;
                }
                return arr.filter(function (c) { return c && c.id; });
            }
            if (arr.results && Array.isArray(arr.results)) return arr.results;
            return [];
        }

        function searchCard(title, year, originalTitle, onFound) {
            var finished = false;
            var pending = 2;
            var candidates = [];

            function finish() {
                pending--;
                if (pending > 0 || finished) return;
                finished = true;
                var best = pickBestMatch(candidates, title, year, originalTitle);
                onFound(best);
            }

            function runSearch(isTv) {
                Lampa.Api.sources.tmdb.search({ query: title }, function (arr) {
                    try {
                        var results = extractResults(arr);
                        results.forEach(function (c) {
                            if (!c.media_type) c.media_type = isTv ? 'tv' : 'movie';
                        });
                        candidates = candidates.concat(results);
                        finish();
                    } catch (e) {
                        console.log('Kinopoisk History', 'search parse error', e);
                        finish();
                    }
                }, function () { finish(); });
            }

            runSearch(false);
            runSearch(true);
        }

        function processKey(key, onDone) {
            var parsed = parseKey(key);
            if (!parsed) {
                onDone('fail', 'bad key');
                return;
            }

            searchCard(parsed.title, parsed.year, parsed.originalTitle, function (card) {
                if (!card) {
                    onDone('fail', 'no match');
                    return;
                }

                // Проверяем, нет ли уже в истории (по id)
                try {
                    var fav = Lampa.Storage.get('favorite', {});
                    var history = fav.history || [];
                    var already = history.some(function (c) { return c && c.id === card.id; });
                    if (already) {
                        onDone('skip', 'already');
                        return;
                    }
                } catch (e) {}

                var normalized = normalizeCard(card, card.media_type === 'tv');
                try {
                    Lampa.Favorite.add('history', normalized);
                    addedEntries.push({
                        id: card.id,
                        title: normalized.title,
                        time: Date.now(),
                        key: key
                    });
                    onDone('ok');
                } catch (e) {
                    console.log('Kinopoisk History', 'Favorite.add error', e);
                    onDone('fail', 'add error');
                }
            });
        }

        function next() {
            if (!queue.length) {
                appendSyncLog(addedEntries);
                onComplete({
                    total: total,
                    ok: okCount,
                    fail: failCount,
                    skip: skipCount,
                    failDetails: failDetails,
                    addedCount: addedEntries.length
                });
                return;
            }

            var batch = queue.splice(0, BATCH);
            var pending = batch.length;

            batch.forEach(function (key) {
                processKey(key, function (status, reason) {
                    if (status === 'ok') okCount++;
                    else if (status === 'skip') skipCount++;
                    else {
                        failCount++;
                        if (failDetails.length < 30) {
                            failDetails.push({ title: key, reason: reason || 'fail' });
                        }
                    }
                    processed++;
                    if (onProgress) onProgress(processed, total, key, status, reason);
                    pending--;
                    if (pending === 0) {
                        setTimeout(next, DELAY);
                    }
                });
            });
        }

        next();
    }

    function showHistoryDialog() {
        var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
        var total = Object.keys(ratingsByKey).length;

        var modal = $(
            '<div style="padding: 15px;">' +
            '  <div class="about" style="margin-bottom: 12px; font-size: 13px; line-height: 1.6;">' +
            '    Пройдёт по всем импортированным оценкам (<b>' + total + '</b>) и добавит каждый фильм/сериал в <b>«История просмотров»</b>.<br>' +
            '    <br>' +
            '    Поиск идёт через встроенный TMDB Lampa — без внешних API и прокси.<br>' +
            '    <span style="color:#79D29E;">История синхронизируется с CUB автоматически.</span><br>' +
            '    <span style="color:#f39c12;">' + total + ' записей — займёт примерно ' + Math.ceil(total / 300) + '-30 минут. Не закрывай приложение.</span><br>' +
            '    <br>' +
            '    <span style="color:#888;">Если что-то пойдёт не так — в настройках есть кнопки отката.</span>' +
            '  </div>' +
            '  <div id="hist-status" style="margin-top:10px;font-size:13px;color:#aaa;min-height:60px;"></div>' +
            '  <div id="hist-actions" style="margin-top:10px;"></div>' +
            '</div>'
        );

        Lampa.Modal.open({
            title: 'Добавление в «История просмотров»',
            html: modal,
            size: 'large',
            onBack: function () { Lampa.Modal.close(); },
            onSelect: function () {}
        });

        setTimeout(function () {
            var btn = $('<div class="broadcast__device selector" style="display:inline-block;padding:10px 24px;background:#4c6ef5;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">Запустить</div>');
            $('#hist-actions').append(btn);

            btn.on('hover:enter click', function () {
                if (!Lampa.Favorite || !Lampa.Favorite.add) {
                    $('#hist-status').text('Lampa.Favorite недоступен').css('color', '#e74c3c');
                    return;
                }

                btn.css('opacity', '0.5').css('pointer-events', 'none');
                $('#hist-status').text('Начинаю...').css('color', '#f39c12');

                markAllAsHistoryLocal(
                    function (processed, total, key, status) {
                        var pct = Math.floor(processed / total * 100);
                        var statusText = status === 'ok' ? '✅' : (status === 'skip' ? '⏭ уже' : '❌');
                        $('#hist-status').html(
                            'Обработано: <b>' + processed + '</b> / ' + total +
                            ' (' + pct + '%)<br>' +
                            'Последний: ' + key + ' — ' + statusText
                        ).css('color', '#f39c12');
                    },
                    function (result) {
                        if (result.error) {
                            $('#hist-status').text('Ошибка: ' + result.error).css('color', '#e74c3c');
                            btn.css('opacity', '1').css('pointer-events', 'auto');
                            return;
                        }

                        var html =
                            '<b style="color:#79D29E;font-size:15px;">Готово ✓</b><br><br>' +
                            'Всего: <b>' + result.total + '</b><br>' +
                            'Добавлено: <b style="color:#79D29E;">' + result.ok + '</b><br>' +
                            'Пропущено (уже в истории): <b>' + result.skip + '</b><br>' +
                            'Не найдено: <b style="color:#f39c12;">' + result.fail + '</b><br><br>' +
                            'История синхронизируется с CUB автоматически.<br>' +
                            '<span style="color:#888;font-size:12px;">Если нужно — откати в настройках.</span>';

                        if (result.failDetails && result.failDetails.length > 0) {
                            html += '<br><b>Примеры ошибок:</b><br>';
                            result.failDetails.slice(0, 5).forEach(function (d) {
                                html += '<span style="color:#888;font-size:12px;">• ' + d.title + ' — ' + d.reason + '</span><br>';
                            });
                        }

                        $('#hist-status').html(html).css('color', '#ddd');
                        Lampa.Noty.show('История: +' + result.ok + ', пропущено ' + result.skip + ', ошибок ' + result.fail);
                    }
                );
            });
        }, 200);
    }

    // ======================= ОТКАТ ИСТОРИИ =======================

    // Универсальная функция отката. mode: 'hour' | 'all'
    function rollbackHistory(mode, onDone) {
        var log = getSyncLog();
        if (!log.length) {
            onDone({ error: 'Журнал пуст — нечего откатывать' });
            return;
        }

        var now = Date.now();
        var oneHourAgo = now - 60 * 60 * 1000;

        // Отбираем записи для удаления
        var toRemove = [];
        if (mode === 'hour') {
            log.forEach(function (entry) {
                if (entry && entry.time && entry.time >= oneHourAgo) {
                    toRemove.push(entry);
                }
            });
        } else {
            toRemove = log.slice();
        }

        if (!toRemove.length) {
            onDone({ removed: 0, message: 'Нечего удалять (за этот период ничего не добавлялось)' });
            return;
        }

        // Множество ID для удаления
        var removeSet = {};
        toRemove.forEach(function (entry) { if (entry && entry.id) removeSet[entry.id] = true; });

        // 1) Локально: чистим favorite.history
        var fav = Lampa.Storage.get('favorite', {});
        var history = fav.history || [];
        var before = history.length;

        var filtered = history.filter(function (card) {
            return !(card && removeSet[card.id]);
        });

        fav.history = filtered;
        Lampa.Storage.set('favorite', fav);

        // 2) Пытаемся через Favorite.remove — чтобы ушло в CUB
        var removedViaApi = 0;
        if (Lampa.Favorite && typeof Lampa.Favorite.remove === 'function') {
            toRemove.forEach(function (entry) {
                try {
                    Lampa.Favorite.remove('history', { id: entry.id });
                    removedViaApi++;
                } catch (e) {
                    console.log('Kinopoisk', 'Favorite.remove error for id=' + entry.id, e);
                }
            });
        }

        // 3) Обновляем журнал — убираем удалённые записи
        var remaining = log.filter(function (entry) {
            return !(entry && removeSet[entry.id]);
        });
        Lampa.Storage.set(SYNC_LOG_KEY, remaining);

        onDone({
            removed: before - filtered.length,
            removedViaApi: removedViaApi,
            before: before,
            after: filtered.length,
            logRemaining: remaining.length
        });
    }

    function showRollbackDialog() {
        var log = getSyncLog();
        var now = Date.now();
        var oneHourAgo = now - 60 * 60 * 1000;
        var lastHour = log.filter(function (e) { return e && e.time && e.time >= oneHourAgo; }).length;

        var modal = $(
            '<div style="padding: 15px;">' +
            '  <div class="about" style="margin-bottom: 12px; font-size: 13px; line-height: 1.6;">' +
            '    Журнал синхронизации:<br>' +
            '    Всего записей: <b>' + log.length + '</b><br>' +
            '    За последний час: <b>' + lastHour + '</b><br>' +
            '    <br>' +
            '    <span style="color:#f39c12;">Откат удалит карточки из истории Lampa и синхронизирует удаление с CUB.</span>' +
            '  </div>' +
            '  <div id="rb-actions" style="display:flex;gap:10px;flex-wrap:wrap;"></div>' +
            '  <div id="rb-status" style="margin-top:12px;font-size:13px;color:#aaa;min-height:40px;"></div>' +
            '</div>'
        );

        Lampa.Modal.open({
            title: 'Откат добавления в историю',
            html: modal,
            size: 'large',
            onBack: function () { Lampa.Modal.close(); },
            onSelect: function () {}
        });

        setTimeout(function () {
            var btnHour = $('<div class="broadcast__device selector" style="display:inline-block;padding:10px 20px;background:#e67e22;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">Откатить за час (' + lastHour + ')</div>');
            var btnAll = $('<div class="broadcast__device selector" style="display:inline-block;padding:10px 20px;background:#c0392b;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">Откатить всё (' + log.length + ')</div>');

            if (lastHour === 0) btnHour.css('opacity', '0.5');
            if (log.length === 0) btnAll.css('opacity', '0.5');

            $('#rb-actions').append(btnHour).append(btnAll);

            function runRollback(mode, btn) {
                btn.css('opacity', '0.5').css('pointer-events', 'none');
                $('#rb-status').text('Удаляю...').css('color', '#f39c12');

                setTimeout(function () {
                    rollbackHistory(mode, function (result) {
                        if (result.error) {
                            $('#rb-status').text(result.error).css('color', '#e74c3c');
                            return;
                        }

                        var html = '<b style="color:#79D29E;">Откат завершён ✓</b><br><br>' +
                            'Удалено из истории: <b>' + result.removed + '</b><br>' +
                            'Отправлено в CUB (remove): <b>' + (result.removedViaApi || 0) + '</b><br>' +
                            'Было: ' + result.before + ' → Стало: ' + result.after + '<br>' +
                            'Осталось в журнале: <b>' + result.logRemaining + '</b>';

                        $('#rb-status').html(html).css('color', '#ddd');
                        Lampa.Noty.show('Откат: -' + result.removed);
                    });
                }, 200);
            }

            btnHour.on('hover:enter click', function () {
                if (lastHour === 0) return;
                runRollback('hour', btnHour);
            });

            btnAll.on('hover:enter click', function () {
                if (log.length === 0) return;
                runRollback('all', btnAll);
            });
        }, 200);
    }

    // ======================= НАСТРОЙКИ =======================

    function addSettings() {
        if (!window.lampa_settings.kinopoisk) {
            Lampa.SettingsApi.addComponent({
                component: 'kinopoisk',
                icon: '<svg width="239" height="239" viewBox="0 0 239 239" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M215 121.415l-99.297-6.644 90.943 36.334a106.416 106.416 0 0 0 8.354-29.69z"/><path fill="currentColor" d="M194.608 171.609C174.933 197.942 143.441 215 107.948 215 48.33 215 0 166.871 0 107.5 0 48.13 48.33 0 107.948 0c35.559 0 67.102 17.122 86.77 43.539l-90.181 48.07L162.57 32.25h-32.169L90.892 86.862V32.25H64.77v150.5h26.123v-54.524l39.509 54.524h32.169l-56.526-57.493 88.564 46.352z"/><path d="M206.646 63.895l-90.308 36.076L215 93.583a106.396 106.396 0 0 0-8.354-29.688z" fill="currentColor"/></svg>',
                name: 'Кинопоиск'
            });
        }

        // --- Аккаунт ---
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
                        title: 'Выйти из аккаунта',
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

        // --- Импорт ---
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'title' },
            field: { name: 'Импорт оценок' }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_import_csv' },
            field: {
                name: 'Импорт из CSV Кинориума',
                description: 'Загружает все оценки из экспортированного CSV'
            },
            onChange: function () {
                Lampa.Controller.toContent();
                showImportDialog();
            }
        });

        // --- История просмотров ---
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'title' },
            field: { name: 'История просмотров и CUB' }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_mark_history' },
            field: {
                name: 'Добавить всё в «История просмотров»',
                description: 'Помечает все оценённые фильмы и сериалы в историю (синхронизируется с CUB)'
            },
            onChange: function () {
                Lampa.Controller.toContent();
                showHistoryDialog();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_rollback_history' },
            field: {
                name: 'Откатить добавление в историю',
                description: 'Удаляет карточки, добавленные плагином (за час или все)'
            },
            onChange: function () {
                Lampa.Controller.toContent();
                showRollbackDialog();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_stats' },
            field: { name: 'Показать статистику' },
            onChange: function () {
                var byKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
                var byId = Lampa.Storage.get('kinopoisk_my_ratings', {});
                var total = Object.keys(byKey).length;

                var histogram = {};
                for (var k in byKey) {
                    var r = byKey[k];
                    histogram[r] = (histogram[r] || 0) + 1;
                }

                var log = getSyncLog();

                var html = '<div style="padding: 20px; font-size: 14px; font-family: monospace;">';
                html += '<b>По ключу "название_год":</b> ' + total + '<br>';
                html += '<b>По backup_id:</b> ' + Object.keys(byId).length + '<br>';
                html += '<b>В журнале синхронизации:</b> ' + log.length + '<br><br>';
                html += '<b>Распределение оценок:</b><br>';

                for (var i = 10; i >= 1; i--) {
                    var cnt = histogram[String(i)] || 0;
                    var bar = '█'.repeat(Math.min(40, Math.round(cnt / 50)));
                    html += i + ': ' + cnt + ' ' + bar + '<br>';
                }
                html += '</div>';

                Lampa.Modal.open({
                    title: 'Статистика оценок',
                    html: $('<div>' + html + '</div>'),
                    size: 'large',
                    onBack: function () { Lampa.Modal.close(); },
                    onSelect: function () {}
                });
            }
        });

        // --- Диагностика ---
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'title' },
            field: { name: 'Отладка' }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_diagnostics' },
            field: {
                name: 'Диагностика карточки фильма',
                description: 'Откройте карточку фильма и нажмите здесь'
            },
            onChange: function () {
                var movie = null;
                try {
                    var activity = Lampa.Activity.active();
                    if (activity && activity.movie) movie = activity.movie;
                } catch (e) {
                    console.log('Kinopoisk', 'Не удалось получить активный фильм', e);
                }
                showDiagnostics(movie);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_clear_imported' },
            field: {
                name: 'Очистить импортированные оценки',
                description: 'Удаляет оценки по ключу (название_год)'
            },
            onChange: function () {
                Lampa.Select.show({
                    title: 'Очистить импортированные оценки?',
                    items: [{ title: 'Да', confirm: true }, { title: 'Нет' }],
                    onSelect: function (a) {
                        if (a.confirm) {
                            Lampa.Storage.set('kinopoisk_ratings_by_key', {});
                            Lampa.Noty.show('Импортированные оценки удалены');
                        }
                        Lampa.Controller.toggle('settings_component');
                    },
                    onBack: function () { Lampa.Controller.toggle('settings_component'); }
                });
            }
        });
    }

    // ======================= СТАРТ =======================

    function startPlugin() {
        window.kinopoisk_ready = true;
        console.log('Kinopoisk', 'Плагин запущен');
        checkAndRefreshToken();
        hookFullCard();
        addSettings();
    }

    if (!window.kinopoisk_ready) startPlugin();
})();
