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

    // ========== СОХРАНЯЕМ ДАННЫЕ КАРТОЧКИ ИЗ ПОСЛЕДНЕГО ВЫЗОВА ==========
    var lastCardData = null;

    // Перехватываем события Lampa
    function setupDataCapture() {
        if (!window.Lampa || !Lampa.Listener) return;

        // Ловим открытие полной карточки
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
                console.log('[Torrent Loading Modal] Захвачена карточка из full:', lastCardData.title || lastCardData.name);
            }
        });

        // Ловим активность
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' && e.data && e.data.movie) {
                lastCardData = e.data.movie;
                console.log('[Torrent Loading Modal] Захвачена карточка из activity:', lastCardData.title || lastCardData.name);
            }
        });
    }

    // ========== ОПРЕДЕЛЕНИЕ ПОПАПА ==========
    function isTorrentLoadingModal(modal) {
        if (!modal || !modal.classList) return false;
        if (
            modal.classList.contains('modal--torrent') ||
            modal.classList.contains('modal--loading') ||
            modal.classList.contains('modal--torrent-loading')
        ) return true;

        if (modal.querySelector('.torrent-loading, .torrent-parse, .torrent-progress, .torrent-info')) return true;

        var head = modal.querySelector('.modal__head');
        if (head && (head.textContent || '').trim().toLowerCase().indexOf('загрузка') !== -1) return true;

        var body = modal.querySelector('.modal__body');
        if (body) {
            var t = (body.textContent || '').toLowerCase();
            if (t.indexOf('подключились') !== -1 || t.indexOf('предзагрузка') !== -1 || t.indexOf('скорость загрузки') !== -1) return true;
        }
        return false;
    }

    // ========== ФОРМИРОВАНИЕ ЗАГОЛОВКА ==========
    function buildTitle(card) {
        if (!card) return null;

        // Пробуем разные варианты названия
        var name = card.title || card.name || card.original_title || card.original_name;
        if (!name) return null;

        // Для сериалов
        var isSerial = card.name || card.media_type === 'tv' || card.number_of_seasons;
        if (isSerial) {
            // Ищем сезон/серию в разных полях
            var season = card.season || card.season_number;
            var episode = card.episode || card.episode_number;

            // Если это объект серии (например, из full)
            if (card.season !== undefined && card.episode !== undefined) {
                season = card.season;
                episode = card.episode;
            }

            if (season !== undefined && episode !== undefined) {
                var s = season < 10 ? '0' + season : '' + season;
                var e = episode < 10 ? '0' + episode : '' + episode;
                return name + ' (S' + s + 'E' + e + ')';
            }
        }

        return name;
    }

    function replaceTitle(modal) {
        if (!modal || !modal.classList.contains(MODAL_CLASS)) return;

        // Если нет сохранённых данных — пробуем взять из Activity
        var card = lastCardData;
        if (!card && Lampa.Activity && Lampa.Activity.active) {
            try {
                var active = Lampa.Activity.active();
                if (active && active.movie) card = active.movie;
            } catch (err) {}
        }

        var customTitle = buildTitle(card);
        if (!customTitle) {
            console.log('[Torrent Loading Modal] Нет данных карточки для замены заголовка');
            return;
        }

        var head = modal.querySelector('.modal__head');
        if (head) {
            // Ищем именно текстовый узел «Загрузка»
            var found = false;
            for (var i = 0; i < head.childNodes.length; i++) {
                var node = head.childNodes[i];
                if (node.nodeType === 3 && /загрузка/i.test(node.textContent)) {
                    node.textContent = node.textContent.replace(/загрузка/i, customTitle);
                    found = true;
                    break;
                }
            }
            // Если не нашли — пробуем заменить весь текст (кроме других элементов)
            if (!found && /загрузка/i.test(head.textContent)) {
                // Сохраняем нетекстовые узлы (например, крестик закрытия)
                var newContent = document.createDocumentFragment();
                head.childNodes.forEach(function (n) {
                    if (n.nodeType === 3) {
                        newContent.appendChild(document.createTextNode(customTitle));
                    } else {
                        newContent.appendChild(n.cloneNode(true));
                    }
                });
                head.innerHTML = '';
                head.appendChild(newContent);
            }
            console.log('[Torrent Loading Modal] Заголовок заменён на:', customTitle);
        }
    }

    function markModal(modal) {
        if (!modal || modal.classList.contains(MODAL_CLASS)) return;
        if (!isTorrentLoadingModal(modal)) return;
        modal.classList.add(MODAL_CLASS);
        // Небольшая задержка, чтобы Lampa успела дорисовать DOM
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
        console.log('[Torrent Loading Modal] Плагин загружен');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPlugin);
    } else {
        startPlugin();
    }
})();
