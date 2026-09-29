/*
 * Lampa Continue Torrent — V2
 * Lampa + TorrServer + Vimu
 * Version: 2.3.11
 */
(function () {
    'use strict';

    if (window.__lampa_continue_torrent_v2) return;
    window.__lampa_continue_torrent_v2 = true;

    var STORAGE = 'lampa_continue_torrent_v2';
    var NATIVE_PENDING_STORAGE = 'lampa_continue_torrent_v2_native_pending';
    var NATIVE_PENDING_MAX_AGE = 6 * 60 * 60 * 1000;
    var NATIVE_RECOVERY_DELAYS = [250, 1000, 2500, 5000, 9000];
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
        buttonGuardModule: null,
        nativeTimelineMap: {},
        externalActive: false,
        buttonRestoreTimer: null,
        nativeLaunch: null,
        lastTimelineEventAt: 0,
        nativeRecoveryToken: 0,
        nativeRecoveryNoticeShown: false
    };

    function debugEnabled() {
        try {
            return window.LAMPA_CONTINUE_TORRENT_DEBUG === true ||
                localStorage.getItem('lampa_continue_torrent_debug') === 'true';
        } catch (e) {
            return false;
        }
    }

    function debug() {
        if (!debugEnabled() || !window.console || !console.log) return;

        var args = Array.prototype.slice.call(arguments);
        args.unshift('[ContinueTorrent v2.3.11]');

        try {
            console.log.apply(console, args);
        } catch (e) {}
    }

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

    function cardKeys(card) {
        if (!card) return [];

        var keys = [];
        var source = t(card.source) || 'tmdb';

        function add(key) {
            key = t(key);

            if (key && keys.indexOf(key) < 0) {
                keys.push(key);
            }
        }

        // Canonical provider IDs do not depend on the transient activity source.
        if (card.tmdb_id) {
            add('tmdb:' + card.tmdb_id);
        }

        if (source === 'tmdb' && card.id) {
            add('tmdb:' + card.id);
        }

        if (card.imdb_id) {
            add('imdb:' + card.imdb_id);
        }

        if (card.kinopoisk_id) {
            add('kinopoisk:' + card.kinopoisk_id);
            add('kp:' + card.kinopoisk_id);
        }

        if (card.id) {
            add(source + ':' + card.id);

            // Full-card objects commonly keep the TMDB id in `id`
            // even when another activity temporarily changes `source`.
            add('tmdb:' + card.id);
        }

        // Legacy v2.3.x key, kept for automatic migration.
        var legacyId =
            card.tmdb_id ||
            (source === 'tmdb' ? card.id : '') ||
            card.imdb_id ||
            card.kinopoisk_id ||
            card.id;

        if (legacyId) {
            add(source + ':' + legacyId);
        }

        return keys;
    }

    function cardIdentity(card) {
        var keys = cardKeys(card);
        return keys.length ? keys[0] : '';
    }

    function historyEntry(card) {
        var keys = cardKeys(card);

        for (var i = 0; i < keys.length; i++) {
            if (runtime.history[keys[i]]) {
                return {
                    key: keys[i],
                    record: runtime.history[keys[i]]
                };
            }
        }

        // Last-resort migration for an old source-prefixed key:
        // only use a suffix match when it is unambiguous.
        var ids = [];

        [
            card && card.tmdb_id,
            card && card.imdb_id,
            card && card.kinopoisk_id,
            card && card.id
        ].forEach(function(id) {
            id = t(id);

            if (id && ids.indexOf(id) < 0) {
                ids.push(id);
            }
        });

        var matches = [];

        Object.keys(runtime.history).forEach(function(key) {
            for (var j = 0; j < ids.length; j++) {
                if (key.slice(-(ids[j].length + 1)) === ':' + ids[j]) {
                    matches.push(key);
                    break;
                }
            }
        });

        if (matches.length === 1) {
            return {
                key: matches[0],
                record: runtime.history[matches[0]]
            };
        }

        return null;
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(n(seconds)));
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h) return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        return m + ':' + String(s).padStart(2,'0');
    }

    function episodeText(s, e, card) {
        s = n(s);
        e = n(e);

        if (!s || !e) return '';

        var oneSeason =
            card &&
            n(card.number_of_seasons) === 1;

        if (oneSeason) {
            return 'Серия ' + e;
        }

        return 'Сезон ' + s + ' · Серия ' + e;
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

    function compactCard(card) {
        card = card || {};

        return {
            id: card.id,
            tmdb_id: card.tmdb_id,
            imdb_id: card.imdb_id,
            kinopoisk_id: card.kinopoisk_id,
            source: card.source,
            title: card.title,
            name: card.name,
            original_title: card.original_title,
            original_name: card.original_name,
            number_of_seasons: card.number_of_seasons,
            media_type: card.media_type,
            type: card.type,
            release_date: card.release_date,
            first_air_date: card.first_air_date
        };
    }

    function androidClientVersion() {
        try {
            if (window.AndroidJS &&
                typeof window.AndroidJS.appVersion === 'function') {
                return t(window.AndroidJS.appVersion());
            }
        } catch (e) {}

        return '';
    }

    function versionAtLeast(version, minimum) {
        version = t(version).split('-')[0];
        minimum = t(minimum).split('-')[0];

        var a = version.split('.').map(n);
        var b = minimum.split('.').map(n);
        var len = Math.max(a.length, b.length);

        for (var i = 0; i < len; i++) {
            var av = a[i] || 0;
            var bv = b[i] || 0;

            if (av > bv) return true;
            if (av < bv) return false;
        }

        return true;
    }

    function supportsNativeStateResume() {
        var version = androidClientVersion();

        // Current Android clients expose appVersion() and persist
        // PlayerStateManager state. Use the native state only on the
        // modern client where this behavior is known to exist.
        return Boolean(
            version &&
            versionAtLeast(version, '1.12.8')
        );
    }

    function loadNativePending() {
        try {
            var value =
                Lampa.Storage.get(
                    NATIVE_PENDING_STORAGE,
                    null
                );

            return value &&
                typeof value === 'object'
                    ? value
                    : null;
        } catch (e) {
            return null;
        }
    }

    function saveNativePending(value) {
        try {
            Lampa.Storage.set(
                NATIVE_PENDING_STORAGE,
                value || null,
                true
            );
        } catch (e) {}
    }

    function clearNativePending(reason) {
        var pending = loadNativePending();

        if (pending) {
            debug(
                'native pending cleared',
                reason || '',
                pending.timeline_hash,
                pending.file_index
            );
        }

        saveNativePending(null);
    }

    function nativePendingMatches(hash, pending) {
        pending = pending || loadNativePending();

        return Boolean(
            pending &&
            t(hash) &&
            t(pending.timeline_hash) === t(hash)
        );
    }

    function markNativeResultResolved(hash, source) {
        var pending = loadNativePending();

        if (!nativePendingMatches(hash, pending)) {
            return;
        }

        var card = pending.card;
        var record = card ? get(card) : null;

        if (record) {
            put(card, {
                time_untrusted: false,
                native_state_pending: false,
                native_pending_since: 0
            });
        }

        clearNativePending(
            source || 'timeline result'
        );
    }

    function showKeepConnectionHelp(pending) {
        if (runtime.nativeRecoveryNoticeShown) return;

        runtime.nativeRecoveryNoticeShown = true;

        var version = androidClientVersion();
        var oldClient =
            version &&
            !versionAtLeast(version, '1.12.8');

        var message = oldClient
            ? 'Lampa была перезапущена во время Vimu, поэтому новый тайм-код не дошёл до плагина. ' +
              'Обновите Android-клиент Lampa минимум до 1.12.8.'
            : 'Lampa была перезапущена во время Vimu, поэтому новый тайм-код не дошёл до плагина. ' +
              'На Android TV удерживайте кнопку «Назад», откройте нативное меню Lampa и выберите ' +
              '«Включить удержание сокета». После этого Vimu сможет вернуть позицию без перезапуска WebView.';

        if (Lampa.Noty && Lampa.Noty.show) {
            Lampa.Noty.show(message);
        }

        debug(
            'native callback lost after WebView restart',
            'android_client=', version || 'unknown',
            'timeline=', pending && pending.timeline_hash,
            'file=', pending && pending.file_index
        );
    }

    function markPendingTimeUntrusted(pending) {
        if (!pending || !pending.card) return;

        var record = get(pending.card);
        if (!record) return;

        put(pending.card, {
            time_untrusted: true,
            native_state_pending: true,
            native_pending_since: n(pending.started_at)
        });

        refreshCurrentButton(pending.card);
    }

    function nativeRecoveryChanged(timeline, pending) {
        if (!timeline || !pending) return false;

        var time = n(timeline.time);
        var duration = n(timeline.duration);
        var updated = n(timeline.updated);

        if (Math.abs(time - n(pending.time_before)) >= 1) {
            return true;
        }

        if (duration &&
            n(pending.duration_before) &&
            Math.abs(duration - n(pending.duration_before)) >= 1) {
            return true;
        }

        if (updated &&
            n(pending.timeline_updated_before) &&
            updated > n(pending.timeline_updated_before)) {
            return true;
        }

        return false;
    }

    function tryRecoverFromTimeline(pending) {
        if (!pending ||
            !pending.timeline_hash ||
            !Lampa.Timeline ||
            typeof Lampa.Timeline.view !== 'function') {
            return false;
        }

        try {
            var timeline =
                Lampa.Timeline.view(
                    pending.timeline_hash
                );

            if (!nativeRecoveryChanged(
                timeline,
                pending
            )) {
                return false;
            }

            applyTimelineRoad(
                pending.timeline_hash,
                timeline,
                {
                    updated:
                        n(timeline.updated) ||
                        Date.now(),
                    source:
                        'native restart recovery'
                }
            );

            if (pending.card) {
                put(pending.card, {
                    time_untrusted: false,
                    native_state_pending: false,
                    native_pending_since: 0
                });

                refreshCurrentButton(
                    pending.card
                );
            }

            clearNativePending(
                'recovered from Timeline after restart'
            );

            return true;
        }
        catch (e) {
            return false;
        }
    }

    function tryRecoverFromTorrServer(pending, done) {
        if (!pending ||
            !pending.torrent_hash ||
            pending.file_index === undefined ||
            pending.file_index === '') {
            done(false);
            return;
        }

        var finished = false;

        function finish(value) {
            if (finished) return;
            finished = true;
            done(Boolean(value));
        }

        var timer = setTimeout(function() {
            finish(false);
        }, 2500);

        try {
            serverViewed.list(
                pending.torrent_hash,
                function(items) {
                    clearTimeout(timer);

                    items =
                        Array.isArray(items)
                            ? items
                            : [];

                    var item = items.find(function(row) {
                        return String(row.file_index) ===
                            String(pending.file_index);
                    });

                    var serverTime =
                        n(item && item.timecode);

                    if (!serverTime ||
                        Math.abs(
                            serverTime -
                            n(pending.time_before)
                        ) < 1) {
                        finish(false);
                        return;
                    }

                    var duration =
                        n(pending.duration_before);

                    var percent =
                        duration
                            ? Math.min(
                                100,
                                serverTime /
                                duration * 100
                            )
                            : n(
                                pending.percent_before
                            );

                    if (pending.card) {
                        put(pending.card, {
                            infohash:
                                pending.torrent_hash,
                            file_index:
                                pending.file_index,
                            file_path:
                                pending.file_path,
                            timeline_hash:
                                pending.timeline_hash,
                            timeline_updated:
                                Date.now(),
                            season:
                                pending.season,
                            episode:
                                pending.episode,
                            time:
                                serverTime,
                            duration:
                                duration,
                            percent:
                                percent,
                            time_untrusted:
                                false,
                            native_state_pending:
                                false,
                            native_pending_since:
                                0
                        });

                        refreshCurrentButton(
                            pending.card
                        );
                    }

                    clearNativePending(
                        'recovered from TorrServer viewed'
                    );

                    debug(
                        'native restart recovered from TorrServer',
                        'time=', serverTime,
                        'file=', pending.file_index
                    );

                    finish(true);
                },
                function() {
                    clearTimeout(timer);
                    finish(false);
                }
            );
        }
        catch (e) {
            clearTimeout(timer);
            finish(false);
        }
    }

    function recoverNativePending() {
        var pending = loadNativePending();

        if (!pending) return;

        var age =
            Date.now() -
            n(pending.started_at);

        if (age < 0 ||
            age > NATIVE_PENDING_MAX_AGE) {
            clearNativePending(
                'expired'
            );
            return;
        }

        runtime.nativeLaunch =
            Object.assign(
                {},
                pending
            );

        var token =
            ++runtime.nativeRecoveryToken;

        debug(
            'recovering unfinished external playback',
            'android_client=',
            androidClientVersion() || 'unknown',
            'timeline=',
            pending.timeline_hash,
            'file=',
            pending.file_index,
            'time_before=',
            pending.time_before,
            'age_ms=',
            age
        );

        NATIVE_RECOVERY_DELAYS.forEach(
            function(wait, index) {
                setTimeout(function() {
                    if (token !==
                        runtime.nativeRecoveryToken) {
                        return;
                    }

                    var current =
                        loadNativePending();

                    if (!current ||
                        !nativePendingMatches(
                            pending.timeline_hash,
                            current
                        )) {
                        return;
                    }

                    if (tryRecoverFromTimeline(
                        current
                    )) {
                        return;
                    }

                    if (index !==
                        NATIVE_RECOVERY_DELAYS.length - 1) {
                        return;
                    }

                    tryRecoverFromTorrServer(
                        current,
                        function(recovered) {
                            if (recovered) return;

                            var latest =
                                loadNativePending();

                            if (!latest ||
                                !nativePendingMatches(
                                    pending.timeline_hash,
                                    latest
                                )) {
                                return;
                            }

                            // We know the old number is stale, but the JS
                            // process never received Vimu's actual position.
                            // Hide the stale time rather than lie to the user.
                            markPendingTimeUntrusted(
                                latest
                            );

                            showKeepConnectionHelp(
                                latest
                            );
                        }
                    );
                }, wait);
            }
        );
    }

    function get(card) {
        var found = historyEntry(card);
        if (!found) return null;

        var canonical = cardIdentity(card);

        if (canonical &&
            found.key !== canonical &&
            !runtime.history[canonical]) {

            runtime.history[canonical] = found.record;
            delete runtime.history[found.key];
            save();

            debug(
                'history key migrated',
                found.key,
                '->',
                canonical
            );

            return runtime.history[canonical];
        }

        return found.record;
    }

    function put(card, data) {
        var canonical = cardIdentity(card);
        if (!canonical) return;

        var found = historyEntry(card);
        var key = canonical;
        var old = found ? found.record : {};

        if (found &&
            found.key !== canonical &&
            !runtime.history[canonical]) {

            runtime.history[canonical] = found.record;
            delete runtime.history[found.key];
        }

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
            timeline_updated: n(take('timeline_updated', 0)),
            season: n(take('season', 0)),
            episode: n(take('episode', 0)),
            time: n(take('time', 0)),
            duration: n(take('duration', 0)),
            percent: n(take('percent', 0)),
            torrent_episode_count:
                n(take('torrent_episode_count', 0)),
            has_next_episode:
                take('has_next_episode', false) === true,
            next_season:
                n(take('next_season', 0)),
            next_episode:
                n(take('next_episode', 0)),
            is_last_torrent_episode:
                take('is_last_torrent_episode', false) === true,
            last_released_season:
                n(take('last_released_season', 0)),
            last_released_episode:
                n(take('last_released_episode', 0)),
            time_untrusted:
                take('time_untrusted', false) === true,
            native_state_pending:
                take('native_state_pending', false) === true,
            native_pending_since:
                n(take('native_pending_since', 0)),
            updated_at: Date.now()
        };

        save();
    }

    function applyTimelineRoad(hash, road, options) {
        hash = t(hash);
        options = options || {};

        if (!hash || !road) return false;

        var time = n(road.time);
        var duration = n(road.duration);
        var percent = road.percent !== undefined
            ? n(road.percent)
            : (duration ? time / duration * 100 : 0);

        var incomingUpdated =
            n(road.updated) ||
            n(options.updated) ||
            0;

        var changed = false;
        var sourceName =
            String(options.source || '');
        var isPassiveView =
            sourceName.indexOf('Timeline.view') === 0;

        function isStale(record) {
            if (!record) return false;

            var storedUpdated = n(record.timeline_updated);

            if (storedUpdated &&
                !incomingUpdated &&
                String(options.source || '').indexOf('Timeline.view') === 0) {
                return true;
            }

            return Boolean(
                incomingUpdated &&
                storedUpdated &&
                incomingUpdated < storedUpdated
            );
        }

        if (runtime.session &&
            t(runtime.session.timeline_hash) === hash &&
            !isStale(runtime.session)) {

            runtime.session.time = time;
            runtime.session.duration = duration;
            runtime.session.percent = percent;

            if (incomingUpdated) {
                runtime.session.timeline_updated = incomingUpdated;
            }

            if (!isPassiveView) {
                runtime.session.time_untrusted = false;
                runtime.session.native_state_pending = false;
                runtime.session.native_pending_since = 0;
            }

            put(runtime.session.card, runtime.session);
            refreshCurrentButton(runtime.session.card);
            changed = true;
        }

        Object.keys(runtime.history).forEach(function(key) {
            var record = runtime.history[key];

            if (!record ||
                t(record.timeline_hash) !== hash ||
                isStale(record)) {
                return;
            }

            if (runtime.session &&
                cardIdentity(runtime.session.card) === key &&
                t(runtime.session.timeline_hash) === hash) {
                return;
            }

            record.time = time;
            record.duration = duration;
            record.percent = percent;

            if (incomingUpdated) {
                record.timeline_updated = incomingUpdated;
            }

            if (!isPassiveView) {
                record.time_untrusted = false;
                record.native_state_pending = false;
                record.native_pending_since = 0;
            }

            record.updated_at = Date.now();
            changed = true;

            var currentCard =
                runtime.currentFull &&
                runtime.currentFull.data &&
                runtime.currentFull.data.movie;

            if (currentCard &&
                cardIdentity(currentCard) === key) {
                refreshCurrentButton(currentCard);
            }
        });

        if (changed) {
            save();

            if (!isPassiveView &&
                nativePendingMatches(hash)) {
                markNativeResultResolved(
                    hash,
                    sourceName || 'timeline update'
                );
            }

            debug(
                'timeline applied',
                hash,
                'time=', time,
                'duration=', duration,
                'percent=', percent,
                'updated=', incomingUpdated,
                options.source || ''
            );
        }

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

                return applyTimelineRoad(
                    record.timeline_hash,
                    timeline,
                    {
                        updated: n(timeline.updated),
                        source: 'Timeline.view(card)'
                    }
                );
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
                        timeline,
                        {
                            updated: n(timeline.updated),
                            source: 'Timeline.view(session)'
                        }
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
            if (runtime.session && !runtime.externalActive) {
                syncActiveTimeline();
            }
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

            runtime.lastTimelineEventAt = Date.now();

            try {
                if (params && params.hash) {
                    var current = Lampa.Timeline.view(params.hash);

                    applyTimelineRoad(
                        params.hash,
                        current || params,
                        {
                            updated: n(
                                current && current.updated
                                    ? current.updated
                                    : params.updated
                            ),
                            source: 'Timeline.update hook'
                        }
                    );
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

    function torrentUrlIdentity(url) {
        url = t(url);

        if (!url) return '';

        var playUrl = toPlayUrl(url);

        try {
            var parsed = new URL(
                playUrl,
                window.location && window.location.href
                    ? window.location.href
                    : undefined
            );

            var link = parsed.searchParams.get('link') || '';
            var index = parsed.searchParams.get('index') || '';

            if (link || index) {
                return [
                    t(link).toUpperCase(),
                    t(index),
                    parsed.pathname
                        .replace(/\/stream\/[^/]+$/i, '/stream')
                        .replace(/\/gst\/[^/]+\/master\.m3u8$/i, '/gst')
                ].join('|');
            }

            return parsed.origin +
                parsed.pathname +
                parsed.search
                    .replace(/([?&])preload(?=&|$)/, '$1play');
        }
        catch (e) {
            return playUrl
                .replace('&preload', '&play')
                .replace('?preload', '?play');
        }
    }

    function samePlaybackItem(a, b) {
        if (!a || !b) return false;

        if (a.id !== undefined &&
            b.id !== undefined &&
            String(a.id) === String(b.id)) {
            return true;
        }

        if (a.file_index !== undefined &&
            b.file_index !== undefined &&
            String(a.file_index) === String(b.file_index)) {
            return true;
        }

        if (a.path && b.path &&
            t(a.path) === t(b.path)) {
            return true;
        }

        if (a.file_path && b.file_path &&
            t(a.file_path) === t(b.file_path)) {
            return true;
        }

        var aKey = torrentUrlIdentity(a.url);
        var bKey = torrentUrlIdentity(b.url);

        return Boolean(
            aKey &&
            bKey &&
            aKey === bKey
        );
    }

    function addNativeUrlAliases(item, originalUrl) {
        if (!item || !item.url) return;

        var playUrl = toPlayUrl(item.url);
        var preloadUrl =
            playUrl.indexOf('&play') >= 0
                ? playUrl.replace('&play', '&preload')
                : playUrl;

        item.url = playUrl;

        // PlayerStateManager.isCurrentPlaybackItem() in the current Android
        // app also accepts any URL from `quality`.  Preserve real qualities
        // and add our aliases only under private keys.
        var quality =
            item.quality &&
            typeof item.quality === 'object' &&
            !Array.isArray(item.quality)
                ? item.quality
                : {};

        quality.__ctv_play = playUrl;

        if (preloadUrl !== playUrl) {
            quality.__ctv_preload = preloadUrl;
        }

        if (originalUrl &&
            t(originalUrl) !== playUrl &&
            t(originalUrl) !== preloadUrl) {
            quality.__ctv_original = t(originalUrl);
        }

        item.quality = quality;
    }

    function makeCurrentPlaylistItem(data) {
        var copy = {};

        [
            'id',
            'file_index',
            'path',
            'file_path',
            'title',
            'thumbnail',
            'season',
            'episode',
            'imdb_id',
            'subtitles',
            'segments',
            'torrent_hash'
        ].forEach(function(key) {
            if (data[key] !== undefined) {
                copy[key] = data[key];
            }
        });

        copy.url = toPlayUrl(data.url);
        copy.timeline = Object.assign(
            {},
            data.timeline || {}
        );

        if (data.quality &&
            typeof data.quality === 'object') {
            copy.quality = Object.assign(
                {},
                data.quality
            );
        }

        return copy;
    }

    function normalizeTorrentPlayerData(data) {
        if (!data || !data.torrent_hash) return data;

        var originalCurrentUrl = t(data.url);

        if (data.url) {
            data.url = toPlayUrl(data.url);
        }

        if (!Array.isArray(data.playlist)) {
            return data;
        }

        data.playlist.forEach(function(item) {
            if (!item || !item.url) return;

            var original = t(item.url);

            item.url = toPlayUrl(item.url);
            addNativeUrlAliases(
                item,
                original
            );
        });

        var current = data.playlist.find(function(item) {
            return samePlaybackItem(
                item,
                data
            );
        });

        // Some parser/plugins build an incomplete playlist.  If the current
        // file is absent, explicitly add it so Android can always resolve
        // currentIndex and later match Vimu's ActivityResult.
        if (!current && data.url) {
            current = makeCurrentPlaylistItem(data);
            addNativeUrlAliases(
                current,
                originalCurrentUrl
            );

            data.playlist.unshift(current);

            debug(
                'current item injected into playlist',
                fileIdentity(data),
                torrentUrlIdentity(data.url)
            );
        }

        if (current && current.url) {
            // Critical invariant: these two strings must be IDENTICAL.
            current.url = toPlayUrl(current.url);
            data.url = current.url;

            // Share the same timeline object as well. This prevents different
            // timeline hashes for the launch object and its playlist twin.
            if (current.timeline) {
                data.timeline = current.timeline;
            }

            addNativeUrlAliases(
                current,
                originalCurrentUrl
            );
        }

        // Also give the launch object the same URL aliases. Older Android
        // builds may serialize the current object instead of playlist item.
        addNativeUrlAliases(
            data,
            originalCurrentUrl
        );

        return data;
    }

    function localHash(input) {
        var str = String(input || '');
        var hash = 0;

        if (!str.length) return '0';

        for (var i = 0; i < str.length; i++) {
            var chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash = hash & hash;
        }

        return String(Math.abs(hash));
    }

    function fileIdentity(item) {
        if (!item) return '';

        return [
            item.id !== undefined
                ? item.id
                : (item.file_index !== undefined ? item.file_index : ''),
            t(item.path || item.file_path || item.title || item.url)
        ].join('|');
    }

    function stableTimelineHash(card, torrentHash, item) {
        var raw = [
            'continue-torrent-v233',
            cardIdentity(card),
            t(torrentHash).toUpperCase(),
            fileIdentity(item)
        ].join('|');

        try {
            if (Lampa.Utils &&
                typeof Lampa.Utils.hash === 'function') {
                return String(Lampa.Utils.hash(raw));
            }
        } catch (e) {}

        return localHash(raw);
    }

    function isValidTimelineHash(hash) {
        hash = t(hash);

        return Boolean(
            hash &&
            hash !== '0' &&
            hash !== 'undefined' &&
            hash !== 'null'
        );
    }

    function normalizeTimelineHashes(data) {
        if (!data) return;

        var card = data.card;
        var torrentHash = t(data.torrent_hash || data.infohash);
        var entries = [data];

        if (Array.isArray(data.playlist)) {
            data.playlist.forEach(function(item) {
                if (item) entries.push(item);
            });
        }

        var groups = {};

        entries.forEach(function(item) {
            var timeline = item && item.timeline;
            var hash = timeline ? t(timeline.hash) : '';
            var fid = fileIdentity(item);

            if (!hash) return;

            if (!groups[hash]) groups[hash] = {};
            groups[hash][fid] = true;
        });

        entries.forEach(function(item) {
            if (!item) return;

            if (!item.timeline ||
                typeof item.timeline !== 'object') {
                item.timeline = {};
            }

            var timeline = item.timeline;
            var oldHash = t(timeline.hash);
            var identities =
                oldHash && groups[oldHash]
                    ? Object.keys(groups[oldHash])
                    : [];

            var collision =
                oldHash &&
                identities.length > 1;

            var invalid =
                !isValidTimelineHash(oldHash);

            if (!invalid && !collision) return;

            var oldTime = n(timeline.time);
            var oldDuration = n(timeline.duration);
            var oldPercent = n(timeline.percent);

            var newHash = stableTimelineHash(
                card,
                torrentHash,
                item
            );

            var fresh = null;

            try {
                if (Lampa.Timeline &&
                    typeof Lampa.Timeline.view === 'function') {
                    fresh = Lampa.Timeline.view(newHash);
                }
            } catch (e) {}

            if (fresh && typeof fresh === 'object') {
                item.timeline = fresh;
                timeline = fresh;
            }

            timeline.hash = newHash;

            if (!n(timeline.time) && oldTime > 0) {
                timeline.time = oldTime;
            }

            if (!n(timeline.duration) && oldDuration > 0) {
                timeline.duration = oldDuration;
            }

            if (!n(timeline.percent) && oldPercent > 0) {
                timeline.percent = oldPercent;
            }

            debug(
                'timeline hash repaired',
                oldHash,
                '->',
                newHash,
                fileIdentity(item),
                collision ? 'collision' : 'invalid'
            );
        });

        if (Array.isArray(data.playlist)) {
            var current = data.playlist.find(function(item) {
                return fileIdentity(item) === fileIdentity(data);
            });

            if (current && current.timeline) {
                data.timeline = current.timeline;
            }
        }
    }

    function timelineMetaFromItem(data, item) {
        item = item || data;

        return {
            card: data.card || item.card,
            torrent_hash:
                t(item.torrent_hash ||
                  data.torrent_hash ||
                  item.infohash ||
                  data.infohash),
            magnet:
                t(item.magnet ||
                  data.magnet ||
                  item.torrent_magnet ||
                  data.torrent_magnet),
            torrent_title:
                t(item.torrent_title ||
                  data.torrent_title ||
                  item.title ||
                  data.title),
            file_index:
                item.id !== undefined
                    ? item.id
                    : (item.file_index !== undefined
                        ? item.file_index
                        : data.file_index),
            file_path:
                t(item.path ||
                  item.file_path ||
                  data.path ||
                  data.file_path),
            timeline_hash:
                t(item.timeline && item.timeline.hash),
            season:
                n(item.season) || n(data.season),
            episode:
                n(item.episode) || n(data.episode)
        };
    }

    function updateRecordFromNative(meta, percent, time, duration, source) {
        if (!meta || !meta.card) return;

        var now = Date.now();
        var stored = get(meta.card) || {};

        var safeTime = n(time);
        var safeDuration = n(duration);
        var safePercent =
            percent !== undefined && percent !== null
                ? n(percent)
                : (safeDuration
                    ? safeTime / safeDuration * 100
                    : n(stored.percent));

        var data = {
            infohash:
                t(meta.torrent_hash || stored.infohash).toUpperCase(),
            magnet:
                t(meta.magnet || stored.magnet),
            torrent_title:
                t(meta.torrent_title || stored.torrent_title),
            file_index:
                meta.file_index !== undefined
                    ? meta.file_index
                    : stored.file_index,
            file_path:
                t(meta.file_path || stored.file_path),
            timeline_hash:
                t(meta.timeline_hash || stored.timeline_hash),
            timeline_updated: now,
            season:
                n(meta.season) || n(stored.season),
            episode:
                n(meta.episode) || n(stored.episode),
            time: safeTime,
            duration: safeDuration,
            percent: safePercent,
            time_untrusted: false,
            native_state_pending: false,
            native_pending_since: 0
        };

        put(meta.card, data);

        if (runtime.session &&
            cardIdentity(runtime.session.card) ===
                cardIdentity(meta.card)) {

            runtime.session = Object.assign(
                {},
                runtime.session,
                data,
                {card: meta.card}
            );
        }

        refreshCurrentButton(meta.card);

        if (data.infohash &&
            data.file_index !== undefined &&
            data.file_index !== '') {

            try {
                // Plugin-owned backup. This is intentionally independent
                // of Lampa's global tracktimecode switch.
                serverViewed.set(
                    data.infohash,
                    data.file_index,
                    data.time
                );
            } catch (e) {}
        }

        if (data.timeline_hash) {
            markNativeResultResolved(
                data.timeline_hash,
                source || 'native callback'
            );
        }

        debug(
            'native time saved',
            source || '',
            data.timeline_hash,
            data.file_index,
            data.time,
            data.duration,
            data.percent
        );
    }

    function wrapTimelineHandler(data, item) {
        if (!item ||
            !item.timeline ||
            !item.timeline.hash) {
            return;
        }

        var timeline = item.timeline;
        var hash = t(timeline.hash);
        var meta = timelineMetaFromItem(data, item);

        runtime.nativeTimelineMap[hash] = meta;

        var currentHandler = timeline.handler;

        if (currentHandler &&
            currentHandler.__continueTorrentV233 === true) {
            return;
        }

        var originalHandler =
            typeof currentHandler === 'function'
                ? currentHandler
                : null;

        var wrapped = function(percent, time, duration) {
            var now = Date.now();

            try {
                if (originalHandler) {
                    originalHandler(
                        percent,
                        time,
                        duration
                    );
                }
                else if (Lampa.Timeline &&
                    typeof Lampa.Timeline.update === 'function') {

                    Lampa.Timeline.update({
                        hash: hash,
                        percent: n(percent),
                        time: n(time),
                        duration: n(duration)
                    });
                }
            }
            catch (e) {
                debug(
                    'original timeline handler failed',
                    e
                );
            }
            finally {
                updateRecordFromNative(
                    meta,
                    percent,
                    time,
                    duration,
                    'timeline.handler'
                );

                applyTimelineRoad(
                    hash,
                    {
                        hash: hash,
                        percent: n(percent),
                        time: n(time),
                        duration: n(duration),
                        updated: now
                    },
                    {
                        updated: now,
                        source: 'timeline.handler'
                    }
                );
            }
        };

        wrapped.__continueTorrentV233 = true;
        wrapped.__continueTorrentOriginal =
            originalHandler;

        timeline.handler = wrapped;
    }

    function prepareExternalTracking(data) {
        if (!data || !data.torrent_hash) return;

        // Vimu/MX-compatible contract: request playback result on exit.
        data.return_result = true;

        normalizeTorrentPlayerData(data);
        normalizeTimelineHashes(data);

        wrapTimelineHandler(data, data);

        if (Array.isArray(data.playlist)) {
            data.playlist.forEach(function(item) {
                wrapTimelineHandler(data, item);
            });
        }

        debug(
            'external tracking prepared',
            data.timeline && data.timeline.hash,
            Array.isArray(data.playlist)
                ? data.playlist.length
                : 0
        );
    }

    function installAndroidTimeCallHook() {
        if (!Lampa.Android ||
            typeof Lampa.Android.timeCall !== 'function' ||
            window.__lampa_continue_torrent_v233_android_hook) {
            return;
        }

        window.__lampa_continue_torrent_v233_android_hook = true;

        var originalTimeCall =
            Lampa.Android.timeCall;

        Lampa.Android.timeCall = function(timeline) {
            try {
                if (timeline && timeline.hash) {
                    var meta =
                        runtime.nativeTimelineMap[
                            t(timeline.hash)
                        ];

                    if (meta) {
                        updateRecordFromNative(
                            meta,
                            timeline.percent,
                            timeline.time,
                            timeline.duration,
                            'Android.timeCall'
                        );
                    }

                    debug(
                        'Android.timeCall',
                        timeline.hash,
                        timeline.time,
                        timeline.duration,
                        timeline.percent
                    );
                }
            }
            catch (e) {
                debug(
                    'Android.timeCall hook failed',
                    e
                );
            }

            return originalTimeCall.apply(
                this,
                arguments
            );
        };
    }

    function activeCardForPlayback(data) {
        if (data && (data.card || data.movie)) {
            return data.card || data.movie;
        }

        try {
            var active =
                Lampa.Activity &&
                Lampa.Activity.active
                    ? Lampa.Activity.active()
                    : null;

            if (active &&
                (active.card || active.movie)) {
                return active.card || active.movie;
            }
        }
        catch (e) {}

        return runtime.currentFull &&
            runtime.currentFull.data
                ? runtime.currentFull.data.movie
                : null;
    }

    function finalNativePayload(data, link) {
        if (!data || !data.torrent_hash) {
            return {
                link: link,
                data: data
            };
        }

        if (!data.card) {
            data.card = activeCardForPlayback(data);
        }

        if (!data.url && link) {
            data.url = link;
        }

        normalizeTorrentPlayerData(data);
        normalizeTimelineHashes(data);

        // Re-run after hash normalization so current data and playlist twin
        // share exactly the same final timeline object/hash.
        normalizeTorrentPlayerData(data);

        wrapTimelineHandler(data, data);

        if (Array.isArray(data.playlist)) {
            data.playlist.forEach(function(item) {
                wrapTimelineHandler(
                    data,
                    item
                );
            });
        }

        var current = null;

        if (Array.isArray(data.playlist)) {
            current = data.playlist.find(function(item) {
                return samePlaybackItem(
                    item,
                    data
                );
            });
        }

        if (current) {
            data.url = current.url;

            if (current.timeline) {
                data.timeline = current.timeline;
            }
        }

        var card =
            data.card ||
            activeCardForPlayback(data);

        var meta =
            timelineMetaFromItem(
                data,
                current || data
            );

        if (!meta.card) {
            meta.card = card;
        }

        var existingRecord =
            card ? get(card) : null;

        runtime.nativeLaunch = {
            started_at: Date.now(),
            card: meta.card || card,
            torrent_hash: t(data.torrent_hash).toUpperCase(),
            file_index: meta.file_index,
            file_path: meta.file_path,
            timeline_hash:
                t(
                    data.timeline &&
                    data.timeline.hash
                ),
            timeline_updated_before:
                n(
                    data.timeline &&
                    data.timeline.updated
                ) ||
                n(
                    existingRecord &&
                    existingRecord.timeline_updated
                ),
            time_before:
                n(
                    data.timeline &&
                    data.timeline.time
                ) ||
                n(
                    existingRecord &&
                    existingRecord.time
                ),
            duration_before:
                n(
                    data.timeline &&
                    data.timeline.duration
                ) ||
                n(
                    existingRecord &&
                    existingRecord.duration
                ),
            percent_before:
                n(
                    data.timeline &&
                    data.timeline.percent
                ) ||
                n(
                    existingRecord &&
                    existingRecord.percent
                ),
            season:
                n(meta.season) ||
                n(existingRecord && existingRecord.season),
            episode:
                n(meta.episode) ||
                n(existingRecord && existingRecord.episode),
            url: t(data.url),
            url_identity:
                torrentUrlIdentity(data.url),
            playlist_index:
                current && Array.isArray(data.playlist)
                    ? data.playlist.indexOf(current)
                    : -1,
            android_client:
                androidClientVersion()
        };

        saveNativePending({
            started_at:
                runtime.nativeLaunch.started_at,
            card:
                compactCard(
                    runtime.nativeLaunch.card
                ),
            torrent_hash:
                runtime.nativeLaunch.torrent_hash,
            file_index:
                runtime.nativeLaunch.file_index,
            file_path:
                runtime.nativeLaunch.file_path,
            timeline_hash:
                runtime.nativeLaunch.timeline_hash,
            timeline_updated_before:
                runtime.nativeLaunch.timeline_updated_before,
            time_before:
                runtime.nativeLaunch.time_before,
            duration_before:
                runtime.nativeLaunch.duration_before,
            percent_before:
                runtime.nativeLaunch.percent_before,
            season:
                runtime.nativeLaunch.season,
            episode:
                runtime.nativeLaunch.episode,
            url:
                runtime.nativeLaunch.url,
            url_identity:
                runtime.nativeLaunch.url_identity,
            playlist_index:
                runtime.nativeLaunch.playlist_index,
            android_client:
                runtime.nativeLaunch.android_client
        });

        debug(
            'FINAL Android payload',
            'file=', runtime.nativeLaunch.file_index,
            'timeline=', runtime.nativeLaunch.timeline_hash,
            'playlist_index=', runtime.nativeLaunch.playlist_index,
            'url=', runtime.nativeLaunch.url,
            'identity=', runtime.nativeLaunch.url_identity
        );

        return {
            link:
                data.url ||
                toPlayUrl(link),
            data: data
        };
    }

    function installAndroidOpenPlayerHook() {
        if (!Lampa.Android ||
            typeof Lampa.Android.openPlayer !== 'function' ||
            window.__lampa_continue_torrent_v235_openplayer_hook) {
            return;
        }

        window.__lampa_continue_torrent_v235_openplayer_hook = true;

        var originalOpenPlayer =
            Lampa.Android.openPlayer;

        Lampa.Android.openPlayer = function(link, data) {
            try {
                var finalPayload =
                    finalNativePayload(
                        data,
                        link
                    );

                link = finalPayload.link;
                data = finalPayload.data;
            }
            catch (e) {
                debug(
                    'Android.openPlayer finalization failed',
                    e
                );
            }

            return originalOpenPlayer.call(
                this,
                link,
                data
            );
        };
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

    function releasedEpisodeMeta(card) {
        card = card || {};

        var candidates = [
            card.last_episode_to_air,
            card.last_episode,
            card.last_aired_episode
        ];

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];

            if (!item) continue;

            var season =
                n(
                    item.season_number !== undefined
                        ? item.season_number
                        : item.season
                );

            var episode =
                n(
                    item.episode_number !== undefined
                        ? item.episode_number
                        : item.episode
                );

            if (season && episode) {
                return {
                    season: season,
                    episode: episode
                };
            }
        }

        // If TMDB gives the next scheduled episode but omits
        // last_episode_to_air, the previous episode in the same season
        // is the latest aired one.
        var next =
            card.next_episode_to_air ||
            card.next_episode;

        if (next) {
            var nextSeason =
                n(
                    next.season_number !== undefined
                        ? next.season_number
                        : next.season
                );

            var nextEpisode =
                n(
                    next.episode_number !== undefined
                        ? next.episode_number
                        : next.episode
                );

            if (nextSeason &&
                nextEpisode > 1) {
                return {
                    season: nextSeason,
                    episode: nextEpisode - 1
                };
            }
        }

        // Conservative fallback for completed/cancelled shows only.
        // For currently-airing shows episode_count can include episodes
        // which have not aired yet, so we deliberately do not use it.
        var status =
            t(card.status).toLowerCase();

        if (status === 'ended' ||
            status === 'canceled' ||
            status === 'cancelled') {

            var seasons =
                Array.isArray(card.seasons)
                    ? card.seasons.slice()
                    : [];

            seasons = seasons.filter(function(item) {
                var season =
                    n(
                        item &&
                        (
                            item.season_number !== undefined
                                ? item.season_number
                                : item.season
                        )
                    );

                return season > 0 &&
                    n(item && item.episode_count) > 0;
            });

            seasons.sort(function(a, b) {
                return n(
                    a.season_number !== undefined
                        ? a.season_number
                        : a.season
                ) -
                n(
                    b.season_number !== undefined
                        ? b.season_number
                        : b.season
                );
            });

            if (seasons.length) {
                var last =
                    seasons[
                        seasons.length - 1
                    ];

                return {
                    season:
                        n(
                            last.season_number !== undefined
                                ? last.season_number
                                : last.season
                        ),
                    episode:
                        n(last.episode_count)
                };
            }
        }

        return {
            season: 0,
            episode: 0
        };
    }

    function parsedEpisodeForPlaylist(
        card,
        playlist,
        item
    ) {
        var season = n(item && item.season);
        var episode = n(item && item.episode);

        if (season && episode) {
            return {
                season: season,
                episode: episode
            };
        }

        if (!item) {
            return {
                season: 0,
                episode: 0
            };
        }

        var parsed =
            parseFile(
                card,
                playlist || [],
                item
            );

        return {
            season:
                season || n(parsed.season),
            episode:
                episode || n(parsed.episode)
        };
    }

    function torrentEpisodeMeta(
        card,
        playlist,
        current
    ) {
        playlist =
            Array.isArray(playlist)
                ? playlist
                : [];

        var episodes = [];
        var seen = {};

        playlist.forEach(function(item) {
            if (!item) return;

            var parsed =
                parsedEpisodeForPlaylist(
                    card,
                    playlist,
                    item
                );

            if (!parsed.season ||
                !parsed.episode) {
                return;
            }

            var key =
                parsed.season +
                ':' +
                parsed.episode;

            if (seen[key]) return;

            seen[key] = true;

            episodes.push({
                season:
                    parsed.season,
                episode:
                    parsed.episode
            });
        });

        episodes.sort(function(a, b) {
            return a.season - b.season ||
                a.episode - b.episode;
        });

        var currentParsed =
            parsedEpisodeForPlaylist(
                card,
                playlist,
                current
            );

        var next = null;

        if (currentParsed.season &&
            currentParsed.episode) {

            for (var i = 0; i < episodes.length; i++) {
                var candidate = episodes[i];

                if (
                    candidate.season >
                        currentParsed.season ||
                    (
                        candidate.season ===
                            currentParsed.season &&
                        candidate.episode >
                            currentParsed.episode
                    )
                ) {
                    next = candidate;
                    break;
                }
            }
        }

        var currentIsKnown =
            Boolean(
                currentParsed.season &&
                currentParsed.episode
            );

        var last = episodes.length
            ? episodes[episodes.length - 1]
            : null;

        var isLast =
            Boolean(
                currentIsKnown &&
                last &&
                currentParsed.season ===
                    last.season &&
                currentParsed.episode ===
                    last.episode
            );

        // If episode parsing failed completely, we still know the number
        // of video entries in the playlist, but we do not guess which
        // episode number comes next.
        var count =
            episodes.length ||
            playlist.length;

        return {
            count: count,
            hasNext:
                Boolean(next),
            nextSeason:
                next ? next.season : 0,
            nextEpisode:
                next ? next.episode : 0,
            isLast:
                isLast
        };
    }

    function recordIsLastReleasedEpisode(
        card,
        record
    ) {
        if (!record) return false;

        var released =
            releasedEpisodeMeta(card);

        var lastSeason =
            released.season ||
            n(record.last_released_season);

        var lastEpisode =
            released.episode ||
            n(record.last_released_episode);

        return Boolean(
            lastSeason &&
            lastEpisode &&
            n(record.season) ===
                lastSeason &&
            n(record.episode) ===
                lastEpisode
        );
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

    function launchVimu(item, playlist, time, options) {
        options = options || {};
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

        if (options.nativeStateResume === true) {
            // Current Android Lampa can reopen its persisted
            // PlayerStateManager state for this card. This is the only
            // exact resume source available after the JS/WebView process
            // was recreated and therefore never received Vimu's callback.
            data.from_state = true;

            debug(
                'using native PlayerStateManager resume',
                androidClientVersion(),
                data.timeline && data.timeline.hash,
                data.id
            );
        }

        try {
            prepareExternalTracking(data);

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

                var targetTorrentMeta =
                    torrentEpisodeMeta(
                        card,
                        playlist,
                        item
                    );

                var targetReleasedMeta =
                    releasedEpisodeMeta(card);

                var useNativeState =
                    record.native_state_pending === true &&
                    supportsNativeStateResume();

                put(card, {
                    infohash: hash,
                    magnet: t(record.magnet) || magnetFor(record),
                    torrent_title: t(record.torrent_title),
                    file_index: item.id,
                    file_path: item.path,
                    timeline_hash: t(item.timeline && item.timeline.hash),
                    timeline_updated: n(item.timeline && item.timeline.updated),
                    season: n(item.season),
                    episode: n(item.episode),
                    time: time,
                    duration: n(item.timeline.duration),
                    percent: target.completed
                        ? 0
                        : (n(item.timeline.duration)
                            ? time / n(item.timeline.duration) * 100
                            : n(record.percent)),
                    torrent_episode_count:
                        targetTorrentMeta.count,
                    has_next_episode:
                        targetTorrentMeta.hasNext,
                    next_season:
                        targetTorrentMeta.nextSeason,
                    next_episode:
                        targetTorrentMeta.nextEpisode,
                    is_last_torrent_episode:
                        targetTorrentMeta.isLast,
                    last_released_season:
                        targetReleasedMeta.season ||
                        n(record.last_released_season),
                    last_released_episode:
                        targetReleasedMeta.episode ||
                        n(record.last_released_episode),
                    time_untrusted:
                        useNativeState
                            ? true
                            : record.time_untrusted === true,
                    native_state_pending:
                        useNativeState,
                    native_pending_since:
                        useNativeState
                            ? n(record.native_pending_since)
                            : 0
                });

                if (isCancelled(job)) throw cancelledError();

                // Restore the normal Lampa controller before handing off to Vimu.
                stopResumeLoading(job);

                if (runtime.resumeJob === job) {
                    runtime.resumeJob = null;
                }

                launchVimu(
                    item,
                    playlist,
                    time,
                    {
                        nativeStateResume:
                            useNativeState
                    }
                );
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

        var hash = t(
            item.torrent_hash ||
            item.infohash ||
            (item.torrent && item.torrent.hash)
        );

        if (!hash || !item.path) return;

        var allFiles =
            (event.params && event.params.files) ||
            event.items ||
            item.files ||
            [];

        var parsed = parseFile(card, allFiles, item);
        var timeline =
            item.timeline ||
            getTimeline(parsed.timelineHash);

        var old = get(card) || {};

        // Stage only. Do NOT touch history or the button here.
        // Merely opening a torrent/file list must never replace or remove
        // the last actually played torrent.
        runtime.pendingTorrent = {
            created_at: Date.now(),
            card: card,
            infohash: hash.toUpperCase(),
            magnet:
                t(item.magnet || item.torrent_magnet) ||
                t(old.magnet),
            torrent_title:
                t(item.torrent_title || item.title || item.path_human) ||
                t(old.torrent_title),
            file_index: item.id,
            file_path: t(item.path),
            timeline_hash:
                t(timeline.hash) ||
                parsed.timelineHash,
            timeline_updated:
                n(timeline.updated),
            season:
                n(item.season) ||
                parsed.season,
            episode:
                n(item.episode) ||
                parsed.episode
        };

        debug(
            'torrent file staged',
            runtime.pendingTorrent.infohash,
            runtime.pendingTorrent.file_index,
            runtime.pendingTorrent.file_path
        );
    }

    function timelineUpdate(event) {
        if (!event) return;

        runtime.lastTimelineEventAt = Date.now();

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

        applyTimelineRoad(
            eventHash,
            timeline,
            {
                updated: n(timeline.updated),
                source: 'Timeline.listener'
            }
        );

        if (runtime.session &&
            eventHash === t(runtime.session.timeline_hash) &&
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

        // create fires synchronously BEFORE Android.openPlayer().
        prepareExternalTracking(data);

        var card =
            data.card ||
            data.movie ||
            activeCardForPlayback(data);

        if (!card) {
            debug(
                'player create skipped: card is missing',
                data.id,
                data.path,
                data.url
            );
            return;
        }

        data.card = card;

        var hash = t(data.torrent_hash || data.infohash);
        if (!hash) return;

        var parsed = parseFile(
            card,
            data.files || [],
            data
        );

        var old = get(card) || {};
        var timeline = data.timeline || {};

        var currentEpisodeForMeta =
            Object.assign(
                {},
                data,
                {
                    season:
                        n(data.season) ||
                        parsed.season,
                    episode:
                        n(data.episode) ||
                        parsed.episode
                }
            );

        var torrentMeta =
            torrentEpisodeMeta(
                card,
                data.playlist || [],
                currentEpisodeForMeta
            );

        var releasedMeta =
            releasedEpisodeMeta(card);

        var pending = runtime.pendingTorrent;
        var pendingFresh =
            pending &&
            Date.now() - n(pending.created_at) < 60000 &&
            (
                !pending.card ||
                cardIdentity(pending.card) === cardIdentity(card)
            );

        if (!pendingFresh) {
            pending = null;
        }

        var timelineHash =
            t(timeline.hash) ||
            t(pending && pending.timeline_hash) ||
            t(old.timeline_hash) ||
            parsed.timelineHash;

        var timelineUpdated =
            n(timeline.updated);

        var oldTimelineUpdated =
            n(old.timeline_updated);

        var sameFile =
            (!old.file_index ||
             data.id === undefined ||
             String(old.file_index) === String(data.id)) &&
            (!old.file_path ||
             !data.path ||
             t(old.file_path) === t(data.path));

        var preferStored =
            sameFile &&
            n(old.time) > 0 &&
            (
                !timelineUpdated ||
                oldTimelineUpdated > timelineUpdated
            );

        var sessionTime =
            preferStored
                ? n(old.time)
                : n(timeline.time);

        var sessionDuration =
            preferStored && n(old.duration)
                ? n(old.duration)
                : n(timeline.duration);

        var sessionPercent =
            preferStored
                ? n(old.percent)
                : n(timeline.percent);

        if (preferStored) {
            timeline.time = sessionTime;

            if (sessionDuration) {
                timeline.duration = sessionDuration;
            }

            if (sessionPercent) {
                timeline.percent = sessionPercent;
            }

            debug(
                'kept newer stored progress',
                sessionTime,
                timelineUpdated,
                oldTimelineUpdated
            );
        }

        runtime.session = {
            card: card,
            timeline_hash: timelineHash,
            timeline_updated:
                Math.max(
                    timelineUpdated,
                    oldTimelineUpdated
                ),
            infohash: hash.toUpperCase(),
            magnet:
                t(data.magnet) ||
                t(pending && pending.magnet) ||
                t(old.magnet),
            torrent_title:
                t(data.torrent_title || data.title) ||
                t(pending && pending.torrent_title) ||
                t(old.torrent_title),
            file_index:
                data.id !== undefined
                    ? data.id
                    : (data.file_index !== undefined
                        ? data.file_index
                        : (pending ? pending.file_index : '')),
            file_path:
                t(data.path || data.file_path) ||
                t(pending && pending.file_path),
            season:
                n(data.season) ||
                n(pending && pending.season) ||
                parsed.season,
            episode:
                n(data.episode) ||
                n(pending && pending.episode) ||
                parsed.episode,
            time: sessionTime,
            duration: sessionDuration,
            percent: sessionPercent,
            torrent_episode_count:
                torrentMeta.count ||
                n(old.torrent_episode_count),
            has_next_episode:
                torrentMeta.count
                    ? torrentMeta.hasNext
                    : old.has_next_episode === true,
            next_season:
                torrentMeta.count
                    ? torrentMeta.nextSeason
                    : n(old.next_season),
            next_episode:
                torrentMeta.count
                    ? torrentMeta.nextEpisode
                    : n(old.next_episode),
            is_last_torrent_episode:
                torrentMeta.count
                    ? torrentMeta.isLast
                    : old.is_last_torrent_episode === true,
            last_released_season:
                releasedMeta.season ||
                n(old.last_released_season),
            last_released_episode:
                releasedMeta.episode ||
                n(old.last_released_episode),
            time_untrusted:
                old.time_untrusted === true,
            native_state_pending:
                old.native_state_pending === true,
            native_pending_since:
                n(old.native_pending_since)
        };

        put(card, runtime.session);
        runtime.pendingTorrent = null;
        refreshCurrentButton(card);
        startTimelinePoller();

        debug(
            'player create',
            runtime.session.timeline_hash,
            runtime.session.file_index,
            runtime.session.time
        );
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
        runtime.externalActive = false;
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

    function progressFor(record) {
        if (!record) return 0;

        var percent = n(record.percent);
        var time = n(record.time);
        var duration = n(record.duration);

        if ((!percent || percent < 0) &&
            time > 0 &&
            duration > 0) {
            percent =
                time / duration * 100;
        }

        return Math.max(
            0,
            Math.min(
                100,
                percent
            )
        );
    }

    function buttonView(card, record) {
        if (!record) {
            return {
                text: 'Продолжить',
                time: '',
                progress: 0,
                hasTime: false,
                series: false
            };
        }

        var series =
            isSeries(card) ||
            Boolean(
                n(record.season) &&
                n(record.episode)
            );

        var done =
            n(record.percent) >=
            COMPLETE_PERCENT;

        var hasTime =
            n(record.time) > 0 &&
            record.time_untrusted !== true;

        var ep =
            episodeText(
                record.season,
                record.episode,
                card
            );

        if (series) {
            if (done) {
                var lastInTorrent =
                    record.is_last_torrent_episode === true;

                if (lastInTorrent) {
                    if (recordIsLastReleasedEpisode(
                        card,
                        record
                    )) {
                        return {
                            text: 'Сезон просмотрен',
                            time: '',
                            progress: 0,
                            hasTime: false,
                            series: true
                        };
                    }

                    if (n(record.torrent_episode_count) > 0) {
                        return {
                            text:
                                'Просмотрено ' +
                                n(record.torrent_episode_count) +
                                ' серий',
                            time: '',
                            progress: 0,
                            hasTime: false,
                            series: true
                        };
                    }
                }

                var nextEpisode =
                    n(record.next_episode);

                return {
                    text:
                        'Продолжить · Следующая серия' +
                        (
                            nextEpisode
                                ? ' ' + nextEpisode
                                : ''
                        ),
                    time: '',
                    progress: 0,
                    hasTime: false,
                    series: true
                };
            }

            if (hasTime) {
                return {
                    // For series with a timecode remove "Продолжить".
                    text: ep || '',
                    time:
                        formatTime(
                            record.time
                        ),
                    progress:
                        progressFor(record),
                    hasTime: true,
                    series: true
                };
            }

            return {
                text:
                    ep
                        ? 'Продолжить · ' + ep
                        : 'Продолжить',
                time: '',
                progress: 0,
                hasTime: false,
                series: true
            };
        }

        if (done) {
            return {
                text: 'Продолжить просмотр',
                time: '',
                progress: 0,
                hasTime: false,
                series: false
            };
        }

        if (hasTime) {
            return {
                // Films keep the word "Продолжить".
                text: 'Продолжить',
                time:
                    formatTime(
                        record.time
                    ),
                progress:
                    progressFor(record),
                hasTime: true,
                series: false
            };
        }

        return {
            text: 'Продолжить',
            time: '',
            progress: 0,
            hasTime: false,
            series: false
        };
    }

    function escapeButtonText(value) {
        return String(
            value === undefined ||
            value === null
                ? ''
                : value
        )
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function installProgressFocusStyle() {
        if (document.getElementById(
            'ctv-progress-focus-style'
        )) {
            return;
        }

        var style =
            document.createElement('style');

        style.id =
            'ctv-progress-focus-style';

        style.textContent =
            '.view--continue-torrent-v2 .ctv-progress{' +
                'margin-left:0!important;' +
                'margin-right:0!important;' +
                'transition:margin .12s ease;' +
            '}' +
            '.view--continue-torrent-v2.focus .ctv-progress{' +
                'margin-left:.85em!important;' +
                'margin-right:.85em!important;' +
            '}';

        document.head.appendChild(style);
    }

    function progressHtml(percent) {
        percent = Math.max(
            0,
            Math.min(
                100,
                n(percent)
            )
        );

        return '' +
            '<span class="ctv-progress" ' +
                'style="' +
                    'display:inline-block;' +
                    'width:3.45em;' +
                    'height:0.24em;' +
                    'flex:0 0 3.45em;' +
                    'overflow:hidden;' +
                    'border-radius:99em;' +
                    'background:rgba(127,127,127,0.38);' +
                    'vertical-align:middle;' +
                '">' +
                '<span class="ctv-progress__fill" ' +
                    'style="' +
                        'display:block;' +
                        'width:' + percent.toFixed(2) + '%;' +
                        'height:100%;' +
                        'border-radius:inherit;' +
                        'background:currentColor;' +
                    '">' +
                '</span>' +
            '</span>';
    }

    function buttonContentHtml(card, record) {
        var view =
            buttonView(
                card,
                record
            );

        var parts = [];

        if (view.text) {
            parts.push(
                '<span class="ctv-continue-text">' +
                    escapeButtonText(
                        view.text
                    ) +
                '</span>'
            );
        }

        if (view.hasTime) {
            parts.push(
                progressHtml(
                    view.progress
                )
            );

            parts.push(
                '<span class="ctv-continue-time">' +
                    escapeButtonText(
                        view.time
                    ) +
                '</span>'
            );
        }

        return '' +
            '<span class="ctv-continue-content" ' +
                'style="' +
                    'display:inline-flex;' +
                    'align-items:center;' +
                    'gap:0;' +
                    'white-space:nowrap;' +
                '">' +
                parts.join('') +
            '</span>';
    }

    function updateButtonContent(button, card, record) {
        if (!button || !button.length) return;

        var directContent =
            button.children(
                '.ctv-continue-content'
            );

        if (!directContent.length) {
            // Old v2.3.x button structure had one plain span.
            // Reuse that node so hot reloads/themes do not duplicate content.
            var oldSpan =
                button.children('span').first();

            if (oldSpan.length) {
                oldSpan.replaceWith(
                    buttonContentHtml(
                        card,
                        record
                    )
                );
            }
            else {
                button.append(
                    buttonContentHtml(
                        card,
                        record
                    )
                );
            }

            return;
        }

        directContent.replaceWith(
            buttonContentHtml(
                card,
                record
            )
        );
    }

    function refreshCurrentButton(card) {
        var event = runtime.currentFull;
        if (!event || !card) return;

        var currentCard =
            event.data &&
            event.data.movie;

        if (!currentCard ||
            cardIdentity(currentCard) !==
            cardIdentity(card)) {
            return;
        }

        var root = rootFor(event);
        if (!root) return;

        var record = get(currentCard);
        var button =
            root.find(
                '.view--continue-torrent-v2'
            ).first();

        if (!record ||
            !button.length) {
            return;
        }

        updateButtonContent(
            button,
            currentCard,
            record
        );
    }

    function renderButton(card, record) {
        return '' +
            '<div class="full-start__button selector view--continue-torrent-v2">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true">' +
                    '<path fill="currentColor" d="M8 5.5v13L18.5 12 8 5.5z"></path>' +
                '</svg>' +
                buttonContentHtml(
                    card,
                    record
                ) +
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

    function activeFullContext() {
        if (!Lampa.Activity ||
            typeof Lampa.Activity.active !== 'function') {
            return null;
        }

        var active = Lampa.Activity.active();
        if (!active) return null;

        var activity = active.activity;
        if (!activity ||
            typeof activity.render !== 'function') {
            return null;
        }

        var rendered = activity.render();
        var root =
            rendered && typeof rendered.find === 'function'
                ? rendered
                : (typeof $ === 'function' ? $(rendered) : null);

        if (!root || !root.length) return null;

        var container = root.find(
            '.full-start-new__buttons, .full-start__buttons'
        ).last();

        // Do not trust only component name: custom builds/themes may differ.
        if (!container.length) return null;

        var card =
            active.card ||
            active.movie ||
            (
                runtime.currentFull &&
                runtime.currentFull.data &&
                runtime.currentFull.data.movie
            );

        if (!card) return null;

        return {
            active: active,
            root: root,
            container: container,
            card: card
        };
    }

    function ensureButtonOnFull(card, root, container, event) {
        if (!card || !root || !container || !container.length) return;

        var record = get(card);
        var button =
            root.find('.view--continue-torrent-v2').first();

        if (!record) {
            // Never delete an existing button merely because a transient
            // activity object is incomplete. Leave it until a stable Full
            // context can resolve the card again.
            return;
        }

        if (button.length) {
            updateButtonContent(
                button,
                card,
                record
            );

            ensureContinueFirst(
                container,
                button
            );
            return;
        }

        button = $(
            renderButton(
                card,
                record
            )
        );

        button.on('hover:enter', function() {
            resume(card);
        });

        container.prepend(button);

        installButtonFirstGuard(
            event || runtime.currentFull || {},
            container,
            button
        );

        debug(
            'continue button restored',
            cardIdentity(card)
        );
    }

    function restoreActiveFullButton() {
        var ctx = activeFullContext();
        if (!ctx) return;

        // We are back on a real Full card, so any staged file which never
        // reached Player.create is irrelevant and must not affect history.
        if (runtime.pendingTorrent) {
            runtime.pendingTorrent = null;
        }

        ensureButtonOnFull(
            ctx.card,
            ctx.root,
            ctx.container,
            runtime.currentFull
        );
    }

    function scheduleButtonRestore() {
        [0, 100, 350, 800].forEach(function(wait) {
            setTimeout(
                restoreActiveFullButton,
                wait
            );
        });
    }

    function verifyTimelineAfterExternalReturn() {
        var launch = runtime.nativeLaunch;

        if (!launch) return;

        var returnedAt = Date.now();

        [400, 1200, 3000].forEach(function(wait, index) {
            setTimeout(function() {
                syncActiveTimeline();
                scheduleButtonRestore();

                if (index === 2 &&
                    runtime.lastTimelineEventAt <
                        n(launch.started_at)) {

                    debug(
                        'WARNING: no Timeline.update after external player return',
                        'file=', launch.file_index,
                        'timeline=', launch.timeline_hash,
                        'url=', launch.url
                    );
                }
            }, wait);
        });

        debug(
            'external player returned',
            'after_ms=',
            returnedAt - n(launch.started_at)
        );
    }

    function startButtonRestoreWatcher() {
        if (runtime.buttonRestoreTimer) return;

        runtime.buttonRestoreTimer =
            setInterval(
                restoreActiveFullButton,
                1000
            );
    }

    function onFull(event) {
        if (!event || event.type !== 'complite') return;

        runtime.currentFull = event;

        var card = event.data && event.data.movie;
        if (!card) return;

        var root = rootFor(event);
        if (!root) return;

        // Pull the newest value from Lampa's own timeline before drawing.
        syncTimelineForCard(card);

        var container = root.find(
            '.full-start-new__buttons, .full-start__buttons'
        ).last();

        if (container.length) {
            ensureButtonOnFull(
                card,
                root,
                container,
                event
            );
            return;
        }

        var firstKnown = root.find(
            '.view--torrent, .view--online, .full-start__button'
        ).first();

        if (firstKnown.length &&
            firstKnown.parent().length) {

            ensureButtonOnFull(
                card,
                root,
                firstKnown.parent(),
                event
            );
        }
    }

    function init() {
        load();

        installTimelineUpdateHook();
        installAndroidTimeCallHook();
        installAndroidOpenPlayerHook();
        installProgressFocusStyle();
        startTimelinePoller();
        startButtonRestoreWatcher();

        // If Vimu caused Android to recreate the WebView, a persistent
        // marker from the previous JS process will still be here.
        // First wait for a delayed native Timeline.update; then try
        // TorrServer viewed; finally mark the old displayed time untrusted.
        recoverNativePending();

        if (Lampa.Listener) {
            Lampa.Listener.follow('full', onFull);
            Lampa.Listener.follow('torrent_file', captureTorrentFile);
            Lampa.Listener.follow('state:changed', timelineStateChanged);

            Lampa.Listener.follow('activity', function() {
                scheduleButtonRestore();
            });
        }

        if (Lampa.Timeline && Lampa.Timeline.listener) {
            Lampa.Timeline.listener.follow('update', timelineUpdate);
        }

        if (Lampa.Player && Lampa.Player.listener) {
            Lampa.Player.listener.follow('create', playerCreate);
            Lampa.Player.listener.follow('destroy', playerDestroy);

            Lampa.Player.listener.follow('external', function(event) {
                var data =
                    event && event.data
                        ? event.data
                        : event;

                runtime.externalActive = true;

                if (data && data.torrent_hash) {
                    // create() already ran before Android.openPlayer().
                    // Re-attach idempotently, but do NOT rebuild the session
                    // from the old pre-play timeline.
                    prepareExternalTracking(data);
                }

                debug(
                    'external player opened',
                    data && data.timeline
                        ? data.timeline.hash
                        : '',
                    'final_url=',
                    runtime.nativeLaunch
                        ? runtime.nativeLaunch.url
                        : '',
                    'playlist_index=',
                    runtime.nativeLaunch
                        ? runtime.nativeLaunch.playlist_index
                        : -1
                );
            });
        }

        if (typeof window !== 'undefined' &&
            window.addEventListener) {

            window.addEventListener(
                'focus',
                function() {
                    var wasExternal =
                        runtime.externalActive;

                    runtime.externalActive = false;
                    scheduleTimelineSync();
                    scheduleButtonRestore();

                    if (wasExternal) {
                        verifyTimelineAfterExternalReturn();
                    }
                }
            );
        }

        if (typeof document !== 'undefined' &&
            document.addEventListener) {

            document.addEventListener(
                'visibilitychange',
                function() {
                    if (!document.hidden) {
                        var wasExternal =
                            runtime.externalActive;

                        runtime.externalActive = false;
                        scheduleTimelineSync();
                        scheduleButtonRestore();

                        if (wasExternal) {
                            verifyTimelineAfterExternalReturn();
                        }
                    }
                }
            );
        }

        console.log(
            '[ContinueTorrent v2.3.11] Lampa + TorrServer + Vimu ready'
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
