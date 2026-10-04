;(function($, Lampa) {
    'use strict';

    // ===================================================================
    // TS Preload Visual + Continue Torrent UI
    // Объединённый плагин: попап предзагрузки торрента с брендированным
    // оформлением Continue Torrent.
    //
    // Публичный API:
    //   window.__ts_preload_show({
    //       url:      'http://...&play',
    //       card:     {...},
    //       onReady:  function() {},
    //       onCancel: function() {}
    //   })
    //
    // Автозапуск: при достижении буфера 85% попап вызывает onReady()
    // и передаёт управление наружу (Continue Torrent).
    // Если onReady не передан — запускает плеер сам (штатный сценарий).
    // ===================================================================

    var STYLE_ID = 'ts-preload-visual-styles';
    var AUTO_START_PERCENT = 85;

    // ---------- Стили ----------
    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.textContent = `
            /* ===== Центрирование попапа предзагрузки ===== */
            .modal--ts-preload {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .modal--ts-preload .modal__content {
                width: 35vw;
                min-width: 280px;
                max-width: 480px;
                height: auto;
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

            .modal--ts-preload .modal__head {
                margin-bottom: 0em !important;
                flex: 0 0 auto;
            }

            .modal--ts-preload .modal__title {
                font-weight: 600;
            }

            .modal--ts-preload .modal__subtitle {
                font-size: 1.2em;
                opacity: 0.7;
                margin-top: 0.6em;
                line-height: 1.2;
            }

            .modal--ts-preload .modal__body {
                flex: 1 1 auto;
                min-height: 0;
            }

            .modal--ts-preload .scroll__content {
                padding-bottom: 0.0em !important;
            }

            .modal--ts-preload .modal__footer {
                padding-top: 1em !important;
                flex: 0 0 auto;
            }

            .modal--ts-preload .torrent-serial {
                background: #1d1f20de !important;
            }

            .modal--ts-preload .torrent-serial.focus {
                background-color: #4b4b4b91 !important;
            }

            /* ===== Шкала буфера ===== */
            .modal--ts-preload .broadcast__scan {
                position: relative;
                width: 100%;
                height: 0.28em;
                margin-top: 1.2em;
                border-radius: 99em;
                background: rgba(127,127,127,0.28);
                overflow: hidden;
            }

            /* Indeterminate-анимация, пока данных нет */
            .modal--ts-preload .broadcast__scan > div {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 30%;
                border-radius: inherit;
                background: currentColor;
                opacity: 0.85;
                animation: tsPreloadScan 1.4s ease-in-out infinite;
            }

            @keyframes tsPreloadScan {
                0%   { left: -30%; }
                50%  { left: 50%; }
                100% { left: 100%; }
            }

            /* Режим прогресса: indeterminate отключается, ширина — по --p */
            .modal--ts-preload .broadcast__scan.is-active > div {
                animation: none;
                left: 0;
                width: var(--p, 0%);
                transition: width .25s linear;
            }

            .modal--ts-preload .broadcast__scan.is-active {
                box-shadow: 0 0 12px rgba(255,255,255,0.08) inset;
            }

            /* Мобильные / низкие экраны */
            @media (max-width: 768px), (max-height: 500px) {
                .modal--ts-preload .modal__content {
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

    // ---------- Модалка (из ts-preload) ----------
    var Modal = /** @class */function(){
        var modalID = 0;

        function Modal(params) {
            this.id = ++modalID;
            this.active = params;
            this.html = Lampa.Template.get('modal', {title: params.title});
            this.scroll = new Lampa.Scroll({over: true, mask: params.mask});
            this.last = false;
        }

        Modal.prototype.open = function(){
            var _this = this;
            this.html.addClass('modal--ts-preload');
            this.html.on('click',function(e){
                if(!$(e.target).closest($('.modal__content', _this.html)).length && Lampa.DeviceInput.canClick(e.originalEvent)) window.history.back();
            });

            this.title(this.active.title);

            this.html.toggleClass('modal--medium', this.active.size === 'medium');
            this.html.toggleClass('modal--large', this.active.size === 'large');
            this.html.toggleClass('modal--full', this.active.size === 'full');
            this.html.toggleClass('modal--overlay', !!this.active.overlay);
            this.html.toggleClass('modal--align-center', this.active.align === 'center');

            if(this.active.zIndex) this.html.css('z-index', this.active.zIndex);

            this.scroll.render().toggleClass('layer--height', this.active.size === 'full');

            this.html.find('.modal__body').append(this.scroll.render());

            this.bind(this.active.html);

            this.scroll.onWheel = function(step){
                this.roll(step > 0 ? 'down' : 'up');
            };
            this.scroll.append(this.active.html);
            if(this.active.buttons) this.buttons();
            $('body').append(this.html);
            this.max();
            this.toggle(this.active.select);
        };

        Modal.prototype.max = function(){
            this.scroll.render().find('.scroll__content').css('max-height',  Math.round(window.innerHeight - this.scroll.render().offset().top - (window.innerHeight * 0.1)) + 'px');
        };

        Modal.prototype.buttons = function(){
            var footer = $('<div class="modal__footer"></div>');
            this.active.buttons.forEach(function(button){
                var btn = $('<div class="modal__button selector" style="width: 50%;text-align: center"></div>');
                btn.text(button.name);
                btn.on('click hover:enter',function(){
                    button.onSelect();
                });
                footer.append(btn);
            });
            this.scroll.append(footer);
        };

        Modal.prototype.bind = function(where){
            where.find('.selector')
                .on('hover:focus',function(e){
                    this.last = e.target;
                    this.scroll.update($(e.target));
                })
                .on('hover:enter',function(e){
                    this.last = e.target;
                    if(this.active.onSelect) this.active.onSelect($(e.target));
                });
        };

        Modal.prototype.jump = function(tofoward){
            var select = this.scroll.render().find('.selector.focus');

            if(tofoward) select = select.nextAll().filter('.selector');
            else         select = select.prevAll().filter('.selector');

            select = select.slice(0,10);
            select = select.last();

            if(select.length){
                Lampa.Controller.collectionFocus(this.select[0],this.scroll.render());
            }
        };

        Modal.prototype.roll = function(direction){
            var select = this.scroll.render().find('.selector');

            if(select.length){
                Navigator.move(direction);
            }
            else{
                var step = Math.round(window.innerHeight * 0.15);
                this.scroll.wheel(direction === 'down' ? step : -step);
            }
        };

        Modal.prototype.toggle = function(need_select){
            var _this = this;
            Lampa.Controller.add('Modal-' + this.id, {
                invisible: true,
                toggle: function(){
                    Lampa.Controller.collectionSet(_this.scroll.render());
                    Lampa.Controller.collectionFocus(need_select || _this.last, _this.scroll.render());

                    Lampa.Layer.visible(_this.scroll.render(true));
                },
                up: function(){ _this.roll('up'); },
                down: function(){ _this.roll('down'); },
                right: function(){
                    if(Navigator.canmove('right')) Navigator.move('right');
                    else _this.jump(true);
                },
                left: function(){
                    if(Navigator.canmove('left')) Navigator.move('left');
                    else _this.jump(false);
                },
                back: function(){
                    if(_this.active.onBack) _this.active.onBack();
                }
            });
            Lampa.Controller.toggle('Modal-' + this.id);
        };

        Modal.prototype.update = function(new_html) {
            this.last = false;
            this.scroll.clear();
            this.scroll.append(new_html);
            this.bind(new_html);
            this.max();
            this.toggle(this.active.select);
        };

        Modal.prototype.title = function(title){
            this.html.find('.modal__title').text(title);
            this.html.toggleClass('modal--empty-title',!title);
        };

        Modal.prototype.destroy = function(){
            this.last = false;
            this.scroll.destroy();
            this.html.remove();
        };

        Modal.prototype.close = function(){
            this.destroy();
        };

        Modal.prototype.render = function(){
            return this.html;
        };
        return Modal;
    }();

    Lampa.Lang.add({
        ts_preload_preload: {
            en: 'Preload', ru: 'Предзагрузка', be: 'Перадзагрузка',
            uk: 'Передзавантаження', pt: 'Pré-carregar', zh: '预加载'
        },
        ts_preload_speed: {
            en: 'Speed', ru: 'Скорость загрузки', be: 'Хуткасць загрузкі',
            uk: 'Швидкість', pt: 'Velocidade', zh: '速度'
        },
        ts_preload_seeds: {
            en: 'seeds', ru: 'раздают', be: 'раздаюць',
            uk: 'роздають', pt: 'entregam', zh: '种子数'
        },
        ts_preload_peers: {
            en: 'Peers', ru: 'Подключились', be: 'Падключыліся',
            uk: 'Підключилися', pt: 'Conectado', zh: '连接数'
        }
    });

    function tsIP(){
        return (!!Lampa.Torserver && !!Lampa.Torserver.ip)
            ? Lampa.Torserver.ip()
            : Lampa.Storage.get(Lampa.Storage.field('torrserver_use_link') === 'two' ? 'torrserver_url_two' : 'torrserver_url');
    }

    var lampaPlay = Lampa.Player.play;
    var lampaCallback = Lampa.Player.callback;
    var lampaPlaylist = Lampa.Player.playlist;
    var lampaStat = Lampa.Player.stat;
    var player = null;

    var Player = /** @class */function(){
        function Player(data) {
            data.url = parseUrl(data.url).clearUrl + '&play';
            this.playerData = data;
            this.playList = null;
            this.statUrl = null;
            this.callback = null;
        }
        Player.prototype.setPlayList = function(playlist){
            playlist.map(function(data){data.url = parseUrl(data.url).clearUrl + '&play'});
            this.playList = playlist;
        };
        Player.prototype.setStatUrl = function(url){this.statUrl = url};
        Player.prototype.setCallback = function(callback){this.callback = callback};
        Player.prototype.play = function(){
            lampaPlay(this.playerData);
            this.playList && lampaPlaylist(this.playList);
            this.callback && lampaCallback(this.callback);
            this.statUrl && lampaStat(this.statUrl);
            player = null;
        };
        return Player;
    }();

    Lampa.Player.playlist = function(playlist) {
        if (player) player.setPlayList(playlist);
        else lampaPlaylist(playlist);
    };
    Lampa.Player.stat = function(url) {
        if (player) player.setStatUrl(url);
        else lampaStat(url);
    };
    Lampa.Player.callback = function(callback) {
        if (player) player.setCallback(callback);
        else lampaCallback(callback);
    };

    function params(obj) {
        var prop, pairs = [];
        for (prop in obj) pairs.push(prop + (obj[prop] ? '=' + obj[prop] : ''));
        return pairs.join('&');
    }

    function parseUrl(url) {
        var m, base_url, stream, args, arg = {};
        if (!!(m = url.match(/^(https?:\/\/.+?)(\/stream\/[^?]+)\?(.+)$/i))) {
            base_url = m[1];
            stream = m[2];
            args = m[3];
            args.split('&').map(function(v){var p=v.split('=');arg[p[0]] = p[1] || null;});
            delete(arg['play']);delete(arg['preload']);delete(arg['stat']);
        }
        args = params(arg);
        return {
            clearUrl: base_url + stream + '?' + args,
            base_url: base_url,
            stream: stream,
            args: '?' + args,
            arg: arg
        };
    }

    // ===================================================================
    // Захват карточки для заголовка попапа (название + сезон/серия)
    // ===================================================================
    var lastCardData = null;

    function setupDataCapture() {
        if (!Lampa.Listener) return;

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

    function getTitle(card) {
        if (!card) return null;
        return card.title || card.name || card.original_title || card.original_name || null;
    }

    function seasonEpisodeFromContinueButton() {
        var btn = document.querySelector('.view--continue-torrent-v2');
        if (!btn) return null;

        var textEl = btn.querySelector('.ctv-continue-text');
        var text = textEl ? (textEl.textContent || '').trim() : '';
        if (!text) return null;

        var season = null, episode = null;
        var sMatch = text.match(/Сезон\s+(\d+)/i);
        var eMatch = text.match(/Серия\s+(\d+)/i);
        if (sMatch) season = parseInt(sMatch[1], 10);
        if (eMatch) episode = parseInt(eMatch[1], 10);

        if (season === null || episode === null) {
            var m = text.match(/S(\d{1,2})[\s._·-]*E(\d{1,3})/i);
            if (m) {
                if (season === null) season = parseInt(m[1], 10);
                if (episode === null) episode = parseInt(m[2], 10);
            }
        }
        if (season === null) {
            var nextS = text.match(/Следующий\s+сезон\s+(\d+)/i);
            if (nextS) season = parseInt(nextS[1], 10);
        }
        if (episode === null) {
            var nextE = text.match(/Следующая\s+серия\s+(\d+)/i);
            if (nextE) episode = parseInt(nextE[1], 10);
        }
        return (season || episode) ? { season: season, episode: episode } : null;
    }

    function seasonEpisodeFromCard(card) {
        if (!card) return null;
        var s = card.season !== undefined ? card.season : card.season_number;
        var e = card.episode !== undefined ? card.episode : card.episode_number;
        return (Number(s) && Number(e)) ? { season: Number(s), episode: Number(e) } : null;
    }

    function getSeasonEpisode(card) {
        return seasonEpisodeFromContinueButton() || seasonEpisodeFromCard(card);
    }

    function getSeasonEpisodeLabel(card) {
        var se = getSeasonEpisode(card);
        if (!se || !se.season || !se.episode) return null;
        return 'Сезон ' + se.season + ' • Серия ' + se.episode;
    }

    function applyTitleToModal(modal, card) {
        if (!modal || !card) return;
        var html = modal.render ? modal.render() : modal;
        var head = html.find('.modal__head');
        if (!head.length) return;

        var titleEl = head.find('.modal__title');
        if (!titleEl.length) return;

        var displayName = getTitle(card);
        if (!displayName) return;

        head.contents().filter(function(){ return this.nodeType === 3; }).remove();

        titleEl.text(displayName);

        var subtitle = head.find('.modal__subtitle');
        if (!subtitle.length) {
            subtitle = $('<div class="modal__subtitle"></div>');
            head.append(subtitle);
        }

        var seLabel = getSeasonEpisodeLabel(card);
        if (seLabel) {
            subtitle.text(seLabel).show();
        } else {
            subtitle.hide();
        }
    }

    // ===================================================================
    // preload — попап предзагрузки
    // ===================================================================
    function preload(data, options) {
        options = options || {};

        var u = parseUrl(data.url);
        if (!u.arg.link) {
            if (options.onReady) options.onReady(data);
            else lampaPlay(data);
            return;
        }

        player = new Player(data);
        var controller = Lampa.Controller.enabled().name;
        var network = new Lampa.Reguest();

        var modalHtml = $('<div>' +
            '<div class="broadcast__text" style="text-align: left">' +
                '<span class="js-peer">&nbsp;</span><br>' +
                '<span class="js-buff">&nbsp;</span><br>' +
                '<span class="js-speed">&nbsp;</span>' +
            '</div>' +
            '<div class="broadcast__scan"><div></div></div>' +
        '</div>');

        var peer = modalHtml.find('.js-peer');
        var buff = modalHtml.find('.js-buff');
        var speed = modalHtml.find('.js-speed');
        var scan = modalHtml.find('.broadcast__scan');

        var modal = new Modal({
            title: Lampa.Lang.translate('loading'),
            html: modalHtml,
            onBack: cancel,
            buttons: [
                { name: Lampa.Lang.translate('cancel'), onSelect: cancel },
                { name: Lampa.Lang.translate('player_lauch'), onSelect: play }
            ]
        });

        modal.open();

        // Подменяем заголовок на название фильма/сериала + сезон/серию
        var cardForModal = data.card || lastCardData;
        if (!cardForModal && Lampa.Activity && Lampa.Activity.active) {
            try {
                var active = Lampa.Activity.active();
                if (active && active.movie) cardForModal = active.movie;
            } catch (e) {}
        }
        if (cardForModal) {
            setTimeout(function(){ applyTitleToModal(modal, cardForModal); }, 0);
        }

        var finished = false;
        var autoStarted = false;

        function destroy() {
            network.clear();
            modal.close();
            try { Lampa.Controller.toggle(controller); } catch (e) {}
        }

        function cancel(){
            if (finished) return;
            finished = true;

            if (player) {
                destroy();
                player.callback && player.callback();
                player = null;
            }

            if (options.onCancel) {
                try { options.onCancel(); } catch (e) {}
            }
        }

        // Вариант B: попап при 85% отдаёт управление наружу через onReady.
        // Если onReady не был передан — играем сами (штатный сценарий).
        function play(){
            if (finished) return;
            finished = true;

            if (!player) {
                if (options.onReady) options.onReady(data);
                else lampaPlay(data);
                return;
            }

            destroy();

            if (options.onReady) {
                // Отдаём управление наружу — Continue Torrent сам запустит Vimu
                try { options.onReady(data); } catch (e) {}
            } else {
                // Старое поведение — запускаем плеер сами
                player.play();
            }
            player = null;
        }

        // Автозапуск при достижении порога буфера.
        // Решение о запуске Vimu принимает внешний onReady (Continue Torrent).
        function autoPlayIfReady(percent) {
            if (autoStarted || finished) return;
            if (percent < AUTO_START_PERCENT) return;

            autoStarted = true;
            console.log('[ts-preload] Буфер достиг ' + percent + '%, вызываем onReady');

            // Вариант B: всегда вызываем play(), который отдаст управление
            // наружу через onReady, либо сыграет сам, если onReady не задан.
            play();
        }

        network.timeout(1800 * 1000);
        network.silent(u.clearUrl + '&preload', play, play);

        network.timeout(2000);

        var stat = function(response) {
            if (finished) return;
            if (!player) return;

            if (response && response.Torrent) {
                var t = response.Torrent;
                var preloadSize = t.preload_size || 0;
                var preloadedBytes = t.preloaded_bytes || 0;
                var p = preloadSize > 0
                    ? Math.floor(preloadedBytes * 100 / preloadSize)
                    : 0;

                peer.html(
                    Lampa.Lang.translate('ts_preload_peers') + ': ' +
                    (t.active_peers || 0) + ' / ' +
                    (t.pending_peers || 0) + ' (' +
                    (t.total_peers || 0) + ') &bull; ' +
                    (t.connected_seeders || 0) + ' - ' +
                    Lampa.Lang.translate('ts_preload_seeds')
                );

                buff.html(
                    Lampa.Lang.translate('ts_preload_preload') + ': ' +
                    Lampa.Utils.bytesToSize(preloadedBytes) + ' / ' +
                    Lampa.Utils.bytesToSize(preloadSize) + ' (' + p + '%)'
                );

                speed.text(
                    Lampa.Lang.translate('ts_preload_speed') + ': ' +
                    Lampa.Utils.bytesToSize((t.download_speed || 0) * 8, true)
                );

                // Шкала: если начали качать — включаем прогресс-режим
                if (preloadedBytes > 0 && preloadSize > 0) {
                    scan.addClass('is-active');
                    scan[0].style.setProperty('--p', p + '%');
                } else {
                    scan.removeClass('is-active');
                }

                // Автозапуск при достижении порога
                autoPlayIfReady(p);
            }

            network.silent(
                u.base_url + '/cache',
                stat,
                stat,
                JSON.stringify({action: 'get', hash: u.arg.link})
            );
        };

        stat({
            Torrent: {
                active_peers: 0, pending_peers: 0, total_peers: 0,
                connected_seeders: 0, preloaded_bytes: 0, preload_size: 0,
                download_speed: 0
            }
        });
    }

    // ===================================================================
    // Публичный API
    // ===================================================================
    window.__ts_preload_show = function(opts) {
        opts = opts || {};

        if (!opts.url) {
            console.warn('[ts-preload] __ts_preload_show: нет url');
            if (opts.onReady) opts.onReady();
            return;
        }

        preload(
            { url: opts.url, card: opts.card },
            { onReady: opts.onReady, onCancel: opts.onCancel }
        );
    };

    // ---------- Init ----------
    function init() {
        addStyles();
        setupDataCapture();
        console.log('[ts-preload] готов. API: window.__ts_preload_show(opts)');
    }

    if (window.appready) {
        init();
    } else if (Lampa.Listener) {
        Lampa.Listener.follow('app', function(event) {
            if (event.type === 'ready') init();
        });
    } else {
        setTimeout(init, 1000);
    }

})(jQuery, Lampa);
