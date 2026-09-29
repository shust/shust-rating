/**
 * Плагин: Hide Date in Header + Button Style
 * Версия: 1.5.0
 * Описание:
 *   1) Убирает дату, день недели, месяц и год из шапки Lampa TV,
 *      оставляя только время (часы и минуты).
 *   2) Заменяет толщину шрифта на кнопках (.full-start__button) на 600.
 *   3) Добавляет margin-bottom: -0.5em и шрифт Onest на кнопках.
 * Совместимость: Lampa для Android TV
 *
 * Целевые селекторы:
 *   Шапка:
 *     .head__time
 *       .head__time-now.time--clock   → оставляем
 *       .head__time-date.time--full   → скрываем
 *       .head__time-week.time--week   → скрываем
 *   Кнопки:
 *     .full-start__button → font-weight: 600;
 *                           margin-bottom: -0.5em;
 *                           font-family: Onest;
 */

(function () {
    'use strict';

    var PLUGIN_VERSION = '1.5.0';

    // ⚙️ Настройки плагина
    var BUTTON_SELECTOR      = '.full-start__button';
    var BUTTON_FONT_WEIGHT   = '600';
    var BUTTON_MARGIN_BOTTOM = '-0.5em';
    var BUTTON_FONT_FAMILY   = 'Onest';

    if (window.hide_date_ready) {
        console.log('[Hide Date] Плагин уже загружен, версия:', window.hide_date_version || PLUGIN_VERSION);
        return;
    }

    function startPlugin() {
        window.hide_date_ready = true;
        window.hide_date_version = PLUGIN_VERSION;

        console.log('[Hide Date] Запуск плагина версии ' + PLUGIN_VERSION);

        // 1) Вставляем CSS один раз — прячем дату/день недели и стилизуем кнопки
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

                /* === Стиль кнопок === */
                ${BUTTON_SELECTOR} {
                    font-weight: ${BUTTON_FONT_WEIGHT} !important;
                    margin-bottom: ${BUTTON_MARGIN_BOTTOM} !important;
                    font-family: ${BUTTON_FONT_FAMILY}, sans-serif !important;
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
            document.querySelectorAll('.head__time-date, .head__time-week, .time--full, .time--week')
                .forEach(function (el) {
                    el.style.setProperty('display', 'none', 'important');
                });

            document.querySelectorAll('.head__time').forEach(function (container) {
                Array.prototype.forEach.call(container.children, function (child) {
                    if (!child.classList.contains('time--clock')) {
                        child.style.setProperty('display', 'none', 'important');
                    }
                });
            });
        }

        // 3) JS-страховка: применяем стили кнопок (на случай перерисовки)
        function applyButtonStyle() {
            document.querySelectorAll(BUTTON_SELECTOR).forEach(function (el) {
                el.style.setProperty('font-weight', BUTTON_FONT_WEIGHT, 'important');
                el.style.setProperty('margin-bottom', BUTTON_MARGIN_BOTTOM, 'important');
                el.style.setProperty('font-family', BUTTON_FONT_FAMILY + ', sans-serif', 'important');
            });
        }

        // Периодическая проверка — на случай перерисовок интерфейса
        function run() {
            injectStyles();
            hideDate();
            applyButtonStyle();
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
