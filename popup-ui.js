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

            .${MODAL_CLASS} .modal__subtitle {
                font-size: 0.85em;
                opacity: 0.65;
                margin-top: 0.35em;
                line-height: 1.2;
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

    // ========== ЗАХВАТ ДАННЫХ ==========
    var lastCardData = null;

    function setupDataCapture() {
        if (!window.Lampa || !Lampa.Listener) return;

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
                console.log('[TLM] Карточка из full:', lastCardData.title || lastCardData.name);
            }
        });

        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
            }
        });

        // Ловим выбор файла торрента — как в continue_torrent_v2
        Lampa.Listener.follow('torrent_file', function (e) {
            if (e.type === 'onenter' && e.element) {
                window.__tlm_last_file = e.element;
                console.log('[TLM] Файл торрента выбран:', e.element);
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

        if (modal.querySelector('.broadcast__text, .broadcast__scan')) return true;

        var title = modal.querySelector('.modal__title');
        if (title && /загрузка/i.test(title.textContent)) return true;

        return false;
    }

    // ========== ИЗВЛЕЧЕНИЕ ДАННЫХ О СЕРИАЛЕ ==========
    function getTitle(card) {
        if (!card) return null;
        return card.title || card.name || card.original_title || card.original_name || null;
    }

    // Способ 1: прямо из активной сессии плагина Continue Torrent
    // (если он выставляет window.__lampa_continue_torrent_session)
    function seasonEpisodeFromSession() {
        var s = window.__lampa_continue_torrent_session;
        if (!s) return null;

        if (n(s.season) && n(s.episode)) {
            return { season: n(s.season), episode: n(s.episode) };
        }
        return null;
    }

    // Способ 2: из выбранного файла торрента (перехвачено в torrent_file)
    function seasonEpisodeFromSelectedFile() {
        var file = window.__tlm_last_file;
        if (!file) return null;

        var s = n(file.season);
        var e = n(file.episode);

        if (s && e) return { season: s, episode: e };

        // Пробуем распарсить имя файла
        var card = lastCardData;
        if (card && window.Lampa && Lampa.Torserver && Lampa.Torserver.parse) {
            try {
                var parsed = Lampa.Torserver.parse({
                    movie: card,
                    files: [],
                    filename: file.path_human || file.path,
                    path: file.path
                }) || {};

                if (n(parsed.season) && n(parsed.episode)) {
                    return { season: n(parsed.season), episode: n(parsed.episode) };
                }
            } catch (err) {}
        }

        // Последний шанс — regex по имени файла
        var name = (file.path_human || file.path || file.title || '');
        var m = name.match(/[Ss](\d{1,2})[\s._-]*[Ee](\d{1,3})/);
        if (m) {
            return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
        }

        return null;
    }

    // Способ 3: из карточки фильма (last_episode_to_air) — как в continue_torrent_v2
    function seasonEpisodeFromCard(card) {
        if (!card) return null;

        // Карточка может содержать напрямую season/episode (если открыт эпизод)
        var directSeason = n(card.season || card.season_number);
        var directEpisode = n(card.episode || card.episode_number);
        if (directSeason && directEpisode) {
            return { season: directSeason, episode: directEpisode };
        }

        // Смотрим в last_episode_to_air
        var candidates = [
            card.last_episode_to_air,
            card.last_episode,
            card.last_aired_episode
        ];

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];
            if (!item) continue;

            var s = n(item.season_number !== undefined ? item.season_number : item.season);
            var e = n(item.episode_number !== undefined ? item.episode_number : item.episode);

            if (s && e) return { season: s, episode: e };
        }

        return null;
    }

    function getSeasonEpisode(card) {
        // 1. Сессия continue_torrent
        var fromSession = seasonEpisodeFromSession();
        if (fromSession) return fromSession;

        // 2. Выбранный файл торрента
        var fromFile = seasonEpisodeFromSelectedFile();
        if (fromFile) return fromFile;

        // 3. Карточка фильма
        var fromCard = seasonEpisodeFromCard(card);
        if (fromCard) return fromCard;

        return { season: null, episode: null };
    }

    function getDisplayName(card) {
        return getTitle(card);
    }

    function getSeasonEpisodeLabel(card) {
        var se = getSeasonEpisode(card);
        if (!se.season || !se.episode) return null;

        return 'Сезон ' + se.season + ' • Серия ' + se.episode;
    }

    // ========== ОБНОВЛЕНИЕ ШАПКИ ==========
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

        var displayName = getDisplayName(card);
        if (!displayName) {
            console.log('[TLM] Нет данных карточки');
            return;
        }

        // Убираем текстовые узлы (дубли)
        for (var i = head.childNodes.length - 1; i >= 0; i--) {
            var node = head.childNodes[i];
            if (node.nodeType === 3) {
                head.removeChild(node);
            }
        }

        // Заголовок
        titleEl.textContent = displayName;

        // Подзаголовок с сезоном/серией
        var subtitle = head.querySelector('.modal__subtitle');
        if (!subtitle) {
            subtitle = document.createElement('div');
            subtitle.className = 'modal__subtitle';
            head.appendChild(subtitle);
        }

        var seLabel = getSeasonEpisodeLabel(card);
        if (seLabel) {
            subtitle.textContent = seLabel;
            subtitle.style.display = '';
        } else {
            subtitle.style.display = 'none';
        }

        console.log('[TLM] Заголовок:', displayName, '| Подзаголовок:', seLabel || '—');
    }

    function markModal(modal) {
        if (!modal || modal.classList.contains(MODAL_CLASS)) return;
        if (!isTorrentLoadingModal(modal)) return;
        modal.classList.add(MODAL_CLASS);
        setTimeout(function () { replaceTitle(modal); }, 100);
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
