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
    '.full-start-new.cardify .full-descr__text {' +
        'width: 60% !important;' +
        'font-weight: 400;' +
        'opacity: 0.8;' +
        'display: -webkit-box;' +
        '-webkit-line-clamp: 4;' +
        '-webkit-box-orient: vertical;' +
        'overflow: hidden;' +
        'mask-image: none;' +
        'margin-bottom: 1.5em;' +
    '}' +
    '.cardify__details {' +
        'width: 60%;' +
    '}' +
    '.full-start-new.cardify .full-start-new__head {' +
        'font-size: 1.0em;' +
    '}';
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
                if (event.type === 'complite' || event.type === 'build') schedule();
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
