/* Watch Sync loader. Public code only; the account/API stay on Cloudflare. */
(function () {
    'use strict';
    if (window.watchSyncLoaderStarted || window.watchSyncInstalled) return;
    window.watchSyncLoaderStarted = true;
    var server = 'https://lampa-watch-sync.shust-blr.workers.dev';
    var prefix = 'window.WatchSyncDefaultServer=' + JSON.stringify(server) + ';\n';
    var cacheKey = 'watch_sync_loader_code_v1', attempts = 0, completed = false;
    function valid(code) {
        return typeof code === 'string' && code.indexOf(prefix) === 0 && code.indexOf('watchSyncInstalled') >= 0 && code.indexOf('WatchSyncCore') >= 0;
    }
    function execute(code) {
        if (completed || !valid(code)) return false;
        var script = document.createElement('script');
        script.type = 'text/javascript'; script.textContent = code;
        document.body.appendChild(script);
        if (!window.watchSyncInstalled) return false;
        completed = true;
        return true;
    }
    function cached() {
        if (completed) return;
        var saved = Lampa.Storage.get(cacheKey, '');
        if (execute(saved)) Lampa.Noty.show('Watch Sync: запущена сохранённая версия — новый код пока недоступен');
        else Lampa.Noty.show('Watch Sync: не удалось загрузить код плагина. Проверь соединение с облачным сервером');
    }
    function browser() {
        if (completed) return;
        $.ajax({url: server + '/watch-sync.js?loader=' + Date.now(), type: 'GET', dataType: 'text', timeout: 15000,
            success: function (code) {
                if (execute(code)) { try { Lampa.Storage.set(cacheKey, code); } catch (ignore) {} }
                else cached();
            }, error: cached});
    }
    function start() {
        if (typeof Lampa === 'undefined' || !Lampa.Storage || !Lampa.Noty || !document.body) {
            if (++attempts < 60) setTimeout(start, 250);
            return;
        }
        if (window.AndroidJS && Lampa.Platform && typeof Lampa.Platform.is === 'function' && Lampa.Platform.is('android') && typeof Lampa.Reguest === 'function') {
            try {
                var request = new Lampa.Reguest();
                request.native(server + '/watch-sync.js?loader=' + Date.now(), function (code) {
                    if (execute(code)) { try { Lampa.Storage.set(cacheKey, code); } catch (ignore) {} }
                    else browser();
                }, browser, false, {type: 'GET', dataType: 'text', timeout: 15000,
                    headers: {'User-Agent': 'WatchSyncLoader/1 (Lampa Android)'}});
                return;
            } catch (ignore) {}
        }
        browser();
    }
    start();
}());
