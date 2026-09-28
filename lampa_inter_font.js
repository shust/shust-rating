(function () {
  'use strict';

  var PLUGIN_ID = 'inter_font_global';
  if (window[PLUGIN_ID]) return;
  window[PLUGIN_ID] = true;

  var INTER_CSS_ID = 'lampa-inter-font-source';
  var STYLE_ID = 'lampa-inter-font-style';

  function loadInter() {
    if (!document.getElementById(INTER_CSS_ID)) {
      var link = document.createElement('link');
      link.id = INTER_CSS_ID;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }

    if (!document.getElementById(STYLE_ID)) {
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        html,
        body,
        #app {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif !important;
        }

        /* Apply Inter to normal text UI, including dynamically created Lampa elements */
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
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif !important;
        }

        /*
         * Do NOT override icon glyph fonts explicitly.
         * This prevents icon-font based controls from turning into missing symbols.
         */
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
      `;
      document.head.appendChild(style);
    }

    document.documentElement.style.setProperty('--lampa-font-family', '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif');
  }

  function init() {
    if (!document.head) {
      setTimeout(init, 100);
      return;
    }

    loadInter();

    // Re-apply after Lampa builds/updates UI
    try {
      var observer = new MutationObserver(function () {
        var style = document.getElementById(STYLE_ID);
        if (!style) loadInter();
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (e) {}

    console.log('[Lampa Inter Font] loaded');
  }

  if (window.appready) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
    setTimeout(init, 1000);
  }
})();
