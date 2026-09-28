/*
 * Lampa Continue Torrent — V2
 * Lampa + TorrServer + Vimu
 * Version: 2.0.0
 */
(function () {
    'use strict';

    if (window.__lampa_continue_torrent_v2) return;
    window.__lampa_continue_torrent_v2 = true;

    var STORAGE = 'lampa_continue_torrent_v2';
    var SAVE_EVERY = 10000;
    var SERVER_SAVE_EVERY = 30000;
    var COMPLETE_PERCENT = 90;
    var VIDEO_EXT = ['mkv','mp4','m4v','avi','mov','m2ts','ts','mpg','mpeg','webm','wmv','flv','vob','rmvb','asf'];

    var runtime = {
        history: {},
        session: null,
        currentFull: null,
        lastSave: 0,
        lastServerSave: 0
    };

    function t(v) {
        return v === undefined || v === null ? '' : String(v).trim();
    }

    function n(v) {
        var x = Number(v);
        return isFinite(x) ? x : 0;
    }

    function ext(path) {
        var p = t(path).toLowerCase().split('?')[0];
        var a = p.split('.');
        return a.length > 1 ? a.pop() : '';
    }

    function isVideo(path) {
        return VIDEO_EXT.indexOf(ext(path)) >= 0;
    }

    function isSeries(card) {
        return !!(card && n(card.number_of_seasons) > 0);
    }

    function cardIdentity(card) {
        if (!card) return '';
        var source = t(card.source) || 'tmdb';
        var id = card.tmdb_id || (source === 'tmdb' ? card.id : '') ||
                 card.imdb_id || card.kinopoisk_id || card.id;
        return id ? source + ':' + id : '';
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(n(seconds)));
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h) return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        return m + ':' + String(s).padStart(2,'0');
    }

    function episodeText(s, e) {
        if (!n(s) || !n(e)) return '';
        return 'S' + String(n(s)).padStart(2,'0') + 'E' + String(n(e)).padStart(2,'0');
    }

    function load() {
        try {
            var value = Lampa.Storage.get(STORAGE, {});
            if (value && typeof value === 'object') runtime.history = value;
        } catch (e) {
            runtime.history = {};
        }
    }

    function save() {
        try {
            Lampa.Storage.set(STORAGE, runtime.history, true);
        } catch (e) {}
    }

    function get(card) {
        var key = cardIdentity(card);
        return key ? runtime.history[key] || null : null;
    }

    function put(card, data) {
        var key = cardIdentity(card);
        if (!key) return;
        runtime.history[key] = Object.assign({}, runtime.history[key] || {}, data, {
            updated_at: Date.now()
        });
        save();
    }

    function magnetFor(record) {
        var magnet = t(record && record.magnet);
        if (/^magnet:/i.test(magnet)) return magnet;

        var hash = t(record && record.infohash).toUpperCase();
        if (/^[A-F0-9]{40}$/.test(hash) || /^[A-Z2-7]{32}$/.test(hash)) {
            return 'magnet:?xt=urn:btih:' + hash;
        }
        return '';
    }

    function viewedApi() {
        function request(payload, success, fail) {
            try {
                if (!Lampa.Reguest || !Lampa.Torserver || !Lampa.Torserver.url) {
                    throw new Error('TorrServer API unavailable');
                }

                var req = new Lampa.Reguest();
                req.timeout(5000);
                req.silent(
                    Lampa.Torserver.url() + '/viewed',
                    success,
                    fail,
                    JSON.stringify(payload)
                );
            } catch (e) {
                if (fail) fail(e);
            }
        }

        return {
            list: function(hash, success, fail) {
                if (Lampa.Torserver.viewed) {
                    return Lampa.Torserver.viewed(hash, success, fail);
                }
                request({action:'list', hash:hash}, success, fail);
            },

            set: function(hash, fileIndex, seconds) {
                if (Lampa.Torserver.viewedSet) {
                    return Lampa.Torserver.viewedSet(hash, fileIndex, Math.round(seconds));
                }
                request({
                    action:'set',
                    hash:hash,
                    file_index:fileIndex,
                    timecode:Math.round(seconds)
                });
            }
        };
    }

    var serverViewed = viewedApi();

    function getFiles(hash) {
        return new Promise(function(resolve, reject) {
            try {
                Lampa.Torserver.files(hash, function(response) {
                    var files = response && (response.file_stats || response.files);
                    if (!files || !files.length) {
                        reject(new Error('Torrent files are empty'));
                        return;
                    }
                    resolve({
                        hash: t(response.hash) || hash,
                        files: files
                    });
                }, function(err) {
                    reject(err || new Error('TorrServer files error'));
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    function addTorrent(record) {
        return new Promise(function(resolve, reject) {
            var link = magnetFor(record);
            if (!link) {
                reject(new Error('No magnet'));
                return;
            }

            try {
                Lampa.Torserver.hash({
                    title: t(record.torrent_title) || 'Continue watching',
                    link: link,
                    poster: '',
                    data: {lampa:true}
                }, function(result) {
                    var hash = t(result && result.hash);
                    if (hash) resolve(hash);
                    else reject(new Error('TorrServer did not return hash'));
                }, function(err) {
                    reject(err || new Error('Cannot add torrent'));
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    function loadTorrent(record) {
        var hash = t(record.infohash).toUpperCase();

        return getFiles(hash).catch(function() {
            return addTorrent(record).then(function(newHash) {
                return getFiles(newHash);
            });
        });
    }

    function parseFile(card, files, file) {
        var parsed = {};
        try {
            if (Lampa.Torserver.parse) {
                parsed = Lampa.Torserver.parse({
                    movie: card,
                    files: files,
                    filename: file.path_human || file.path,
                    path: file.path
                }) || {};
            }
        } catch (e) {}

        return {
            season: n(parsed.season),
            episode: n(parsed.episode),
            timelineHash: t(parsed.hash)
        };
    }

    function naturalPath(path) {
        return t(path).replace(/\\/g,'/').toLowerCase().replace(/\d+/g,function(x) {
            return ('0000' + x).slice(-4);
        });
    }

    function getTimeline(hash) {
        var timeline = {};
        try {
            if (Lampa.Timeline && Lampa.Timeline.view) {
                timeline = Lampa.Timeline.view(hash) || {};
            }
        } catch (e) {}
        return {
            hash: hash,
            time: n(timeline.time),
            duration: n(timeline.duration),
            percent: n(timeline.percent) ||
                (n(timeline.duration) ? n(timeline.time) / n(timeline.duration) * 100 : 0)
        };
    }

    function buildPlaylist(card, hash, files, viewed) {
        var source = files.filter(function(file) {
            return isVideo(file.path);
        });

        try {
            if (Lampa.Torserver.clearFileName) {
                source = Lampa.Torserver.clearFileName(source);
            }
        } catch (e) {}

        source.sort(function(a,b) {
            return naturalPath(a.path).localeCompare(naturalPath(b.path));
        });

        return source.map(function(file) {
            var parsed = parseFile(card, files, file);
            var timeline = getTimeline(parsed.timelineHash);

            var serverRoad = (viewed || []).find(function(item) {
                return n(item.file_index) === n(file.id);
            });

            if (!timeline.time && serverRoad && n(serverRoad.timecode) > 0) {
                timeline.time = n(serverRoad.timecode);
                timeline.percent = timeline.duration
                    ? Math.min(100, timeline.time / timeline.duration * 100)
                    : 0;
            }

            var url = '';
            try {
                url = Lampa.Torserver.stream(file.path, hash, file.id);
                if (url && url.indexOf('&play') < 0) {
                    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'play';
                }
            } catch (e) {}

            return Object.assign({}, file, {
                card: card,
                season: parsed.season,
                episode: parsed.episode,
                torrent_hash: hash,
                url: url,
                timeline: timeline,
                viewed: function(seconds) {
                    if (Lampa.Storage.field('torrserver_tracktimecode') === true) {
                        serverViewed.set(hash, file.id, seconds);
                    }
                }
            });
        }).sort(function(a,b) {
            return n(a.season) - n(b.season) ||
                   n(a.episode) - n(b.episode) ||
                   naturalPath(a.path).localeCompare(naturalPath(b.path));
        });
    }

    function sameFile(item, record) {
        if (!item || !record) return false;

        if (record.file_index !== undefined &&
            String(item.id) === String(record.file_index)) return true;

        if (t(item.path).toLowerCase() === t(record.file_path).toLowerCase()) return true;

        if (n(item.season) && n(item.episode) &&
            n(item.season) === n(record.season) &&
            n(item.episode) === n(record.episode)) return true;

        return false;
    }

    function chooseStart(playlist, record) {
        if (!playlist.length) return null;

        var index = playlist.findIndex(function(item) {
            return sameFile(item, record);
        });

        if (index < 0) index = 0;

        var current = playlist[index];
        var completed = n(record.percent) >= COMPLETE_PERCENT;

        if (completed && isSeries(record.card)) {
            for (var i=index+1; i<playlist.length; i++) {
                if (n(playlist[i].season) > n(current.season) ||
                    (n(playlist[i].season) === n(current.season) &&
                     n(playlist[i].episode) > n(current.episode))) {
                    current = playlist[i];
                    index = i;
                    break;
                }
            }
        }

        return {
            item: current,
            index: index,
            completed: completed
        };
    }

    function launchVimu(item, playlist, time) {
        var normalized = playlist.map(function(x) {
            var copy = Object.assign({}, x);
            copy.timeline = Object.assign({}, x.timeline || {});

            if (String(x.id) === String(item.id)) {
                copy.timeline.time = Math.max(0, n(time));
                if (copy.timeline.duration) {
                    copy.timeline.percent =
                        copy.timeline.time / copy.timeline.duration * 100;
                }
            }

            return copy;
        });

        var data = Object.assign({}, normalized.find(function(x) {
            return String(x.id) === String(item.id);
        }) || item, {
            playlist: normalized,
            return_result: true
        });

        try {
            Lampa.Player.play(data);
            if (Lampa.Player.playlist) {
                Lampa.Player.playlist(normalized);
            }
        } catch (e) {
            throw e;
        }
    }

    function resume(card) {
        var record = get(card);
        if (!record) return;

        record.card = card;

        if (Lampa.Loading && Lampa.Loading.start) Lampa.Loading.start();

        loadTorrent(record).then(function(result) {
            var hash = t(result.hash).toUpperCase();

            return new Promise(function(resolve) {
                if (Lampa.Storage.field('torrserver_tracktimecode') !== true) {
                    resolve([]);
                    return;
                }

                serverViewed.list(hash, function(items) {
                    resolve(Array.isArray(items) ? items : []);
                }, function() {
                    resolve([]);
                });
            }).then(function(viewed) {
                var playlist = buildPlaylist(card, hash, result.files, viewed);

                if (!playlist.length) {
                    throw new Error('No video files');
                }

                var target = chooseStart(playlist, record);
                if (!target) throw new Error('Cannot select file');

                var item = target.item;
                var time = target.completed ? 0 : n(record.time);

                put(card, {
                    infohash: hash,
                    magnet: t(record.magnet) || magnetFor(record),
                    torrent_title: t(record.torrent_title),
                    file_index: item.id,
                    file_path: item.path,
                    season: n(item.season),
                    episode: n(item.episode),
                    time: time,
                    duration: n(item.timeline.duration),
                    percent: n(item.timeline.duration)
                        ? time / n(item.timeline.duration) * 100
                        : 0
                });

                launchVimu(item, playlist, time);
            });
        }).catch(function(error) {
            console.error('[ContinueTorrent v2]', error);

            if (Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show('Не удалось продолжить просмотр');
            }
        }).finally(function() {
            if (Lampa.Loading && Lampa.Loading.stop) Lampa.Loading.stop();
        });
    }

    function captureTorrentFile(event) {
        if (!event || event.type !== 'onenter' || !event.element) return;

        var item = event.element;
        var active = (Lampa.Activity && Lampa.Activity.active) ? (Lampa.Activity.active() || {}) : {};
        var card = item.card ||
            (event.params && event.params.movie) ||
            active.movie ||
            active.card;

        if (!card) return;

        var hash = t(item.torrent_hash || item.infohash ||
                     (item.torrent && item.torrent.hash));

        if (!hash || !item.path) return;

        var parsed = parseFile(card, item.files || [], item);
        var timeline = item.timeline || {};

        var session = {
            card: card,
            infohash: hash.toUpperCase(),
            magnet: t(item.magnet || item.torrent_magnet),
            torrent_title: t(item.torrent_title || item.title || item.path_human),
            file_index: item.id,
            file_path: t(item.path),
            season: n(item.season) || parsed.season,
            episode: n(item.episode) || parsed.episode,
            time: n(timeline.time),
            duration: n(timeline.duration),
            percent: n(timeline.percent)
        };

        runtime.session = session;
        put(card, session);
    }

    function timelineUpdate(event) {
        if (!runtime.session || !event || !event.data) return;

        var data = event.data;
        var timeline = data.road || data;

        var time = n(timeline.time);
        var duration = n(timeline.duration);
        var percent = n(timeline.percent);

        if (!duration && !time) return;

        runtime.session.time = time;
        runtime.session.duration = duration;
        runtime.session.percent = percent ||
            (duration ? time / duration * 100 : 0);

        if (Date.now() - runtime.lastSave >= SAVE_EVERY) {
            runtime.lastSave = Date.now();
            put(runtime.session.card, runtime.session);
        }

        if (Lampa.Storage.field('torrserver_tracktimecode') === true &&
            Date.now() - runtime.lastServerSave >= SERVER_SAVE_EVERY) {

            runtime.lastServerSave = Date.now();

            serverViewed.set(
                runtime.session.infohash,
                runtime.session.file_index,
                runtime.session.time
            );
        }
    }

    function playerCreate(event) {
        if (!event || !event.data) return;

        var data = event.data;
        var card = data.card;
        if (!card) return;

        var hash = t(data.torrent_hash || data.infohash);
        if (!hash) return;

        var parsed = parseFile(card, data.files || [], data);

        runtime.session = {
            card: card,
            infohash: hash.toUpperCase(),
            magnet: t(data.magnet),
            torrent_title: t(data.torrent_title || data.title),
            file_index: data.id !== undefined ? data.id : data.file_index,
            file_path: t(data.path || data.file_path),
            season: n(data.season) || parsed.season,
            episode: n(data.episode) || parsed.episode,
            time: n(data.timeline && data.timeline.time),
            duration: n(data.timeline && data.timeline.duration),
            percent: n(data.timeline && data.timeline.percent)
        };

        put(card, runtime.session);
    }

    function playerDestroy() {
        if (!runtime.session) return;

        put(runtime.session.card, runtime.session);

        if (Lampa.Storage.field('torrserver_tracktimecode') === true) {
            serverViewed.set(
                runtime.session.infohash,
                runtime.session.file_index,
                runtime.session.time
            );
        }

        runtime.session = null;
    }

    function rootFor(event) {
        if (event && event.body && typeof event.body.find === 'function') {
            return event.body;
        }

        var activity = event && event.object && event.object.activity;
        if (!activity || typeof activity.render !== 'function') return null;

        var rendered = activity.render();
        if (rendered && typeof rendered.find === 'function') return rendered;

        return typeof $ === 'function' ? $(rendered) : null;
    }

    function labelFor(card, record) {
        if (!record) return '';

        var ep = episodeText(record.season, record.episode);
        var done = n(record.percent) >= COMPLETE_PERCENT;

        if (isSeries(card)) {
            if (done) return 'Следующая серия';
            return ep
                ? ep + ' · ' + formatTime(record.time)
                : formatTime(record.time);
        }

        if (done) return 'Продолжить просмотр';
        return formatTime(record.time);
    }

    function renderButton(label) {
        return '<div class="full-start__button selector view--continue-torrent-v2">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M8 5v14l11-7z"></path>' +
            '<path fill="currentColor" d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8z"></path>' +
            '</svg>' +
            '<span>Продолжить · ' + label + '</span>' +
            '</div>';
    }

    function onFull(event) {
        if (!event || event.type !== 'complite') return;

        runtime.currentFull = event;

        var card = event.data && event.data.movie;
        if (!card) return;

        var root = rootFor(event);
        if (!root) return;

        root.find('.view--continue-torrent-v2').remove();

        var record = get(card);
        if (!record) return;

        var button = $(renderButton(labelFor(card, record)));

        button.on('hover:enter', function() {
            resume(card);
        });

        var container = root.find(
            '.full-start-new__buttons, .full-start__buttons'
        ).last();

        var torrent = container.length
            ? container.find('.view--torrent').last()
            : root.find('.view--torrent').last();

        var online = container.length
            ? container.find('.view--online').last()
            : root.find('.view--online').last();

        if (torrent.length) {
            torrent.after(button);
        } else if (online.length) {
            online.after(button);
        } else if (container.length) {
            container.append(button);
        }
    }

    function init() {
        load();

        if (Lampa.Listener) {
            Lampa.Listener.follow('full', onFull);
            Lampa.Listener.follow('torrent_file', captureTorrentFile);
        }

        if (Lampa.Timeline && Lampa.Timeline.listener) {
            Lampa.Timeline.listener.follow('update', timelineUpdate);
        }

        if (Lampa.Player && Lampa.Player.listener) {
            Lampa.Player.listener.follow('create', playerCreate);
            Lampa.Player.listener.follow('destroy', playerDestroy);
            Lampa.Player.listener.follow('external', function(event) {
                if (event && event.data && event.data.card) {
                    playerCreate(event);
                }
            });
        }

        console.log('[ContinueTorrent v2] Lampa + TorrServer + Vimu ready');
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
})();
