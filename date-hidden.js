/**
 * Плагин: Hide Date in Header + Button Font Weight
 * Версия: 1.2.0
 * Описание:
 *   1) Убирает дату, день недели, месяц и год из шапки Lampa TV,
 *      оставляя только время (часы и минуты).
 *   2) Заменяет толщину шрифта на кнопках (.full-start__button) на 600.
 * Совместимость: Lampa для Android TV
 *
 * Целевые селекторы:
 *   Шапка:
 *     .head__time
 *       .head__time-now.time--clock   → оставляем
 *       .head__time-date.time--full   → скрываем
 *       .head__time-week.time--week   → скрываем
 *   Кнопки:
 *     .full-start__button → font-weight: 600
 */

(function () {
    'use strict';

    var PLUGIN_VERSION = '1.2.0';

    // ⚙️ Настройки плагина
    var BUTTON_FONT_WEIGHT = '600';   // толщина шрифта на кнопках
    var BUTTON_SELECTOR = '.full-start__button';

    if (window.hide_date_ready) {
        console.log('[Hide Date] Плагин уже загружен, версия:', window.hide_date_version || PLUGIN_VERSION);
        return;
    }

    function startPlugin() {
        window.hide_date_ready = true;
        window.hide_date_version = PLUGIN_VERSION;

        console.log('[Hide Date] Запуск плагина версии ' + PLUGIN_VERSION);

        // 1) Вставляем CSS один раз — прячем дату/день недели и меняем шрифт кнопок
        function injectStyles() {
            if (document.getElementById('hide-date-style')) return;

            var css = `
                /* === Скрытие даты и дня недели в шапке === */
                .head__time-date,
                .head__time-week,
                .head__time .time--full,
                .head__time .time--week {
                    display: none !important;
                }

                /* === Толщина шрифта на кнопках === */
                ${BUTTON_SELECTOR} {
                    font-weight: ${BUTTON_FONT_WEIGHT} !important;
                }
            `;

            var style = document.createElement('style');
            style.id = 'hide-date-style';
            style.type = 'text/css';
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        }

        // 2) JS-страховка: прячем дату по классам и оставляем только время
        function hideDate() {
            // По точным классам
            document.querySelectorAll('.head__time-date, .head__time-week, .time--full, .time--week')
                .forEach(function (el) {
                    el.style.setProperty('display', 'none', 'important');
                });

            // Оставляем в .head__time только блок с временем
            document.querySelectorAll('.head__time').forEach(function (container) {
                Array.prototype.forEach.call(container.children, function (child) {
                    if (!child.classList.contains('time--clock')) {
                        child.style.setProperty('display', 'none', 'important');
                    }
                });
            });
        }

        // 3) JS-страховка: применяем толщину шрифта кнопок (на случай перерисовки)
        function applyButtonWeight() {
            document.querySelectorAll(BUTTON_SELECTOR).forEach(function (el) {
                el.style.setProperty('font-weight', BUTTON_FONT_WEIGHT, 'important');
            });
        }

        // Периодическая проверка — на случай перерисовок интерфейса
        function run() {
            injectStyles();
            hideDate();
            applyButtonWeight();
        }

        // Запуск после готовности приложения
        function boot() {
            run();
            // Часы обновляются каждую секунду — держим состояние
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
