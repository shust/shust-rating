function seasonEpisodeCount(card, season) {
    season = n(season);
    if (!season || !card) return 0;

    // 1) Массив seasons из карточки TMDB
    if (Array.isArray(card.seasons)) {
        for (var i = 0; i < card.seasons.length; i++) {
            var s = card.seasons[i];
            if (!s) continue;
            var sn = n(s.season_number !== undefined ? s.season_number : s.season);
            if (sn === season) {
                var cnt = n(s.episode_count);
                if (cnt) return cnt;
            }
        }
    }

    // 2) number_of_episodes у самого сезона (если карточка — сезон)
    if (n(card.season_number) === season && n(card.number_of_episodes)) {
        return n(card.number_of_episodes);
    }

    // 3) fallback — последний известный эпизод сезона
    var candidates = [card.last_episode_to_air, card.last_episode, card.last_aired_episode];
    for (var j = 0; j < candidates.length; j++) {
        var ep = candidates[j];
        if (!ep) continue;
        var es = n(ep.season_number !== undefined ? ep.season_number : ep.season);
        var ee = n(ep.episode_number !== undefined ? ep.episode_number : ep.episode);
        if (es === season && ee) return ee;
    }

    return 0;
}
