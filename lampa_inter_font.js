(function () {
  'use strict';

  var PLUGIN_ID      = 'lampa_custom_font_global';
  var PLUGIN_VERSION = '1.5.0';

  if (window[PLUGIN_ID]) return;
  window[PLUGIN_ID] = true;

  var STORAGE_KEY = 'lampa_font_choice';
  var LINK_ID     = 'lampa-custom-font-source';
  var STYLE_ID    = 'lampa-custom-font-style';

  var FONTS = {
    original: {
      title: 'Оригинальный',
      family: null,
      url: null,
      size: null
    },
    inter: {
      title: 'Inter',
      family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap',
      size: 16
    },
    onest: {
      title: 'Onest',
      family: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      url: 'https://fonts.googleapis.com/css2?family=Onest:wght@100;200;300;400;500;600;700;800;900&display=swap',
      size: 16
    },
    roboto: {
      title: 'Roboto',
      family: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      url: 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap',
      size: 17
    }
  };

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
    document.documentElement.style.removeProperty('font-size');
    document.body.style.removeProperty('font-size');
  }

  // Перехват Lampa.Layer.update — сюда Lampa сбрасывает свои размеры
  function hookLayerUpdate() {
    if (!window.Lampa || !Lampa.Layer || !Lampa.Layer.update) return false;
    if (Lampa.Layer._font_hooked) return true;
    Lampa.Layer._font_hooked = true;

    var originalUpdate = Lampa.Layer.update;
    Lampa.Layer.update = function () {
      var result = originalUpdate.apply(this, arguments);

      var choice = getChoice();
      var font = FONTS[choice];
      if (font && font.family && font.size) {
        // Принудительно ставим размер на body после того, как Lampa
        // применит свои responsive-настройки
        document.body.style.setProperty('font-size', font.size + 'px', 'important');
      }

      return result;
    };
    return true;
  }

  function applyFont(key) {
    var font = FONTS[key] || FONTS.original;

    if (!font.family) {
      removeFont();
      return;
    }

    var link = document.getElementById(LINK_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== font.url) link.href = font.url;

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `
      html,
      body,
      #app {
        font-family: ${font.family} !important;
      }

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
        font-family: inherit !important;
        font-size: inherit !important;
      }
    `;

    if (font.size) {
      document.body.style.setProperty('font-size', font.size + 'px', 'important');
    }

    document.documentElement.style.setProperty('--lampa-font-family', font.family);
  }

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
          onest: 'Onest',
          roboto: 'Roboto'
        },
        default: 'original'
      },
      field: {
        name: 'Шрифт',
        description: 'Выбор шрифта интерфейса Lampa (v' + PLUGIN_VERSION + ')'
      },
      onChange: function (value) {
        setChoice(value);
      }
    });

    try {
      var saved = getChoice();
      Lampa.SettingsApi.set('font_choice', saved);
    } catch (e) {}

    return true;
  }

  function registerVersion() {
    try {
      if (window.Lampa && Lampa.Plugins && typeof Lampa.Plugins.register === 'function') {
        Lampa.Plugins.register(PLUGIN_ID, PLUGIN_VERSION);
      }
    } catch (e) {}
  }

  function init() {
    if (!document.head) {
      setTimeout(init, 100);
      return;
    }

    applyFont(getChoice());
    registerVersion();
    hookLayerUpdate();

    if (!addSettingsItem()) {
      var tries = 0;
      var t = setInterval(function () {
        if (addSettingsItem() || ++tries > 50) clearInterval(t);
      }, 200);
    }

    try {
      var observer = new MutationObserver(function () {
        var current = getChoice();
        if (current === 'original') return;
        if (!document.getElementById(STYLE_ID)) applyFont(current);
        if (!document.documentElement.style.getPropertyValue('--lampa-font-family')) {
          applyFont(current);
        }
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
