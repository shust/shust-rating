/* Ratings on cards: Lampa / ByLampa compatibility patch.
 * Based on the user-supplied plugin; original provider credentials and icons retained.
 * ByLampa HTTP API requires an HTTPS reverse proxy when the app uses HTTPS.
 */
(function () {
  "use strict";
  var _0x44fc9f = null;
  function _0x4ef64d(_0x111817, _0x18018c) {
    var _0x1ebfae = null,
      _0x489bcf = _0x111817.parentElement;
    while (_0x489bcf) {
      if (_0x489bcf.classList && _0x489bcf.classList.contains(_0x18018c)) return _0x489bcf;
      _0x489bcf = _0x489bcf.parentElement;
    }
    return null;
  }
  var ratingCache = {
      caches: {},
      get: function (_0x3d389e, _0xf82b95) {
        var _0x399934 = null,
          _0x27cb4b =
            this.caches[_0x3d389e] ||
            (this["caches"][_0x3d389e] = Lampa.Storage.cache(_0x3d389e, 0x1f4, {})),
          _0x5782ff = _0x27cb4b[_0xf82b95];
        if (!_0x5782ff) return null;
        var _0x5c61ce = Date.now() - _0x5782ff.timestamp > 0x18 * 0x3c * 0x3c * 0x3e8;
        if (_0x5c61ce)
          return (delete _0x27cb4b[_0xf82b95], Lampa["Storage"].set(_0x3d389e, _0x27cb4b), null);
        return _0x5782ff;
      },
      set: function (_0x277a1c, _0xbe2345, _0x68e53d) {
        var _0x4c8a54 = null;
        if ((_0x68e53d["kp"] === 0x0 && _0x68e53d.imdb === 0x0) || _0x68e53d.rating === "0.0")
          return _0x68e53d;
        var _0x5d644d =
          this["caches"][_0x277a1c] ||
          (this.caches[_0x277a1c] = Lampa.Storage.cache(_0x277a1c, 0x1f4, {}));
        return (
          (_0x68e53d["timestamp"] = Date["now"]()),
          (_0x5d644d[_0xbe2345] = _0x68e53d),
          Lampa.Storage.set(_0x277a1c, _0x5d644d),
          _0x68e53d
        );
      },
    },
    _0x387c46 = {};
  function normalizeTitle(_0x233243) {
    var _0x3c7761 = null;
    if (_0x387c46[_0x233243]) return _0x387c46[_0x233243];
    var _0x299955 = _0x233243
      .replace(/[\s.,:;''`!?]+/g, "\x20")
      .trim()
      ["toLowerCase"]()
      .replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-")
      .replace(/ё/g, "е");
    return ((_0x387c46[_0x233243] = _0x299955), _0x299955);
  }
  function cleanTitle(_0x312eca) {
    var _0xe7e7fb = null;
    return _0x312eca["replace"](/[\s.,:;''`!?]+/g, "\x20").trim();
  }
  function searchTitle(_0x43d0c9) {
    var _0x1e7bae = null;
    return cleanTitle(_0x43d0c9)
      ["replace"](/^[ \/\\]+/, "")
      ["replace"](/[ \/\\]+$/, "")
      .replace(/\+( *[+\/\\])+/g, "+")
      .replace(/([+\/\\] *)+\+/g, "+")
      .replace(/( *[\/\\]+ *)+/g, "+");
  }
  function _0x24ff8e(_0x3df97e, _0x3d90e6) {
    var _0x56dc24 = null;
    return (
      typeof _0x3df97e === "string" &&
      typeof _0x3d90e6 === "string" &&
      normalizeTitle(_0x3df97e) === normalizeTitle(_0x3d90e6)
    );
  }
  function titleIncludes(_0x5d7709, _0x3af011) {
    var _0x50d0bb = null;
    return (
      typeof _0x5d7709 === "string" &&
      typeof _0x3af011 === "string" &&
      normalizeTitle(_0x5d7709).indexOf(normalizeTitle(_0x3af011)) !== -0x1
    );
  }
  var _0x34b897 = [],
    _0x5e89dc = ![],
    _0x50c3d5 = 0x12c;
  function runQueue() {
    var _0x77fb2e = null;
    if (_0x5e89dc || !_0x34b897.length) return;
    _0x5e89dc = !![];
    var _0x5aeba2 = _0x34b897.shift();
    (_0x5aeba2.execute(),
      setTimeout(function () {
        ((_0x5e89dc = ![]), runQueue());
      }, _0x50c3d5));
  }
  function enqueueRequest(_0x462f20) {
    (_0x34b897["push"]({ execute: _0x462f20 }), runQueue());
  }
  var _0xd704a7 = [];
  function takeRequest() {
    var _0xe29d0e = null;
    return _0xd704a7["pop"]() || new Lampa["Reguest"]();
  }
  function releaseRequest(_0x2fa858) {
    var _0x53a005 = null;
    (_0x2fa858["clear"](), _0xd704a7.length < 0x3 && _0xd704a7.push(_0x2fa858));
  }
  function getLampaRating(_0x3808bb, _0x1adf74) {
    var _0x166220 = null,
      _0x2073a4 = ratingCache.get("lampa_rating", mediaKey(_0x3808bb));
    if (_0x2073a4 && _0x2073a4["rating"] !== "0.0") {
      _0x1adf74(_0x2073a4.rating);
      return;
    }
    enqueueRequest(function () {
      var _0x3d15b4 = _0x166220,
        _0x2650d3 = mediaType(_0x3808bb);
      var _0xe3a73e = _0x2650d3 + "_" + _0x3808bb["id"],
        _0x21e283 = "https://cub.best/api/reactions/get/" + _0xe3a73e,
        _0x14c3d8 = takeRequest();
      (_0x14c3d8.timeout(0x3a98),
        _0x14c3d8.silent(
          _0x21e283,
          function (_0x17bc42) {
            var _0xa7ebf0 = _0x3d15b4,
              _0x40305f = "0.0";
            if (_0x17bc42 && _0x17bc42.result) {
              var _0x1547f7 = _0x17bc42["result"],
                _0x4ea8ee = 0x0,
                _0x573d36 = 0x0;
              _0x1547f7.forEach(function (_0x1e1b92) {
                var _0x28a8a5 = _0xa7ebf0;
                ((_0x1e1b92.type === "fire" || _0x1e1b92.type === "nice") &&
                  (_0x4ea8ee += parseInt(_0x1e1b92.counter, 0xa)),
                  (_0x1e1b92["type"] === "think" ||
                    _0x1e1b92.type === "bore" ||
                    _0x1e1b92.type === "shit") &&
                    (_0x573d36 += parseInt(_0x1e1b92.counter, 0xa)));
              });
              var _0x22aa31 =
                _0x4ea8ee + _0x573d36 > 0x0 ? (_0x4ea8ee / (_0x4ea8ee + _0x573d36)) * 0xa : 0x0;
              _0x40305f = _0x22aa31.toFixed(0x1);
            }
            (ratingCache["set"]("lampa_rating", mediaKey(_0x3808bb), {
              rating: _0x40305f,
              timestamp: Date.now(),
            }),
              releaseRequest(_0x14c3d8),
              _0x1adf74(_0x40305f));
          },
          function () {
            var _0x286b5c = _0x3d15b4;
            (releaseRequest(_0x14c3d8), _0x1adf74("0.0"));
          },
        ));
    });
  }
  function getByLampaRating(_0x86ebdb, _0x55d2b0) {
    var byLampaEndpoint = String(
      Lampa.Storage.get("bylampa_rating_url", "http://94.156.115.58:841"),
    );
    var _0x17157d = null,
      _0x396fc0 = "movie";
    var _0x4d6c56 = _0x396fc0 + "_" + _0x86ebdb["id"],
      _0x170bae = ratingCache.get("bylampa_rating", byLampaEndpoint + "|" + _0x4d6c56);
    if (_0x170bae && _0x170bae.rating !== "0.0") {
      _0x55d2b0(_0x170bae.rating, _0x170bae.voteCount || 0x0);
      return;
    }
    enqueueRequest(function () {
      var _0x355fb3 = _0x17157d,
        _0x5d3fd2 = byLampaEndpoint.replace(/\/+$/, ""),
        _0x133e5c = _0x5d3fd2 + "/lampa/ratings/content/" + _0x396fc0 + "/" + _0x86ebdb["id"],
        _0x1d6113 = new XMLHttpRequest();
      if (window.location.protocol === "https:" && /^http:/i.test(_0x5d3fd2)) {
        _0x55d2b0("0.0", 0);
        return;
      }
      (_0x1d6113["open"]("GET", _0x133e5c, !![]),
        (_0x1d6113["timeout"] = 0x1388),
        (_0x1d6113["onload"] = function () {
          var _0x17724f = _0x355fb3;
          if (this.status === 0xc8)
            try {
              var _0x4bf1cd = JSON.parse(this.responseText),
                _0xdb7744 = parseFloat(_0x4bf1cd["averageRating"]) || 0x0,
                _0x78ea60 = _0x4bf1cd.voteCount || 0x0;
              (ratingCache.set("bylampa_rating", byLampaEndpoint + "|" + _0x4d6c56, {
                rating: _0xdb7744["toFixed"](0x1),
                voteCount: _0x78ea60,
                timestamp: Date["now"](),
              }),
                _0x55d2b0(_0xdb7744.toFixed(0x1), _0x78ea60));
            } catch (_0x579257) {
              _0x55d2b0("0.0", 0x0);
            }
          else _0x55d2b0("0.0", 0x0);
        }),
        (_0x1d6113.onerror = function () {
          var _0x25bdf6 = _0x355fb3;
          _0x55d2b0("0.0", 0x0);
        }),
        (_0x1d6113.ontimeout = function () {
          var _0x202b12 = _0x355fb3;
          _0x55d2b0("0.0", 0x0);
        }),
        _0x1d6113.send());
    });
  }
  function getKinopoiskRating(_0x1508f8, _0x1612cf) {
    var _0x5bc83a = null,
      _0x2b6043 = ratingCache.get("kp_rating", mediaKey(_0x1508f8));
    if (_0x2b6043) {
      var _0x4dd541 = Lampa.Storage["get"]("rating_source", "tmdb"),
        _0x2ca4bb = _0x4dd541 === "kp" ? _0x2b6043["kp"] : _0x2b6043.imdb;
      if (_0x2ca4bb && _0x2ca4bb > 0x0) {
        _0x1612cf(parseFloat(_0x2ca4bb).toFixed(0x1));
        return;
      }
    }
    enqueueRequest(function () {
      var _0x25d6a0 = _0x5bc83a,
        _0x1c9a63 = takeRequest(),
        _0xb68257 = searchTitle(_0x1508f8.title || _0x1508f8.name || ""),
        _0x40af27 =
          _0x1508f8.release_date || _0x1508f8.first_air_date || _0x1508f8.last_air_date || "0000",
        _0xbd9ef7 = parseInt((_0x40af27 + "")["slice"](0x0, 0x4)),
        _0x3a0b92 = _0x1508f8.original_title || _0x1508f8.original_name,
        _0x4a4497 = {
          url: "https://kinopoiskapiunofficial.tech/",
          rating_url: "https://rating.kinopoisk.ru/",
          headers: { "X-API-KEY": "14342b35-714b-449d-bf10-30d0d9ac22e6" },
        };
      function _0x30d21b() {
        var _0x5ac620 = _0x25d6a0,
          _0x355e90 = _0x4a4497.url,
          _0x5a26d0 = Lampa.Utils["addUrlComponent"](
            _0x355e90 + "api/v2.1/films/search-by-keyword",
            "keyword=" + encodeURIComponent(_0xb68257),
          );
        if (_0x1508f8["imdb_id"])
          _0x355e90 = Lampa["Utils"]["addUrlComponent"](
            _0x355e90 + "api/v2.2/films",
            "imdbId=" + encodeURIComponent(_0x1508f8.imdb_id),
          );
        else _0x355e90 = _0x5a26d0;
        (_0x1c9a63.timeout(0x3a98),
          _0x1c9a63.silent(
            _0x355e90,
            function (_0x45f003) {
              var _0x285f40 = _0x5ac620;
              if (_0x45f003.items && _0x45f003["items"]["length"]) _0x23090c(_0x45f003.items);
              else {
                if (_0x45f003["films"] && _0x45f003.films.length) _0x23090c(_0x45f003["films"]);
                else _0x23090c([]);
              }
            },
            function () {
              var _0x1c35a1 = _0x5ac620;
              (releaseRequest(_0x1c9a63), _0x1612cf("0.0"));
            },
            ![],
            { headers: _0x4a4497.headers },
          ));
      }
      function _0x23090c(_0x5a7a2c) {
        var _0x4b9ea5 = _0x25d6a0;
        if (!_0x5a7a2c || !_0x5a7a2c.length) {
          (releaseRequest(_0x1c9a63), _0x1612cf("0.0"));
          return;
        }
        var _0x527bd6 = ![];
        _0x5a7a2c.forEach(function (_0x5af150) {
          var _0x31271b = _0x4b9ea5,
            _0x3717f6 = _0x5af150.start_date || _0x5af150.year || "0000";
          _0x5af150["tmp_year"] = parseInt((_0x3717f6 + "").slice(0x0, 0x4));
        });
        var _0x337fe4 = _0x5a7a2c;
        if (_0x3a0b92) {
          var _0x300798 = _0x337fe4["filter"](function (_0xe490d3) {
            var _0x434da2 = _0x4b9ea5;
            return (
              titleIncludes(_0xe490d3.orig_title || _0xe490d3["nameOriginal"], _0x3a0b92) ||
              titleIncludes(_0xe490d3["en_title"] || _0xe490d3.nameEn, _0x3a0b92) ||
              titleIncludes(
                _0xe490d3["title"] || _0xe490d3["ru_title"] || _0xe490d3.nameRu,
                _0x3a0b92,
              )
            );
          });
          _0x300798.length && ((_0x337fe4 = _0x300798), (_0x527bd6 = !![]));
        }
        if (_0x337fe4["length"] > 0x1 && _0xbd9ef7) {
          var _0x2a8062 = _0x337fe4.filter(function (_0x160f99) {
            var _0x39d5ed = _0x4b9ea5;
            return _0x160f99.tmp_year == _0xbd9ef7;
          });
          if (!_0x2a8062.length)
            _0x2a8062 = _0x337fe4.filter(function (_0x49265c) {
              var _0x410a98 = _0x4b9ea5;
              return (
                _0x49265c.tmp_year &&
                _0x49265c.tmp_year > _0xbd9ef7 - 0x2 &&
                _0x49265c.tmp_year < _0xbd9ef7 + 0x2
              );
            });
          if (_0x2a8062.length) _0x337fe4 = _0x2a8062;
        }
        if (_0x337fe4.length >= 0x1) {
          var _0x5b3a69 =
            _0x337fe4[0x0]["kp_id"] ||
            _0x337fe4[0x0]["kinopoisk_id"] ||
            _0x337fe4[0x0]["kinopoiskId"] ||
            _0x337fe4[0x0].filmId;
          _0x5b3a69
            ? (_0x1c9a63["timeout"](0x3a98),
              _0x1c9a63.silent(
                _0x4a4497["url"] + "api/v2.2/films/" + _0x5b3a69,
                function (_0x4eaaaf) {
                  var _0x16fae = _0x4b9ea5,
                    _0x2348d1 = ratingCache.set("kp_rating", mediaKey(_0x1508f8), {
                      kp: _0x4eaaaf["ratingKinopoisk"] || 0x0,
                      imdb: _0x4eaaaf.ratingImdb || 0x0,
                      timestamp: Date.now(),
                    }),
                    _0x3a328e = Lampa.Storage["get"]("rating_source", "tmdb"),
                    _0x43bdd9 = _0x3a328e === "kp" ? _0x2348d1["kp"] : _0x2348d1.imdb;
                  (releaseRequest(_0x1c9a63),
                    _0x1612cf(_0x43bdd9 ? parseFloat(_0x43bdd9)["toFixed"](0x1) : "0.0"));
                },
                function () {
                  var _0x55a24b = _0x4b9ea5;
                  (releaseRequest(_0x1c9a63), _0x1612cf("0.0"));
                },
                ![],
                { headers: _0x4a4497.headers },
              ))
            : (releaseRequest(_0x1c9a63), _0x1612cf("0.0"));
        } else (releaseRequest(_0x1c9a63), _0x1612cf("0.0"));
      }
      _0x30d21b();
    });
  }
  var _0x4b4114 = [],
    _0x1a7c7c = null;
  function enqueueCard(_0x2b43a0) {
    _0x4b4114["push"](_0x2b43a0);
    if (_0x1a7c7c) return;
    _0x1a7c7c = setTimeout(function () {
      var _0x440048 = _0x4b4114["splice"](0x0);
      (_0x440048["forEach"](function (_0x4783db) {
        updateCard(_0x4783db);
      }),
        (_0x1a7c7c = null));
    }, 0x10);
  }
  function createBadge(_0x2eb7a5) {
    var _0x22ec94 = null,
      _0xe543ee = document.createElement("div");
    ((_0xe543ee.className = "card__vote"),
      (_0xe543ee.style.cssText =
        'line-height: 1; font-family: "SegoeUI", sans-serif; cursor: pointer; box-sizing: border-box; outline: none; user-select: none; position: absolute; right: 0.3em; bottom: 0.3em; background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 1.3em; font-weight: 700; padding: 0.2em 0.5em; border-radius: 1em;'));
    var _0x2d6623 = _0x2eb7a5.querySelector(".card__view");
    return ((_0x2d6623 || _0x2eb7a5)["appendChild"](_0xe543ee), _0xe543ee);
  }
  function mediaType(data) {
    if (data.media_type === "tv" || data.media_type === "movie") return data.media_type;
    return data.number_of_seasons ||
      data.seasons ||
      data.first_air_date ||
      data.last_episode_to_air ||
      data.first_episode_to_air ||
      data.original_name ||
      (data.name && !data.title)
      ? "tv"
      : "movie";
  }
  function mediaKey(data) {
    return mediaType(data) + "_" + data.id;
  }
  function getSource() {
    var value = Lampa.Storage.get("rating_source", "tmdb");
    return /^(tmdb|bylampa|lampa|kp|imdb)$/.test(value) ? value : "tmdb";
  }
  function unwrap(value) {
    return value && value.querySelector ? value : value && value[0];
  }
  function updateCard(item) {
    var card = unwrap(item.card || item.html || item);
    if (!card || !card.querySelector || !card.classList || !card.classList.contains("card")) return;
    var data = item.data || card.card_data;
    if (!data || data.id === undefined || data.id === null || data.media_type === "person") return;
    card.card_data = data;
    var source = getSource(),
      key = mediaKey(data);
    var badge = card.querySelector(".card__vote");
    if (!badge) badge = createBadge(card);
    if (
      badge.getAttribute("data-rating-source") === source &&
      badge.getAttribute("data-rating-key") === key
    )
      return;
    badge.setAttribute("data-rating-source", source);
    badge.setAttribute("data-rating-key", key);
    var token = {};
    badge.ratingRequestToken = token;
    badge.className = "card__vote rate--" + source;
    badge.textContent = "\u2026";
    function done(value) {
      if (
        badge.ratingRequestToken !== token ||
        getSource() !== source ||
        badge.getAttribute("data-rating-source") !== source ||
        badge.getAttribute("data-rating-key") !== key ||
        mediaKey(card.card_data || {}) !== key
      )
        return;
      var number = parseFloat(value);
      badge.textContent = isFinite(number) && number > 0 ? number.toFixed(1) : "\u2014";
      var icon = document.createElement("span");
      icon.className = "source--name";
      badge.appendChild(icon);
    }
    if (source === "tmdb") done(data.vote_average);
    else if (source === "bylampa") getByLampaRating(data, done);
    else if (source === "lampa") getLampaRating(data, done);
    else getKinopoiskRating(data, done);
  }
  function refreshCards() {
    var cards = document.querySelectorAll(".card");
    for (var i = 0; i < cards.length; i++) {
      var badge = cards[i].querySelector(".card__vote");
      if (badge) {
        badge.removeAttribute("data-rating-source");
        badge.removeAttribute("data-rating-key");
      }
      enqueueCard({ card: cards[i], data: cards[i].card_data });
    }
  }

  function addSettings() {
    Lampa.SettingsApi.addParam({
      component: "interface",
      param: {
        name: "rating_source",
        type: "select",
        values: {
          tmdb: "TMDB",
          bylampa: "ByLAMPA",
          lampa: "Lampa",
          kp: "\u041a\u0438\u043d\u043e\u041f\u043e\u0438\u0441\u043a",
          imdb: "IMDb",
        },
        default: "tmdb",
      },
      field: {
        name: "Источник рейтинга на карточках",
        description: "Выберите источник оценок на постерах",
      },
      onChange: function (value) {
        Lampa.Storage.set("rating_source", value);
        refreshCards();
      },
    });
    Lampa.SettingsApi.addParam({
      component: "interface",
      param: { name: "bylampa_rating_url", type: "input", values: "", default: "http://94.156.115.58:841" },
      field: {
        name: "Сервер рейтинга ByLAMPA",
        description:
          "Для HTTPS-версии Lampa нужен HTTPS-адрес этого API или вашего прокси. TMDB, Lampa и КиноПоиск не используют этот адрес.",
      },
      onChange: function (value) {
        Lampa.Storage.set("bylampa_rating_url", String(value || "").replace(/\/+$/, ""));
        refreshCards();
      },
    });
  }

  function addStyles() {
    var _0x481fdb = null,
      _0x152d87 = document["createElement"]("style");
    _0x152d87.type = "text/css";
    var _0x5d61c6 =
      ".card__vote[data-rating-source] {" +
      "    display: inline-flex !important;" +
      "\x20\x20\x20\x20align-items:\x20center\x20!important;" +
      "}" +
      ".card__vote\x20.source--name\x20{" +
      "    font-size: 0;" +
      "    color: transparent;" +
      "    display: inline-block;" +
      "    width: 16px;" +
      "\x20\x20\x20\x20height:\x2016px;" +
      "    background-repeat: no-repeat;" +
      "    background-position: center;" +
      "    background-size: contain;" +
      "    margin-left: 4px;" +
      "    flex-shrink: 0;" +
      "}" +
      "@media (min-width: 481px) {" +
      "    .card__vote[data-rating-source] .source--name {" +
      "        width: 24px;" +
      "\x20\x20\x20\x20\x20\x20\x20\x20height:\x2024px;" +
      "\x20\x20\x20\x20\x20\x20\x20\x20margin-left:\x206px;" +
      "    }" +
      "}" +
      ".rate--bylampa .source--name {" +
      "    background-image: url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z' fill='%23ffd700' stroke='%23ffd700' stroke-width='1'/%3E%3C/svg%3E\");" +
      "}" +
      ".rate--lampa .source--name {" +
      "    background-image: url(\"data:image/svg+xml,%3Csvg width='110' height='104' viewBox='0 0 110 104' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M81.6744 103.11C98.5682 93.7234 110 75.6967 110 55C110 24.6243 85.3757 0 55 0C24.6243 0 0 24.6243 0 55C0 75.6967 11.4318 93.7234 28.3255 103.11C14.8869 94.3724 6 79.224 6 62C6 34.938 27.938 13 55 13C82.062 13 104 34.938 104 62C104 79.224 95.1131 94.3725 81.6744 103.11Z' fill='white'/%3E%3Cpath d='M92.9546 80.0076C95.5485 74.5501 97 68.4446 97 62C97 38.804 78.196 20 55 20C31.804 20 13 38.804 13 62C13 68.4446 14.4515 74.5501 17.0454 80.0076C16.3618 77.1161 16 74.1003 16 71C16 49.4609 33.4609 32 55 32C76.5391 32 94 49.4609 94 71C94 74.1003 93.6382 77.1161 92.9546 80.0076Z' fill='white'/%3E%3Cpath d='M55 89C69.3594 89 81 77.3594 81 63C81 57.9297 79.5486 53.1983 77.0387 49.1987C82.579 54.7989 86 62.5 86 71C86 88.1208 72.1208 102 55 102C37.8792 102 24 88.1208 24 71C24 62.5 27.421 54.7989 32.9613 49.1987C30.4514 53.1983 29 57.9297 29 63C29 77.3594 40.6406 89 55 89Z' fill='white'/%3E%3Cpath d='M73 63C73 72.9411 64.9411 81 55 81C45.0589 81 37 72.9411 37 63C37 53.0589 45.0589 45 55 45C64.9411 45 73 53.0589 73 63Z' fill='white'/%3E%3C/svg%3E\");" +
      "}" +
      ".rate--tmdb .source--name {" +
      "\x20\x20\x20\x20background-image:\x20url(\x22data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20150%20150%22%20width%3D%22150%22%20height%3D%22150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22grad%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%220%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2390cea1%22%2F%3E%3Cstop%20offset%3D%2256%25%22%20stop-color%3D%22%233cbec9%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2300b3e5%22%2F%3E%3C%2FlinearGradient%3E%3Cstyle%3E%20.text-style%20%7B%20%20%20font-weight%3A%20bold%3B%20%20%20fill%3A%20url%28%23grad%29%3B%20%20%20text-anchor%3A%20start%3B%20%20%20dominant-baseline%3A%20middle%3B%20%20%20textLength%3A%20150%3B%20%20%20lengthAdjust%3A%20spacingAndGlyphs%3B%20%20%20font-size%3A%2070px%3B%20%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Ctext%20class%3D%22text-style%22%20x%3D%220%22%20y%3D%2250%22%20textLength%3D%22150%22%20lengthAdjust%3D%22spacingAndGlyphs%22%3ETM%3C%2Ftext%3E%3Ctext%20class%3D%22text-style%22%20x%3D%220%22%20y%3D%22120%22%20textLength%3D%22150%22%20lengthAdjust%3D%22spacingAndGlyphs%22%3EDB%3C%2Ftext%3E%3C%2Fsvg%3E\x22);" +
      "}" +
      ".rate--imdb .source--name {" +
      "    background-image: url(\"data:image/svg+xml,%3Csvg fill='%23ffcc00' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cg id='SVGRepo_bgCarrier' stroke-width='0'%3E%3C/g%3E%3Cg id='SVGRepo_tracerCarrier' stroke-linecap='round' stroke-linejoin='round'%3E%3C/g%3E%3Cg id='SVGRepo_iconCarrier'%3E%3Cpath d='M 0 7 L 0 25 L 32 25 L 32 7 Z M 2 9 L 30 9 L 30 23 L 2 23 Z M 5 11.6875 L 5 20.3125 L 7 20.3125 L 7 11.6875 Z M 8.09375 11.6875 L 8.09375 20.3125 L 10 20.3125 L 10 15.5 L 10.90625 20.3125 L 12.1875 20.3125 L 13 15.5 L 13 20.3125 L 14.8125 20.3125 L 14.8125 11.6875 L 12 11.6875 L 11.5 15.8125 L 10.8125 11.6875 Z M 15.90625 11.6875 L 15.90625 20.1875 L 18.3125 20.1875 C 19.613281 20.1875 20.101563 19.988281 20.5 19.6875 C 20.898438 19.488281 21.09375 19 21.09375 18.5 L 21.09375 13.3125 C 21.09375 12.710938 20.898438 12.199219 20.5 12 C 20 11.800781 19.8125 11.6875 18.3125 11.6875 Z M 22.09375 11.8125 L 22.09375 20.3125 L 23.90625 20.3125 C 23.90625 20.3125 23.992188 19.710938 24.09375 19.8125 C 24.292969 19.8125 25.101563 20.1875 25.5 20.1875 C 26 20.1875 26.199219 20.195313 26.5 20.09375 C 26.898438 19.894531 27 19.613281 27 19.3125 L 27 14.3125 C 27 13.613281 26.289063 13.09375 25.6875 13.09375 C 25.085938 13.09375 24.511719 13.488281 24.3125 13.6875 L 24.3125 11.8125 Z M 18 13 C 18.398438 13 18.8125 13.007813 18.8125 13.40625 L 18.8125 18.40625 C 18.8125 18.804688 18.300781 18.8125 18 18.8125 Z M 24.59375 14 C 24.695313 14 24.8125 14.105469 24.8125 14.40625 L 24.8125 18.6875 C 24.8125 18.886719 24.792969 19.09375 24.59375 19.09375 C 24.492188 19.09375 24.40625 18.988281 24.40625 18.6875 L 24.40625 14.40625 C 24.40625 14.207031 24.394531 14 24.59375 14 Z'/%3E%3C/g%3E%3C/svg%3E\");" +
      "}" +
      ".rate--kp .source--name {" +
      "    background-image: url(\"data:image/svg+xml,%3Csvg width='300' height='300' viewBox='0 0 300 300' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cmask id='mask0_1_69' style='mask-type:alpha' maskUnits='userSpaceOnUse' x='0' y='0' width='300' height='300'%3E%3Ccircle cx='150' cy='150' r='150' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_1_69)'%3E%3Ccircle cx='150' cy='150' r='150' fill='black'/%3E%3Cpath d='M300 45L145.26 127.827L225.9 45H181.2L126.3 121.203V45H89.9999V255H126.3V178.92L181.2 255H225.9L147.354 174.777L300 255V216L160.776 160.146L300 169.5V130.5L161.658 139.494L300 84V45Z' fill='url(%23paint0_radial_1_69)'/%3E%3C/g%3E%3Cdefs%3E%3CradialGradient id='paint0_radial_1_69' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(89.9999 45) rotate(45) scale(296.985)'%3E%3Cstop offset='0.5' stop-color='%23FF5500'/%3E%3Cstop offset='1' stop-color='%23BBFF00'/%3E%3C/radialGradient%3E%3C/defs%3E%3C/svg%3E\");" +
      "}";
    _0x5d61c6 = _0x5d61c6
      .replace(/\\"/g, '"')
      .replace(/\.card__vote(?!\[)/g, ".card__vote[data-rating-source]");
    (_0x152d87.styleSheet
      ? (_0x152d87.styleSheet.cssText = _0x5d61c6)
      : _0x152d87.appendChild(document.createTextNode(_0x5d61c6)),
      document["head"].appendChild(_0x152d87));
  }
  function start() {
    if (window.lampa_rating_plugin) return;
    window.lampa_rating_plugin = true;
    addSettings();
    addStyles();

    // Modern modular cards. Preserve arguments, return value and original behavior.
    if (Lampa.Maker && typeof Lampa.Maker.map === "function") {
      var map = Lampa.Maker.map("Card");
      if (map && map.Card) {
        ["onCreate", "onVisible"].forEach(function (name) {
          var original = map.Card[name];
          map.Card[name] = function () {
            var result =
              typeof original === "function" ? original.apply(this, arguments) : undefined;
            enqueueCard({ data: this.data, card: this.html });
            return result;
          };
        });
      }
    }

    // Older Lampa.Card constructors define visible on each instance.
    if (typeof Lampa.Card === "function") {
      var OriginalCard = Lampa.Card;
      function CompatibleCard() {
        var returned = OriginalCard.apply(this, arguments);
        var instance = returned && typeof returned === "object" ? returned : this;
        var visible = instance.visible;
        if (typeof visible === "function") {
          instance.visible = function () {
            var result = visible.apply(this, arguments);
            enqueueCard({
              data: this.data,
              card: this.card || this.html || (this.render && this.render(true)),
            });
            return result;
          };
        }
        return instance;
      }
      CompatibleCard.prototype = OriginalCard.prototype;
      for (var property in OriginalCard) {
        if (Object.prototype.hasOwnProperty.call(OriginalCard, property))
          CompatibleCard[property] = OriginalCard[property];
      }
      Lampa.Card = CompatibleCard;
    }

    // Cards already on screen and cards created by older/custom components.
    function enqueueTree(node) {
      if (!node || !node.querySelectorAll) return;
      if (node.classList && node.classList.contains("card"))
        enqueueCard({ card: node, data: node.card_data });
      var cards = node.querySelectorAll(".card");
      for (var i = 0; i < cards.length; i++)
        enqueueCard({ card: cards[i], data: cards[i].card_data });
    }
    if (window.MutationObserver && document.body) {
      var observer = new window.MutationObserver(function (records) {
        records.forEach(function (record) {
          for (var i = 0; i < record.addedNodes.length; i++) enqueueTree(record.addedNodes[i]);
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener(
      "visible",
      function (event) {
        var node = event.target;
        if (node && node.classList && node.classList.contains("card"))
          enqueueCard({ card: node, data: node.card_data });
      },
      true,
    );
    enqueueTree(document);
  }
  function boot() {
    if (!window.Lampa || !Lampa.Storage || !Lampa.SettingsApi) {
      setTimeout(boot, 200);
      return;
    }
    if (window.appready) start();
    else if (Lampa.Listener && typeof Lampa.Listener.follow === "function") {
      Lampa.Listener.follow("app", function (event) {
        if (event.type === "ready") start();
      });
    } else setTimeout(boot, 200);
  }
  boot();
})();

/* ===== Integrated: lampa_rating_icons_toggle.js ===== */
(function () {
    'use strict';

    var SETTING = 'rating_icons_show';
    var STYLE_ID = 'lampa-rating-icons-toggle-style';
    var HIDE_CLASS = 'lampa-rating-provider-icon-hidden';
    var observer = null;
    var rescanTimer = null;

    function boolValue(value, fallback) {
        if (value === undefined || value === null) return fallback;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return fallback;
    }

    function iconsEnabled() {
        return boolValue(Lampa.Storage.get(SETTING, true), true);
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = '.' + HIDE_CLASS + '{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;max-width:0!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;}';
        document.head.appendChild(style);
    }

    function providerHint(el) {
        if (!el || el.nodeType !== 1) return false;
        var attrs = [
            el.className || '', el.id || '',
            el.getAttribute('alt') || '', el.getAttribute('title') || '',
            el.getAttribute('aria-label') || '', el.getAttribute('data-source') || '',
            el.getAttribute('data-provider') || '', el.getAttribute('src') || ''
        ].join(' ').toLowerCase();
        return /(imdb|kinopoisk|kinopoisk|кинопоиск|kp[_-]?(?:logo|rate|rating)|tmdb|rottentomatoes|rotten[_-]?tomatoes|metacritic|letterboxd|trakt|mdblist|shikimori|myshows|rating[_-]?logo|rate[_-]?logo)/i.test(attrs);
    }

    function hasNumericRating(text) {
        return /\d(?:[\.,]\d)?/.test(String(text || '').replace(/\s+/g, ' ').trim());
    }

    function isCard(el) {
        return !!(el && el.nodeType === 1 && el.matches && el.matches('.card, .card--small, .card--wide, [class~="card"]'));
    }

    function closestCard(el) {
        if (!el || el.nodeType !== 1) return null;
        if (isCard(el)) return el;
        return el.closest ? el.closest('.card, .card--small, .card--wide, [class~="card"]') : null;
    }

    function ratingBoxes(card) {
        if (!card || !card.querySelectorAll) return [];
        var selectors = ['.card__rate','.card__rating','.card__vote','.card__vote-rate','.card__vote-number','[class^="card__rate-"]','[class*=" card__rate-"]','[class^="card__rating-"]','[class*=" card__rating-"]'].join(',');
        return Array.prototype.slice.call(card.querySelectorAll(selectors));
    }

    function markProviderIconsInBox(box) {
        if (!box || !box.querySelectorAll) return;
        var graphics = box.querySelectorAll('img,svg,picture');
        for (var i = 0; i < graphics.length; i++) {
            var graphic = graphics[i];
            var rect = null;
            try { rect = graphic.getBoundingClientRect(); } catch (e) {}
            var smallGraphic = !rect || ((rect.width || 0) <= 80 && (rect.height || 0) <= 80);
            if (providerHint(graphic) || smallGraphic) graphic.classList.add(HIDE_CLASS);
        }
        var children = box.querySelectorAll('span,i,b,em,div');
        for (var j = 0; j < children.length; j++) {
            var child = children[j];
            if (hasNumericRating(child.textContent)) continue;
            if (providerHint(child)) { child.classList.add(HIDE_CLASS); continue; }
            try {
                var cs = window.getComputedStyle(child);
                var bg = cs && cs.backgroundImage ? cs.backgroundImage : 'none';
                var rect2 = child.getBoundingClientRect();
                if (bg !== 'none' && rect2.width <= 80 && rect2.height <= 80) child.classList.add(HIDE_CLASS);
            } catch (e2) {}
        }
    }

    function scanCard(card) {
        if (!card || !card.querySelectorAll) return;
        var boxes = ratingBoxes(card);
        for (var i = 0; i < boxes.length; i++) markProviderIconsInBox(boxes[i]);
    }

    function scan(root) {
        if (iconsEnabled() || !root || !root.querySelectorAll) return;
        var ownCard = closestCard(root);
        if (ownCard) scanCard(ownCard);
        var cards = root.querySelectorAll('.card, .card--small, .card--wide, [class~="card"]');
        for (var i = 0; i < cards.length; i++) scanCard(cards[i]);
    }

    function clearMarks() {
        var marked = document.querySelectorAll('.' + HIDE_CLASS);
        for (var i = 0; i < marked.length; i++) marked[i].classList.remove(HIDE_CLASS);
    }

    function applySetting() {
        addStyles();
        clearMarks();
        if (!iconsEnabled()) scan(document.body);
    }

    function observeDom() {
        if (observer || typeof MutationObserver === 'undefined' || !document.body) return;
        observer = new MutationObserver(function (mutations) {
            if (iconsEnabled()) return;
            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes || [];
                for (var j = 0; j < nodes.length; j++) {
                    if (nodes[j] && nodes[j].nodeType === 1) scan(nodes[j]);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function rescanBurst() {
        if (rescanTimer) clearInterval(rescanTimer);
        var n = 0;
        rescanTimer = setInterval(function () {
            if (!iconsEnabled()) scan(document.body);
            n++;
            if (n >= 10) { clearInterval(rescanTimer); rescanTimer = null; }
        }, 500);
    }

    function startPlugin() {
        if (window.__lampa_rating_icons_toggle_fixed_loaded) return;
        window.__lampa_rating_icons_toggle_fixed_loaded = true;

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: SETTING, type: 'trigger', 'default': true },
            field: {
                name: 'Иконки возле рейтинга',
                description: 'Показывать логотипы IMDb, Кинопоиска и других источников только на карточках фильмов и сериалов'
            },
            onChange: function () { setTimeout(function () { applySetting(); rescanBurst(); }, 50); }
        });

        if (Lampa.Storage && Lampa.Storage.listener && Lampa.Storage.listener.follow) {
            Lampa.Storage.listener.follow('change', function (event) {
                if (!event) return;
                if (event.name === SETTING || event.name === 'activity') {
                    setTimeout(function () {
                        applySetting();
                        if (!iconsEnabled()) rescanBurst();
                    }, event.name === 'activity' ? 300 : 30);
                }
            });
        }

        addStyles();
        applySetting();
        observeDom();
        rescanBurst();
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();

