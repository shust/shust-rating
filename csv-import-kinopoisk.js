(function () {
    'use strict';

    // ======================= УТИЛИТЫ =======================

    /**
     * Нормализует название:
     * - нижний регистр
     * - все виды пробелов → обычный
     * - ё → е
     * - убирает пунктуацию
     * - сжимает пробелы
     */
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

    /**
     * Извлекает год: "2019-2021" → 2019, "2019-11-01" → 2019.
     */
    function extractYear(yearStr) {
        if (!yearStr) return 0;
        var m = String(yearStr).match(/(\d{4})/);
        return m ? parseInt(m[1], 10) : 0;
    }

    /**
     * Ключ для оценки: "название_год".
     */
    function makeKey(title, year) {
        var normTitle = normalizeTitle(title);
        if (!normTitle) return '';
        return normTitle + '_' + year;
    }

    /**
     * Простой CSV-парсер с поддержкой кавычек и разделителя \t.
     */
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

    /**
     * Генерирует SVG с белым кругом и цифрой.
     */
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

    function getButtonIcon(rating) {
        return rating ? makeRatingIcon(rating) : starIconEmpty;
    }

    // ======================= ПОИСК ОЦЕНКИ =======================

    /**
     * Ищет оценку для фильма Lampa.
     * Перебирает:
     *   1. Все доступные названия (title, name, original_title, original_name)
     *   2. Год ±1 (иногда в TMDB и Кинориуме разные даты)
     *   3. Если не найдено — ищет по началу названия и совпадению года
     * Возвращает { rate, matchedKey } или null.
     */
    function findRating(movie) {
        var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});

        var titles = [
            movie.title,
            movie.name,
            movie.original_title,
            movie.original_name
        ].filter(Boolean);

        var yearStr = movie.release_date || movie.first_air_date || movie.year || '';
        var baseYear = extractYear(yearStr);
        var years = baseYear ? [baseYear, baseYear - 1, baseYear + 1] : [0];

        // Точный поиск по всем комбинациям
        for (var t = 0; t < titles.length; t++) {
            for (var y = 0; y < years.length; y++) {
                var key = makeKey(titles[t], years[y]);
                if (key && ratingsByKey[key]) {
                    return { rate: ratingsByKey[key], matchedKey: key, matchType: 'exact' };
                }
            }
        }

        // Fallback: поиск по началу названия с тем же годом
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

                    if (keyTitle === normT) {
                        return { rate: ratingsByKey[allKeys[k]], matchedKey: allKeys[k], matchType: 'equal' };
                    }
                    if (keyTitle.indexOf(normT + ' ') === 0) {
                        return { rate: ratingsByKey[allKeys[k]], matchedKey: allKeys[k], matchType: 'startsWith' };
                    }
                    if (normT.indexOf(keyTitle + ' ') === 0) {
                        return { rate: ratingsByKey[allKeys[k]], matchedKey: allKeys[k], matchType: 'keyStartsWith' };
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
                    skippedDetails.push({
                        title: title || originalTitle,
                        reason: 'некорректная оценка: "' + rating + '"'
                    });
                }
                continue;
            }

            // Основной ключ — по русскому названию
            var keys = [];
            if (title) keys.push(makeKey(title, year));
            if (originalTitle && originalTitle !== title) keys.push(makeKey(originalTitle, year));

            keys = keys.filter(Boolean);
            if (!keys.length) { skipped++; continue; }

            var isUpdate = false;
            keys.forEach(function (k) {
                if (ratingsByKey[k]) isUpdate = true;
            });

            if (isUpdate) updated++;
            else added++;

            keys.forEach(function (k) { ratingsByKey[k] = String(numRating); });

            if (backupId) {
                ratingsByBackupId[backupId] = String(numRating);
            }

            var lowType = type.toLowerCase();
            if (lowType.indexOf('сериал') !== -1 || lowType.indexOf('мультсериал') !== -1) {
                typeBreakdown.tv++;
            } else {
                typeBreakdown.movie++;
            }

            if (onProgress && processed % 100 === 0) {
                onProgress(processed, total);
            }
        }

        Lampa.Storage.set('kinopoisk_ratings_by_key', ratingsByKey);
        Lampa.Storage.set('kinopoisk_my_ratings', ratingsByBackupId);

        var afterCount = Object.keys(ratingsByKey).length;

        console.log('Kinopoisk Import CSV', 'Импорт за', (Date.now() - t0) + ' мс');
        console.log('Kinopoisk Import CSV', 'Новых:', added, '| Обновлено:', updated, '| Пропущено:', skipped);
        console.log('Kinopoisk Import CSV', 'Всего ключей:', afterCount);

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

    // ======================= ДИАЛОГ ИМПОРТА =======================

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
                            $('#import-status').html(
                                'Обработано: <b>' + processed + '</b> / ' + total + ' (' + percent + '%)'
                            ).css('color', '#f39c12');
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

                            setTimeout(function () {
                                Lampa.Modal.close();
                            }, 5000);
                        }
                    );
                }, 100);
            });
        }, 200);
    }

    // ======================= ДИАГНОСТИКА =======================

    /**
     * Показывает подробную информацию о фильме и совпадениях.
     */
    function showDiagnostics(movie) {
        if (!movie) {
            Lampa.Noty.show('Откройте карточку фильма');
            return;
        }

        var ratingsByKey = Lampa.Storage.get('kinopoisk_ratings_by_key', {});
        var ratingsById = Lampa.Storage.get('kinopoisk_my_ratings', {});

        var titles = [
            movie.title,
            movie.name,
            movie.original_title,
            movie.original_name
        ].filter(Boolean);

        var yearStr = movie.release_date || movie.first_air_date || movie.year || '';
        var baseYear = extractYear(yearStr);

        // Все возможные ключи-кандидаты
        var candidateKeys = [];
        titles.forEach(function (t) {
            [baseYear, baseYear - 1, baseYear + 1].forEach(function (y) {
                if (y) candidateKeys.push(makeKey(t, y));
            });
        });

        // Совпадения в хранилище
        var matches = [];
        candidateKeys.forEach(function (k) {
            if (ratingsByKey[k]) {
                matches.push({ key: k, rate: ratingsByKey[k] });
            }
        });

        // Результат findRating
        var result = findRating(movie);

        // Близкие ключи (содержащие первое слово)
        var relatedKeys = [];
        var firstWord = normalizeTitle(titles[0] || '').split(' ')[0];
        if (firstWord.length > 2) {
            Object.keys(ratingsByKey).forEach(function (k) {
                if (k.indexOf(firstWord) !== -1) relatedKeys.push(k + ' = ' + ratingsByKey[k]);
            });
        }

        var html = '<div style="padding: 20px; font-family: monospace; font-size: 12px; line-height: 1.6; max-height: 70vh; overflow-y: auto;">';

        html += '<b style="color: #79D29E;">— ДАННЫЕ ФИЛЬМА —</b><br>';
        html += 'title: ' + (movie.title || '—') + '<br>';
        html += 'name: ' + (movie.name || '—') + '<br>';
        html += 'original_title: ' + (movie.original_title || '—') + '<br>';
        html += 'original_name: ' + (movie.original_name || '—') + '<br>';
        html += 'release_date: ' + (movie.release_date || '—') + '<br>';
        html += 'first_air_date: ' + (movie.first_air_date || '—') + '<br>';
        html += 'baseYear: ' + baseYear + '<br>';
        html += 'kinopoisk_id: ' + (movie.kinopoisk_id || '—') + '<br>';

        html += '<br><b style="color: #79D29E;">— ХРАНИЛИЩА —</b><br>';
        html += 'kinopoisk_ratings_by_key: ' + Object.keys(ratingsByKey).length + ' записей<br>';
        html += 'kinopoisk_my_ratings: ' + Object.keys(ratingsById).length + ' записей<br>';

        html += '<br><b style="color: #79D29E;">— КЛЮЧИ-КАНДИДАТЫ —</b><br>';
        candidateKeys.forEach(function (k) {
            html += (ratingsByKey[k] ? '✅ ' : '❌ ') + JSON.stringify(k) + (ratingsByKey[k] ? ' = ' + ratingsByKey[k] : '') + '<br>';
        });

        html += '<br><b style="color: #79D29E;">— РЕЗУЛЬТАТ findRating —</b><br>';
        if (result) {
            html += '<span style="color: #79D29E;">✅ Найдено: ' + result.rate + '</span><br>';
            html += 'Ключ: ' + JSON.stringify(result.matchedKey) + '<br>';
            html += 'Тип: ' + result.matchType + '<br>';
        } else {
            html += '<span style="color: #e74c3c;">❌ Не найдено</span><br>';
        }

        if (relatedKeys.length > 0) {
            html += '<br><b style="color: #79D29E;">— ПОХОЖИЕ КЛЮЧИ —</b><br>';
            relatedKeys.slice(0, 15).forEach(function (k) {
                html += k + '<br>';
            });
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

    /**
     * Следим за открытием карточки и обновляем иконку.
     * Задержка 500 мс, чтобы основной плагин успел создать кнопку.
     */
    function hookFullCard() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            setTimeout(function () {
                var movie = e.data.movie;
                if (!movie) return;

                var result = findRating(movie);

                console.log('Kinopoisk Import CSV',
                    'Карточка:', movie.title || movie.name,
                    '| Результат:', result ? (result.rate + ' (' + result.matchType + ')') : 'не найдено');

                var $btn = $('.button--kinopoisk_rating');
                if (!$btn.length) {
                    console.log('Kinopoisk Import CSV', 'Кнопка .button--kinopoisk_rating не найдена');
                    return;
                }

                if (result) {
                    $btn.find('.button--kinopoisk_rating_icon').replaceWith(getButtonIcon(result.rate));
                } else {
                    $btn.find('.button--kinopoisk_rating_icon').replaceWith(starIconEmpty);
                }
            }, 500);
        });
    }

    // ======================= НАСТРОЙКИ =======================

    function addSettings() {
        if (!window.lampa_settings.kinopoisk) {
            Lampa.SettingsApi.addComponent({
                component: 'kinopoisk',
                icon: '<svg width="239" height="239" viewBox="0 0 239 239" fill="currentColor"><path d="M215 121.415l-99.297-6.644 90.943 36.334a106.416 106.416 0 0 0 8.354-29.69z"/><path d="M194.608 171.609C174.933 197.942 143.441 215 107.948 215 48.33 215 0 166.871 0 107.5 0 48.13 48.33 0 107.948 0c35.559 0 67.102 17.122 86.77 43.539l-90.181 48.07L162.57 32.25h-32.169L90.892 86.862V32.25H64.77v150.5h26.123v-54.524l39.509 54.524h32.169l-56.526-57.493 88.564 46.352z"/><path d="M206.646 63.895l-90.308 36.076L215 93.583a106.396 106.396 0 0 0-8.354-29.688z"/></svg>',
                name: 'Кинопоиск'
            });
        }

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'title' },
            field: { name: 'Импорт оценок из Кинориума' }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_import_csv' },
            field: {
                name: 'Импорт из CSV',
                description: 'Загружает все оценки из экспортированного CSV'
            },
            onChange: function () {
                Lampa.Controller.toContent();
                showImportDialog();
            }
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
                    console.log('Kinopoisk Import CSV', 'Не удалось получить активный фильм', e);
                }
                showDiagnostics(movie);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: { type: 'button', name: 'kinopoisk_clear_imported' },
            field: {
                name: 'Очистить импортированные оценки',
                description: 'Удаляет оценки из CSV (по ключу), не трогает backup_id'
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

                var html = '<div style="padding: 20px; font-size: 14px; font-family: monospace;">';
                html += '<b>По ключу "название_год":</b> ' + total + '<br>';
                html += '<b>По backup_id:</b> ' + Object.keys(byId).length + '<br><br>';
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
    }

    // ======================= СТАРТ =======================

    function startPlugin() {
        window.kinopoisk_import_csv_ready = true;
        console.log('Kinopoisk Import CSV', 'Плагин запущен');
        hookFullCard();
        addSettings();
    }

    if (!window.kinopoisk_import_csv_ready) startPlugin();
})();
