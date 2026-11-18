(function () {
    'use strict';

    if (window.lampa_font_changer) return;
    window.lampa_font_changer = true;

    // ───────── Настройки плагина ─────────

    var STYLE_ID = 'lampa-font-changer-style';
    var CDN      = 'https://cdn.jsdelivr.net/npm/';

    // Метрики оригинального Segoe UI (в % от размера шрифта)
    var SEGOE_ASCENT  = 107.9;
    var SEGOE_DESCENT = 25.1;

    // size - начальный size-adjust (%), подгоняет размер глифов под Segoe UI
    var FONTS = {
        original: { name: 'Оригинальный' },
        onest:    { name: 'Onest',  pkg: '@fontsource-variable/onest',  file: 'onest',  size: 92 },
        inter:    { name: 'Inter',  pkg: '@fontsource-variable/inter',  file: 'inter',  size: 90 },
        roboto:   { name: 'Roboto', pkg: '@fontsource-variable/roboto', file: 'roboto', size: 95 }
    };

    var RANGES = {
        cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
        latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
    };

    var KEY_FONT = 'font_changer_family';
    var KEY_SIZE = 'font_changer_size';

    // ───────── Применение шрифта ─────────

    function removeStyle() {
        var old = document.getElementById(STYLE_ID);
        if (old && old.parentNode) old.parentNode.removeChild(old);
    }

    function fontFace(font, subset, size) {
        var k = size / 100;
        var url = CDN + font.pkg + '/files/' + font.file + '-' + subset + '-wght-normal.woff2';

        return '@font-face {' +
            'font-family: "LampaCustomFont";' +
            'font-style: normal;' +
            'font-weight: 100 900;' +
            'font-display: swap;' +
            'src: url("' + url + '") format("woff2");' +
            'unicode-range: ' + RANGES[subset] + ';' +
            'size-adjust: ' + size + '%;' +
            'ascent-override: ' + (SEGOE_ASCENT / k).toFixed(1) + '%;' +
            'descent-override: ' + (SEGOE_DESCENT / k).toFixed(1) + '%;' +
            'line-gap-override: 0%;' +
        '}';
    }

    function apply() {
        var key  = Lampa.Storage.get(KEY_FONT, 'original');
        var font = FONTS[key];

        removeStyle();

        if (!font || key === 'original') return;

        var sizeSetting = Lampa.Storage.get(KEY_SIZE, 'auto');
        var size = sizeSetting === 'auto' ? font.size : parseInt(sizeSetting, 10);
        if (!size || size < 50 || size > 150) size = font.size;

        var css =
            fontFace(font, 'cyrillic', size) +
            fontFace(font, 'latin', size) +
            'body, input, button, textarea, select {' +
                'font-family: "LampaCustomFont", "SegoeUI", sans-serif !important;' +
            '}' +
            '.card__age {' +
                'font-size: 1em;' +
                'margin-top: 0.5em;' +
                'opacity: 0.65;' +
            '}' +
            '.items-line__title {' +
                'font-weight: 600;' +
            '}' +
            '.watch-sync-meta__episode {' +
                'font-weight: 400;' +
            '}';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ───────── Меню настроек ─────────

    function buildValues() {
        var values = {};
        for (var key in FONTS) values[key] = FONTS[key].name;
        return values;
    }

    function buildSizeValues() {
        var values = { auto: 'Авто (подобрано для шрифта)' };
        for (var i = 80; i <= 110; i += 2) values[String(i)] = i + '%';
        return values;
    }

    function initSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'font_changer',
            name: 'Шрифт',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'font_changer',
            param: { name: KEY_FONT, type: 'select', values: buildValues(), default: 'original' },
            field: {
                name: 'Шрифт интерфейса',
                description: 'Выберите шрифт для всего текста в Lampa'
            },
            onChange: apply
        });

        Lampa.SettingsApi.addParam({
            component: 'font_changer',
            param: { name: KEY_SIZE, type: 'select', values: buildSizeValues(), default: 'auto' },
            field: {
                name: 'Размер текста',
                description: 'Подгонка размера букв выбранного шрифта. Размеры блоков, иконок и отступов не меняются'
            },
            onChange: apply
        });
    }

    // ───────── Запуск ─────────

    function start() {
        initSettings();
        apply();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });
})();
