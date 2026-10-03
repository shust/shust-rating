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

    // ========== ЗАХВАТ КАРТОЧКИ ==========
    var lastCardData = null;

    function setupDataCapture() {
        if (!window.Lampa || !Lampa.Listener) return;

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
            }
        });

        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
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

    function getTitle(card) {
        if (!card) return null;
        return card.title || card.name || card.original_title || card.original_name || null;
    }

    // ========== ЧТЕНИЕ ДАННЫХ ИЗ КНОПКИ CONTINUE TORRENT ==========
    // Кнопка имеет класс .view--continue-torrent-v2.
    // Внутри неё .ctv-continue-text с текстом вида:
    //   "Сезон 1 · Серия 5"  или  "Серия 5"  или  "Продолжить · Сезон 1 · Серия 5"
    // А также .ctv-continue-time с временем.
    function seasonEpisodeFromContinueButton() {
        var btn = document.querySelector('.view--continue-torrent-v2');
        if (!btn) return null;

        var textEl = btn.querySelector('.ctv-continue-text');
        var text = textEl ? (textEl.textContent || '').trim() : '';

        if (!text) return null;

        var season = null, episode = null;

        // "Сезон N · Серия M" / "Сезон N" / "Серия M"
        var sMatch = text.match(/Сезон\s+(\d+)/i);
        var eMatch = text.match(/Серия\s+(\d+)/i);

        if (sMatch) season = parseInt(sMatch[1], 10);
        if (eMatch) episode = parseInt(eMatch[1], 10);

        // Резервный вариант: "S01E05"
        if (season === null || episode === null) {
            var m = text.match(/S(\d{1,2})[\s._·-]*E(\d{1,3})/i);
            if (m) {
                if (season === null) season = parseInt(m[1], 10);
                if (episode === null) episode = parseInt(m[2], 10);
            }
        }

        // "Следующая серия N" / "Следующий сезон N"
        if (season === null) {
            var nextS = text.match(/Следующий\s+сезон\s+(\d+)/i);
            if (nextS) season = parseInt(nextS[1], 10);
        }
        if (episode === null) {
            var nextE = text.match(/Следующая\s+серия\s+(\d+)/i);
            if (nextE) episode = parseInt(nextE[1], 10);
        }

        if (season || episode) {
            return { season: season, episode: episode };
        }

        return null;
    }

    // Резерв: из карточки фильма
    function seasonEpisodeFromCard(card) {
        if (!card) return null;

        var s = card.season !== undefined ? card.season : card.season_number;
        var e = card.episode !== undefined ? card.episode : card.episode_number;

        if (n(s) && n(e)) {
            return { season: n(s), episode: n(e) };
        }

        return null;
    }

    function getSeasonEpisode(card) {
        var fromButton = seasonEpisodeFromContinueButton();
        if (fromButton) return fromButton;

        return seasonEpisodeFromCard(card);
    }

    function getSeasonEpisodeLabel(card) {
        var se = getSeasonEpisode(card);
        if (!se || !se.season || !se.episode) return null;

        return 'Сезон ' + se.season + ' • Серия ' + se.episode;
    }

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

        var displayName = getTitle(card);
        if (!displayName) {
            console.log('[TLM] Нет данных карточки');
            return;
        }

        // Убираем текстовые узлы-дубли
        for (var i = head.childNodes.length - 1; i >= 0; i--) {
            var node = head.childNodes[i];
            if (node.nodeType === 3) {
                head.removeChild(node);
            }
        }

        titleEl.textContent = displayName;

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
