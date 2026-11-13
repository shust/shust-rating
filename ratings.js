window.LampaRatingsServer="https://lampa-ratings.shust-blr.workers.dev";
/* Ratings Core. Film-level ratings only; no playback or favorite operations. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.LampaRatingsCore = factory();
}(typeof window !== 'undefined' ? window : this, function () {
    'use strict';
    function normal(value) {
        return String(value || '').toLowerCase().replace(/ё/g, 'е')
            .replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function year(value) { var match = /\b((?:18|19|20|21)\d{2})\b/.exec(String(value || '')); return match ? Number(match[1]) : 0; }
    function id(value, size) { var str = String(value === undefined || value === null ? '' : value); return new RegExp('^[1-9]\\d{0,' + (size - 1) + '}$').test(str) ? str : null; }
    function type(card) {
        if (card.media_type === 'tv' || card.media_type === 'movie') return card.media_type;
        return card.first_air_date || card.original_name || card.name ? 'tv' : 'movie';
    }
    function cardInfo(card) {
        if (!card || (card.source && card.source !== 'tmdb' && card.source !== 'cub')) return null;
        var tmdbId = id(card.id, 12);
        if (!tmdbId) return null;
        return {key: 'tmdb:' + type(card) + ':' + tmdbId, tmdbId: tmdbId, kpId: id(card.kinopoisk_id, 10),
            kind: type(card), title: String(card.title || card.name || '').slice(0, 240),
            originalTitle: String(card.original_title || card.original_name || '').slice(0, 240),
            year: year(card.release_date || card.first_air_date || card.year)};
    }
    function validKey(key) { return /^(?:tmdb:(?:movie|tv):[1-9]\d{0,11}|kp:[1-9]\d{0,9}|knrm:[A-Za-z0-9_-]{1,80}|title:[a-f0-9]{16,64})$/.test(key || ''); }
    function decode(value) {
        if (typeof value === 'string') return value;
        var bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
        var encoding = bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8';
        return new TextDecoder(encoding).decode(bytes);
    }
    function parseDelimited(text) {
        text = String(text || '').replace(/^\uFEFF/, '');
        var first = text.split(/\r?\n/)[0], delimiter = first.indexOf('\t') >= 0 ? '\t' : first.indexOf(';') >= 0 ? ';' : ',';
        var rows = [], row = [], field = '', quoted = false;
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (c === '"') {
                if (quoted && text[i + 1] === '"') { field += '"'; i++; }
                else if (quoted || !field) quoted = !quoted;
                else field += c;
            } else if (!quoted && c === delimiter) { row.push(field); field = ''; }
            else if (!quoted && (c === '\n' || c === '\r')) {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(field); if (row.some(function (v) { return v.trim(); })) rows.push(row);
                row = []; field = '';
            } else field += c;
        }
        if (quoted) throw new Error('Незакрытые кавычки в файле');
        row.push(field); if (row.some(function (v) { return v.trim(); })) rows.push(row);
        return rows;
    }
    function hashKey(str) {
        var a = 2166136261, b = 3339675911;
        for (var i = 0; i < str.length; i++) { a = Math.imul(a ^ str.charCodeAt(i), 16777619); b = Math.imul(b ^ str.charCodeAt(i), 2246822519); }
        return ('00000000' + (a >>> 0).toString(16)).slice(-8) + ('00000000' + (b >>> 0).toString(16)).slice(-8);
    }
    function importCSV(text) {
        var rows = parseDelimited(decode(text));
        if (!rows.length) throw new Error('Файл пустой');
        var headers = rows.shift().map(function (s) { return s.trim(); });
        ['My rating', 'Title', 'Year'].forEach(function (name) { if (headers.indexOf(name) < 0) throw new Error('Нет колонки ' + name); });
        var records = {}, report = {rows: rows.length, rated: 0, skipped: 0, duplicates: 0, movies: 0, tv: 0};
        rows.forEach(function (row) {
            function get(name) { var index = headers.indexOf(name); return index < 0 ? '' : String(row[index] || '').trim(); }
            var rating = get('My rating'), title = get('Title'), original = get('Original Title'), released = year(get('Year'));
            if (!/^(?:10|[1-9])$/.test(rating) || !(title || original) || !released) { report.skipped++; return; }
            var kind = /сериал|series|tv/i.test(get('Type')) ? 'tv' : 'movie';
            var backupId = get('backup_id'), key = /^[A-Za-z0-9_-]{1,80}$/.test(backupId) ? 'knrm:' + backupId :
                'title:' + hashKey(kind + '|' + released + '|' + normal(original || title));
            var value = {key: key, kind: kind, title: title || original, originalTitle: original, year: released,
                rating: Number(rating), backupId: backupId || null, kpId: null, tmdbId: null, origin: 'kinorium', ratedAt: get('Date')};
            if (records[key]) {
                report.duplicates++;
                if (records[key].ratedAt > value.ratedAt) return;
            }
            records[key] = value;
        });
        var values = Object.keys(records).map(function (key) { return records[key]; });
        values.forEach(function (value) { report[value.kind === 'tv' ? 'tv' : 'movies']++; });
        report.rated = values.length;
        return {records: values, report: report};
    }
    function aliases(value) { return [normal(value.title), normal(value.originalTitle)].filter(function (s, i, a) { return s && a.indexOf(s) === i; }); }
    function find(records, info) {
        if (!info) return null;
        var rows = Object.keys(records).map(function (key) { return records[key]; }), candidates;
        if (info.kpId) {
            candidates = rows.filter(function (v) { return v.kpId === info.kpId; });
            if (candidates.length === 1) return candidates[0];
        }
        candidates = rows.filter(function (v) { return v.tmdbId === info.tmdbId && v.kind === info.kind; });
        if (candidates.length === 1) return candidates[0];
        var names = aliases(info);
        function matches(tolerance) {
            return rows.filter(function (v) {
                if (v.kind !== info.kind || !info.year || !v.year || Math.abs(v.year - info.year) > tolerance) return false;
                var other = aliases(v);
                return names.some(function (name) { return other.indexOf(name) >= 0; });
            });
        }
        candidates = matches(0);
        if (!candidates.length) candidates = matches(1);
        return candidates.length === 1 ? candidates[0] : null;
    }
    function createIndex(records) {
        var rows = Object.create(null), links = Object.create(null);
        var buckets = {kp: Object.create(null), tmdb: Object.create(null), names: Object.create(null)};
        function remove(key) {
            (links[key] || []).forEach(function (link) {
                var bucket = buckets[link[0]][link[1]];
                if (!bucket) return;
                delete bucket[key];
                if (!Object.keys(bucket).length) delete buckets[link[0]][link[1]];
            });
            delete links[key]; delete rows[key];
        }
        function put(value) {
            if (!value || !value.key) return;
            remove(value.key); rows[value.key] = value;
            var entries = [];
            if (value.kpId) entries.push(['kp', String(value.kpId)]);
            if (value.tmdbId) entries.push(['tmdb', value.kind + ':' + value.tmdbId]);
            if (value.year) aliases(value).forEach(function (name) { entries.push(['names', value.kind + ':' + value.year + ':' + name]); });
            links[value.key] = entries;
            entries.forEach(function (entry) {
                var group = buckets[entry[0]];
                if (!group[entry[1]]) group[entry[1]] = Object.create(null);
                group[entry[1]][value.key] = true;
            });
        }
        function unique(bucket) {
            if (!bucket) return null;
            var keys = Object.keys(bucket);
            return keys.length === 1 ? rows[keys[0]] : null;
        }
        function lookup(info) {
            if (!info) return null;
            var result = info.kpId && unique(buckets.kp[String(info.kpId)]);
            if (result) return result;
            result = info.tmdbId && unique(buckets.tmdb[info.kind + ':' + info.tmdbId]);
            if (result) return result;
            if (!info.year) return null;
            var names = aliases(info);
            function candidates(years) {
                var found = Object.create(null);
                years.forEach(function (released) { names.forEach(function (name) {
                    var bucket = buckets.names[info.kind + ':' + released + ':' + name];
                    if (bucket) Object.keys(bucket).forEach(function (key) { found[key] = true; });
                }); });
                return Object.keys(found);
            }
            var keys = candidates([info.year]);
            if (!keys.length) keys = candidates([info.year - 1, info.year + 1]);
            return keys.length === 1 ? rows[keys[0]] : null;
        }
        Object.keys(records || {}).forEach(function (key) { put(records[key]); });
        return {put: put, remove: remove, find: lookup};
    }
    function ratedPage(data, offset) {
        var list = data && data.data && data.data.userProfile && data.data.userProfile.userData && data.data.userProfile.userData.ratedOrWatchedMovies;
        if (!list || !Array.isArray(list.items) || !Number.isSafeInteger(Number(list.total)) || Number(list.total) < 0) throw new Error('KP_RESPONSE_FORMAT');
        var values = [];
        list.items.forEach(function (entry) {
            var movie = entry.item || {}, kpId = id(movie.id, 10), vote = movie.movieUserVote && movie.movieUserVote.voting;
            var rating = Number(vote && vote.value);
            if (!kpId || !Number.isInteger(rating) || rating < 1 || rating > 10) return;
            var title = movie.title || {}, kind = movie.isSeries === true || /series|serial|tv/i.test(movie.__typename || movie.type || '') ? 'tv' :
                /film|movie/i.test(movie.__typename || movie.type || '') ? 'movie' : 'unknown';
            values.push({key: 'kp:' + kpId, kpId: kpId, tmdbId: null, backupId: null, kind: kind,
                title: (typeof title === 'string' ? title : title.localized || title.russian || title.original) || 'Кинопоиск #' + kpId,
                originalTitle: title.original || '', year: year(movie.productionYear || movie.year || (movie.releaseYears && movie.releaseYears[0] && movie.releaseYears[0].start)), rating: rating,
                origin: 'kinopoisk', ratedAt: ''});
        });
        var next = offset + list.items.length;
        if (!list.items.length && next < Number(list.total)) throw new Error('KP_INCOMPLETE_PAGE');
        return {records: values, total: Number(list.total), nextOffset: next < Number(list.total) ? next : null};
    }
    return {normal: normal, year: year, id: id, cardInfo: cardInfo, validKey: validKey, decode: decode, parseDelimited: parseDelimited,
        importCSV: importCSV, find: find, createIndex: createIndex, aliases: aliases, ratedPage: ratedPage};
}));

/* Lampa Ratings 1.1.0. Indexed local lookup and change-only cache persistence. */
(function () {
    'use strict';
    if (window.lampaRatingsInstalled) return;
    window.lampaRatingsInstalled = true;
    var Core = window.LampaRatingsCore;
    var WATCH_SERVER = 'https://lampa-watch-sync.shust-blr.workers.dev';
    var SERVER = window.LampaRatingsServer || 'https://lampa-ratings.shust-blr.workers.dev';
    var context = null, fingerprint = '', generation = 0, store = null, started = false;
    var busy = false, polling = false, exporting = false, importing = false, importCancel = null;
    var currentCard = null, cardSequence = 0, lastStatus = 'Не выполнен вход', lastPoll = 0;
    var ratingIndex = Core.createIndex(), pendingExports = Object.create(null);
    var mappings = {}, mappingPending = Object.create(null), mappingFailures = Object.create(null);
    var icon = '<svg class="lampa-ratings-unrated" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><g><circle cx="8" cy="8" r="6"/><path d="M5.25 8.25 L7.25 10.25 L10.75 6.25"/></g></svg>';
    function escape(value) { return String(value === undefined || value === null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function notify(value) { Lampa.Noty.show('Оценки: ' + escape(value)); }
    function enabled() { var value = Lampa.Storage.get('lampa_ratings_enabled', true); return value !== false && value !== 'false'; }
    function signedIn() { return context && context.user && context.user.id && context.token; }
    function active(version) { return version === generation && enabled() && signedIn(); }
    function dataKey() { return 'lampa_ratings_data_v1_' + encodeURIComponent(SERVER) + '_' + context.user.id; }
    function empty() { return {records: {}, outbox: {}, cursor: 0}; }
    function persist() {
        if (!signedIn()) return;
        try { Lampa.Storage.set(dataKey(), store); }
        catch (error) { lastStatus = 'Не удалось сохранить очередь: недостаточно места'; notify(lastStatus); }
    }
    function refreshIndex(key) {
        var job = store.outbox[key], value = job ? job.next || job : store.records[key];
        if (value) ratingIndex.put(value); else ratingIndex.remove(key);
        var remote = store.records[key];
        if (!job && remote && remote.exportRequested && !remote.synced && remote.kpId) pendingExports[key] = true;
        else delete pendingExports[key];
    }
    function mappingKey() { return 'lampa_ratings_mappings_v1_' + encodeURIComponent(SERVER) + '_' + context.user.id; }
    function cachedMapping(key) {
        var value = mappings[key];
        if (!value || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) return null;
        return value.kpId === null || Core.id(value.kpId, 10) ? value : null;
    }
    function cacheMapping(key, kpId) {
        mappings[key] = {kpId: kpId, expiresAt: Date.now() + (kpId ? 30 * 86400000 : 6 * 3600000)};
        delete mappingFailures[key];
        var keys = Object.keys(mappings).sort(function (a, b) { return mappings[b].expiresAt - mappings[a].expiresAt; });
        keys.forEach(function (name, i) { if (i >= 500 || !cachedMapping(name)) delete mappings[name]; });
        try { Lampa.Storage.set(mappingKey(), mappings); } catch (ignore) { /* IDs remain cached in memory. */ }
    }
    function selected() {
        if (Lampa.Storage.get('lampa_ratings_detached', false)) return {};
        var own = Lampa.Storage.get('lampa_ratings_connection', {});
        if (own && own.token && own.user && own.user.id) return own;
        var shared = Lampa.Storage.get('watch_sync_connection', {});
        if (shared && shared.server && shared.server.replace(/\/$/, '') === WATCH_SERVER && shared.token && shared.user && shared.user.id) return shared;
        return {};
    }
    function load() {
        var candidate = selected(), mark = JSON.stringify([candidate.user && candidate.user.id, candidate.token, enabled()]);
        if (mark === fingerprint) return false;
        fingerprint = mark; generation++; context = candidate; store = empty();
        ratingIndex = Core.createIndex(); pendingExports = Object.create(null);
        mappings = {}; mappingPending = Object.create(null); mappingFailures = Object.create(null);
        busy = false; polling = false; exporting = false; importing = false; importCancel = null; lastPoll = 0;
        $('.button--lampa-ratings').remove();
        if (signedIn()) {
            var saved = Lampa.Storage.get(dataKey(), {});
            if (saved && saved.records && saved.outbox && Number.isSafeInteger(saved.cursor)) store = saved;
            ratingIndex = Core.createIndex(store.records);
            Object.keys(store.records).forEach(function (key) {
                var row = store.records[key];
                if (row.exportRequested && !row.synced && row.kpId && !store.outbox[key]) pendingExports[key] = true;
            });
            Object.keys(store.outbox).forEach(refreshIndex);
            var savedMappings = Lampa.Storage.get(mappingKey(), {});
            if (savedMappings && typeof savedMappings === 'object' && !Array.isArray(savedMappings)) mappings = savedMappings;
            if (Object.prototype.hasOwnProperty.call(store, 'kp')) { delete store.kp; persist(); }
            lastStatus = 'Аккаунт: ' + context.user.username;
        } else lastStatus = 'Не выполнен вход';
        render();
        return true;
    }
    function message(error) {
        var code = error && error.body && error.body.error;
        var labels = {LOGIN_REQUIRED: 'Нужно снова войти в аккаунт', INVALID_CREDENTIALS: 'Неверный логин или пароль',
            KP_LOGIN_REQUIRED: 'Войди в Кинопоиск через плагин and7ey и повтори синхронизацию',
            KP_ID_REQUIRED: 'Не найден ID Кинопоиска. Его можно указать в меню оценки',
            MAPPING_NOT_CONFIGURED: 'Автопоиск ID пока не настроен. Укажи ID Кинопоиска вручную',
            KP_IMPORT_UNSUPPORTED: 'Прокси не вернул список оценок. Импорт CSV остаётся доступен',
            KP_VOTE_NOT_CONFIRMED: 'Кинопоиск не подтвердил оценку. Она сохранена в облаке и ожидает повторной отправки',
            KP_REQUEST_REJECTED: 'Кинопоиск отклонил запрос', KP_UPSTREAM_ERROR: 'Кинопоиск временно недоступен',
            KP_API_UNAVAILABLE: 'API Кинопоиска сейчас недоступен. Оценка сохранена в облаке, отправка остаётся в очереди',
            KP_INVALID_RESPONSE: 'Кинопоиск вернул неожиданный ответ. Отправка остаётся в очереди',
            KP_TIMEOUT: 'Кинопоиск не успел ответить. Оценка остаётся в очереди; повторим позже',
            REVISION_CONFLICT: 'Получена более новая оценка с другого устройства',
            IDENTITY_CONFLICT: 'Найдена другая запись этого фильма. Обнови оценки и повтори',
            RATINGS_LIMIT: 'Достигнут лимит оценок', TOO_MANY_ATTEMPTS: 'Слишком много попыток входа. Повтори позже'};
        return labels[code] || (error && error.status ? 'Ошибка сервера: ' + (code || error.status) : 'Нет связи. Изменения остаются в очереди');
    }
    function request(server, token, method, path, data, callback) {
        var options = {url: server + path, type: method, dataType: 'json', contentType: 'application/json', timeout: 18000,
            headers: token ? {Authorization: 'Bearer ' + token} : {}, success: function (body) { callback(null, body); },
            error: function (xhr) { callback({status: xhr.status || 0, body: xhr.responseJSON || {}}); }};
        if (data) options.data = JSON.stringify(data);
        $.ajax(options);
    }
    function api(method, path, data, callback) {
        var version = generation;
        if (!active(version)) return callback({canceled: true});
        return request(SERVER, context.token, method, path, data, function (error, body) {
            load();
            if (!active(version)) return callback({canceled: true});
            callback(error, body);
        });
    }
    function operation() {
        var bytes = new Uint8Array(16), result = '';
        if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
        else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        for (var j = 0; j < bytes.length; j++) result += ('0' + bytes[j].toString(16)).slice(-2);
        return result;
    }
    function validRecord(value) { return value && Core.validKey(value.key) && Number.isSafeInteger(value.revision) && value.revision > 0 &&
        (value.rating === null || (Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 10)); }
    function accept(row) {
        if (!validRecord(row)) return false;
        var previous = store.records[row.key];
        if (previous && (row.revision < previous.revision || (row.revision === previous.revision && row.changeId < previous.changeId))) return false;
        if (previous && row.revision === previous.revision && row.changeId === previous.changeId &&
            row.rating === previous.rating && row.synced === previous.synced && row.exportRequested === previous.exportRequested) return false;
        store.records[row.key] = row; refreshIndex(row.key); return true;
    }
    function combined() {
        var result = {};
        Object.keys(store.records).forEach(function (key) { result[key] = store.records[key]; });
        Object.keys(store.outbox).forEach(function (key) { result[key] = store.outbox[key].next || store.outbox[key]; });
        return result;
    }
    function current(info) { return ratingIndex.find(info); }
    function synchronize(force, done) {
        done = done || function () {};
        load();
        if (!enabled() || !signedIn() || polling || importing || (!force && Date.now() - lastPoll < 30000)) return done();
        polling = true; lastPoll = Date.now(); var version = generation, dirty = false;
        function finish(error) {
            polling = false;
            if (dirty) persist();
            done(error);
        }
        function page(after) {
            api('GET', '/v1/ratings?after=' + after, null, function (error, body) {
                if (!active(version)) return;
                if (error || !body || !Array.isArray(body.records) || !Number.isSafeInteger(body.cursor) || body.cursor < after ||
                    (body.hasMore && body.cursor <= after)) {
                    if (error) lastStatus = message(error); return finish(error || {status: 502});
                }
                var changed = false;
                body.records.forEach(function (row) { if (accept(row)) changed = true; });
                if (changed || store.cursor !== body.cursor) dirty = true;
                store.cursor = body.cursor;
                if (changed) render();
                if (body.hasMore) return page(body.cursor);
                finish();
            });
        }
        page(store.cursor);
    }
    function payload(value) {
        return {kind: value.kind, title: value.title, originalTitle: value.originalTitle || '', year: value.year || 0,
            tmdbId: value.tmdbId || null, kpId: value.kpId || null, backupId: value.backupId || null,
            rating: value.rating, ratedAt: value.ratedAt || '', baseRevision: value.baseRevision, operationId: value.operationId};
    }
    function flush(done) {
        done = done || function () {};
        if (!enabled() || !signedIn() || busy || importing) return done();
        var version = generation, keys = Object.keys(store.outbox);
        if (!keys.length) return exportPending(done);
        busy = true;
        function next() {
            if (!active(version)) return;
            var key = keys.shift(), job = store.outbox[key];
            if (!key) { busy = false; render(); return exportPending(done); }
            if (!job) return next();
            if (!job.attempted) { job.attempted = true; persist(); }
            api('PUT', '/v1/ratings/' + encodeURIComponent(key), payload(job), function (error, body) {
                if (!active(version)) return;
                var conflict = error && error.status === 409 && error.body.error !== 'KP_EXPORT_BUSY';
                var row = error && error.body.record || body && body.record;
                if ((!error || conflict) && (validRecord(row) || conflict)) {
                    if (row) accept(row);
                    var waiting = store.outbox[key];
                    if (waiting && waiting.operationId === job.operationId) {
                        if (!conflict && waiting.next) { store.outbox[key] = waiting.next; store.outbox[key].baseRevision = row.revision; keys.push(key); }
                        else delete store.outbox[key];
                    }
                    lastStatus = conflict ? message(error) : 'Оценка сохранена в облаке';
                    if (conflict) notify(lastStatus);
                    refreshIndex(key); persist(); render();
                    if (conflict && error.body.error === 'IDENTITY_CONFLICT') { store.cursor = 0; persist(); }
                    return next();
                }
                busy = false; lastStatus = message(error); render(); done(error);
            });
        }
        next();
    }
    function save(info, rating, explicitKpId) {
        load();
        if (!enabled() || !signedIn()) return notify('Войди в аккаунт в настройках оценок');
        if (importing) return notify('Дождись окончания импорта');
        var found = current(info), key = found ? found.key : info.key;
        var remote = store.records[key], previous = store.outbox[key];
        var value = {key: key, kind: info.kind, title: info.title, originalTitle: info.originalTitle, year: info.year,
            tmdbId: info.tmdbId, kpId: explicitKpId || (found && found.kpId) || info.kpId || null,
            backupId: found && found.backupId || null, rating: rating, origin: 'manual',
            ratedAt: new Date().toISOString(), revision: remote ? remote.revision : 0,
            baseRevision: previous ? previous.baseRevision : remote ? remote.revision : 0,
            operationId: operation(), exportRequested: true, synced: false};
        if (previous && previous.attempted) previous.next = value; else store.outbox[key] = value;
        refreshIndex(key);
        lastStatus = 'Оценка сохранена на устройстве'; persist(); render();
        flush(function (error) { if (error && !error.canceled) notify(message(error)); });
    }
    function and7eyToken() {
        var value = Lampa.Storage.get('kinopoisk_access_token', '');
        return typeof value === 'string' ? value : '';
    }
    function token(callback) {
        var value = and7eyToken();
        if (!value) return callback({status: 400, body: {error: 'KP_LOGIN_REQUIRED'}});
        callback(null, value);
    }
    function exportPending(done) {
        done = done || function () {};
        if (!enabled() || !signedIn() || exporting || importing) return done();
        var values = Object.keys(pendingExports).map(function (key) { return store.records[key]; });
        if (!values.length) return done();
        exporting = true; var version = generation;
        token(function (error, oauth) {
            if (!active(version)) return;
            if (error) { exporting = false; lastStatus = message(error); return done(error); }
            function next() {
                if (!active(version)) return;
                if (and7eyToken() !== oauth) { exporting = false; return done({canceled: true}); }
                var row = values.shift();
                if (!row) { exporting = false; return done(); }
                if (store.outbox[row.key]) return next();
                api('POST', '/v1/kinopoisk/vote', {key: row.key, revision: row.revision, oauth: oauth}, function (error, body) {
                    if (!active(version)) return;
                    var changed = false;
                    if (body && body.record) changed = accept(body.record);
                    if (error && error.body.record) changed = accept(error.body.record) || changed;
                    if (changed) { persist(); render(); }
                    if (error) { exporting = false; lastStatus = message(error); return done(error); }
                    lastStatus = 'Оценка подтверждена Кинопоиском'; next();
                });
            }
            next();
        });
    }
    function controller() { try { return Lampa.Controller.enabled().name; } catch (ignore) { return 'full_start'; } }
    function ask(title, password, callback) { Lampa.Input.edit({title: title, value: '', free: true, nosave: true, password: !!password}, callback); }
    function login() {
        var version = generation;
        ask('Логин существующего аккаунта Watch Sync', false, function (username) {
            if (!username) return;
            ask('Пароль аккаунта Watch Sync', true, function (password) {
                if (!password) return;
                request(WATCH_SERVER, null, 'POST', '/v1/auth/login', {username: username, password: password}, function (error, body) {
                    password = null;
                    if (version !== generation) return;
                    if (error) return notify(message(error));
                    if (!body || !body.user || !body.user.id || !body.token) return notify('Некорректный ответ авторизации');
                    Lampa.Storage.set('lampa_ratings_connection', {user: body.user, token: body.token});
                    Lampa.Storage.set('lampa_ratings_detached', false); load(); synchronize(true, function () { flush(); });
                    notify('Вход выполнен: ' + body.user.username);
                });
            });
        });
    }
    function importCSV(text, update, complete) {
        var parsed;
        try { parsed = Core.importCSV(text); } catch (error) { return complete(error.message); }
        if (!parsed.records.length) return complete('В файле нет оценок от 1 до 10');
        if (busy || exporting || importing || polling || Object.keys(store.outbox).length) return complete('Сначала синхронизируй очередь изменений и повтори импорт');
        importing = true; var version = generation, offset = 0, applied = 0, skipped = 0, canceled = false;
        importCancel = function () { canceled = true; };
        function finish(error) {
            if (!active(version)) return;
            importing = false; importCancel = null;
            synchronize(true, function () { flush(); });
            complete(error, {report: parsed.report, applied: applied, skipped: skipped});
        }
        function next() {
            if (!active(version)) return;
            if (canceled) return finish('Импорт остановлен. Уже принятые оценки сохранены');
            var batch = parsed.records.slice(offset, offset + 40);
            if (!batch.length) return finish();
            api('POST', '/v1/ratings/import', {origin: 'kinorium', records: batch}, function (error, body) {
                if (!active(version)) return;
                if (error) return finish(message(error));
                offset += batch.length; applied += body.applied || 0; skipped += body.skipped || 0;
                update(offset, parsed.records.length); setTimeout(next, 75);
            });
        }
        next();
    }
    function importDialog() {
        if (!enabled() || !signedIn()) return notify('Сначала войди в облачный аккаунт');
        var version = generation, closed = false;
        var modal = $('<div style="padding:15px"><div style="margin-bottom:12px">Выбери CSV/TSV из Кинориума или вставь его содержимое. Импортируются только оценки, без истории просмотров.</div></div>');
        var file = $('<input type="file" accept=".csv,.tsv,.txt" style="display:block;margin:12px 0"/>').appendTo(modal);
        var textarea = $('<textarea style="width:100%;height:150px;background:#161616;color:#fff" placeholder="Содержимое CSV/TSV"></textarea>').appendTo(modal);
        var status = $('<div style="margin:12px 0"></div>').appendTo(modal);
        var button = $('<div class="broadcast__device selector">Импортировать оценки</div>').appendTo(modal);
        file.on('change', function () {
            var picked = this.files && this.files[0];
            if (!picked) return;
            if (picked.size > 15 * 1024 * 1024) return status.text('Максимум 15 МБ');
            var reader = new FileReader();
            reader.onload = function () { if (active(version) && !closed) textarea.val(Core.decode(reader.result)); };
            reader.onerror = function () { if (!closed) status.text('Не удалось прочитать файл'); }; reader.readAsArrayBuffer(picked);
        });
        button.on('hover:enter click', function () {
            if (!active(version) || closed || button.data('busy')) return;
            button.data('busy', true);
            importCSV(textarea.val(), function (count, total) { if (!closed) status.text('Обработано ' + count + ' / ' + total); }, function (error, result) {
                if (!active(version) || closed) return;
                button.data('busy', false);
                status.text(error || 'Готово. Принято: ' + result.applied + '. Уже есть или сохранены более новые: ' + result.skipped +
                    '. Без корректной оценки: ' + result.report.skipped + '. История просмотров не менялась.');
            });
        });
        Lampa.Modal.open({title: 'Импорт из Кинориума', html: modal, size: 'large', onBack: function () {
            closed = true; if (importCancel) importCancel(); Lampa.Modal.close();
        }});
    }
    function importKP() {
        if (!enabled() || !signedIn()) return notify('Сначала войди в облачный аккаунт');
        if (busy || exporting || importing || polling || Object.keys(store.outbox).length) return notify('Сначала синхронизируй очередь изменений и повтори');
        var version = generation, canceled = false, count = 0;
        importing = true; importCancel = function () { canceled = true; };
        token(function (error, oauth) {
            if (!active(version)) return;
            if (error) { importing = false; importCancel = null; return notify(message(error)); }
            function finish(error) {
                importing = false; importCancel = null;
                notify(error || 'Импорт с Кинопоиска завершён. Принято изменений: ' + count);
                synchronize(true, function () { flush(); });
            }
            function page(offset) {
                if (!active(version)) return;
                if (and7eyToken() !== oauth) return finish('Вход Кинопоиска в плагине and7ey изменился. Импорт остановлен');
                if (canceled) return finish('Импорт остановлен');
                api('POST', '/v1/kinopoisk/ratings', {oauth: oauth, offset: offset}, function (error, body) {
                    if (!active(version)) return;
                    if (error) return finish(message(error));
                    count += body.applied || 0;
                    lastStatus = 'Импорт с Кинопоиска: ' + count + ' изменений';
                    if (body.nextOffset !== null && Number.isSafeInteger(body.nextOffset) && body.nextOffset > offset) return setTimeout(function () { page(body.nextOffset); }, 300);
                    finish();
                });
            }
            page(0);
        });
    }
    function rateMenu(info) {
        load();
        if (!enabled()) return;
        if (!signedIn()) return notify('Войди в аккаунт через Настройки → Оценки');
        var version = generation, row = current(info), back = controller();
        var items = [];
        for (var rating = 10; rating >= 1; rating--) items.push({title: String(rating), value: rating, selected: !!row && row.rating === rating});
        if (row && row.rating !== null) items.push({title: 'Удалить оценку', remove: true});
        items.push({title: 'ID Кинопоиска' + ((row && row.kpId || info.kpId) ? ': ' + (row && row.kpId || info.kpId) : ': указать вручную'), mapping: true});
        Lampa.Select.show({title: 'Моя оценка · ' + escape(info.title), items: items, onBack: function () { Lampa.Controller.toggle(back); },
            onSelect: function (item) {
                Lampa.Controller.toggle(back);
                if (!active(version)) return;
                if (item.mapping) return ask('ID или ссылка на фильм/сериал Кинопоиска', false, function (value) {
                    if (!active(version) || !value) return;
                    var matched = /kinopoisk\.ru\/(?:film|series)\/(\d+)/.exec(value), kpId = Core.id(matched ? matched[1] : value.trim(), 10);
                    if (!kpId) return notify('Нужен числовой ID или ссылка kinopoisk.ru/film/ID');
                    cacheMapping(info.key, kpId);
                    info.kpId = kpId;
                    if (row) save(info, row.rating, kpId); else { notify('ID выбран. Теперь поставь оценку'); rateMenu(info); }
                });
                save(info, item.remove ? null : item.value);
                var value = current(info);
                if (value && !value.kpId) notify('Оценка сохранена. Для отправки на Кинопоиск нужен ID фильма');
            }});
    }
    function render() {
        if (!currentCard || !enabled()) { $('.button--lampa-ratings').remove(); $('.lampa-ratings-neighbor').removeClass('lampa-ratings-neighbor'); return; }
        var info = currentCard.info;
        if (!info) return;
        var scope = currentCard.body ? $(currentCard.body) : $(document);
        var container = scope.find('.full-start-new__rate-line,.full-start__rate-line').first();
        var inRateLine = !!container.length;
        if (!container.length) container = scope.find('.full-start-new__buttons,.full-start__buttons').first();
        if (!container.length && currentCard.body) container = scope.filter('.full-start-new__buttons,.full-start__buttons').first();
        if (!container.length) return;
        var button = scope.find('.button--lampa-ratings').first();
        if (!button.length) {
            button = $('<div class="selector button--lampa-ratings" role="button" tabindex="0"></div>');
            button.on('hover:enter', function () { if (currentCard) rateMenu(currentCard.info); });
        }
        button.toggleClass('full-start__rate', inRateLine).toggleClass('full-start__button', !inRateLine);
        if (!$.contains(container[0], button[0])) {
            var kp = inRateLine ? container.children('.rate--kp').first() : $();
            if (kp.length) { kp.addClass('lampa-ratings-neighbor'); kp.after(button); } else container.append(button);
        }
        if (!document.getElementById('lampa-ratings-button-style')) {
            $('<style id="lampa-ratings-button-style">.cardify .full-start-new__rate-line{height:2.7em}.full-start-new__rate-line>.rate--kp.lampa-ratings-neighbor,.full-start__rate-line>.rate--kp.lampa-ratings-neighbor{margin-right:.35em!important}.full-start__rate.button--lampa-ratings{display:inline-flex;align-items:center;gap:.35em;cursor:pointer;position:relative;z-index:0;isolation:isolate;height:1.2em;padding:0!important;white-space:nowrap;line-height:1}.full-start__rate.button--lampa-ratings svg{width:1.2em;height:1.2em;flex:none}.full-start__rate.button--lampa-ratings svg.lampa-ratings-unrated{width:1.2em;height:1.2em}.full-start__rate.button--lampa-ratings .lampa-ratings-label{display:none;line-height:1;white-space:nowrap}.full-start__rate.button--lampa-ratings.focus .lampa-ratings-label{display:inline;font-family:"SegoeUI",sans-serif;font-size:.85em}.button--lampa-ratings.focus{background:#fff!important;color:#111!important}.full-start__rate.button--lampa-ratings.focus{background:transparent!important;margin-left:.45em!important;margin-right:1.5em!important}.full-start__rate.button--lampa-ratings.focus:before{content:"";position:absolute;top:-.42em;bottom:-.42em;left:-.62em;right:-.62em;background:#fff;border-radius:10em;z-index:-1;pointer-events:none}.button--lampa-ratings.focus svg.lampa-ratings-rated circle{fill:#111}.button--lampa-ratings.focus svg.lampa-ratings-rated text{fill:#fff}</style>').appendTo('head');
        }
        var row = signedIn() ? current(info) : null, value = row && row.rating;
        var drawing = value ? '<svg class="lampa-ratings-rated" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><text x="12" y="16" text-anchor="middle" font-size="13" font-weight="700" fill="#161616">' + value + '</text></svg>' : icon;
        var suffix = '';
        if (row && (store.outbox[row.key] || (row.exportRequested && !row.synced))) suffix = ' · ожидает синхронизации';
        var signature = info.key + ':' + (value || '') + ':' + suffix + ':' + inRateLine;
        if (button.attr('data-lampa-ratings-state') === signature) return;
        button.attr('data-lampa-ratings-state', signature);
        var label = (value ? 'Моя оценка: ' + value : 'Оценить') + (suffix ? ' · в очереди' : '');
        var focusLabel = value ? 'Моя оценка' : 'Оценить';
        button.html(drawing + '<span class="lampa-ratings-label">' + (inRateLine ? focusLabel : label) + '</span>').attr('title', label).attr('aria-label', label);
    }
    function resolveKp(info, callback) {
        var key = info.key, cached = cachedMapping(key), version = generation;
        if (cached) return callback(cached.kpId);
        if (mappingFailures[key] > Date.now()) return;
        if (mappingPending[key]) { mappingPending[key].push(callback); return; }
        mappingPending[key] = [callback];
        var before = mappings[key];
        api('POST', '/v1/resolve', {kind: info.kind, tmdbId: info.tmdbId}, function (error, body) {
            if (!active(version)) return;
            var callbacks = mappingPending[key] || []; delete mappingPending[key];
            var latest = cachedMapping(key), kpId = null;
            if (mappings[key] !== before && latest) kpId = latest.kpId;
            else if (!error && body && (body.kpId === null || Core.id(body.kpId, 10))) {
                kpId = body.kpId; cacheMapping(key, kpId);
            } else { mappingFailures[key] = Date.now() + 60000; return; }
            callbacks.forEach(function (done) { done(kpId); });
        });
    }
    function full(event) {
        if (!event || event.type !== 'complite' || !event.data || !event.data.movie) return;
        load(); var info = Core.cardInfo(event.data.movie);
        currentCard = info ? {info: info, body: event.body || null} : null; cardSequence++;
        if (!info || !enabled()) return;
        render(); synchronize(false);
        var found = signedIn() && current(info), version = generation, sequence = cardSequence;
        if (info.kpId || (found && found.kpId) || !signedIn()) return;
        resolveKp(info, function (kpId) {
            if (!active(version) || sequence !== cardSequence || !currentCard) return;
            if (kpId) {
                currentCard.info.kpId = kpId;
                var pending = current(currentCard.info);
                if (pending && pending.exportRequested && !pending.synced && !pending.kpId) save(currentCard.info, pending.rating, kpId);
                render();
            }
        });
    }
    function settings() {
        Lampa.SettingsApi.addComponent({component: 'lampa_ratings', name: 'Оценки', icon: icon});
        Lampa.SettingsApi.addParam({component: 'lampa_ratings', param: {name: 'lampa_ratings_enabled', type: 'trigger', default: true},
            field: {name: 'Оценки включены', description: 'Кнопка в карточках и синхронизация оценок.'}, onChange: function () {
                load(); if (enabled()) synchronize(true, function () { flush(); });
            }});
        function button(name, title, description, action) { Lampa.SettingsApi.addParam({component: 'lampa_ratings',
            param: {name: name, type: 'button'}, field: {name: title, description: description}, onChange: action}); }
        button('ratings_account', 'Войти в облачный аккаунт', 'Используй логин и пароль Watch Sync. Вход таймкодов останется прежним.', login);
        button('ratings_shared', 'Использовать аккаунт Watch Sync на устройстве', 'Подключить оценки к уже выполненному входу.', function () {
            Lampa.Storage.set('lampa_ratings_connection', {}); Lampa.Storage.set('lampa_ratings_detached', false);
            load(); synchronize(true, function () { flush(); }); notify(lastStatus);
        });
        button('ratings_import_csv', 'Импорт из Кинориума', 'Выбрать CSV/TSV или вставить его содержимое.', importDialog);
        button('ratings_import_kp', 'Загрузить оценки с Кинопоиска', 'Импорт всех оценок. Не меняет историю просмотров.', importKP);
        button('ratings_import_cancel', 'Остановить импорт', 'Уже принятые оценки сохранятся.', function () { if (importCancel) importCancel(); });
        button('ratings_sync', 'Синхронизировать сейчас', 'Получить облачные оценки и отправить очередь изменений.', function () {
            synchronize(true, function (error) { if (error) return notify(message(error)); flush(function (error) { notify(error ? message(error) : lastStatus); }); });
        });
        button('ratings_status', 'Статус оценок', 'Аккаунт, количество оценок и очередь.', function () {
            load(); if (!signedIn()) return notify(lastStatus);
            var all = combined(), total = Object.keys(all).filter(function (key) { return all[key].rating !== null; }).length;
            var pending = Object.keys(all).filter(function (key) { return all[key].exportRequested && !all[key].synced; }).length;
            notify('Аккаунт: ' + context.user.username + '. Оценок: ' + total + '. В очереди облака: ' + Object.keys(store.outbox).length +
                '. Ожидают Кинопоиск: ' + pending + '. Вход and7ey: ' + (and7eyToken() ? 'есть' : 'не выполнен') + '. ' + lastStatus);
        });
        button('ratings_logout', 'Выйти только из плагина оценок', 'Таймкоды и облачные оценки сохранятся.', function () {
            Lampa.Storage.set('lampa_ratings_connection', {}); Lampa.Storage.set('lampa_ratings_detached', true); load(); notify('Выполнен выход из оценок');
        });
    }
    function start() {
        if (started) return; started = true; load(); settings(); Lampa.Listener.follow('full', full);
        function tick() { load(); if (enabled() && signedIn()) synchronize(false, function () { flush(); }); }
        setInterval(tick, 30000); window.addEventListener('online', tick); window.addEventListener('focus', tick); tick();
    }
    if (window.appready) start(); else Lampa.Listener.follow('app', function (event) { if (event.type === 'ready') start(); });
}());
