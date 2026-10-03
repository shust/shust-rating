(function () {
    'use strict';

    var STYLE_ID = 'modal-custom-styles';
    var MODAL_CLASS = 'modal--torrent-loading';

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.textContent = `
            /* ===== Центрирование попапа предзагрузки торрента ===== */
            .${MODAL_CLASS} {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .${MODAL_CLASS} .modal__content {
                width: 50vw;
                height: auto;
                min-width: 360px;
                max-width: 640px;
                max-height: 80vh;

                margin: auto !important;
                display: flex;
                flex-direction: column;

                background-color: #262829b3 !important;
                backdrop-filter: blur(15px) !important;
                -webkit-backdrop-filter: blur(15px) !important;
                padding: 2em !important;
                border-radius: 16px;
                box-sizing: border-box;
            }

            .${MODAL_CLASS} .modal__head {
                margin-bottom: 0em !important;
                flex: 0 0 auto;
            }

            .${MODAL_CLASS} .modal__body {
                flex: 1 1 auto;
                min-height: 0;
            }

            .${MODAL_CLASS} .scroll__content {
                padding-bottom: 0.0em !important;
            }

            .${MODAL_CLASS} .modal__footer {
                padding-top: 1em !important;
                flex: 0 0 auto;
            }

            .${MODAL_CLASS} .torrent-serial {
                background: #1d1f20de !important;
            }

            .${MODAL_CLASS} .torrent-serial.focus {
                background-color: #4b4b4b91 !important;
            }

            /* Мобилки / низкие ТВ-экраны */
            @media (max-width: 768px), (max-height: 500px) {
                .${MODAL_CLASS} .modal__content {
                    width: 92vw;
                    min-width: 0;
                    max-width: none;
                    max-height: 92vh;
                    padding: 1.2em !important;
                    border-radius: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Определяем именно попап предзагрузки торрента
    function isTorrentLoadingModal(modal) {
        if (!modal || !modal.classList) return false;

        // 1) Классы, которые Lampa вешает на этот попап
        if (
            modal.classList.contains('modal--torrent') ||
            modal.classList.contains('modal--loading') ||
            modal.classList.contains('modal--torrent-loading')
        ) {
            return true;
        }

        // 2) Характерные элементы внутри
        if (modal.querySelector('.torrent-loading, .torrent-parse, .torrent-progress, .torrent-info')) {
            return true;
        }

        // 3) По заголовку "Загрузка"
        var head = modal.querySelector('.modal__head');
        if (head) {
            var text = (head.textContent || '').trim().toLowerCase();
            if (text.indexOf('загрузка') !== -1) return true;
        }

        // 4) По ключевым строкам в теле (Подключились, Предзагрузка, Скорость загрузки)
        var body = modal.querySelector('.modal__body');
        if (body) {
            var t = (body.textContent || '').toLowerCase();
            if (
                t.indexOf('подключились') !== -1 ||
                t.indexOf('предзагрузка') !== -1 ||
                t.indexOf('скорость загрузки') !== -1
            ) {
                return true;
            }
        }

        return false;
    }

    function markModal(modal) {
        if (!modal || modal.classList.contains(MODAL_CLASS)) return;
        if (!isTorrentLoadingModal(modal)) return;
        modal.classList.add(MODAL_CLASS);
        console.log('[Torrent Loading Modal] Применён класс к попапу');
    }

    function scanModals() {
        var modals = document.querySelectorAll('.modal');
        for (var i = 0; i < modals.length; i++) markModal(modals[i]);
    }

    function startPlugin() {
        if (!window.Lampa || !Lampa.Manifest) {
            setTimeout(startPlugin, 300);
            return;
        }

        addStyles();

        if (Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready' || e.type === 'start') {
                    addStyles();
                    scanModals();
                }
            });

            Lampa.Listener.follow('modal', function () {
                scanModals();
            });
        }

        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes;
                for (var j = 0; j < nodes.length; j++) {
                    var node = nodes[j];
                    if (node.nodeType !== 1) continue;

                    if (node.classList && node.classList.contains('modal')) {
                        markModal(node);
                    } else if (node.querySelectorAll) {
                        var inner = node.querySelectorAll('.modal');
                        for (var k = 0; k < inner.length; k++) markModal(inner[k]);
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        scanModals();

        console.log('[Torrent Loading Modal] Плагин загружен');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPlugin);
    } else {
        startPlugin();
    }
})();
