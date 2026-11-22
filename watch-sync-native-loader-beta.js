/* Watch Sync: штатный экран предзагрузки — бета-дополнение. */
(function (root) {
    'use strict';
    if (root.watchSyncNativeLoaderBetaInstalled) return;
    root.watchSyncNativeLoaderBetaInstalled = true;

    var name = '__ts_preload_show';
    var original = root[name];
    var active = null;

    function streamInfo(url) {
        var match = typeof url === 'string' && url.match(/^(https?:\/\/[^/]+)(\/stream\/[^?]+)\?(.+)$/i);
        if (!match) return null;
        var parts = match[3].split('&'), params = [], hash = '';
        parts.forEach(function (part) {
            var key = part.split('=')[0];
            if (key === 'link') hash = part.slice(5);
            if (key !== 'play' && key !== 'preload' && key !== 'stat' && part) params.push(part);
        });
        if (!/^(?:[a-f\d]{40}|[a-z2-7]{32})$/i.test(hash)) return null;
        return { base: match[1], hash: hash, preload: match[1] + match[2] + '?' + params.join('&') + '&preload' };
    }

    function nativeShow(options) {
        var lampa = root.Lampa, info = options && streamInfo(options.url);
        var loader = lampa && lampa.Loading;
        if (!root.document || !root.document.querySelector('.view--watch-sync-continue.watch-sync-loading') || !info || !loader || typeof loader.start !== 'function' || typeof loader.stop !== 'function' || typeof loader.setProgress !== 'function' || !lampa.Reguest || typeof options.onReady !== 'function' || typeof options.onCancel !== 'function') {
            return original.apply(root, arguments);
        }
        if (active) return;
        var closed = false, pollTimer = null, deadline = null;
        var preload = new lampa.Reguest(), status = new lampa.Reguest();
        function cleanup() {
            if (pollTimer) clearTimeout(pollTimer);
            if (deadline) clearTimeout(deadline);
            try { preload.clear(); } catch (ignore) {}
            try { status.clear(); } catch (ignore) {}
            try { loader.stop(); } catch (ignore) {}
            active = null;
        }
        function finish(ready, timedOut) {
            if (closed) return;
            closed = true;
            cleanup();
            if (timedOut && lampa.Noty && lampa.Noty.show) lampa.Noty.show('Не удалось дождаться предзагрузки торрента');
            if (ready) options.onReady();
            else options.onCancel();
        }
        function cancel() { finish(false, false); }
        function poll() {
            if (closed) return;
            try {
                status.timeout(2000);
                status.silent(info.base + '/cache', function (data) {
                    if (closed) return;
                    var torrent = data && data.Torrent;
                    var size = Number(torrent && torrent.preload_size) || 0;
                    var bytes = Number(torrent && torrent.preloaded_bytes) || 0;
                    var progress = size > 0 ? Math.min(100, Math.max(0, bytes * 100 / size)) : 0;
                    if (size > 0 && progress >= 95) return finish(true, false);
                    var detail = {};
                    if (torrent && torrent.active_peers != null) detail.active_peers = torrent.active_peers;
                    if (torrent && torrent.total_peers != null) detail.total_peers = torrent.total_peers;
                    if (torrent && torrent.download_speed && lampa.Utils && lampa.Utils.bytesToSize) detail.speed = lampa.Utils.bytesToSize(torrent.download_speed * 8, true);
                    loader.setProgress(progress, detail);
                    pollTimer = setTimeout(poll, 1000);
                }, function () { if (!closed) pollTimer = setTimeout(poll, 1000); }, JSON.stringify({ action: 'get', hash: info.hash }));
            } catch (error) { if (!closed) pollTimer = setTimeout(poll, 1000); }
        }
        try {
            active = cancel;
            loader.start(cancel, 'Предзагрузка торрента', { media: { card: options.card || {} } });
            deadline = setTimeout(function () { finish(false, true); }, 90000);
            preload.timeout(90000);
            preload.silent(info.preload, function () { finish(true, false); }, function () {});
            poll();
        } catch (error) {
            if (!closed) {
                closed = true;
                cleanup();
                return original.apply(root, arguments);
            }
        }
    }

    try {
        var descriptor = Object.getOwnPropertyDescriptor(root, name);
        if (descriptor && !descriptor.configurable) throw new Error('non-configurable');
        Object.defineProperty(root, name, {
            configurable: true,
            enumerable: true,
            get: function () { return typeof original === 'function' ? nativeShow : original; },
            set: function (value) { if (value !== nativeShow) original = value; }
        });
    } catch (error) {
        if (typeof original === 'function') root[name] = nativeShow;
        else root.watchSyncNativeLoaderBetaInstalled = false;
    }
})(typeof window !== 'undefined' ? window : this);
