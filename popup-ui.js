(function () {
    'use strict';

    var STYLE_ID = 'modal-custom-styles';

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.textContent = `
            .modal__content {
                background-color: #262829b3 !important;
                backdrop-filter: blur(15px) !important;
                -webkit-backdrop-filter: blur(15px) !important;
                padding: 2em !important;
            }
            .modal__head {
                margin-bottom: 0em !important;
            }
            .modal__footer {
                padding-top: 1em !important;
            }
            .scroll__content {
                padding-bottom: 0.0em !important;
            }
            .torrent-serial {
                background: #1d1f20de !important;
            }
        `;
        document.head.appendChild(style);
    }

    function startPlugin() {
        if (window.Lampa && Lampa.Manifest) {
            addStyles();

            if (Lampa.Listener) {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready' || e.type === 'start') addStyles();
                });
            }

            console.log('[Modal Custom] Плагин загружен');
        } else {
            setTimeout(startPlugin, 300);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPlugin);
    } else {
        startPlugin();
    }
})();
