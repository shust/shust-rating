(function () {
  'use strict';

  var PLUGIN_ID      = 'lampa_custom_font_global';
  var PLUGIN_VERSION = '1.1.0';

  if (window[PLUGIN_ID]) return;
  window[PLUGIN_ID] = true;

  var STORAGE_KEY = 'lampa_font_choice';   // 'original' | 'inter' | 'onest'
  var LINK_ID     = 'lampa-custom-font-source';
  var STYLE_ID    = 'lampa-custom-font-style';

  // Описание доступных шрифтов
  var FONTS = {
    original: {
      title: 'Оригинальный',
      family: null, // null = не трогаем шрифт
      url: null,
      scale: 1
    },
    inter: {
      title: 'Inter',
      family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap',
      scale: 0.8 // -20%
    },
    onest: {
      title: 'Onest',
      family: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      url: 'https://fonts.googleapis.com/css2?family=Onest:wght@100;200;300;400;500;600;700;800;900&display=swap',
      scale: 0.8 // -20%
    }
  };

  // ---------- Работа со шрифтом ----------

  function getChoice() {
    var v = null;
    try { v = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    return FONTS[v] ? v : 'original';
  }

  function setChoice(key) {
    if (!FONTS[key]) key = 'original';
    try { localStorage.setItem(STORAGE_KEY, key); } catch (e) {}
    applyFont(key);
  }

  function removeFont() {
    var link = document.getElementById(LINK_ID);
    if (link && link.parentNode) link.parentNode.removeChild(link);
    var style = document.getElementById(STYLE_ID);
    if (style && style.parentNode) style.parentNode.removeChild(style);
    document.documentElement.style.removeProperty('--lampa-font-family');
    document.documentElement.style.removeProperty('--lampa-font-scale');
  }

  function buildScaleCss(scale) {
    if (scale === 1) return '';

    // Процент уменьшения относительно базового размера
    var pct = Math.round(scale * 100); // например, 80

    return `
      /* ===== Уменьшение всех шрифтов на 20% (при кастомном шрифте) ===== */
      html,
      body,
      #app {
        font-size: ${pct}% !important;
      }

      /* Основные контейнеры и элементы интерфейса */
      #app div,
      #app span,
      #app p,
      #app a,
      #app button,
      #app input,
      #app textarea,
      #app select,
      #app option,
      #app label,
      #app h1,
      #app h2,
      #app h3,
      #app h4,
      #app h5,
      #app h6,
      .selectbox,
      .modal,
      .settings,
      .settings-param,
      .settings-box,
      .menu,
      .head,
      .card,
      .full,
      .activity,
      .notice,
      .keyboard {
        font-size: ${pct}% !important;
      }

      /* ===== ИСКЛЮЧЕНИЕ: рейтинги на странице фильма/сериала ===== */
      /* Возвращаем исходный (100%) размер для блока рейтингов */
      .full-start__rate,
      .full-start__rate *,
      .full-start__rate .rate-value,
      .full-start__rate .rate-country,
      .full-start__rate .rate-source,
      .full-start__rate .rate-name,
      .full-start__rate .rating-value,
      .full-start__rate .rating-name,
      .full-start__rating,
      .full-start__rating *,
      .full__rate,
      .full__rate *,
      .rate,
      .rate *,
      .rate-value,
      .rate-name,
      .rate-source,
      .rating,
      .rating *,
      .ratings,
      .ratings *,
      .ratings__item,
      .ratings__item *,
      .ratings__value,
      .ratings__name,
      [class*="rate"] ,
      [class*="rating"] {
        font-size: 100% !important;
      }
    `;
  }

  function applyFont(key) {
    var font = FONTS[key] || FONTS.original;

    // Оригинальный — просто убираем всё наше
    if (!font.family) {
      removeFont();
      return;
    }

    // Подгружаем CSS шрифта
    var link = document.getElementById(LINK_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== font.url) link.href = font.url;

    // Стили применения
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    var scaleCss = buildScaleCss(font.scale || 1);

    style.textContent = `
      html,
      body,
      #app {
        font-family: ${font.family} !important;
      }

      #app div,
      #app span,
      #app p,
      #app a,
      #app button,
      #app input,
      #app textarea,
      #app select,
      #app option,
      #app label,
      #app h1,
      #app h2,
      #app h3,
      #app h4,
      #app h5,
      #app h6,
      .selectbox,
      .modal,
      .settings,
      .settings-param,
      .settings-box,
      .menu,
      .head,
      .card,
      .full,
      .activity,
      .notice,
      .keyboard {
        font-family: ${font.family} !important;
      }

      /* Не трогаем иконочные шрифты */
      [class*="icon--"],
      [class^="icon--"],
      .icon,
      .icomoon,
      .fa,
      .fas,
      .far,
      .fal,
      .fab,
      [class*="fontawesome"],
      [class*="FontAwesome"] {
        font-family: inherit;
      }

      ${scaleCss}
    `;

    document.documentElement.style.setProperty('--lampa-font-family', font.family);
    document.documentElement.style.setProperty('--lampa-font-scale', String(font.scale || 1));
  }

  // ---------- Интеграция с настройками Lampa ----------

  function addSettingsItem() {
    if (!window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return false;

    Lampa.SettingsApi.addComponent({
      component: 'lampa_custom_font',
      name: 'Шрифт интерфейса',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4h14v2H13v14h-2V6H5V4z" fill="currentColor"/></svg>'
    });

    Lampa.SettingsApi.addParam({
      component: 'lampa_custom_font',
      param: {
        name: 'font_choice',
        type: 'select',
        values: {
          original: 'Оригинальный',
          inter: 'Inter',
          onest: 'Onest'
        },
        default: 'original'
      },
      field: {
        name: 'Шрифт',
        description: 'Выбор шрифта интерфейса Lampa. Inter/Onest уменьшают шрифт на 20% (v' + PLUGIN_VERSION + ')'
      },
      onChange: function (value) {
        setChoice(value);
      }
    });

    // Восстанавливаем сохранённое значение в UI
    try {
      var saved = getChoice();
      Lampa.SettingsApi.set('font_choice', saved);
    } catch (e) {}

    return true;
  }

  // ---------- Регистрация версии в Lampa (если возможно) ----------

  function registerVersion() {
    try {
      if (window.Lampa && Lampa.Plugins && typeof Lampa.Plugins.register === 'function') {
        Lampa.Plugins.register(PLUGIN_ID, PLUGIN_VERSION);
      }
    } catch (e) {}
  }

  // ---------- Инициализация ----------

  function init() {
    if (!document.head) {
      setTimeout(init, 100);
      return;
    }

    // Применяем сохранённый шрифт
    applyFont(getChoice());

    // Регистрируем версию
    registerVersion();

    // Регистрируем настройку (может понадобиться подождать Lampa)
    if (!addSettingsItem()) {
      var tries = 0;
      var t = setInterval(function () {
        if (addSettingsItem() || ++tries > 50) clearInterval(t);
      }, 200);
    }

    // Переприменяем стили, если Lampa их снесла
    try {
      var observer = new MutationObserver(function () {
        var current = getChoice();
        if (current === 'original') return;
        if (!document.getElementById(STYLE_ID)) applyFont(current);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}

    console.log('[Lampa Custom Font] loaded v' + PLUGIN_VERSION);
  }

  if (window.appready) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
    setTimeout(init, 1500);
  }
})();
