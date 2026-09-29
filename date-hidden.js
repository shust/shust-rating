/**
 * Плагин: Hide Date in Header
 * Версия: 1.1.0
 * Описание: Убирает дату, день недели, месяц и год из шапки Lampa TV,
 *           оставляя только время (часы и минуты).
 * Совместимость: Lampa для Android TV
 * Структура шапки (целевые селекторы):
 *   .head__time
 *     .head__time-now.time--clock   → оставляем
 *     .head__time-date.time--full   → скрываем
 *     .head__time-week.time--week   → скрываем
 */

(function () {
    'use strict';

    var PLUGIN_VERSION = '1.1.0';

    if (window.hide_date_ready) {
        console.log('[Hide Date] Плагин уже загружен, версия:', window.hide_date_version || PLUGIN_VERSION);
        return;
    }

    function startPlugin() {
        window.hide_date_ready = true;
        window.hide_date_version = PLUGIN_VERSION;

        console.log('[Hide Date] Запуск плагина версии ' + PLUGIN_VERSION);

        // 1) Вставляем CSS один раз — прячем дату и день недели
        function injectStyles() {
            if (document.getElementById('hide-date-style')) return;

            var css = `
                .head__time-date,
                .head__time-week,
                .head__time .time--full,
                .head__time .time--week {
                    display: none !important;
                }
            `;

            var style = document.createElement('style');
            style.id = 'hide-date-style';
            style.type = 'text/css';
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        }

        // 2) JS-страховка: прячем элементы по классам и по содержимому
        function hideDate() {
            // По точным классам
            document.querySelectorAll('.head__time-date, .head__time-week, .time--full, .time--week')
                .forEach(function (el) {
                    el.style.setProperty('display', 'none', 'important');
                });

            // Оставляем в .head__time только блок с временем
            document.querySelectorAll('.head__time').forEach(function (container) {
                Array.prototype.forEach.call(container.children, function (child) {
                    // Оставляем только тот блок, у которого есть класс time--clock
                    if (!child.classList.contains('time--clock')) {
                        child.style.setProperty('display', 'none', 'important');
                    }
                });
            });
        }

        // Периодическая проверка — на случай перерисовок интерфейса
        function run() {
            injectStyles();
            hideDate();
        }

        // Запуск после готовности приложения
        function boot() {
            run();
            // Часы и дата обновляются каждую секунду — держим состояние
            setInterval(run, 1000);
        }

        if (window.appready) {
            boot();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') boot();
            });
        }

        // Переприменяем при смене активности
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' || e.type === 'render') {
                setTimeout(run, 100);
            }
        });
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
