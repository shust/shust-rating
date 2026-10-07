(function () {
    'use strict';

    function parseCSV(text) {
        var rows = [];
        var current = [];
        var field = '';
        var inQuotes = false;

        for (var i = 0; i < text.length; i++) {
            var char = text[i];
            var next = text[i + 1];

            if (inQuotes) {
                if (char === '"' && next === '"') {
                    field += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    field += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === '\t') {
                    current.push(field);
                    field = '';
                } else if (char === '\n') {
                    current.push(field);
                    rows.push(current);
                    current = [];
                    field = '';
                } else if (char === '\r') {
                    // ignore
                } else {
                    field += char;
                }
            }
        }
        if (field.length > 0 || current.length > 0) {
            current.push(field);
            rows.push(current);
        }
        return rows;
    }

    function importFromCSV(csvText, onProgress, onComplete) {
        var t0 = Date.now();
        console.log('Kinopoisk Import CSV', 'Начинаю парсинг CSV (' + (csvText.length / 1024).toFixed(1) + ' КБ)...');

        var rows = parseCSV(csvText);
        console.log('Kinopoisk Import CSV', 'Распарсено строк:', rows.length, 'за', (Date.now() - t0) + ' мс');

        if (rows.length < 2) {
            onComplete({ error: 'CSV пустой или некорректный' });
            return;
        }

        var headers = rows[0].map(function (h) { return h.trim(); });

        var idxRating = headers.indexOf('My rating');
        var idxBackupId = headers.indexOf('backup_id');
        var idxTitle = headers.indexOf('Title');
        var idxType = headers.indexOf('Type');
        var idxYear = headers.indexOf('Year');

        if (idxRating === -1 || idxBackupId === -1) {
            onComplete({ error: 'В CSV нет колонок "My rating" или "backup_id"' });
            return;
        }

        var ratings = Lampa.Storage.get('kinopoisk_my_ratings', {});
        var beforeCount = Object.keys(ratings).length;

        var total = rows.length - 1;
        var processed = 0;
        var added = 0;
        var updated = 0;
        var skipped = 0;
        var skippedDetails = [];

        for (var i = 1; i < rows.length; i++) {
            var row = rows[i];
            if (!row || row.length < 2) continue;

            var rating = (row[idxRating] || '').trim();
            var backupId = (row[idxBackupId] || '').trim();

            processed++;

            if (!rating || !backupId) {
                skipped++;
                if (skippedDetails.length < 20) {
                    skippedDetails.push({
                        title: row[idxTitle] || '?',
                        reason: !rating ? 'нет оценки' : 'нет backup_id'
                    });
                }
                continue;
            }

            var numRating = parseInt(rating, 10);
            if (isNaN(numRating) || numRating < 1 || numRating > 10) {
                skipped++;
                if (skippedDetails.length < 20) {
                    skippedDetails.push({
                        title: row[idxTitle] || '?',
                        reason: 'некорректная оценка: "' + rating + '"'
                    });
                }
                continue;
            }

            if (ratings[backupId]) {
                updated++;
            } else {
                added++;
            }

            ratings[backupId] = String(numRating);

            if (onProgress && processed % 50 === 0) {
                onProgress(processed, total);
            }
        }

        Lampa.Storage.set('kinopoisk_my_ratings', ratings);
        var afterCount = Object.keys(ratings).length;

        console.log('Kinopoisk Import CSV', 'Импорт завершён за', (Date.now() - t0) + ' мс');
        console.log('Kinopoisk Import CSV', 'Было оценок:', beforeCount);
        console.log('Kinopoisk Import CSV', 'Стало оценок:', afterCount);
        console.log('Kinopoisk Import CSV', 'Новых:', added, '| Обновлено:', updated, '| Пропущено:', skipped);

        onComplete({
            added: added,
            updated: updated,
            skipped: skipped,
            total: total,
            beforeCount: beforeCount,
            afterCount: afterCount,
            skippedDetails: skippedDetails
        });
    }

    function showImportDialog() {
        var modal = $(
            '<div style="padding: 15px;">' +
            '  <div class="about" style="margin-bottom: 12px; font-size: 13px; line-height: 1.5;">' +
            '    1. Открой файл <b>backup_XXX_votes.csv</b> в текстовом редакторе.<br>' +
            '    2. Выдели <b>всё</b> содержимое (Ctrl+A), скопируй (Ctrl+C).<br>' +
            '    3. Вставь в поле ниже и нажми «Импортировать».<br>' +
            '    <span style="color: #f39c12;">Для 4000+ оценок лучше использовать браузер на ПК.</span>' +
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
                                'Обработано: <b>' + processed + '</b> / ' + total +
                                ' (' + percent + '%)'
                            ).css('color', '#f39c12');
                        },
                        function (result) {
                            if (result.error) {
                                $('#import-status').text('Ошибка: ' + result.error).css('color', '#e74c3c');
                                button.css('opacity', '1').css('pointer-events', 'auto');
                                return;
                            }

                            var html = '<b style="color: #79D29E; font-size: 15px;">Импорт завершён ✓</b><br><br>' +
                                'Всего строк в CSV: <b>' + result.total + '</b><br>' +
                                'Новых оценок: <b style="color: #79D29E;">' + result.added + '</b><br>' +
                                'Обновлено: <b>' + result.updated + '</b><br>' +
                                'Пропущено: <b style="color: #f39c12;">' + result.skipped + '</b><br><br>' +
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

    function addSettingsButton() {
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: {
                type: 'button',
                name: 'kinopoisk_import_csv'
            },
            field: {
                name: 'Импорт из CSV Кинориума',
                description: 'Импортирует 4000+ оценок из экспортированного CSV'
            },
            onChange: function () {
                Lampa.Controller.toContent();
                showImportDialog();
            }
        });
    }

    function startPlugin() {
        window.kinopoisk_import_csv_ready = true;
        if (window.lampa_settings.kinopoisk) {
            addSettingsButton();
        } else {
            setTimeout(addSettingsButton, 2000);
        }
    }

    if (!window.kinopoisk_import_csv_ready) startPlugin();
})();