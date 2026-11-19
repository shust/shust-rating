/* Cardify Layout for lampa.mx, v1.0.0
 * Moves the original description and year/country nodes to the Cardify header.
 * Requires the existing Cardify layout. Does not change other card layouts.
 */
(function () {
    'use strict';

    if (window.cardifyLayoutLampaMx) return;
    window.cardifyLayoutLampaMx = { version: '1.0.0' };

    var scheduled = false;
    var cardSelector = '.full-start-new.cardify';

    function moveEpisodesBeforeBuild(event) {
        var page = event.link;
        if (!page || !Array.isArray(page.rows) || typeof page.build !== 'function' ||
            page.cardifyEpisodesBuildWrapped) return;

        var originalBuild = page.build;
        page.cardifyEpisodesBuildWrapped = true;
        page.build = function (initialRows) {
            // Restore the original method immediately: later builds must keep their arguments.
            this.build = originalBuild;
            var rows = this.rows;
            var episodeIndex = -1;
            var descriptionIndex = -1;
            for (var i = 0; i < rows.length; i++) {
                var name = Array.isArray(rows[i]) ? rows[i][0] : rows[i];
                if (name === 'episodes') episodeIndex = i;
                if (name === 'description') descriptionIndex = i;
            }
            if (episodeIndex > descriptionIndex && descriptionIndex >= 0) {
                var episodes = rows.splice(episodeIndex, 1)[0];
                rows.splice(descriptionIndex, 0, episodes);
                initialRows = rows.slice(0, this.view);
            }
            return originalBuild.call(this, initialRows);
        };
    }

    function applyLayout() {
        scheduled = false;

        var cards = document.querySelectorAll(cardSelector);
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var left = card.querySelector('.cardify__left');
            if (!left) continue;

            var details = left.querySelector('.full-start-new__details');
            var head = left.querySelector('.full-start-new__head');
            if (details && head && details.firstElementChild !== head) {
                details.insertBefore(head, details.firstChild);
            }

            var buttons = left.querySelector('.full-start-new__buttons');
            if (!buttons) continue;

            // Each activity owns its own description, including cached activities.
            var scope = card.closest('.activity__body') ||
                card.closest('.scroll__body') || card.parentNode;
            var description = scope.querySelector('.full-descr__text');
            if (description && (description.parentNode !== buttons.parentNode ||
                description.nextElementSibling !== buttons)) {
                // Moving the node preserves its text and existing event handlers.
                buttons.parentNode.insertBefore(description, buttons);
            }
            if (description) description.classList.remove('selector', 'focus');

            var ratings = card.querySelector('.cardify__right');
            var anchor = description && description.parentNode === buttons.parentNode ? description : buttons;
            if (ratings && (ratings.parentNode !== anchor.parentNode ||
                ratings.nextElementSibling !== anchor)) {
                anchor.parentNode.insertBefore(ratings, anchor);
            }
        }
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        (window.requestAnimationFrame || window.setTimeout)(applyLayout);
    }

    function start() {
        var style = document.createElement('style');
        style.id = 'cardify-layout-lampa-mx-style';
        style.textContent =
            '.full-start-new.cardify .full-descr__text {width: 60% !important; height: auto !important; min-height: 0 !important; font-weight: 400; opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; mask-image: none; margin-bottom: 1.5em;}' +
            '.full-start-new {padding: 0 2em; padding-bottom: 4em;}' +
            '.full-start-new.cardify .cardify__details {width: 60%;}' +
            '.full-start-new.cardify .cardify__right {margin-bottom: 1.7em; zoom: 0.8;}' +
            'img.full-start__background.cardify__background.loaded {width: 100%; height: 100vh; top: -4em; mask-image: linear-gradient(270deg, #000 0%, rgb(0 0 0 / 59%) 34%, transparent 76%), linear-gradient( 26deg, transparent 0%, transparent 52%, rgb(0 0 0 / 44%) 82%, #000 100%);}' +
            '.full-start-new.cardify .full-start-new__head {font-size: 1.0em;}';
        (document.head || document.documentElement).appendChild(style);

        // Cardify can build or rearrange the card after Lampa's full event.
        // Also handles navigation and descriptions inserted asynchronously.
        if (window.MutationObserver) {
            var observer = new MutationObserver(function (records) {
                for (var i = 0; i < records.length; i++) {
                    if (records[i].type === 'childList' ||
                        (records[i].target.classList &&
                         records[i].target.classList.contains('full-start-new'))) {
                        schedule();
                        break;
                    }
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }

        if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('full', function (event) {
                if (event.type === 'start') moveEpisodesBeforeBuild(event);
                if (event.type === 'complite' || event.type === 'build') schedule();
            });
        }

        // Lampa selects the first navigable element when returning to the start.
        // Ratings now precede the buttons in DOM order, so explicitly choose a button.
        if (window.Lampa && Lampa.Controller && Lampa.Controller.listener &&
            Lampa.Controller.listener.follow) {
            Lampa.Controller.listener.follow('toggle', function (event) {
                if (event.name !== 'full_start') return;
                var active = document.querySelector('.activity--active');
                var card = active && active.querySelector(cardSelector);
                var buttons = card && card.querySelectorAll('.full-start-new__buttons .selector');
                if (!buttons) return;
                for (var i = 0; i < buttons.length; i++) {
                    if (!buttons[i].classList.contains('hide') && buttons[i].offsetParent !== null) {
                        Lampa.Controller.collectionFocus(buttons[i], card);
                        break;
                    }
                }
            });
        }

        applyLayout();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
