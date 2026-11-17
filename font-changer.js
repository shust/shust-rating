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

    // Элементы, которые всегда считаются мелким текстом (кроме автоопределения).
    var SMALL_SELECTORS = [];

    var KEY_FONT   = 'font_changer_family';
    var KEY_SIZE   = 'font_changer_size';
    var KEY_SMALL  = 'font_changer_small';
    var KEY_THRESH = 'font_changer_thresh';

    var CLS_SMALL  = 'fc-small';
    var CLS_NORMAL = 'fc-normal';

    // ───────── Автоопределение мелкого текста ─────────

    var observer = null;
    var timer    = null;
    var pending  = [];
    var runId    = 0;

    function isEnabled() {
        return !!FONTS[Lampa.Storage.get(KEY_FONT, 'original')] &&
               Lampa.Storage.get(KEY_FONT, 'original') !== 'original';
    }

    function getThreshold() {
        var t = parseInt(Lampa.Storage.get(KEY_THRESH, '90'), 10);
        if (!t || t < 30 || t > 120) t = 90;
        return t / 100;
    }

    function matchesForced(el) {
        if (!SMALL_SELECTORS.length) return false;
        try { return el.matches(SMALL_SELECTORS.join(',')); } catch (e) { return false; }
    }

    // Размечает один элемент с текстом: мелкий или обычный
    function classify(el, base, ratio) {
        var size = parseFloat(window.getComputedStyle(el).fontSize);
        var small = !!(size && base && (size / base) < ratio) || matchesForced(el);

        if (small) {
            el.classList.remove(CLS_NORMAL);
            el.classList.add(CLS_SMALL);
        } else {
            el.classList.remove(CLS_SMALL);
            el.classList.add(CLS_NORMAL);
        }
    }

    // Обходит текстовые узлы внутри root и размечает их родителей
    function scan(root) {
        if (!root) return;

        var base  = parseFloat(window.getComputedStyle(document.body).fontSize);
        var ratio = getThreshold();

        if (root.nodeType === 3) {
            if (root.parentElement && root.nodeValue.trim()) classify(root.parentElement, base, ratio);
            return;
        }
        if (root.nodeType !== 1) return;

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;
        runId++;

        while ((node = walker.nextNode())) {
            var parent = node.parentElement;
            if (!parent || parent.__fcRun === runId) continue;
            if (!node.nodeValue.trim()) continue;

            var tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE') continue;

            parent.__fcRun = runId;
            classify(parent, base, ratio);
        }
    }

    function flush() {
        timer = null;
        if (!isEnabled()) { pending = []; return; }

        var nodes = pending;
        pending = [];
        for (var i = 0; i < nodes.length; i++) scan(nodes[i]);
    }

    function onMutations(list) {
        for (var i = 0; i < list.length; i++) {
            var added = list[i].addedNodes;
            for (var j = 0; j < added.length; j++) pending.push(added[j]);
        }
        if (!timer) timer = setTimeout(flush, 80);
    }

    function startObserver() {
        if (observer || !window.MutationObserver) return;
        observer = new MutationObserver(onMutations);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
        if (observer) { observer.disconnect(); observer = null; }
        if (timer) { clearTimeout(timer); timer = null; }
        pending = [];
    }

    function clearClasses() {
        var els = document.querySelectorAll('.' + CLS_SMALL + ', .' + CLS_NORMAL);
        for (var i = 0; i < els.length; i++) {
            els[i].classList.remove(CLS_SMALL);
            els[i].classList.remove(CLS_NORMAL);
        }
    }

    // ───────── Применение шрифта ─────────

    function removeStyle() {
        var old = document.getElementById(STYLE_ID);
        if (old && old.parentNode) old.parentNode.removeChild(old);
    }

    function fontFace(font, subset, size, family) {
        var k = size / 100;
        var url = CDN + font.pkg + '/files/' + font.file + '-' + subset + '-wght-normal.woff2';

        return '@font-face {' +
            'font-family: "' + family + '";' +
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

        if (!font || key === 'original') {
            stopObserver();
            clearClasses();
            return;
        }

        var sizeSetting = Lampa.Storage.get(KEY_SIZE, 'auto');
        var size = sizeSetting === 'auto' ? font.size : parseInt(sizeSetting, 10);
        if (!size || size < 50 || size > 150) size = font.size;

        // Отдельное семейство с увеличенными буквами для мелкого текста
        var smallK = parseInt(Lampa.Storage.get(KEY_SMALL, '115'), 10);
        if (!smallK || smallK < 80 || smallK > 200) smallK = 115;
        var smallSize = Math.round(size * smallK / 100);

        var css =
            fontFace(font, 'cyrillic', size, 'LampaCustomFont') +
            fontFace(font, 'latin', size, 'LampaCustomFont') +
            fontFace(font, 'cyrillic', smallSize, 'LampaCustomFontSmall') +
            fontFace(font, 'latin', smallSize, 'LampaCustomFontSmall') +
            'body, input, button, textarea, select {' +
                'font-family: "LampaCustomFont", "SegoeUI", sans-serif !important;' +
            '}' +
            '.' + CLS_NORMAL + ' {' +
                'font-family: "LampaCustomFont", "SegoeUI", sans-serif !important;' +
            '}' +
            '.' + CLS_SMALL + ' {' +
                'font-family: "LampaCustomFontSmall", "SegoeUI", sans-serif !important;' +
            '}' +
            '.card__age {' +
                'font-size: 1em;' +
                'margin-top: 0.5em;' +
                'opacity: 0.65;' +
            '}' +
            '.watch-sync-meta__episode {' +
                'font-weight: 400;' +
            '}';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);

        // Пересчитываем весь интерфейс и следим за новыми элементами
        scan(document.body);
        startObserver();
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

    function buildSmallValues() {
        var values = {};
        for (var i = 100; i <= 150; i += 5) values[String(i)] = i + '%';
        return values;
    }

    function buildThreshValues() {
        var values = {};
        for (var i = 60; i <= 100; i += 5) values[String(i)] = 'меньше ' + i + '% от основного';
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

        Lampa.SettingsApi.addParam({
            component: 'font_changer',
            param: { name: KEY_SMALL, type: 'select', values: buildSmallValues(), default: '115' },
            field: {
                name: 'Увеличение мелкого текста',
                description: 'Насколько дополнительно увеличить буквы в мелком тексте'
            },
            onChange: apply
        });

        Lampa.SettingsApi.addParam({
            component: 'font_changer',
            param: { name: KEY_THRESH, type: 'select', values: buildThreshValues(), default: '90' },
            field: {
                name: 'Что считать мелким текстом',
                description: 'Текст мельче этого порога (относительно основного размера) определяется автоматически'
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
