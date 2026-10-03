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

    // ========== СОХРАНЯЕМ ДАННЫЕ КАРТОЧКИ ==========
    var lastCardData = null;

    function setupDataCapture() {
        if (!window.Lampa || !Lampa.Listener) return;

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
                console.log('[TLM] Карточка из full:', lastCardData.title || lastCardData.name, lastCardData);
            }
        });

        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
                console.log('[TLM] Карточка из activity:', lastCardData.title || lastCardData.name);
            }
        });
    }

    function isTorrentLoadingModal(modal) {
        if (!modal || !modal.classList) return false;
        if (
            modal.classList.contains('modal--torrent') ||
            modal.classList.contains('modal--loading') ||
            modal.classList.contains('modal--torrent-loading')
        ) return true;

        if (modal.querySelector('.torrent-loading, .torrent-parse, .torrent-progress, .torrent-info')) return true;
        if (modal.querySelector('.broadcast__text, .broadcast__scan')) return true;

        var title = modal.querySelector('.modal__title');
        if (title && /загрузка/i.test(title.textContent)) return true;

        var body = modal.querySelector('.modal__body');
        if (body) {
            var t = (body.textContent || '').toLowerCase();
            if (t.indexOf('подключились') !== -1 || t.indexOf('предзагрузка') !== -1 || t.indexOf('скорость загрузки') !== -1) return true;
        }
        return false;
    }

    // ========== ИЗВЛЕЧЕНИЕ ДАННЫХ О ФИЛЬМЕ/СЕРИАЛЕ ==========
    function getTitle(card) {
        if (!card) return null;
        return card.title || card.name || card.original_title || card.original_name || null;
    }

    function getSeasonEpisode(card) {
        if (!card) return { season: null, episode: null };

        var season = null, episode = null;

        // Плоские поля
        if (card.season !== undefined) season = card.season;
        if (card.season_number !== undefined) season = card.season_number;
        if (card.episode !== undefined) episode = card.episode;
        if (card.episode_number !== undefined) episode = card.episode_number;

        // Вложенные
        if (card.seasons && card.seasons.season !== undefined) season = card.seasons.season;
        if (card.seasons && card.seasons.episode !== undefined) episode = card.seasons.episode;

        // Парсинг из строки названия "S01E05"
        if (season === null || episode === null) {
            var titleStr = (card.title || card.name || '');
            var m = titleStr.match(/S(\d+)[\s._-]*E(\d+)/i);
            if (m) {
                if (season === null) season = parseInt(m[1], 10);
                if (episode === null) episode = parseInt(m[2], 10);
            }
        }

        // Lampa.Full
        try {
            if (window.Lampa && Lampa.Full) {
                if (season === null && Lampa.Full.season !== undefined) season = Lampa.Full.season;
                if (episode === null && Lampa.Full.episode !== undefined) episode = Lampa.Full.episode;
            }
        } catch (e) {}

        return { season: season, episode: episode };
    }

    function buildDisplayTitle(card) {
        var name = getTitle(card);
        if (!name) return null;

        var se = getSeasonEpisode(card);
        var isSerial = card && (card.name || card.media_type === 'tv' || card.number_of_seasons);

        if (isSerial && se.season !== null && se.episode !== null) {
            var s = se.season < 10 ? '0' + se.season : '' + se.season;
            var e = se.episode < 10 ? '0' + se.episode : '' + se.episode;
            return name + ' (S' + s + 'E' + e + ')';
        }
        return name;
    }

    // ========== ОЧИСТКА ШАПКИ И ЗАМЕНА ЗАГОЛОВКА ==========
    function replaceTitle(modal) {
        if (!modal || !modal.classList.contains(MODAL_CLASS)) return;

        var head = modal.querySelector('.modal__head');
        if (!head) return;

        var titleEl = head.querySelector('.modal__title');
        if (!titleEl) return;

        var card = lastCardData;
        if (!card && Lampa.Activity && Lampa.Activity.active) {
            try {
                var active = Lampa.Activity.active();
                if (active && active.movie) card = active.movie;
            } catch (err) {}
        }

        var customTitle = buildDisplayTitle(card);
        if (!customTitle) {
            console.log('[TLM] Нет данных карточки для замены заголовка');
            return;
        }

        // 1) Убираем все текстовые узлы в .modal__head (дубли "Твин Пикс")
        for (var i = head.childNodes.length - 1; i >= 0; i--) {
            var node = head.childNodes[i];
            if (node.nodeType === 3) {
                // Текстовый узел — удаляем
                head.removeChild(node);
            }
        }

        // 2) Заменяем текст внутри .modal__title
        titleEl.textContent = customTitle;

        console.log('[TLM] Заголовок заменён на:', customTitle);
    }

    function markModal(modal) {
        if (!modal || modal.classList.contains(MODAL_CLASS)) return;
        if (!isTorrentLoadingModal(modal)) return;
        modal.classList.add(MODAL_CLASS);
        setTimeout(function () { replaceTitle(modal); }, 50);
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
        setupDataCapture();

        if (Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready' || e.type === 'start') { addStyles(); scanModals(); }
            });
            Lampa.Listener.follow('modal', function () { scanModals(); });
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
        console.log('[TLM] Плагин загружен');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPlugin);
    } else {
        startPlugin();
    }
})();
