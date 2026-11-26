/* Torrent poster preview for Lampa. Standalone experiment. */
(function () {
    'use strict';
    if (window.torrentPosterPreviewInstalled) return;
    window.torrentPosterPreviewInstalled = true;

    var style = document.createElement('style');
    style.textContent = [
        '.torrent-item.torrent-poster--ready {display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:1.3em;position:relative;}',
        '.torrent-item.torrent-poster--ready > * {grid-column:2;min-width:0;}',
        '.torrent-item > .torrent-poster__image {display:none;width:auto;height:8.5em;border-radius:.7em;object-fit:contain;}',
        '.torrent-item.torrent-poster--ready > .torrent-poster__image {display:block;grid-column:1;grid-row:1 / span 3;align-self:start;}',
        '.torrent-item.torrent-poster--ready .torrent-poster__quality {position:absolute;top:1.4em;left:1.4em;z-index:1;float:none;margin:0;border-radius:.4em !important;}',
        '.torrent-item.torrent-poster--ready .torrent-poster__quality.torrent-poster__basic {background:#000 !important;box-shadow:none !important;}',
        '.torrent-item.torrent-poster--ready > .torrent-item__viewed {grid-column:auto;grid-row:auto;left:-.75em;top:-.75em;}',
        '.explorer.torrent-poster--explorer .explorer-card__head-left {display:none;}',
        '.explorer.torrent-poster--explorer .explorer-card__head {margin-bottom:2em;}',
        '.explorer.torrent-poster--explorer .explorer-card__head-rate {display:none;}',
        '.explorer.torrent-poster--explorer .explorer-card__descr {font-weight:400;opacity:.8;}',
        '.explorer.torrent-poster--explorer .explorer__left {padding-right:3%;}',
        '.explorer.torrent-poster--explorer .explorer-card__title.selector.focus {text-decoration:underline;}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);

    var scheduled = false;
    function updateItem(item, posterUrl) {
        var image = item.querySelector('.torrent-poster__image');
        if (!image) {
            image = document.createElement('img');
            image.className = 'torrent-poster__image';
            image.alt = '';
            image.onload = function () { item.classList.add('torrent-poster--ready'); };
            image.onerror = function () {
                item.classList.remove('torrent-poster--ready');
                image.removeAttribute('src');
            };
            item.insertBefore(image, item.firstChild);
        }
        if (image.getAttribute('src') !== posterUrl && image.getAttribute('data-poster-url') !== posterUrl) {
            image.setAttribute('data-poster-url', posterUrl);
            image.src = posterUrl;
        }
        var badges = item.querySelectorAll('.torrent-item__ffprobe > .m-resolution');
        var chosen = null;
        for (var i = 0; i < badges.length; i++) {
            var badge = badges[i];
            var label = (badge.textContent || '').trim();
            var isQuality = /^(?:4K(?:\s+(?:SDR|HDR|DV))?|2160p|1080p|720p|FHD|HD)$/i.test(label);
            var selected = !chosen && isQuality && !badge.classList.contains('m-resolution--merged-hide');
            if (selected) chosen = badge;
            badge.classList.toggle('torrent-poster__quality', selected);
            badge.classList.toggle('torrent-poster__basic', selected && /^(?:720p|1080p|FHD|HD)$/i.test(label));
        }
    }

    function scan() {
        scheduled = false;
        var activities = document.querySelectorAll('.activity--active');
        for (var i = 0; i < activities.length; i++) {
            var activity = activities[i];
            var list = activity.querySelector('.torrent-list');
            var explorer = list && list.closest('.explorer');
            if (!explorer) continue;
            explorer.classList.add('torrent-poster--explorer');

            // Keep Lampa's original cover handler as the sole navigation action.
            var cover = explorer.querySelector('.explorer-card__head-img.selector');
            var title = explorer.querySelector('.explorer-card__title');
            var jq = window.jQuery || window.$;
            if (cover && title && jq && !title.torrentPosterTitleBound &&
                !explorer.classList.contains('explorer--fullsize')) {
                title.torrentPosterTitleBound = true;
                title.classList.add('selector');
                (function (element, original, $) {
                    $(element).on('hover:enter', function () { $(original).trigger('hover:enter'); });
                })(title, cover, jq);
            }
            var headerImage = activity.querySelector('.explorer-card__head-img img');
            var posterUrl = headerImage && headerImage.getAttribute('src');
            if (!posterUrl || /^data:|img_broken/i.test(posterUrl)) continue;
            var items = activity.querySelectorAll('.torrent-list .torrent-item');
            for (var j = 0; j < items.length; j++) updateItem(items[j], posterUrl);
        }
    }
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        (window.requestAnimationFrame || window.setTimeout)(scan);
    }
    function start() {
        if (window.MutationObserver) {
            new MutationObserver(function (changes) {
                for (var i = 0; i < changes.length; i++) {
                    var node = changes[i].target;
                    if (node.nodeType !== 1) node = node.parentNode;
                    if (!node || !node.closest) continue;
                    if (changes[i].type === 'childList' ||
                        node.matches('.activity, .m-resolution, .explorer-card__head-img img')) {
                        schedule();
                        return;
                    }
                }
            }).observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['class','src']});
        }
        schedule();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
