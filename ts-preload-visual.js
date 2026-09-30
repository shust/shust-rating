(function ($, Lampa) {
    'use strict';

    function init() {
        if (!Lampa || !Lampa.Player || !Lampa.Storage) return;
        if (Lampa.__tsPreloadVisualLoaded) return;
        Lampa.__tsPreloadVisualLoaded = true;

        var ReguestClass = Lampa.Reguest || Lampa.Network;
        if (!ReguestClass) {
            console.warn('[ts-preload] Reguest/Network не найден, плагин не активирован');
            return;
        }

        /* ---------- Modal ---------- */
        var Modal = (function () {
            var modalID = 0;
            function Modal(params) {
                this.id = ++modalID;
                this.active = params;
                this.html = Lampa.Template.get('modal', { title: params.title });
                this.scroll = new Lampa.Scroll({ over: true, mask: params.mask });
                this.last = false;
            }
            Modal.prototype.open = function () {
                var _this = this;
                this.html.on('click', function (e) {
                    if (!$(e.target).closest($('.modal__content', _this.html)).length
                        && Lampa.DeviceInput && Lampa.DeviceInput.canClick
                        && Lampa.DeviceInput.canClick(e.originalEvent)) {
                        window.history.back();
                    }
                });
                this.html.find('.modal__title').text(this.active.title);
                this.html.toggleClass('modal--medium', this.active.size === 'medium');
                this.html.toggleClass('modal--large', this.active.size === 'large');
                this.html.toggleClass('modal--full', this.active.size === 'full');
                this.html.toggleClass('modal--overlay', !!this.active.overlay);
                this.html.toggleClass('modal--align-center', this.active.align === 'center');
                if (this.active.zIndex) this.html.css('z-index', this.active.zIndex);
                this.scroll.render().toggleClass('layer--height', this.active.size === 'full');
                this.html.find('.modal__body').append(this.scroll.render());
                this.scroll.append(this.active.html);
                if (this.active.buttons) this.buttons();
                $('body').append(this.html);
                this.max();
                this.toggle(this.active.select);
            };
            Modal.prototype.max = function () {
                this.scroll.render().find('.scroll__content').css(
                    'max-height',
                    Math.round(window.innerHeight - this.scroll.render().offset().top - (window.innerHeight * 0.1)) + 'px'
                );
            };
            Modal.prototype.buttons = function () {
                var footer = $('<div class="modal__footer"></div>');
                this.active.buttons.forEach(function (button) {
                    var btn = $('<div class="modal__button selector" style="width:50%;text-align:center"></div>');
                    btn.text(button.name);
                    btn.on('click hover:enter', function () { button.onSelect(); });
                    footer.append(btn);
                });
                this.scroll.append(footer);
            };
            Modal.prototype.toggle = function (need_select) {
                var _this = this;
                Lampa.Controller.add('Modal-' + this.id, {
                    invisible: true,
                    toggle: function () {
                        Lampa.Controller.collectionSet(_this.scroll.render());
                        Lampa.Controller.collectionFocus(need_select || _this.last, _this.scroll.render());
                        Lampa.Layer.visible(_this.scroll.render(true));
                    },
                    up:    function () {},
                    down:  function () {},
                    right: function () {},
                    left:  function () {},
                    back:  function () { if (_this.active.onBack) _this.active.onBack(); }
                });
                Lampa.Controller.toggle('Modal-' + this.id);
            };
            Modal.prototype.destroy = function () {
                this.scroll.destroy();
                this.html.remove();
            };
            Modal.prototype.close = function () { this.destroy(); };
            return Modal;
        })();

        /* ---------- Иконки ---------- */
        var ICON_PEER =
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '<circle cx="9" cy="8" r="3.2"/>' +
                '<path d="M3.5 19.5v-1.2c0-2.6 2.5-4.8 5.5-4.8s5.5 2.2 5.5 4.8v1.2"/>' +
                '<path d="M16 6.2a3.2 3.2 0 0 1 0 6.1"/>' +
                '<path d="M17.5 14.2c2 .6 3.5 2.2 3.5 4.1v1.2"/>' +
            '</svg>';
        var ICON_DOWNLOAD =
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M12 3v12"/>' +
                '<path d="M7 10l5 5 5-5"/>' +
                '<path d="M5 20h14"/>' +
            '</svg>';
        var ICON_SPEED =
            '<svg class="speed-alt" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M4.5 20 A 10 10 0 1 1 19.5 20"/>' +
                '<line x1="12" y1="14" x2="16.5" y2="9.5"/>' +
            '</svg>';

        /* ---------- Локализация ---------- */
        Lampa.Lang.add({
            ts_preload_title: { ru: 'Предзагрузка', en: 'Preload' },
            ts_preload_seeds: { ru: 'раздают', en: 'seeds' }
        });

        /* ---------- Утилиты ---------- */
        function tsIP() {
            try {
                if (Lampa.Torserver && typeof Lampa.Torserver.ip === 'function') {
                    var ip = Lampa.Torserver.ip();
                    if (ip) return ip;
                }
            } catch (e) {}
            var field = Lampa.Storage.field('torrserver_use_link');
            return Lampa.Storage.get(field === 'two' ? 'torrserver_url_two' : 'torrserver_url');
        }
        function params(obj) {
            var prop, pairs = [];
            for (prop in obj) pairs.push(prop + (obj[prop] ? '=' + obj[prop] : ''));
            return pairs.join('&');
        }
        function parseUrl(url) {
            var m, base_url, stream, args, arg = {};
            if (typeof url !== 'string') return { clearUrl: url, arg: {} };
            if (!!(m = url.match(/^(https?:\/\/.+?)(\/stream\/[^?]+)\?(.+)$/i))) {
                base_url = m[1]; stream = m[2]; args = m[3];
                args.split('&').map(function (v) {
                    var p = v.split('='); arg[p[0]] = p[1] || null;
                });
                delete arg['play']; delete arg['preload']; delete arg['stat'];
            }
            args = params(arg);
            return { clearUrl: base_url + stream + '?' + args, base_url: base_url, arg: arg };
        }

        /* ---------- Стили ---------- */
        if (!$('#ts-preload-visual-styles').length) {
            $('<style id="ts-preload-visual-styles">').text(
                '.ts-preload-modal .ts-preload-broadcast__text{font-size:14px;line-height:1.8;color:#fff;font-family:"Segoe UI",sans-serif;background:transparent;padding:0;border:none;margin-bottom:16px}' +
                '.ts-preload-modal .ts-preload-broadcast__text .stat-row{display:flex;align-items:center;gap:10px;white-space:nowrap;overflow:hidden;color:#fff}' +
                '.ts-preload-modal .ts-preload-broadcast__text .icon{width:18px;height:18px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;opacity:.9}' +
                '.ts-preload-modal .ts-preload-broadcast__text .icon svg{width:18px;height:18px;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
                '.ts-preload-modal .ts-preload-broadcast__text .icon svg.speed-alt{width:15px;height:15px;stroke-width:2.4;stroke-linejoin:miter}' +
                '.ts-preload-modal .ts-preload-broadcast__text .js-speed-value b{font-weight:700}' +
                '.ts-preload-modal .ts-preload-broadcast__scan{height:4px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden;position:relative;margin-bottom:8px}' +
                '.ts-preload-modal .ts-preload-broadcast__scan>div{height:100%;width:40%;background:#fff;border-radius:2px;animation:ts-preload-scan 1.8s ease-in-out infinite;position:absolute;box-shadow:0 0 8px rgba(255,255,255,.6)}' +
                '@keyframes ts-preload-scan{0%{left:-40%}100%{left:100%}}' +
                '.ts-preload-modal.modal{background:rgba(20,23,28,.75)!important;-webkit-backdrop-filter:blur(24px)!important;backdrop-filter:blur(24px)!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:12px!important;box-shadow:0 20px 60px rgba(0,0,0,.6)!important}' +
                '.ts-preload-modal .modal__title{color:#fff!important;font-size:18px!important;font-weight:600!important;padding:20px 24px 4px!important}' +
                '.ts-preload-modal .modal__body{padding:0 24px 24px!important}' +
                '.ts-preload-modal .modal__footer{display:flex!important;gap:12px;padding:0 24px 24px!important;border:none!important;background:transparent!important}' +
                '.ts-preload-modal .modal__footer .modal__button{flex:1!important;width:auto!important;padding:14px 20px!important;border-radius:8px!important;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.18)!important;color:#fff!important;font-size:15px!important;font-weight:500!important;text-align:center!important}' +
                '.ts-preload-modal .modal__footer .modal__button.focus{background:rgba(255,255,255,.25)!important;border-color:rgba(255,255,255,.45)!important;outline:none!important}'
            ).appendTo('head');
        }

        /* ---------- Перехват Player.play ---------- */
        var lampaPlay     = Lampa.Player.play;
        var lampaCallback = Lampa.Player.callback;
        var lampaPlaylist = Lampa.Player.playlist;
        var lampaStat     = Lampa.Player.stat;
        var player        = null;

        function Player(data) {
            data.url = parseUrl(data.url).clearUrl + '&play';
            this.playerData = data;
            this.playList = null; this.statUrl = null; this.callback = null;
        }
        Player.prototype.setPlayList = function (playlist) {
            playlist.map(function (d) { d.url = parseUrl(d.url).clearUrl + '&play'; });
            this.playList = playlist;
        };
        Player.prototype.setStatUrl  = function (url) { this.statUrl  = url; };
        Player.prototype.setCallback = function (cb)  { this.callback = cb;  };
        Player.prototype.play = function () {
            lampaPlay(this.playerData);
            this.playList && lampaPlaylist(this.playList);
            this.callback && lampaCallback(this.callback);
            this.statUrl  && lampaStat(this.statUrl);
            player = null;
        };

        Lampa.Player.playlist = function (p) { if (player) player.setPlayList(p); else lampaPlaylist(p); };
        Lampa.Player.stat     = function (u) { if (player) player.setStatUrl(u);  else lampaStat(u);     };
        Lampa.Player.callback = function (c) { if (player) player.setCallback(c); else lampaCallback(c); };

        Lampa.Player.play = function (data) {
            try {
                if (!Lampa.Storage.field('torrserver_preload')) return lampaPlay(data);
                if (!data || !data.url) return lampaPlay(data);
                var ip = tsIP();
                if (!ip || data.url.indexOf(ip) === -1) return lampaPlay(data);
                if (Lampa.Storage.field('player_timecode') !== 'again'
                    && data.timeline && data.timeline.time
                    && parseFloat('0' + data.timeline.time) >= 60) {
                    return lampaPlay(data);
                }
                preload(data);
            } catch (e) {
                console.error('[ts-preload] Ошибка, откат к стандартному плееру:', e);
                try { lampaPlay(data); } catch (e2) { console.error(e2); }
            }
        };

        /* ---------- Окно предзагрузки ---------- */
        function preload(data) {
            var u = parseUrl(data.url);
            if (!u.arg.link) return lampaPlay(data);

            player = new Player(data);
            var controller = Lampa.Controller.enabled().name;
            var network    = new ReguestClass();

            var modalHtml = $(
                '<div>' +
                    '<div class="ts-preload-broadcast__text">' +
                        '<div class="stat-row js-peer"><span class="icon">' + ICON_PEER + '</span><span class="js-peer-value"> </span></div>' +
                        '<div class="stat-row js-buff"><span class="icon">' + ICON_DOWNLOAD + '</span><span class="js-buff-value"> </span></div>' +
                        '<div class="stat-row js-speed"><span class="icon">' + ICON_SPEED + '</span><span class="js-speed-value"> </span></div>' +
                    '</div>' +
                    '<div class="ts-preload-broadcast__scan"><div></div></div>' +
                '</div>'
            );

            var peer  = modalHtml.find('.js-peer-value');
            var buff  = modalHtml.find('.js-buff-value');
            var speed = modalHtml.find('.js-speed-value');

            var modal = new Modal({
                title: Lampa.Lang.translate('ts_preload_title'),
                html: modalHtml,
                onBack: cancel,
                buttons: [
                    { name: Lampa.Lang.translate('cancel'),       onSelect: cancel },
                    { name: Lampa.Lang.translate('player_lauch'), onSelect: play   }
                ]
            });
            modal.open();
            modal.html.addClass('ts-preload-modal');

            function destroy() {
                network.clear();
                modal.close();
                Lampa.Controller.toggle(controller);
            }
            function cancel() {
                if (player) { destroy(); player.callback && player.callback(); player = null; }
            }
            function play() {
                if (player) { destroy(); player.play(); }
            }

            network.timeout(1800 * 1000);
            network.silent(u.clearUrl + '&preload', play, play);
            network.timeout(2000);

            var stat = function (resp) {
                if (!player) return;
                if (resp && resp.Torrent) {
                    var t = resp.Torrent;
                    var p = Math.floor((t.preloaded_bytes || 0) * 100 / (t.preload_size || 1));
                    peer.html(
                        (t.active_peers || 0) + ' / ' + (t.pending_peers || 0) +
                        ' (' + (t.total_peers || 0) + ') • ' +
                        (t.connected_seeders || 0) + ' - ' +
                        Lampa.Lang.translate('ts_preload_seeds')
                    );
                    buff.html(
                        Lampa.Utils.bytesToSize(t.preloaded_bytes || 0) + ' / ' +
                        Lampa.Utils.bytesToSize(t.preload_size || 0) + ' (' + p + '%)'
                    );
                    speed.html('<b>' + Lampa.Utils.bytesToSize((t.download_speed || 0) * 8, true) + '</b>');
                }
                network.silent(u.base_url + '/cache', stat, stat,
                    JSON.stringify({ action: 'get', hash: u.arg.link }));
            };

            stat({ Torrent: {
                active_peers: 0, pending_peers: 0, total_peers: 0,
                connected_seeders: 0, preloaded_bytes: 0, preload_size: 0, download_speed: 0
            }});
        }
    }

    /* =========================================================================
     * Точка входа: ждём, пока Lampa полностью загрузится
     * ========================================================================= */
    if (window.appready) {
        init();
    } else if (Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    } else {
        // Резервный вариант для старых версий
        var t = setInterval(function () {
            if (Lampa.Player && Lampa.Template && Lampa.Template.get) {
                clearInterval(t);
                init();
            }
        }, 500);
    }

})(jQuery, Lampa);
