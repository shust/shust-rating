/**
 * Плагин "Font Switcher" для Lampa.mx
 * 
 * Назначение:
 *   Позволяет менять шрифт интерфейса Lampa на выбранный из списка
 *   (доступны шрифты Onest и Inter из Google Fonts) через настройки приложения.
 *   Дополнительно применяет набор кастомных CSS-стилей для элементов
 *   интерфейса (возрастной рейтинг, меню, заголовки, кнопки и т.д.),
 *   улучшая внешний вид и читаемость.
 * 
 * Использование:
 *   Подключить плагин в Lampa → Настройки → Шрифт интерфейса → выбрать шрифт.
 *   Выбор сохраняется и применяется автоматически при следующем запуске.
 */
(function() {
    'use strict';

    // Предотвращаем повторную загрузку плагина
    if (window.font_switcher_plugin_ready) return;
    window.font_switcher_plugin_ready = true;

    // --- 1. Подключение шрифтов из Google Fonts ---
    // Onest
    var onestLink = document.createElement('link');
    onestLink.rel = 'stylesheet';
    onestLink.href = 'https://fonts.googleapis.com/css2?family=Onest:wght@100..900&display=swap';
    document.head.appendChild(onestLink);

    // Inter
    var interLink = document.createElement('link');
    interLink.rel = 'stylesheet';
    interLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap';
    document.head.appendChild(interLink);

    // --- 2. Базовые стили интерфейса (применяются всегда) ---
    // Эти правила не зависят от выбранного шрифта и применяются один раз
    function applyBaseStyles() {
        // Удаляем старый стиль базовых правил, если он есть
        var oldBase = document.getElementById('font-switcher-base-style');
        if (oldBase) {
            oldBase.remove();
        }

        var style = document.createElement('style');
        style.id = 'font-switcher-base-style';
        style.textContent = `
            .card__age {
                opacity: 0.65;
                font-weight: 300;
            }
            .menu__text {
                font-size: 1.2em;
                margin-top: 0.1em;
                font-weight: 300;
            }
            .items-line__title {
                font-weight: 500;
            }
            .full-start-new__split {
                zoom: 0.5;
            }
            .full-start__button > svg + span {
                margin-top: -0.0em;
            }
            .head__time-now {
                margin-top: 0.13em;
            }
            .card__vote {
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    // --- 3. Функция для применения шрифта ---
    function applyFont(fontName) {
        // Удаляем старый стиль шрифта, если он есть
        var oldStyle = document.getElementById('font-switcher-style');
        if (oldStyle) {
            oldStyle.remove();
        }

        // Если выбран вариант "По умолчанию" (или пусто), ничего не делаем
        if (!fontName || fontName === 'default') {
            return;
        }

        // Создаем новый тег <style> с правилом для шрифта
        var style = document.createElement('style');
        style.id = 'font-switcher-style';
        style.textContent = `
            body * {
                font-family: '${fontName}', sans-serif !important;
            }
        `;
        document.head.appendChild(style);
    }

    // --- 4. Инициализация плагина после готовности Lampa ---
    function init() {
        // Применяем базовые стили сразу при запуске
        applyBaseStyles();

        // Регистрируем раздел настроек
        Lampa.SettingsApi.addComponent({
            component: 'font_switcher',
            name: 'Шрифт интерфейса',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>'
        });

        // Добавляем параметр выбора шрифта
        Lampa.SettingsApi.addParam({
            component: 'font_switcher',
            param: {
                name: 'font_switcher_family',
                type: 'select',
                // Используем объект: ключ — сохраняемое значение, значение — отображаемый текст
                values: {
                    default: 'По умолчанию',
                    Onest: 'Onest',
                    Inter: 'Inter'
                },
                default: 'default'
            },
            field: {
                name: 'Выберите шрифт',
                description: 'Шрифт, который будет использоваться во всем интерфейсе Lampa'
            },
            onChange: function() {
                // Читаем актуальное значение из хранилища и применяем
                var selectedFont = Lampa.Storage.field('font_switcher_family');
                applyFont(selectedFont);
            }
        });

        // Применяем сохраненный шрифт при запуске
        var savedFont = Lampa.Storage.field('font_switcher_family');
        applyFont(savedFont);
    }

    // Запускаем init, когда приложение Lampa будет готово
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                init();
            }
        });
    }

})();
