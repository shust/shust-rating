/*
 * Тестовый плагин: проверка открытия штатного окна предзагрузки Lampa
 * 
 * Цель: выяснить, откроется ли штатное окно предзагрузки Lampa,
 * если вызвать Lampa.Player.play() с URL, содержащим &preload,
 * но НЕ из штатного места (списка торрент-раздач), а из плагина.
 * 
 * Использование:
 * 1. Подключить этот плагин в Lampa.
 * 2. Открыть карточку любого фильма.
 * 3. В консоли выполнить:
 *    window.__test_preload_launch('http://IP:8090/stream/file.mkv?link=HASH&index=0&preload')
 *    (замените IP, file.mkv, HASH и index на реальные значения вашего TorrServer)
 * 4. Посмотреть, откроется ли штатное окно предзагрузки.
 * 
 * Если откроется — значит, Lampa показывает окно на основе наличия &preload в URL,
 * независимо от того, откуда пришёл вызов. Это подтвердит гипотезу.
 * 
 * Если не откроется (сразу бросит в плеер или ничего не произойдёт) —
 * значит, Lampa проверяет что-то ещё (контекст, флаги, контроллер),
 * и подход "просто передать &preload" не сработает.
 */

(function() {
    'use strict';

    if (window.__lampa_test_preload_launch) return;
    window.__lampa_test_preload_launch = true;

    function debug() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[TestPreload]');
        try { console.log.apply(console, args); } catch(e) {}
    }

    function noty(msg) {
        if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(msg);
    }

    // Основная функция для ручного теста
    window.__test_preload_launch = function(testUrl) {
        if (!testUrl) {
            noty('Укажите URL: window.__test_preload_launch("http://...&preload")');
            return;
        }

        debug('=== ЗАПУСК ТЕСТА ===');
        debug('URL:', testUrl);
        debug('Контроллер:', Lampa.Controller && Lampa.Controller.enabled ? Lampa.Controller.enabled().name : '?');

        // Собираем данные для плеера
        var data = {
            url: testUrl,
            title: 'Test Preload',
            // Указываем, что это торрент, чтобы Lampa могла отслеживать таймлайн
            torrent_hash: '',
            // Карточка не обязательна для теста, но добавим
            card: null
        };

        // Пытаемся вытащить текущую карточку
        try {
            var active = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
            if (active && active.movie) {
                data.card = active.movie;
                data.torrent_hash = active.movie.torrent_hash || '';
                debug('Карточка найдена:', data.card.title || data.card.name);
            }
        } catch(e) {
            debug('Не удалось получить карточку:', e.message);
        }

        // Запоминаем оригинальный play для сравнения
        var originalPlay = Lampa.Player.play;

        // Оборачиваем, чтобы увидеть, что происходит внутри
        var callCount = 0;
        Lampa.Player.play = function(d) {
            callCount++;
            debug('Lampa.Player.play вызван (#' + callCount + ')');
            debug('  URL в data:', d && d.url ? d.url.substring(0, 80) + '...' : '(нет)');
            debug('  return_result:', d && d.return_result);
            
            // Проверяем, есть ли &preload в URL
            if (d && d.url && d.url.indexOf('&preload') !== -1) {
                debug('  → URL содержит &preload');
            } else {
                debug('  → URL НЕ содержит &preload');
            }
            
            var result = originalPlay.apply(this, arguments);
            
            // Восстанавливаем через секунду (на случай цепочки вызовов)
            setTimeout(function() {
                Lampa.Player.play = originalPlay;
                debug('Lampa.Player.play восстановлен (было вызовов: ' + callCount + ')');
            }, 1000);
            
            return result;
        };

        try {
            noty('Тест: вызов Lampa.Player.play с &preload...');
            Lampa.Player.play(data);
            debug('Lampa.Player.play успешно вызван');
        } catch(e) {
            debug('ОШИБКА при вызове Lampa.Player.play:', e.message);
            noty('Ошибка: ' + e.message);
            Lampa.Player.play = originalPlay;
        }
    };

    // Дополнительно: функция для проверки, как выглядит URL, который строит Lampa
    window.__test_build_stream_url = function(path, hash, index) {
        if (!Lampa.Torserver || !Lampa.Torserver.stream) {
            noty('Lampa.Torserver.stream недоступен');
            return;
        }
        var url = Lampa.Torserver.stream(path, hash, index);
        debug('Lampa.Torserver.stream вернул:', url);
        noty('URL: ' + url);
        return url;
    };

    console.log('[TestPreload] Плагин загружен. Доступны функции:');
    console.log('  window.__test_preload_launch(url) — запустить тест с указанным URL');
    console.log('  window.__test_build_stream_url(path, hash, index) — посмотреть, какой URL строит Lampa');

    // Показываем уведомление при загрузке, если appready уже был
    if (window.appready) {
        noty('TestPreload: плагин загружен. См. консоль.');
    }

})();
