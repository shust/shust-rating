/**
 * Плагин: Hide Date in Header
 * Версия: 1.0.1
 * Описание: Убирает дату, день недели, месяц и год из шапки Lampa TV,
 *           оставляя только время.
 * Совместимость: Lampa для Android TV
 */

(function () {
    'use strict';

    var PLUGIN_VERSION = '1.0.1';

    if (window.hide_date_ready) return;

    function startPlugin() {
        window.hide_date_ready = true;
        window.hide_date_version = PLUGIN_VERSION;

        console.log('[Hide Date] Запуск плагина версии ' + PLUGIN_VERSION);

        // Основная функция: находим контейнер часов и оставляем только время
        function fixClock() {
            // Ищем все возможные контейнеры часов в шапке
            var selectors = [
                '.header__time',
                '.header__clock',
                '.header__date-time',
                '.time',
                '.clock'
            ];

            selectors.forEach(function (sel) {
                document.querySelectorAll(sel).forEach(function (container) {
                    // Проходим по всем дочерним элементам
                    Array.prototype.forEach.call(container.children, function (child) {
                        var text = (child.textContent || '').trim();

                        // Проверяем: похоже ли содержимое на время (только HH:MM или HH:MM:SS)?
                        var isTime = /^\d{1,2}:\d{2}(:\d{2})?$/.test(text);

                        if (!isTime && text.length > 0) {
                            // Это не время — скрываем (дата, день недели и т.д.)
                            child.style.setProperty('display', 'none', 'important');
                        }
                    });

                    // На всякий случай скрываем все текстовые узлы, кроме времени
                    Array.prototype.forEach.call(container.childNodes, function (node) {
                        if (node.nodeType === 3) { // текстовый узел
                            var t = (node.textContent || '').trim();
                            if (t && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
                                node.textContent = '';
                            }
                        }
                    });
                });
            });

            // Дополнительно: скрываем любые элементы, чей текст содержит день недели/месяц/год
            var header = document.querySelector('.header');
            if (header) {
                header.querySelectorAll('*').forEach(function (el) {
                    if (el.children.length > 0) return; // только "листовые" элементы
                    var t = (el.textContent || '').trim();
                    if (!t) return;
                    if (/(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)/i.test(t) ||
                        /20\d{2}/.test(t) ||
                        /\d{1,2}\s+(январ|феврал|март|апрел|ма|июн|июл|август|сентябр|октябр|ноябр|декабр)/i.test(t)) {
                        el.style.setProperty('display', 'none', 'important');
                    }
                });
            }
        }

        // Запуск по готовности приложения
        if (window.appready) {
            fixClock();
            setInterval(fixClock, 1000); // часы обновляются каждую секунду
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    fixClock();
                    setInterval(fixClock, 1000);
                }
            });
        }

        // Переприменяем при навигации
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' || e.type === 'render') {
                setTimeout(fixClock, 100);
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
