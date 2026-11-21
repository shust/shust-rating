/* Cardify: combined Logo Title and cardify-new. */
/* Cardify + Logo Title 1.1 for Lampa. Based on the two supplied plugins.
 * Domain-independent; settings: Cardify -> Логотип вместо названия.
 * Persistent logo lookup cache, early preload, and bounded title placeholder.
 */
(function () {
    'use strict';

    if (window.cardifyMxInstalled || window.cardifyMxPending) return;
    window.cardifyMxPending = true;


    var states = [];
    var settingName = 'logo_card';
    var cacheName = 'cardify_logo_cache_v2';
    var cache = null;
    var pending = {};
    var warmImages = {};
    var warmKeys = [];
    var placeholderClass = 'cardify__title-pending';

    function validPath(path) {
        return typeof path === 'string' && /^\/[^?#]+\.(png|svg|webp)$/i.test(path);
    }

    function language() {
        return String(Lampa.Storage.get('language', 'ru')).split('-')[0];
    }

    function movieType(movie) {
        if (movie.media_type === 'movie' || movie.media_type === 'tv') return movie.media_type;
        return movie.first_air_date || movie.name ? 'tv' : 'movie';
    }

    function movieKey(movie) {
        if (!movie || !/^\d+$/.test(String(movie.id))) return null;
        return movieType(movie) + ':' + movie.id + ':' + language() + ':' + (movie.original_language || '');
    }

    function logoCache() {
        if (!cache) {
            try { cache = Lampa.Storage.get(cacheName, {}); } catch (ignore) {}
            if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
        }
        return cache;
    }

    function cachedLogo(key) {
        var entry = logoCache()[key];
        if (!entry || typeof entry.at !== 'number') return null;
        var age = Date.now() - entry.at;
        var ttl = entry.path === null ? 12 * 3600000 : 30 * 86400000;
        if (age < 0 || age > ttl || (entry.path !== null && !validPath(entry.path))) return null;
        return entry;
    }

    function saveLogo(key, path) {
        var entries = logoCache();
        entries[key] = {path: path, at: Date.now()};
        var keys = Object.keys(entries).sort(function (a, b) {
            return (entries[b] && entries[b].at || 0) - (entries[a] && entries[a].at || 0);
        });
        keys.slice(160).forEach(function (old) { delete entries[old]; });
        // A full or unavailable local storage must not stop logo rendering.
        try { Lampa.Storage.set(cacheName, entries); } catch (ignore) {}
    }

    function forgetLogo(movie) {
        var key = movieKey(movie);
        if (key) {
            delete logoCache()[key];
            try { Lampa.Storage.set(cacheName, cache); } catch (ignore) {}
        }
    }

    function imageUrl(path) {
        return Lampa.TMDB.image('t/p/' + (/\.svg$/i.test(path) ? 'original' : 'w500') + path);
    }

    function warmImage(path) {
        if (!path || !logoEnabled()) return;
        var url = imageUrl(path);
        if (warmImages[url]) return;
        var image = new Image();
        image.fetchPriority = 'high';
        warmImages[url] = image;
        warmKeys.push(url);
        if (warmKeys.length > 24) delete warmImages[warmKeys.shift()];
        image.src = url;
    }

    function getLogo(movie, callback) {
        var key = movieKey(movie);
        if (!key || !Lampa.TMDB) { callback(null); return; }
        var entry = cachedLogo(key);
        if (entry) { callback(entry.path); return; }
        // Some sources already include the image list in the full card response.
        if (movie.images && Array.isArray(movie.images.logos)) {
            var supplied = pickLogo(movie.images.logos, movie);
            saveLogo(key, supplied);
            callback(supplied);
            return;
        }
        if (pending[key]) { pending[key].push(callback); return; }
        pending[key] = [callback];
        function finish(path, remember) {
            if (remember) saveLogo(key, path);
            var callbacks = pending[key] || [];
            delete pending[key];
            callbacks.forEach(function (done) { done(path); });
        }
        $.ajax({
            url: Lampa.TMDB.api(movieType(movie) + '/' + movie.id + '/images?api_key=' +
                encodeURIComponent(Lampa.TMDB.key())),
            dataType: 'json',
            timeout: 10000,
            success: function (data) {
                // Do not cache a malformed response as a missing logo.
                var valid = data && Array.isArray(data.logos);
                finish(valid ? pickLogo(data.logos, movie) : null, valid);
            },
            error: function () { finish(null, false); }
        });
    }

    function revealTitle(state) {
        if (state.waitTimer) clearTimeout(state.waitTimer);
        state.waitTimer = null;
        state.title.removeClass(placeholderClass);
    }

    function waitForLogo(state) {
        if (state.original) return;
        state.title.addClass(placeholderClass);
        state.waitTimer = setTimeout(function () { revealTitle(state); }, 1200);
    }

    function logoEnabled() {
        var value = Lampa.Storage.get(settingName, true);
        return value !== false && value !== 'false' && value !== 0 && value !== '0';
    }

    function connected(state) {
        return $.contains(document.documentElement, state.title[0]);
    }

    function restoreTitle(state) {
        revealTitle(state);
        if (state.original) {
            state.title.empty().append(state.original);
            state.original = null;
        }
    }

    function stopLoading(state) {
        state.token++;
        if (state.waitTimer) clearTimeout(state.waitTimer);
        state.waitTimer = null;
        if (state.timer) clearTimeout(state.timer);
        state.timer = null;
        if (state.loadingImage) {
            state.loadingImage.onload = state.loadingImage.onerror = null;
            state.loadingImage = null;
        }
    }

    function pruneStates() {
        states = states.filter(function (state) {
            if (connected(state)) return true;
            stopLoading(state);
            return false;
        });
    }

    function pickLogo(logos, movie) {
        var lang = language();
        var original = movie.original_language;
        var best = null;
        var bestScore = -1;
        (Array.isArray(logos) ? logos : []).forEach(function (logo) {
            if (!logo || !validPath(logo.file_path)) return;
            var score = logo.iso_639_1 === lang ? 40 :
                original && logo.iso_639_1 === original ? 30 :
                logo.iso_639_1 === 'en' ? 20 : !logo.iso_639_1 ? 10 : 0;
            if (score > bestScore) {
                bestScore = score;
                best = logo.file_path;
            }
        });
        return best;
    }

    function loadImage(state, path, token) {
        if (token !== state.token || !logoEnabled()) return;
        var url = imageUrl(path);
        var warmed = warmImages[url];
        var reusable = state.loadedImage && state.loadedImage.src === url ? state.loadedImage :
            warmed && warmed.complete && warmed.naturalWidth > 0 && !warmed.parentNode ? warmed : null;
        var image = reusable || new Image();
        state.loadingImage = image;
        image.fetchPriority = 'high';
        function clear() {
            clearTimeout(state.timer);
            state.timer = null;
            image.onload = image.onerror = null;
            state.loadingImage = null;
        }
        image.className = 'cardify__logo';
        image.alt = state.movie.title || state.movie.name || state.title.text();
        image.onload = function () {
            if (token !== state.token) return;
            clear();
            if (token !== state.token || !logoEnabled() || (!state.attaching && !connected(state))) return;
            state.path = path;
            state.loadedImage = image;
            if (!state.original) state.original = state.title.contents().detach();
            state.title.empty().append(image);
            revealTitle(state);
        };
        image.onerror = function () {
            if (token !== state.token) return;
            clear();
            if (token === state.token) {
                state.path = null;
                state.loadedImage = null;
                delete warmImages[url];
                forgetLogo(state.movie);
                restoreTitle(state);
            }
        };
        state.timer = setTimeout(image.onerror, 10000);
        if (reusable) image.onload();
        else {
            // A cached browser image can be ready synchronously, before the next paint.
            image.src = url;
            if (image.complete && image.naturalWidth > 0) image.onload();
        }
    }

    function updateLogo(state) {
        stopLoading(state);
        if (!logoEnabled()) {
            restoreTitle(state);
            return;
        }
        var token = state.token;
        waitForLogo(state);
        if (state.path) {
            loadImage(state, state.path, token);
            return;
        }
        getLogo(state.movie, function (path) {
            if (token !== state.token || !logoEnabled() || (!state.attaching && !connected(state))) return;
            if (path) loadImage(state, path, token);
            else restoreTitle(state);
        });
    }

    function refreshLogos() {
        $('body').toggleClass('cardify-logo-enabled', logoEnabled());
        pruneStates();
        states.forEach(updateLogo);
    }

    function addSettings() {
        if (!Lampa.SettingsApi.getComponent('cardify')) {
            Lampa.SettingsApi.addComponent({
                component: 'cardify',
                name: 'Cardify',
                icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 15l4-4 3 3 2-2 3 3" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
            });
        }
        Lampa.SettingsApi.addParam({
            component: 'cardify',
            param: {name: settingName, type: 'trigger', default: true},
            field: {
                name: 'Логотип вместо названия',
                description: 'Показывать логотип фильма или сериала. Если логотип недоступен, останется название.'
            },
            onChange: refreshLogos
        });
    }

    function fullReady(event) {
        if (!event) return;
        if (event.type === 'start') {
            if (logoEnabled() && event.data && event.data.movie) getLogo(event.data.movie, warmImage);
            return;
        }
        if (event.type !== 'complite' && event.type !== 'complete') return;
        var activity = event.object && event.object.activity;
        var root = event.body || (activity && typeof activity.render === 'function' ? activity.render() : null);
        if (!root) return;
        root.find('.full-start__background').addClass('cardify__background');
        var title = root.find('.full-start-new__title').first();
        if (!title.length) return;
        var state = title.data('cardify-logo-state');
        if (state && state.started) return;
        pruneStates();
        if (!state) {
            state = {
                title: title,
                movie: event.data && event.data.movie,
                token: 0,
                original: null,
                path: null
            };
            title.data('cardify-logo-state', state);
        }
        state.started = true;
        if (states.indexOf(state) === -1) states.push(state);
        // A synchronous cache hit may render before Lampa attaches this root to the DOM.
        state.attaching = true;
        updateLogo(state);
        state.attaching = false;
    }

    function start() {
        if (window.cardifyMxInstalled) return;

        // Preserve the original plugin's TV layout preference.
        Lampa.Platform.tv();
        if (!Lampa.Platform.screen('tv')) {
            window.cardifyMxPending = false;
            console.warn('Cardify: TV layout is required.');
            return;
        }

        Lampa.Template.add('full_start_new', "<div class=\"full-start-new cardify\">\n        <div class=\"full-start-new__body\">\n            <div class=\"full-start-new__left hide\">\n                <div class=\"full-start-new__poster\">\n                    <img class=\"full-start-new__img full--poster\" />\n                </div>\n            </div>\n\n            <div class=\"full-start-new__right\">\n                \n                <div class=\"cardify__left\">\n                    <div class=\"full-start-new__head\"></div>\n                    <div class=\"full-start-new__title cardify__title-pending\">{title}</div>\n\n                    <div class=\"cardify__details\">\n                        <div class=\"full-start-new__details\"></div>\n                    </div>\n\n                    <div class=\"full-start-new__buttons\">\n                        <div class=\"full-start__button selector button--play\">\n                            <svg width=\"28\" height=\"29\" viewBox=\"0 0 28 29\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"14\" cy=\"14.5\" r=\"13\" stroke=\"currentColor\" stroke-width=\"2.7\"/>\n                                <path d=\"M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z\" fill=\"currentColor\"/>\n                            </svg>\n\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--book\">\n                            <svg width=\"21\" height=\"32\" viewBox=\"0 0 21 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{settings_input_links}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--reaction\">\n                            <svg width=\"38\" height=\"34\" viewBox=\"0 0 38 34\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3164 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z\" fill=\"currentColor\"/>\n                                <path d=\"M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z\" fill=\"currentColor\"/>\n                            </svg>                \n\n                            <span>#{title_reactions}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--subscribe hide\">\n                            <svg width=\"25\" height=\"30\" viewBox=\"0 0 25 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z\" fill=\"currentColor\"/>\n                            <path d=\"M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{title_subscribe}</span>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"cardify__right\">\n                    <div class=\"full-start-new__reactions selector\">\n                        <div>#{reactions_none}</div>\n                    </div>\n\n                    <div class=\"full-start-new__rate-line\">\n                 <div class=\"full-start__rate rate--tmdb\"><div>{rating}</div><div class=\"source--name\">TMDB</div></div>\n                <div class=\"full-start__rate rate--imdb hide\"><div></div><div>IMDB</div></div>\n                <div class=\"full-start__rate rate--kp hide\"><div></div><div>KP</div></div>\n\n                   <div class=\"full-start__pg hide\"></div>\n                        <div class=\"full-start__status hide\"></div>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"hide buttons--container\">\n            <div class=\"full-start__button view--torrent hide\">\n                <svg xmlns=\"http://www.w3.org/2000/svg\"  viewBox=\"0 0 50 50\" width=\"50px\" height=\"50px\">\n                    <path d=\"M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z\" fill=\"currentColor\"/>\n                </svg>\n\n                <span>#{full_torrents}</span>\n            </div>\n\n            <div class=\"full-start__button selector view--trailer\">\n                <svg height=\"70\" viewBox=\"0 0 80 70\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z\" fill=\"currentColor\"></path>\n                </svg>\n\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>");
        Lampa.Template.add('cardify_css', "\n <style>\n .cardify .full-start-new__body{height:80vh}.cardify .full-start-new__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end}.cardify__left{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}.cardify__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.cardify__details{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.cardify .full-start-new__reactions{margin:0;margin-right:-2.8em}.cardify .full-start-new__reactions:not(.focus){margin:0}.cardify .full-start-new__reactions:not(.focus)>div:not(:first-child){display:none}.cardify .full-start-new__reactions:not(.focus) .reaction{position:relative}.cardify .full-start-new__reactions:not(.focus) .reaction__count{position:absolute;top:28%;left:95%;font-size:1.2em;font-weight:500}.cardify .full-start-new__rate-line{margin:0;margin-left:3.5em}.cardify .full-start-new__rate-line>*:last-child{margin-right:0 !important}.cardify__background{left:0}.cardify__background.loaded:not(.dim){opacity:1}body:not(.menu--open) .cardify__background{background:linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0) 70%), linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0) 70%), linear-gradient(to left, rgba(0,0,0,0.8), rgba(0,0,0,0) 70%), linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0) 70%)}@-webkit-keyframes animation-full-background{0%{-webkit-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-moz-keyframes animation-full-background{0%{-moz-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-o-keyframes animation-full-background{0%{transform:translate3d(0,-10%,0)}100%{transform:translate3d(0,0,0)}}@keyframes animation-full-background{0%{-webkit-transform:translate3d(0,-10%,0);-moz-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}\n </style>\n ");
        $('body').append(Lampa.Template.get('cardify_css', {}, true));
        $('head').append('<style>.full-descr__text{width:70% !important}body.cardify-logo-enabled .cardify__title-pending{visibility:hidden}.cardify__logo{display:block;object-fit:contain;object-position:left center;max-height:2.8em;max-width:6.8em;width:auto;height:auto;margin:.6em 0 .4em}@media(max-width:585px){.cardify__logo{max-height:1.8em;max-width:100%;margin:.3em 0 .1em}}</style>');

        $('body').toggleClass('cardify-logo-enabled', logoEnabled());
        addSettings();
        Lampa.Listener.follow('full', fullReady);

        window.cardifyMxInstalled = true;
        window.cardifyMxPending = false;
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (event) {
        if (event && event.type === 'ready') start();
    });
})();


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

    function initCardifyBackground() {
        if (!window.Lampa || !Lampa.SettingsApi || !Lampa.Storage || !Lampa.Listener) return;

        var setting = 'cardify_color_only_in_full';
        var root = document.documentElement;
        var background = Lampa.Background;
        var cancelPending = background && background.change;
        var immediately = background && background.immediately;
        var lastFull = null;
        var earlyBackgroundFull = null;
        var style = document.createElement('style');
        style.id = 'cardify-background-only-full-style';
        style.textContent =
            'html.cardify-black-outside body {background-color: #000 !important;}' +
            'html.cardify-black-outside .background {background: #000 !important;}' +
            'html.cardify-color-in-full .background {background-color: #000 !important;}' +
            'html.cardify-black-outside .background canvas {visibility: hidden !important;}';
        (document.head || root).appendChild(style);

        function isEnabled() {
            var value = Lampa.Storage.get(setting, false);
            return value === true || value === 'true';
        }

        function active() {
            return Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
        }

        function clearBackground() {
            var canvases = document.querySelectorAll('.background canvas');
            for (var i = 0; i < canvases.length; i++) {
                var context = canvases[i].getContext('2d');
                if (context) context.clearRect(0, 0, canvases[i].width, canvases[i].height);
            }
        }

        function update(component) {
            var enabled = isEnabled();
            if (typeof component !== 'string') {
                var current = active();
                component = current && current.component;
            }
            root.classList.toggle('cardify-color-in-full', enabled);
            root.classList.toggle('cardify-black-outside', enabled && component !== 'full');
            if (enabled && component !== 'full' && typeof cancelPending === 'function') {
                cancelPending.call(background, '');
            }
        }

        if (background) {
            ['change', 'immediately'].forEach(function (method) {
                var original = background[method];
                if (typeof original !== 'function') return;
                background[method] = function () {
                    if (isEnabled()) {
                        var current = active();
                        if (!current || current.component !== 'full') return;
                        // Keep the initial background until this card is left.
                        if (current === earlyBackgroundFull) return;
                        if (current !== lastFull) {
                            clearBackground();
                            lastFull = current;
                        }
                    }
                    return original.apply(this, arguments);
                };
            });
        }

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {name: setting, type: 'trigger', default: false},
            field: {
                name: 'Цветной фон только в карточке',
                description: 'В остальных разделах использовать чёрный фон'
            },
            onChange: function () { update(); }
        });
        Lampa.Listener.follow('activity', function (event) {
            if (event.type === 'init' && event.component === 'full' && isEnabled()) {
                clearBackground();
                lastFull = event.object;
                earlyBackgroundFull = null;
                // Begin loading before full details arrive.
                var card = event.object && event.object.card;
                if (card && typeof immediately === 'function' && Lampa.Utils && Lampa.Utils.cardImgBackgroundBlur) {
                    var earlyUrl = Lampa.Utils.cardImgBackgroundBlur(card);
                    if (earlyUrl) {
                        earlyBackgroundFull = event.object;
                        immediately.call(background, earlyUrl);
                        // Lampa can throttle immediate calls; its normal change is the fallback.
                        if (typeof cancelPending === 'function') cancelPending.call(background, earlyUrl);
                    }
                }
            }
            if (event.type === 'start') {
                if (event.component === 'full' && isEnabled() && event.object !== lastFull) {
                    clearBackground();
                    lastFull = event.object;
                }
                update(event.component);
            }
        });
        Lampa.Listener.follow('full', function (event) {
            if (!isEnabled() || event.type !== 'start' || !event.data || !event.data.movie ||
                !background || !Lampa.Utils || !Lampa.Utils.cardImgBackgroundBlur) return;
            if (event.object && event.object === earlyBackgroundFull) return;
            var url = Lampa.Utils.cardImgBackgroundBlur(event.data.movie);
            if (url) {
                // Avoid the normal delay when possible; keep change as a fallback.
                if (background.immediately) background.immediately(url);
                background.change(url);
                // If Lampa already has this image cached, restore its cleared canvas.
                if (background.update) background.update();
            }
        });
        update();
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
            if (description) {
                while (description.lastChild &&
                    ((description.lastChild.nodeType === 1 && description.lastChild.tagName === 'BR') ||
                     (description.lastChild.nodeType === 3 && !description.lastChild.nodeValue.trim()))) {
                    description.removeChild(description.lastChild);
                }
            }
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
            '.menu__text,.settings-folder__name {font-size: 1.3em; line-height: 1.4;}' +
            '.full-person {max-width: 22em;}' +
            '.full-start-new.cardify .full-descr__text {width: 60% !important; height: auto !important; min-height: 0 !important; font-weight: 400; opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; mask-image: none; margin-bottom: 1.5em; line-height: 1.5em;}' +
            '.full-start-new {padding: 0 2em; padding-bottom: 4em;}' +
            '.full-start-new.cardify .cardify__details {width: 60%;}' +
            '.full-start-new.cardify .cardify__right {margin-bottom: 1.7em; zoom: 0.8;}' +
            '.full-start__button {padding: 0.8em; height: auto; border-radius: 10em; background-color: rgb(255 255 255 / 14%); box-shadow: inset 0 0 0 1px #ffffff0f;}' +
            '.full-start__button.focus {padding-right: 1.4em; padding-left: 1.3em;}' +
            '.full-start__button > svg {width: 1.3em; height: 1.3em;}' +
            '.full-start__button > svg + span {margin-left: 0.5em;}' +
            '.selector.button--lampa-ratings.full-start__rate.focus {margin-left: 0.8em !important;}' +
            '.selectbox__title {font-size: 1.6em; font-weight: 400;}' +
            'img.full-start__background.cardify__background.loaded {width: 100%; height: 100vh; top: -4em; mask-image: linear-gradient(270deg, #000 0%, rgb(0 0 0 / 59%) 34%, transparent 76%), linear-gradient( 26deg, transparent 0%, transparent 52%, rgb(0 0 0 / 44%) 82%, #000 100%); mask-image: linear-gradient( 90deg, rgb(0 0 0 / 0%) 0%, rgb(0 0 0 / 40%) 50%, #000 80% );}' +
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

        initCardifyBackground();
        applyLayout();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
