/*
 * Lampa Continue Torrent — V2
 * Lampa + TorrServer + Vimu
 * Version: 2.4.0
 */
(function () {
    'use strict';

    if (window.__lampa_continue_torrent_v2) return;
    window.__lampa_continue_torrent_v2 = true;

    var STORAGE = 'lampa_continue_torrent_v2';
    var SAVE_EVERY = 10000;
    var SERVER_SAVE_EVERY = 30000;
    var COMPLETE_PERCENT = 90;

    // TorrServer.files() in current Lampa can stay silent when file_stats
    // are not ready yet, so every attempt needs our own timeout.
    var FILE_REQUEST_TIMEOUT = 3200;
    var FILE_RETRY_DELAY = 900;
    var EXISTING_HASH_ATTEMPTS = 3;
    var RESTORED_HASH_ATTEMPTS = 24;
    var ADD_TORRENT_TIMEOUT = 10000;
    var VIDEO_EXT = ['mkv','mp4','m4v','avi','mov','m2ts','ts','mpg','mpeg','webm','wmv','flv','vob','rmvb','asf'];

    var runtime = {
        history: {},
        session: null,
        currentFull: null,
        lastSave: 0,
        lastServerSave: 0,
        resumeJob: null,
        pendingTorrent: null,
        timelinePoller: null,
        buttonObserver: null,
        buttonGuardStart: null,
        buttonGuardModule: null
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
        s = n(s);
        e = n(e);

        if (!s || !e) return '';

        return 'S' + s + '• Серия ' + e;
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

        var old = runtime.history[key] || {};
        data = data || {};

        function take(name, fallback) {
            return data[name] !== undefined ? data[name] : old[name] !== undefined ? old[name] : fallback;
        }

        runtime.history[key] = {
            infohash: t(take('infohash', '')).toUpperCase(),
            magnet: t(take('magnet', '')),
            torrent_title: t(take('torrent_title', '')),
            file_index: take('file_index', ''),
            file_path: t(take('file_path', '')),
            timeline_hash: t(take('timeline_hash', '')),
            season: n(take('season', 0)),
            episode: n(take('episode', 0)),
            time: n(take('time', 0)),
            duration: n(take('duration', 0)),
            percent: n(take('percent', 0)),
            updated_at: Date.now()
        };

        save();
    }

    function applyTimelineRoad(hash, road) {
        hash = t(hash);
        if (!hash || !road) return false;

        var time = n(road.time);
        var duration = n(road.duration);
        var percent = road.percent !== undefined
            ? n(road.percent)
            : (duration ? time / duration * 100 : 0);

        var changed = false;

        // Update the active playback session.
        if (runtime.session &&
            t(runtime.session.timeline_hash) === hash) {

            runtime.session.time = time;
            runtime.session.duration = duration;
            runtime.session.percent = percent;

            put(runtime.session.card, runtime.session);
            refreshCurrentButton(runtime.session.card);
            changed = true;
        }

        // Also update persistent history by timeline hash.
        // This continues to work after Player.destroy or a card rebuild.
        Object.keys(runtime.history).forEach(function(key) {
            var record = runtime.history[key];

            if (!record || t(record.timeline_hash) !== hash) return;

            if (runtime.session &&
                cardIdentity(runtime.session.card) === key) {
                return;
            }

            record.time = time;
            record.duration = duration;
            record.percent = percent;
            record.updated_at = Date.now();

            changed = true;

            var currentCard =
                runtime.currentFull &&
                runtime.currentFull.data &&
                runtime.currentFull.data.movie;

            if (currentCard && cardIdentity(currentCard) === key) {
                refreshCurrentButton(currentCard);
            }
        });

        if (changed) save();

        return changed;
    }

    function syncTimelineForCard(card) {
        if (!card || !Lampa.Timeline || !Lampa.Timeline.view) return false;

        var record = get(card);
        if (!record || !record.timeline_hash) return false;

        try {
            var timeline = Lampa.Timeline.view(record.timeline_hash);

            // Do not overwrite a useful stored value with an empty timeline
            // merely because this Lampa build has not loaded it yet.
            // Explicit zero/reset updates are still handled by timelineUpdate().
            if (timeline &&
                (n(timeline.time) > 0 ||
                 n(timeline.duration) > 0 ||
                 n(timeline.percent) > 0)) {

                return applyTimelineRoad(record.timeline_hash, timeline);
            }
        } catch (e) {}

        return false;
    }

    function syncActiveTimeline() {
        if (runtime.session && runtime.session.timeline_hash &&
            Lampa.Timeline && Lampa.Timeline.view) {

            try {
                var timeline =
                    Lampa.Timeline.view(runtime.session.timeline_hash);

                if (timeline &&
                    (n(timeline.time) > 0 ||
                     n(timeline.duration) > 0 ||
                     n(timeline.percent) > 0)) {

                    applyTimelineRoad(
                        runtime.session.timeline_hash,
                        timeline
                    );
                }
            } catch (e) {}
        }

        var currentCard =
            runtime.currentFull &&
            runtime.currentFull.data &&
            runtime.currentFull.data.movie;

        if (currentCard) {
            syncTimelineForCard(currentCard);
        }
    }

    function scheduleTimelineSync() {
        [0, 300, 1000, 2500].forEach(function(wait) {
            setTimeout(syncActiveTimeline, wait);
        });
    }

    function startTimelinePoller() {
        if (runtime.timelinePoller) return;

        runtime.timelinePoller = setInterval(function() {
            if (runtime.session) syncActiveTimeline();
        }, 2000);
    }

    function timelineStateChanged(event) {
        if (!event ||
            event.target !== 'timeline' ||
            event.reason !== 'update' ||
            !event.data) {
            return;
        }

        timelineUpdate({data: event.data});
    }

    function installTimelineUpdateHook() {
        if (!Lampa.Timeline ||
            typeof Lampa.Timeline.update !== 'function' ||
            window.__lampa_continue_torrent_v2_timeline_hook) {
            return;
        }

        window.__lampa_continue_torrent_v2_timeline_hook = true;

        var originalUpdate = Lampa.Timeline.update;

        Lampa.Timeline.update = function(params) {
            var result = originalUpdate.apply(this, arguments);

            try {
                if (params && params.hash) {
                    var current = Lampa.Timeline.view(params.hash);
                    applyTimelineRoad(params.hash, current || params);
                }
            } catch (e) {}

            return result;
        };
    }

    function toPlayUrl(url) {
        url = t(url);
        if (!url) return '';

        try {
            if (Lampa.Torserver &&
                typeof Lampa.Torserver.toPlayUrl === 'function') {
                return Lampa.Torserver.toPlayUrl(url);
            }
        } catch (e) {}

        return url.replace('&preload', '&play');
    }

    function normalizeTorrentPlayerData(data) {
        if (!data || !data.torrent_hash) return data;

        // Important for external Android/Vimu resume:
        // current item and its playlist entry MUST use the same URL.
        if (data.url) {
            data.url = toPlayUrl(data.url);
        }

        if (Array.isArray(data.playlist)) {
            data.playlist.forEach(function(item) {
                if (item && item.url) {
                    item.url = toPlayUrl(item.url);
                }
            });

            var current = data.playlist.find(function(item) {
                if (!item) return false;

                if (data.id !== undefined &&
                    item.id !== undefined &&
                    String(item.id) === String(data.id)) {
                    return true;
                }

                if (data.path && item.path &&
                    t(item.path) === t(data.path)) {
                    return true;
                }

                return false;
            });

            if (current && current.url) {
                data.url = current.url;
            }
        }

        return data;
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

    function cancelledError() {
        var error = new Error('Cancelled');
        error.cancelled = true;
        return error;
    }

    function isCancelled(token) {
        return !!(token && token.cancelled);
    }

    function delay(ms, token) {
        return new Promise(function(resolve, reject) {
            if (isCancelled(token)) {
                reject(cancelledError());
                return;
            }

            var timer = setTimeout(function() {
                if (isCancelled(token)) reject(cancelledError());
                else resolve();
            }, ms);

            if (token) {
                token.timers = token.timers || [];
                token.timers.push(timer);
            }
        });
    }

    function getFilesOnce(hash, token) {
        return new Promise(function(resolve, reject) {
            if (!hash) {
                reject(new Error('Empty torrent hash'));
                return;
            }

            if (isCancelled(token)) {
                reject(cancelledError());
                return;
            }

            var finished = false;

            function finish(ok, value) {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);

                if (isCancelled(token)) {
                    reject(cancelledError());
                    return;
                }

                if (ok) resolve(value);
                else reject(value instanceof Error ? value : new Error(t(value) || 'TorrServer files error'));
            }

            // Important: current Torserver.files() does not call success
            // when the response has no file_stats. This timeout prevents
            // an endless Promise.
            var timeout = setTimeout(function() {
                finish(false, new Error('TorrServer files timeout'));
            }, FILE_REQUEST_TIMEOUT);

            try {
                Lampa.Torserver.files(hash, function(response) {
                    var files = response && (response.file_stats || response.files);

                    if (!files || !files.length) {
                        finish(false, new Error('Torrent files are not ready'));
                        return;
                    }

                    finish(true, {
                        hash: t(response.hash) || hash,
                        files: files
                    });
                }, function(err) {
                    finish(false, err || new Error('TorrServer files error'));
                });
            } catch (e) {
                finish(false, e);
            }
        });
    }

    function waitForFiles(hash, token, attempts) {
        var current = 0;
        var lastError = null;

        function next() {
            if (isCancelled(token)) {
                return Promise.reject(cancelledError());
            }

            current++;

            return getFilesOnce(hash, token).catch(function(error) {
                lastError = error;

                if (error && error.cancelled) throw error;
                if (current >= attempts) throw lastError;

                return delay(FILE_RETRY_DELAY, token).then(next);
            });
        }

        return next();
    }

    function addTorrent(record, token) {
        return new Promise(function(resolve, reject) {
            var link = magnetFor(record);

            if (!link) {
                reject(new Error('No magnet or valid infohash'));
                return;
            }

            if (isCancelled(token)) {
                reject(cancelledError());
                return;
            }

            var finished = false;

            function finish(ok, value) {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);

                if (isCancelled(token)) {
                    reject(cancelledError());
                    return;
                }

                if (ok) resolve(value);
                else reject(value instanceof Error ? value : new Error(t(value) || 'Cannot add torrent'));
            }

            var timeout = setTimeout(function() {
                finish(false, new Error('TorrServer add timeout'));
            }, ADD_TORRENT_TIMEOUT);

            try {
                Lampa.Torserver.hash({
                    title: t(record.torrent_title) || 'Continue watching',
                    link: link,
                    poster: '',
                    data: {
                        lampa: true,
                        movie: record.card || {}
                    }
                }, function(result) {
                    var hash = t(result && result.hash);

                    if (hash) finish(true, hash);
                    else finish(false, new Error('TorrServer did not return hash'));
                }, function(err) {
                    finish(false, err || new Error('Cannot add torrent'));
                });
            } catch (e) {
                finish(false, e);
            }
        });
    }

    function loadTorrent(record, token) {
        var hash = t(record.infohash).toUpperCase();

        function restore() {
            return addTorrent(record, token).then(function(newHash) {
                return waitForFiles(
                    t(newHash).toUpperCase(),
                    token,
                    RESTORED_HASH_ATTEMPTS
                );
            });
        }

        if (!hash) return restore();

        return waitForFiles(hash, token, EXISTING_HASH_ATTEMPTS).catch(function(error) {
            if (error && error.cancelled) throw error;
            return restore();
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
        var timeline = null;

        try {
            if (Lampa.Timeline && Lampa.Timeline.view && hash) {
                timeline = Lampa.Timeline.view(hash);
            }
        } catch (e) {}

        // Do not create a stripped copy here.
        // Android.openPlayer keeps this object and later calls timeline.handler
        // when Vimu returns the final position.
        if (!timeline || typeof timeline !== 'object') {
            timeline = {
                hash: hash,
                time: 0,
                duration: 0,
                percent: 0
            };
        }

        timeline.hash = t(timeline.hash) || hash;
        timeline.time = n(timeline.time);
        timeline.duration = n(timeline.duration);
        timeline.percent = n(timeline.percent) ||
            (timeline.duration ? timeline.time / timeline.duration * 100 : 0);

        // Fallback for builds where view() did not provide a handler.
        if (typeof timeline.handler !== 'function' &&
            Lampa.Timeline && typeof Lampa.Timeline.update === 'function') {

            timeline.handler = function(percent, time, duration) {
                Lampa.Timeline.update({
                    hash: timeline.hash,
                    percent: n(percent),
                    time: n(time),
                    duration: n(duration)
                });
            };
        }

        return timeline;
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
                // Keep the native TorrServer URL untouched.
                // Lampa.Player itself converts &preload to &play for an
                // external Android player.
                url = Lampa.Torserver.stream(file.path, hash, file.id);
            } catch (e) {}

            return Object.assign({}, file, {
                card: card,
                title: t(file.title || file.path_human || file.path.split('/').pop()),
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
            normalizeTorrentPlayerData(data);

            Lampa.Player.play(data);

            if (Lampa.Player.playlist) {
                Lampa.Player.playlist(
                    data.playlist || normalized
                );
            }
        } catch (e) {
            throw e;
        }
    }

    function stopResumeLoading(job) {
        if (!job || !job.loading) return;

        job.loading = false;

        try {
            if (Lampa.Loading && Lampa.Loading.stop) {
                Lampa.Loading.stop();
            }
        } catch (e) {}
    }

    function cancelResume(job) {
        if (!job || job.cancelled) return;

        job.cancelled = true;

        (job.timers || []).forEach(function(timer) {
            clearTimeout(timer);
        });

        try {
            if (Lampa.Torserver && Lampa.Torserver.clear) {
                Lampa.Torserver.clear();
            }
        } catch (e) {}

        stopResumeLoading(job);

        if (runtime.resumeJob === job) {
            runtime.resumeJob = null;
        }
    }

    function resume(card) {
        var stored = get(card);
        if (!stored) return;

        // Work on a copy. Do not place the entire card in persistent history.
        var record = Object.assign({}, stored, {card: card});

        if (runtime.resumeJob) {
            cancelResume(runtime.resumeJob);
        }

        var job = {
            cancelled: false,
            loading: false,
            timers: []
        };

        runtime.resumeJob = job;

        if (Lampa.Loading && Lampa.Loading.start) {
            job.loading = true;

            // Back now cancels the actual TorrServer request/retry loop.
            Lampa.Loading.start(function() {
                cancelResume(job);
            }, 'Загрузка раздачи');
        }

        loadTorrent(record, job).then(function(result) {
            if (isCancelled(job)) throw cancelledError();

            var hash = t(result.hash).toUpperCase();

            return new Promise(function(resolve) {
                if (isCancelled(job)) {
                    resolve([]);
                    return;
                }

                if (Lampa.Storage.field('torrserver_tracktimecode') !== true) {
                    resolve([]);
                    return;
                }

                var settled = false;

                function done(items) {
                    if (settled) return;
                    settled = true;
                    resolve(Array.isArray(items) ? items : []);
                }

                // Do not let an optional /viewed request block playback.
                var viewedTimeout = setTimeout(function() {
                    done([]);
                }, 3000);
                job.timers.push(viewedTimeout);

                serverViewed.list(hash, function(items) {
                    clearTimeout(viewedTimeout);
                    done(items);
                }, function() {
                    clearTimeout(viewedTimeout);
                    done([]);
                });
            }).then(function(viewed) {
                if (isCancelled(job)) throw cancelledError();

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
                    timeline_hash: t(item.timeline && item.timeline.hash),
                    season: n(item.season),
                    episode: n(item.episode),
                    time: time,
                    duration: n(item.timeline.duration),
                    percent: target.completed
                        ? 0
                        : (n(item.timeline.duration)
                            ? time / n(item.timeline.duration) * 100
                            : n(record.percent))
                });

                if (isCancelled(job)) throw cancelledError();

                // Restore the normal Lampa controller before handing off to Vimu.
                stopResumeLoading(job);

                if (runtime.resumeJob === job) {
                    runtime.resumeJob = null;
                }

                launchVimu(item, playlist, time);
            });
        }).catch(function(error) {
            if (error && error.cancelled) return;

            console.error('[ContinueTorrent v2.1]', error);

            if (Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show('Не удалось открыть сохранённую раздачу');
            }
        }).then(function() {
            stopResumeLoading(job);

            if (runtime.resumeJob === job) {
                runtime.resumeJob = null;
            }
        }, function() {
            stopResumeLoading(job);

            if (runtime.resumeJob === job) {
                runtime.resumeJob = null;
            }
        });
    }

    function captureTorrentFile(event) {
        if (!event || event.type !== 'onenter' || !event.element) return;

        var item = event.element;
        var active = (Lampa.Activity && Lampa.Activity.active)
            ? (Lampa.Activity.active() || {})
            : {};

        var card = item.card ||
            (event.params && event.params.movie) ||
            active.movie ||
            active.card;

        if (!card) return;

        var hash = t(item.torrent_hash || item.infohash ||
                     (item.torrent && item.torrent.hash));

        if (!hash || !item.path) return;

        // Current Lampa sends the raw torrent file array in event.params.files.
        var allFiles =
            (event.params && event.params.files) ||
            event.items ||
            item.files ||
            [];

        var parsed = parseFile(card, allFiles, item);
        var timeline = item.timeline || getTimeline(parsed.timelineHash);
        var old = get(card) || {};

        var session = {
            card: card,
            timeline_hash: t(timeline.hash) || parsed.timelineHash,
            infohash: hash.toUpperCase(),
            magnet: t(item.magnet || item.torrent_magnet) || t(old.magnet),
            torrent_title: t(item.torrent_title || item.title || item.path_human) || t(old.torrent_title),
            file_index: item.id,
            file_path: t(item.path),
            timeline_hash: t(timeline.hash) || parsed.timelineHash,
            season: n(item.season) || parsed.season,
            episode: n(item.episode) || parsed.episode,
            time: n(timeline.time),
            duration: n(timeline.duration),
            percent: n(timeline.percent)
        };

        runtime.session = session;
        put(card, session);
        refreshCurrentButton(card);
        startTimelinePoller();
    }

    function timelineUpdate(event) {
        if (!event) return;

        var data = event.data || event;
        var timeline = data.road || data.timeline || data;
        if (!timeline) return;

        var eventHash = t(data.hash || timeline.hash);
        if (!eventHash) return;

        var sessionHash =
            runtime.session
                ? t(runtime.session.timeline_hash)
                : '';

        // If an active session exists for another file, still allow the
        // persistent-history lookup below to process this hash.
        if (sessionHash && eventHash === sessionHash) {
            runtime.session.time = n(timeline.time);
            runtime.session.duration = n(timeline.duration);
            runtime.session.percent =
                timeline.percent !== undefined
                    ? n(timeline.percent)
                    : (runtime.session.duration
                        ? runtime.session.time /
                          runtime.session.duration * 100
                        : 0);

            runtime.lastSave = Date.now();
        }

        applyTimelineRoad(eventHash, timeline);

        if (runtime.session &&
            eventHash === t(runtime.session.timeline_hash) &&
            Lampa.Storage.field('torrserver_tracktimecode') === true &&
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

        // Player.listener "create" is synchronous and runs before
        // Lampa launches the external Android player. Mutating this object
        // here fixes preload/play URL divergence in the actual launch data.
        normalizeTorrentPlayerData(data);

        var card = data.card;
        if (!card) return;

        var hash = t(data.torrent_hash || data.infohash);
        if (!hash) return;

        var parsed = parseFile(card, data.files || [], data);
        var old = get(card) || {};
        var timeline = data.timeline || {};

        runtime.session = {
            card: card,
            timeline_hash: t(timeline.hash) ||
                           t(old.timeline_hash) ||
                           parsed.timelineHash,
            infohash: hash.toUpperCase(),
            magnet: t(data.magnet) || t(old.magnet),
            torrent_title: t(data.torrent_title || data.title) ||
                           t(old.torrent_title),
            file_index:
                data.id !== undefined
                    ? data.id
                    : data.file_index,
            file_path: t(data.path || data.file_path),
            season: n(data.season) || parsed.season,
            episode: n(data.episode) || parsed.episode,
            time: n(timeline.time),
            duration: n(timeline.duration),
            percent: n(timeline.percent)
        };

        put(card, runtime.session);
        refreshCurrentButton(card);
        startTimelinePoller();
    }

    function playerDestroy() {
        if (!runtime.session) return;

        put(runtime.session.card, runtime.session);
        refreshCurrentButton(runtime.session.card);

        if (Lampa.Storage.field('torrserver_tracktimecode') === true) {
            serverViewed.set(
                runtime.session.infohash,
                runtime.session.file_index,
                runtime.session.time
            );
        }

        // Do not clear runtime.session here.
        // Some external-player flows deliver the final Timeline.update
        // after the destroy notification.
        scheduleTimelineSync();
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
                ? ep + ' • ' + formatTime(record.time)
                : formatTime(record.time);
        }

        if (done) return 'Продолжить просмотр';
        return formatTime(record.time);
    }

    function refreshCurrentButton(card) {
        var event = runtime.currentFull;
        if (!event || !card) return;

        var currentCard = event.data && event.data.movie;
        if (!currentCard || cardIdentity(currentCard) !== cardIdentity(card)) return;

        var root = rootFor(event);
        if (!root) return;

        var record = get(currentCard);
        var button = root.find('.view--continue-torrent-v2').first();

        if (!record || !button.length) return;

        var label = labelFor(currentCard, record);
        button.find('span').text(
            label ? 'Продолжить • ' + label : 'Продолжить'
        );
    }

    function renderButton(label) {
        return '<div class="full-start__button selector view--continue-torrent-v2">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M8 5.5v13L18.5 12 8 5.5z"></path>' +
            '</svg>' +
            '<span>' + (label ? 'Продолжить • ' + label : 'Продолжить') + '</span>' +
            '</div>';
    }

    function cleanupButtonGuard() {
        if (runtime.buttonObserver) {
            try {
                runtime.buttonObserver.disconnect();
            } catch (e) {}

            runtime.buttonObserver = null;
        }

        if (runtime.buttonGuardStart &&
            runtime.buttonGuardModule &&
            typeof runtime.buttonGuardStart.unuse === 'function') {

            try {
                runtime.buttonGuardStart.unuse(
                    runtime.buttonGuardModule
                );
            } catch (e) {}
        }

        runtime.buttonGuardStart = null;
        runtime.buttonGuardModule = null;
    }

    function ensureContinueFirst(container, button) {
        if (!container || !container.length ||
            !button || !button.length) {
            return;
        }

        var first = container.children().first();

        if (!first.length || first[0] !== button[0]) {
            container.prepend(button);
        }
    }

    function installButtonFirstGuard(event, container, button) {
        cleanupButtonGuard();

        var guard = function() {
            ensureContinueFirst(container, button);
        };

        // Current Lampa runs groupButtons immediately after full:complite.
        // The built-in Buttons module can prepend .button--priority there.
        // Appending our module makes our handlers run after the built-in one,
        // but still before Controller.collectionSet().
        var fullComponent = event && event.link;
        var startComponent =
            fullComponent &&
            fullComponent.items &&
            fullComponent.items[0];

        if (startComponent &&
            typeof startComponent.use === 'function') {

            var module = {
                onPriorityButton: guard,
                onGroupButtons: guard
            };

            try {
                startComponent.use(module);
                runtime.buttonGuardStart = startComponent;
                runtime.buttonGuardModule = module;
            } catch (e) {}
        }

        // Fallback for themes/plugins that reorder buttons directly in DOM.
        if (typeof MutationObserver !== 'undefined' &&
            container[0]) {

            runtime.buttonObserver =
                new MutationObserver(function() {
                    guard();
                });

            runtime.buttonObserver.observe(
                container[0],
                {childList: true}
            );
        }

        guard();
        setTimeout(guard, 0);
        setTimeout(guard, 100);
        setTimeout(guard, 500);
    }

    function onFull(event) {
        if (!event || event.type !== 'complite') return;

        runtime.currentFull = event;

        var card = event.data && event.data.movie;
        if (!card) return;

        var root = rootFor(event);
        if (!root) return;

        cleanupButtonGuard();
        root.find('.view--continue-torrent-v2').remove();

        // Pull the newest value from Lampa's own timeline before drawing.
        syncTimelineForCard(card);

        var record = get(card);
        if (!record) return;

        var button = $(renderButton(labelFor(card, record)));

        button.on('hover:enter', function() {
            resume(card);
        });

        var container = root.find(
            '.full-start-new__buttons, .full-start__buttons'
        ).last();

        if (container.length) {
            container.prepend(button);
            installButtonFirstGuard(
                event,
                container,
                button
            );
            return;
        }

        // Legacy / custom layout fallback.
        var firstKnown = root.find(
            '.view--torrent, .view--online, .full-start__button'
        ).first();

        if (firstKnown.length &&
            firstKnown.parent().length) {

            container = firstKnown.parent();
            container.prepend(button);

            installButtonFirstGuard(
                event,
                container,
                button
            );
        }
    }

    function init() {
        load();

        installTimelineUpdateHook();
        startTimelinePoller();

        if (Lampa.Listener) {
            Lampa.Listener.follow('full', onFull);
            Lampa.Listener.follow('torrent_file', captureTorrentFile);
            Lampa.Listener.follow('state:changed', timelineStateChanged);
        }

        if (Lampa.Timeline && Lampa.Timeline.listener) {
            Lampa.Timeline.listener.follow('update', timelineUpdate);
        }

        if (Lampa.Player && Lampa.Player.listener) {
            Lampa.Player.listener.follow('create', playerCreate);
            Lampa.Player.listener.follow('destroy', playerDestroy);

            Lampa.Player.listener.follow('external', function(event) {
                // Current Player sends raw play data for "external".
                var data =
                    event && event.data
                        ? event.data
                        : event;

                if (data && data.card) {
                    playerCreate({data: data});
                }

                // On return from Vimu the native client updates Timeline.
                // The delayed reads make the button resilient to event order.
                scheduleTimelineSync();
            });
        }

        if (typeof window !== 'undefined' &&
            window.addEventListener) {

            window.addEventListener(
                'focus',
                scheduleTimelineSync
            );
        }

        if (typeof document !== 'undefined' &&
            document.addEventListener) {

            document.addEventListener(
                'visibilitychange',
                function() {
                    if (!document.hidden) {
                        scheduleTimelineSync();
                    }
                }
            );
        }

        console.log(
            '[ContinueTorrent v2.4] Lampa + TorrServer + Vimu ready'
        );
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
