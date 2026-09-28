/*
    Lampa ratings plugin — rating-only build.

    Rating sources:
    - Kinopoisk: kinopoiskapiunofficial.tech
    - IMDb / Rotten Tomatoes / Metacritic / awards: OMDb API

    API keys can be supplied through:
      window.RATINGS_PLUGIN_TOKENS.OMDB_API_KEYS
      window.RATINGS_PLUGIN_TOKENS.KP_API_KEYS

    This build contains only rating-related functionality.
*/

(function() {
    'use strict';

    var star_svg = '<svg viewBox="5 5 54 54" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="white" stroke-width="2" d="M32 18.7461L36.2922 27.4159L46.2682 28.6834L38.9675 35.3631L40.7895 44.8469L32 40.2489L23.2105 44.8469L25.0325 35.3631L17.7318 28.6834L27.7078 27.4159L32 18.7461ZM32 23.2539L29.0241 29.2648L22.2682 30.1231L27.2075 34.6424L25.9567 41.1531L32 37.9918L38.0433 41.1531L36.7925 34.6424L41.7318 30.1231L34.9759 29.2648L32 23.2539Z"/><path fill="none" stroke="white" stroke-width="2" d="M32 9C19.2975 9 9 19.2975 9 32C9 44.7025 19.2975 55 32 55C44.7025 55 55 44.7025 55 32C55 19.2975 44.7025 9 32 9ZM7 32C7 18.1929 18.1929 7 32 7C45.8071 7 57 18.1929 57 32C57 45.8071 45.8071 57 32 57C18.1929 57 7 45.8071 7 32Z"/></svg>';

    var tmdb_svg = '<svg width="202" height="202" viewBox="0 0 202 202" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1219_22)"><path d="M201.5 0.5H0.5V201.5H201.5V0.5Z" fill="#0D253F"/><g clip-path="url(#clip1_1219_22)"><path d="M109.536 97.0107H162.904C166.641 97.0107 170.225 95.5267 172.869 92.885C175.512 90.2432 176.998 86.6599 177 82.9228C177 79.1844 175.515 75.599 172.871 72.9556C170.228 70.3121 166.643 68.827 162.904 68.827H109.536C105.798 68.827 102.212 70.3121 99.5687 72.9556C96.9253 75.599 95.4402 79.1844 95.4402 82.9228C95.4423 86.6599 96.9283 90.2432 99.5716 92.885C102.215 95.5267 105.799 97.0107 109.536 97.0107ZM39.3359 132.909H100.681C104.418 132.909 108.002 131.425 110.646 128.783C113.289 126.141 114.775 122.558 114.777 118.821C114.777 115.082 113.292 111.497 110.649 108.853C108.005 106.21 104.42 104.725 100.681 104.725H39.3359C35.5974 104.725 32.0121 106.21 29.3686 108.853C26.7251 111.497 25.24 115.082 25.24 118.821C25.2421 122.558 26.7281 126.141 29.3714 128.783C32.0147 131.425 35.5988 132.909 39.3359 132.909ZM33.5444 96.5002H39.7666V73.7649H47.8237V68.2446H25.4873V73.749H33.5444V96.5002ZM55.9605 96.5002H62.1828V74.8259H62.2626L69.4422 96.4842H74.2285L81.6474 74.8259H81.7272V96.4842H87.9495V68.2446H78.4964L71.955 86.6722H71.8752L65.3737 68.2446H55.9605V96.5002ZM146.838 112.654C146.006 110.919 144.769 109.409 143.232 108.251C141.637 107.085 139.826 106.249 137.903 105.794C135.798 105.268 133.636 105 131.466 104.996H122.132V133.236H132.303C134.346 133.245 136.379 132.936 138.326 132.318C140.165 131.759 141.883 130.86 143.392 129.67C144.859 128.479 146.049 126.981 146.878 125.282C147.774 123.395 148.219 121.325 148.178 119.235C148.243 116.968 147.784 114.716 146.838 112.654ZM140.911 122.969C140.444 124.033 139.72 124.965 138.805 125.681C137.853 126.381 136.766 126.875 135.614 127.133C134.306 127.434 132.967 127.582 131.625 127.572H128.394V110.819H132.064C133.323 110.813 134.577 110.982 135.789 111.322C136.905 111.623 137.954 112.129 138.884 112.814C139.737 113.485 140.43 114.338 140.911 115.311C141.459 116.432 141.732 117.668 141.708 118.916C141.743 120.309 141.471 121.693 140.911 122.969ZM176.513 122.865C176.232 122.094 175.804 121.384 175.253 120.775C174.705 120.169 174.051 119.669 173.322 119.299C172.528 118.898 171.674 118.629 170.794 118.502V118.422C172.162 118.029 173.387 117.247 174.32 116.172C175.239 115.051 175.716 113.632 175.66 112.184C175.72 110.884 175.401 109.596 174.742 108.474C174.142 107.56 173.318 106.813 172.349 106.304C171.307 105.766 170.178 105.415 169.015 105.267C167.794 105.093 166.562 105.005 165.329 105.004H154.799V133.244H166.366C167.632 133.244 168.894 133.111 170.132 132.845C171.336 132.604 172.491 132.158 173.546 131.528C174.544 130.933 175.391 130.114 176.019 129.135C176.691 128.009 177.024 126.713 176.976 125.402C176.977 124.537 176.829 123.679 176.537 122.865H176.513ZM161.021 110.301H165.249C165.745 110.303 166.239 110.351 166.725 110.444C167.197 110.529 167.654 110.683 168.081 110.899C168.476 111.114 168.81 111.424 169.055 111.801C169.324 112.236 169.457 112.741 169.438 113.253C169.449 113.753 169.331 114.247 169.094 114.688C168.879 115.076 168.573 115.404 168.201 115.646C167.814 115.891 167.388 116.066 166.941 116.164C166.478 116.273 166.004 116.327 165.529 116.324H161.021V110.301ZM170.371 126.255C170.131 126.672 169.798 127.027 169.398 127.293C168.992 127.565 168.537 127.755 168.057 127.851C167.581 127.958 167.094 128.012 166.606 128.01H161.021V121.629H165.728C166.262 121.634 166.795 121.674 167.324 121.748C167.885 121.825 168.434 121.973 168.959 122.187C169.448 122.392 169.879 122.715 170.211 123.128C170.558 123.586 170.736 124.15 170.714 124.724C170.739 125.256 170.621 125.785 170.371 126.255Z" fill="url(#paint0_linear_1219_22)"/></g></g><defs><linearGradient id="paint0_linear_1219_22" x1="25.24" y1="100.76" x2="177" y2="100.76" gradientUnits="userSpaceOnUse"><stop stop-color="#90CEA1"/><stop offset="0.56" stop-color="#3CBEC9"/><stop offset="1" stop-color="#00B3E5"/></linearGradient><clipPath id="clip0_1219_22"><rect width="202" height="202" fill="white"/></clipPath><clipPath id="clip1_1219_22"><rect width="151.76" height="65.0309" fill="white" transform="translate(25.24 68.2446)"/></clipPath></defs></svg>';

    var imdb_svg = '<svg width="202" height="202" viewBox="0 0 202 202" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1219_6)"><path d="M201.5 0.5H0.5V201.5H201.5V0.5Z" fill="#F5C518"/><path d="M25.25 72.5938V129.406H41.0312V72.5938H25.25Z" fill="black"/><path d="M74.7164 72.5938L71.1844 99.133L68.9899 84.698C68.3537 80.0744 67.7434 76.0396 67.159 72.5938H47.3438V129.406H60.7314L60.7833 91.8905L66.4189 129.406H75.95L81.2998 91.0635L81.3388 129.406H94.6875V72.5938H74.7164Z" fill="black"/><path d="M101 129.406V72.5938H125.633C131.203 72.5938 135.719 77.0754 135.719 82.6199V119.38C135.719 124.917 131.211 129.406 125.633 129.406H101ZM119.408 82.8185C118.782 82.4802 117.585 82.3173 115.843 82.3173V119.595C118.142 119.595 119.558 119.182 120.088 118.317C120.619 117.465 120.891 115.159 120.891 111.375V89.3468C120.891 86.7781 120.796 85.1366 120.619 84.4098C120.442 83.6831 120.048 83.1568 119.408 82.8185Z" fill="black"/><path d="M165.482 86.8185H166.491C172.157 86.8185 176.75 91.2556 176.75 96.7229V119.502C176.75 124.972 172.158 129.406 166.491 129.406H165.482C162.015 129.406 158.95 127.745 157.092 125.203L156.184 128.676H142.031V72.5938H157.132V90.8386C159.083 88.4071 162.09 86.8185 165.482 86.8185ZM162.249 114.522V101.06C162.249 98.8359 162.106 97.3762 161.809 96.7042C161.511 96.0323 160.324 95.6009 159.491 95.6009C158.658 95.6009 157.373 95.9515 157.123 96.5423V119.33C157.409 119.979 158.634 120.34 159.491 120.34C160.347 120.34 161.594 119.99 161.856 119.33C162.118 118.67 162.249 117.059 162.249 114.522Z" fill="black"/></g><defs><clipPath id="clip0_1219_6"><rect width="202" height="202" fill="white"/></clipPath></defs></svg>';

    var kp_svg = '<svg width="202" height="202" viewBox="0 0 202 202" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1219_2)"><path d="M202 0H0V202H202V0Z" fill="#262626"/><path d="M161 41L72.5771 88.3297L118.657 41H93.1143L61.7429 84.5446V41H41V161H61.7429V117.526L93.1143 161H118.657L73.7737 115.158L161 161V138.714L81.4434 106.798L161 112.143V89.8571L81.9474 94.9966L161 63.2857V41Z" fill="url(#paint0_radial_1219_2)"/></g><defs><radialGradient id="paint0_radial_1219_2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(41 41) rotate(45) scale(169.706)"><stop offset="0.5" stop-color="#FF5500"/><stop offset="1" stop-color="#BBFF00"/></radialGradient><clipPath id="clip0_1219_2"><rect width="202" height="202" fill="white"/></clipPath></defs></svg>';


    Lampa.Lang.add({
        maxsm_ratings: {
            ru: 'Рейтинги',
            en: 'Ratings',
            uk: 'Рейтинги',
            be: 'Рэйтынгі',
            pt: 'Classificações',
            zh: '评分',
            he: 'דירוגים',
            cs: 'Hodnocení',
            bg: 'Рейтинги'
        },

        maxsm_ratings_cc: {
            ru: 'Очистить локальный кеш',
            en: 'Clear local cache',
            uk: 'Очистити локальний кеш',
            be: 'Ачысціць лакальны кэш',
            pt: 'Limpar cache local',
            zh: '清除本地缓存',
            he: 'נקה מטמון מקומי',
            cs: 'Vymazat místní mezipaměť',
            bg: 'Изчистване на локалния кеш'
        },

        maxsm_ratings_critic: {
            ru: 'Оценки критиков',
            en: 'Critic Ratings',
            uk: 'Оцінки критиків',
            be: 'Ацэнкі крытыкаў',
            pt: 'Avaliações da crítica',
            zh: '影评人评分',
            he: 'דירוגי מבקרים',
            cs: 'Hodnocení kritiků',
            bg: 'Оценки на критиците'
        },

        maxsm_ratings_mode: {
            ru: 'Средний рейтинг',
            en: 'Average rating',
            uk: 'Середній рейтинг',
            be: 'Сярэдні рэйтынг',
            pt: 'Classificação média',
            zh: '平均评分',
            he: 'דירוג ממוצע',
            cs: 'Průměrné hodnocení',
            bg: 'Среден рейтинг'
        },

        maxsm_ratings_mode_normal: {
            ru: 'Показывать средний рейтинг',
            en: 'Show average rating',
            uk: 'Показувати середній рейтинг',
            be: 'Паказваць сярэдні рэйтынг',
            pt: 'Mostrar classificação média',
            zh: '显示平均评分',
            he: 'הצג דירוג ממוצע',
            cs: 'Zobrazit průměrné hodnocení',
            bg: 'Показване на среден рейтинг'
        },

        maxsm_ratings_mode_simple: {
            ru: 'Только средний рейтинг',
            en: 'Only average rating',
            uk: 'Лише середній рейтинг',
            be: 'Толькі сярэдні рэйтынг',
            pt: 'Apenas classificação média',
            zh: '仅显示平均评分',
            he: 'רק דירוג ממוצע',
            cs: 'Pouze průměrné hodnocení',
            bg: 'Само среден рейтинг'
        },

        maxsm_ratings_mode_noavg: {
            ru: 'Без среднего рейтинга',
            en: 'No average',
            uk: 'Без середнього рейтингу',
            be: 'Без сярэдняга рэйтынгу',
            pt: 'Sem média',
            zh: '无平均值',
            he: 'ללא ממוצע',
            cs: 'Bez průměru',
            bg: 'Без среден рейтинг'
        },

        maxsm_ratings_icons: {
            ru: 'Иконки вместо текста',
            en: 'Icons instead of text',
            uk: 'Іконки замість тексту',
            be: 'Іконкі замест тэксту',
            pt: 'Ícones em vez de texto',
            zh: '使用图标代替文字',
            he: 'סמלים במקום טקסט',
            cs: 'Ikony místo textu',
            bg: 'Икони вместо текст'
        },

        maxsm_ratings_source_kp: {
            ru: 'Кинопоиск',
            en: 'Kinopoisk',
            uk: 'Кінопошук',
            be: 'Кінапошук',
            pt: 'Kinopoisk',
            zh: 'Kinopoisk',
            he: 'Kinopoisk',
            cs: 'Kinopoisk',
            bg: 'Kinopoisk'
        },

        maxsm_ratings_source_tmdb: {
            ru: 'TMDB',
            en: 'TMDB',
            uk: 'TMDB',
            be: 'TMDB',
            pt: 'TMDB',
            zh: 'TMDB',
            he: 'TMDB',
            cs: 'TMDB',
            bg: 'TMDB'
        },

        maxsm_ratings_source_imdb: {
            ru: 'IMDb',
            en: 'IMDb',
            uk: 'IMDb',
            be: 'IMDb',
            pt: 'IMDb',
            zh: 'IMDb',
            he: 'IMDb',
            cs: 'IMDb',
            bg: 'IMDb'
        },

        maxsm_ratings_colors: {
            ru: 'Цвета',
            en: 'Colors',
            uk: 'Кольори',
            be: 'Колеры',
            pt: 'Cores',
            zh: '颜色',
            he: 'צבעים',
            cs: 'Barvy',
            bg: 'Цветове'
        },

        maxsm_ratings_avg: {
            ru: 'ИТОГ',
            en: 'TOTAL',
            uk: 'ПІДСУМОК',
            be: 'ВЫНІК',
            pt: 'TOTAL',
            zh: '总评',
            he: 'סה"כ',
            cs: 'VÝSLEDEK',
            bg: 'РЕЗУЛТАТ'
        },

        maxsm_ratings_avg_simple: {
            ru: 'Оценка',
            en: 'Rating',
            uk: 'Оцінка',
            be: 'Ацэнка',
            pt: 'Avaliação',
            zh: '评分',
            he: 'דירוג',
            cs: 'Hodnocení',
            bg: 'Оценка'
        },

        maxsm_ratings_oscars: {
            ru: 'Оскар',
            en: 'Oscar',
            uk: 'Оскар',
            be: 'Оскар',
            pt: 'Oscar',
            zh: '奥斯卡奖',
            he: 'אוסקר',
            cs: 'Oscar',
            bg: 'Оскар'
        },

        maxsm_ratings_emmy: {
            ru: 'Эмми',
            en: 'Emmy',
            uk: 'Еммі',
            be: 'Эммі',
            pt: 'Emmy',
            zh: '艾美奖',
            he: 'אמי',
            cs: 'Emmy',
            bg: 'Еми'
        },

        maxsm_ratings_awards: {
            ru: 'Награды',
            en: 'Awards',
            uk: 'Нагороди',
            be: 'Узнагароды',
            pt: 'Prêmios',
            zh: '奖项',
            he: 'פרסים',
            cs: 'Ocenění',
            bg: 'Награди'
        }
    });


    var modalStyle = "<style id=\"maxsm_ratings_modal\">" +
        ".maxsm-modal-ratings {" +
            "padding: 1.25em;" +
            "font-size: 1.4em;" +
            "line-height: 1.6;" +
        "}" +
        ".maxsm-modal-rating-line {" +
            "padding: 0.5em 0;" +
            "border-bottom: 0.0625em solid rgba(255,255,255,0.1);" +
        "}" +
        ".maxsm-modal-rating-line:last-child {" +
            "border-bottom: none;" +
        "}" +
        ".maxsm-modal-imdb { color: #f5c518; }" +
        ".maxsm-modal-kp { color: #4CAF50; }" +
        ".maxsm-modal-tmdb { color: #01b4e4; }" +
        ".maxsm-modal-rt { color: #fa320a; }" +
        ".maxsm-modal-mc { color: #6dc849; }" +
        ".maxsm-modal-oscars, .maxsm-modal-emmy, .maxsm-modal-awards { color: #FFD700; }" +
    "</style>";

    Lampa.Template.add('maxsm_ratings_modal', modalStyle);
    $('body').append(Lampa.Template.get('maxsm_ratings_modal', {}, true));


    var style = "<style id=\"maxsm_ratings\">" +

        ".full-start-new__rate-line {" +
            "visibility: hidden;" +
            "flex-wrap: wrap;" +
            "gap: 0.4em 0;" +
        "}" +

        ".full-start-new__rate-line > * {" +
            "margin-right: 0.75em !important;" +
        "}" +

        ".rate--green { color: #4caf50; }" +
        ".rate--lime { color: #cddc39; }" +
        ".rate--orange { color: #ff9800; }" +
        ".rate--red { color: #f44336; }" +
        ".rate--gold { color: gold; }" +

        ".maxsm-icon-container {" +
            "display: inline-flex;" +
            "align-items: center;" +
            "justify-content: center;" +
            "width: 1.6em;" +
            "height: 1.6em;" +
            "padding: 0 !important;" +
            "margin: 0 !important;" +
            "overflow: hidden;" +
            "vertical-align: middle;" +
            "border-radius: 15%;" +
            "line-height: 0;" +
            "background: transparent !important;" +
            "box-shadow: none !important;" +
        "}" +

        ".maxsm-icon-container svg {" +
            "display: block;" +
            "width: 100%;" +
            "height: 100%;" +
            "object-fit: contain;" +
            "border-radius: 15%;" +
        "}" +

        ".rate--icon {" +
            "display: inline-flex;" +
            "align-items: center;" +
            "justify-content: center;" +
            "padding: 0 !important;" +
            "margin: 0 !important;" +
            "min-width: 1.8em;" +
            "height: 1.8em;" +
            "background: transparent !important;" +
            "background-color: transparent !important;" +
            "box-shadow: none !important;" +
            "border: 0 !important;" +
        "}" +

        ".full-start__rate {" +
            "display: flex;" +
            "align-items: center;" +
            "padding: 0 !important;" +
            "background: transparent !important;" +
            "background-color: transparent !important;" +
            "box-shadow: none !important;" +
            "border: 0 !important;" +
        "}" +

        ".full-start__rate > div," +
        ".full-start__rate > span {" +
            "padding: 0 !important;" +
            "margin: 0 !important;" +
            "background: transparent !important;" +
            "background-color: transparent !important;" +
            "box-shadow: none !important;" +
            "border: 0 !important;" +
            "border-radius: 0 !important;" +
        "}" +

        ".full-start-new__rate-line .full-start__rate {" +
            "padding: 0 !important;" +
            "min-width: 0 !important;" +
            "min-height: 0 !important;" +
            "width: auto !important;" +
            "height: auto !important;" +
        "}" +

        ".full-start-new__rate-line .full-start__rate > div," +
        ".full-start-new__rate-line .full-start__rate > span {" +
            "padding: 0 !important;" +
            "min-width: 0 !important;" +
            "min-height: 0 !important;" +
        "}" +

        ".maxsm-source-disabled {" +
            "display: none !important;" +
        "}" +

        ".rate--avg > div:first-child," +
        ".rate--tmdb > div:first-child," +
        ".rate--imdb > div:first-child," +
        ".rate--kp > div:first-child," +
        ".rate--rt > div:first-child," +
        ".rate--mc > div:first-child {" +
            "font-size: 1.3em !important;" +
            "font-weight: 700 !important;" +
            "line-height: 1.1;" +
        "}" +

    "</style>";

    Lampa.Template.add('maxsm_ratings_css', style);
    $('body').append(Lampa.Template.get('maxsm_ratings_css', {}, true));


    var globalCurrentCard = null;

    var C_LOGGING = false;

    var CACHE_TIME =
        3 * 24 * 60 * 60 * 1000;

    var OMDB_CACHE =
        'maxsm_ratings_omdb_cache';

    var KP_CACHE =
        'maxsm_ratings_kp_cache';

    var ID_MAPPING_CACHE =
        'maxsm_ratings_id_mapping_cache';

    var OMDB_API_KEYS =
        (
            window.RATINGS_PLUGIN_TOKENS &&
            window.RATINGS_PLUGIN_TOKENS.OMDB_API_KEYS
        ) || ['YOU_KEY'];

    var KP_API_KEYS =
        (
            window.RATINGS_PLUGIN_TOKENS &&
            window.RATINGS_PLUGIN_TOKENS.KP_API_KEYS
        ) || ['YOU_KEY'];

    var PROXY_TIMEOUT = 5000;

    var PROXY_LIST = [
        'https://cors.bwa.workers.dev/',
        'https://api.allorigins.win/raw?url='
    ];


    var AGE_RATINGS = {
        'G': '3+',
        'PG': '6+',
        'PG-13': '13+',
        'R': '17+',
        'NC-17': '18+',
        'TV-Y': '0+',
        'TV-Y7': '7+',
        'TV-G': '3+',
        'TV-PG': '6+',
        'TV-14': '14+',
        'TV-MA': '17+'
    };


    var WEIGHTS = {
        imdb: 0.35,
        tmdb: 0.15,
        kp: 0.20,
        mc: 0.15,
        rt: 0.15
    };


    function getRandomToken(arr) {
        if (!arr || !arr.length) {
            return '';
        }

        return arr[
            Math.floor(
                Math.random() * arr.length
            )
        ];
    }


    function parseAwards(awardsText, localCurrentCard) {
        if (typeof awardsText !== 'string') {
            return null;
        }

        if (C_LOGGING) {
            console.log(
                "MAXSM-RATINGS",
                "card: " +
                localCurrentCard +
                ", Parse awards: " +
                awardsText
            );
        }

        var result = {
            oscars: 0,
            emmy: 0,
            awards: 0
        };

        var oscarMatch =
            awardsText.match(
                /Won (\d+) Oscars?/i
            );

        if (
            oscarMatch &&
            oscarMatch[1]
        ) {
            result.oscars =
                parseInt(
                    oscarMatch[1],
                    10
                );
        }

        var emmyMatch =
            awardsText.match(
                /Won (\d+) Primetime Emmys?/i
            );

        if (
            emmyMatch &&
            emmyMatch[1]
        ) {
            result.emmy =
                parseInt(
                    emmyMatch[1],
                    10
                );
        }

        var otherMatch =
            awardsText.match(
                /Another (\d+) wins?/i
            );

        if (
            otherMatch &&
            otherMatch[1]
        ) {
            result.awards =
                parseInt(
                    otherMatch[1],
                    10
                );
        }

        if (result.awards === 0) {
            var simpleMatch =
                awardsText.match(
                    /(\d+) wins?/i
                );

            if (
                simpleMatch &&
                simpleMatch[1]
            ) {
                result.awards =
                    parseInt(
                        simpleMatch[1],
                        10
                    );
            }
        }

        return result;
    }


    function fetchWithProxy(
        url,
        localCurrentCard,
        callback
    ) {
        var currentProxy = 0;
        var callbackCalled = false;

        function tryNextProxy() {
            if (
                currentProxy >=
                PROXY_LIST.length
            ) {
                if (!callbackCalled) {
                    callbackCalled = true;

                    callback(
                        new Error(
                            'All proxies failed'
                        )
                    );
                }

                return;
            }

            var proxyUrl =
                PROXY_LIST[currentProxy] +
                encodeURIComponent(url);

            var timeoutId =
                setTimeout(
                    function() {
                        if (
                            !callbackCalled
                        ) {
                            currentProxy++;
                            tryNextProxy();
                        }
                    },
                    PROXY_TIMEOUT
                );

            fetch(proxyUrl)
                .then(function(response) {
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(
                            'Proxy error: ' +
                            response.status
                        );
                    }

                    return response.text();
                })
                .then(function(data) {
                    if (!callbackCalled) {
                        callbackCalled = true;

                        clearTimeout(
                            timeoutId
                        );

                        callback(
                            null,
                            data
                        );
                    }
                })
                .catch(function() {
                    clearTimeout(
                        timeoutId
                    );

                    if (!callbackCalled) {
                        currentProxy++;
                        tryNextProxy();
                    }
                });
        }

        tryNextProxy();
    }


    function getKPRatings(
        normalizedCard,
        apiKey,
        localCurrentCard,
        callback
    ) {
        if (
            normalizedCard.kinopoisk_id
        ) {
            return fetchRatings(
                normalizedCard.kinopoisk_id,
                localCurrentCard
            );
        }

        var queryTitle =
            (
                normalizedCard.original_title ||
                normalizedCard.title ||
                ''
            )
            .replace(
                /[:\-–—]/g,
                ' '
            )
            .trim();

        var year = '';

        if (
            normalizedCard.release_date &&
            typeof normalizedCard.release_date ===
                'string'
        ) {
            year =
                normalizedCard
                    .release_date
                    .split('-')[0];
        }

        if (!year) {
            callback(null);
            return;
        }

        var encodedTitle =
            encodeURIComponent(
                queryTitle
            );

        var searchUrl =
            'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' +
            encodedTitle;

        fetch(
            searchUrl,
            {
                method: 'GET',

                headers: {
                    'X-API-KEY':
                        apiKey,

                    'Content-Type':
                        'application/json'
                }
            }
        )
        .then(function(response) {
            if (!response.ok) {
                throw new Error(
                    'HTTP error: ' +
                    response.status
                );
            }

            return response.json();
        })
        .then(function(data) {
            if (
                !data.films ||
                !data.films.length
            ) {
                callback(null);
                return;
            }

            var bestMatch = null;
            var filmYear;
            var targetYear;
            var film;

            for (
                var i = 0;
                i < data.films.length;
                i++
            ) {
                film =
                    data.films[i];

                if (!film.year) {
                    continue;
                }

                filmYear =
                    parseInt(
                        film.year.substring(
                            0,
                            4
                        ),
                        10
                    );

                targetYear =
                    parseInt(
                        year,
                        10
                    );

                if (
                    isNaN(filmYear) ||
                    isNaN(targetYear)
                ) {
                    continue;
                }

                if (
                    filmYear ===
                    targetYear
                ) {
                    bestMatch = film;
                    break;
                }
            }

            if (!bestMatch) {
                for (
                    var j = 0;
                    j < data.films.length;
                    j++
                ) {
                    film =
                        data.films[j];

                    if (!film.year) {
                        continue;
                    }

                    filmYear =
                        parseInt(
                            film.year.substring(
                                0,
                                4
                            ),
                            10
                        );

                    targetYear =
                        parseInt(
                            year,
                            10
                        );

                    if (
                        isNaN(filmYear) ||
                        isNaN(targetYear)
                    ) {
                        continue;
                    }

                    if (
                        Math.abs(
                            filmYear -
                            targetYear
                        ) <= 1
                    ) {
                        bestMatch =
                            film;

                        break;
                    }
                }
            }

            if (
                !bestMatch ||
                !bestMatch.filmId
            ) {
                callback(null);
                return;
            }

            fetchRatings(
                bestMatch.filmId,
                localCurrentCard
            );
        })
        .catch(function() {
            callback(null);
        });


        function fetchRatings(
            filmId,
            localCurrentCard
        ) {
            var xmlUrl =
                'https://rating.kinopoisk.ru/' +
                filmId +
                '.xml';

            fetchWithProxy(
                xmlUrl,
                localCurrentCard,

                function(
                    error,
                    xmlText
                ) {
                    if (
                        !error &&
                        xmlText
                    ) {
                        try {
                            var parser =
                                new DOMParser();

                            var xmlDoc =
                                parser
                                .parseFromString(
                                    xmlText,
                                    'text/xml'
                                );

                            var kpRatingNode =
                                xmlDoc
                                .getElementsByTagName(
                                    'kp_rating'
                                )[0];

                            var imdbRatingNode =
                                xmlDoc
                                .getElementsByTagName(
                                    'imdb_rating'
                                )[0];

                            var kpRating =
                                kpRatingNode
                                    ? parseFloat(
                                        kpRatingNode
                                            .textContent
                                      )
                                    : null;

                            var imdbRating =
                                imdbRatingNode
                                    ? parseFloat(
                                        imdbRatingNode
                                            .textContent
                                      )
                                    : null;

                            var hasValidKp =
                                !isNaN(
                                    kpRating
                                ) &&
                                kpRating > 0;

                            var hasValidImdb =
                                !isNaN(
                                    imdbRating
                                ) &&
                                imdbRating > 0;

                            if (
                                hasValidKp ||
                                hasValidImdb
                            ) {
                                callback({
                                    kinopoisk:
                                        hasValidKp
                                            ? kpRating
                                            : null,

                                    imdb:
                                        hasValidImdb
                                            ? imdbRating
                                            : null
                                });

                                return;
                            }
                        }
                        catch (e) {}
                    }

                    fetch(
                        'https://kinopoiskapiunofficial.tech/api/v2.2/films/' +
                        filmId,

                        {
                            headers: {
                                'X-API-KEY':
                                    apiKey
                            }
                        }
                    )
                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error(
                                'API error'
                            );
                        }

                        return response.json();
                    })
                    .then(function(data) {
                        callback({
                            kinopoisk:
                                data.ratingKinopoisk ||
                                null,

                            imdb:
                                data.ratingImdb ||
                                null
                        });
                    })
                    .catch(function() {
                        callback(null);
                    });
                }
            );
        }
    }


    function getCardType(card) {
        var type =
            card.media_type ||
            card.type;

        if (
            type === 'movie' ||
            type === 'tv'
        ) {
            return type;
        }

        return (
            card.name ||
            card.original_name
        )
            ? 'tv'
            : 'movie';
    }


    function getRatingClass(rating) {
        if (rating >= 8.5) {
            return 'rate--green';
        }

        if (rating >= 7.0) {
            return 'rate--lime';
        }

        if (rating >= 5.0) {
            return 'rate--orange';
        }

        return 'rate--red';
    }


    function isRatingSourceEnabled(source) {
        var keyMap = {
            kp:
                'maxsm_ratings_source_kp',

            tmdb:
                'maxsm_ratings_source_tmdb',

            imdb:
                'maxsm_ratings_source_imdb'
        };

        var key =
            keyMap[source];

        return (
            !key ||
            localStorage.getItem(key) !==
                'false'
        );
    }


    function applyRatingSourceVisibility(
        render
    ) {
        if (!render) {
            return;
        }

        $('.rate--kp', render)
            .toggleClass(
                'maxsm-source-disabled',
                !isRatingSourceEnabled(
                    'kp'
                )
            );

        $('.rate--tmdb', render)
            .toggleClass(
                'maxsm-source-disabled',
                !isRatingSourceEnabled(
                    'tmdb'
                )
            );

        $('.rate--imdb', render)
            .toggleClass(
                'maxsm-source-disabled',
                !isRatingSourceEnabled(
                    'imdb'
                )
            );
    }


    function refreshRatingSourceSettings() {
        try {
            var active =
                Lampa.Activity.active();

            if (
                !active ||
                !active.activity
            ) {
                return;
            }

            var render =
                active.activity.render();

            if (!render) {
                return;
            }

            applyRatingSourceVisibility(
                render
            );

            var mode =
                parseInt(
                    localStorage.getItem(
                        'maxsm_ratings_mode'
                    ),
                    10
                );

            if (mode !== 2) {
                calculateAverageRating(
                    globalCurrentCard,
                    render
                );
            }

            insertIcons(
                globalCurrentCard,
                render
            );
        }
        catch (e) {
            if (C_LOGGING) {
                console.warn(
                    'MAXSM-RATINGS',
                    'Unable to refresh source visibility',
                    e
                );
            }
        }
    }


    function fetchAdditionalRatings(
        card,
        render
    ) {
        if (!render) {
            return;
        }

        var localCurrentCard =
            card.id;

        var normalizedCard = {
            id:
                card.id,

            tmdb:
                card.vote_average ||
                null,

            kinopoisk_id:
                card.kinopoisk_id,

            imdb_id:
                card.imdb_id ||
                card.imdb ||
                null,

            title:
                card.title ||
                card.name ||
                '',

            original_title:
                card.original_title ||
                card.original_name ||
                '',

            type:
                getCardType(card),

            release_date:
                card.release_date ||
                card.first_air_date ||
                ''
        };

        var rateLine =
            $('.full-start-new__rate-line',
              render);

        if (rateLine.length) {
            rateLine.css(
                'visibility',
                'hidden'
            );

            rateLine.addClass(
                'done'
            );
        }

        var cacheKey =
            normalizedCard.type +
            '_' +
            (
                normalizedCard.imdb_id ||
                normalizedCard.id
            );

        var cachedData =
            getOmdbCache(
                cacheKey
            );

        var cachedKpData =
            getKpCache(
                cacheKey
            );

        var ratingsData = {};


        if (cachedKpData) {
            ratingsData.kp =
                cachedKpData.kp;

            ratingsData.imdb_kp =
                cachedKpData.imdb;

            processNextStep();
        }
        else {
            getKPRatings(
                normalizedCard,
                getRandomToken(
                    KP_API_KEYS
                ),
                localCurrentCard,

                function(kpRatings) {
                    if (kpRatings) {
                        if (
                            kpRatings.kinopoisk
                        ) {
                            ratingsData.kp =
                                kpRatings.kinopoisk;
                        }

                        if (
                            kpRatings.imdb
                        ) {
                            ratingsData.imdb_kp =
                                kpRatings.imdb;
                        }

                        saveKpCache(
                            cacheKey,
                            {
                                kp:
                                    kpRatings.kinopoisk,

                                imdb:
                                    kpRatings.imdb
                            },
                            localCurrentCard
                        );
                    }

                    processNextStep();
                }
            );

            return;
        }


        function processNextStep() {
            updateHiddenElements(
                ratingsData,
                localCurrentCard,
                render
            );

            if (cachedData) {
                ratingsData.rt =
                    cachedData.rt;

                ratingsData.mc =
                    cachedData.mc;

                ratingsData.imdb =
                    cachedData.imdb;

                ratingsData.ageRating =
                    cachedData.ageRating;

                ratingsData.oscars =
                    cachedData.oscars;

                ratingsData.emmy =
                    cachedData.emmy;

                ratingsData.awards =
                    cachedData.awards;

                updateUI();
            }
            else if (
                normalizedCard.imdb_id
            ) {
                fetchOmdbRatings(
                    normalizedCard,
                    cacheKey,
                    localCurrentCard,
                    render,

                    function(omdbData) {
                        if (omdbData) {
                            Object.assign(
                                ratingsData,
                                omdbData
                            );

                            saveOmdbCache(
                                cacheKey,
                                omdbData,
                                localCurrentCard
                            );
                        }

                        updateUI();
                    }
                );
            }
            else {
                getImdbIdFromTmdb(
                    normalizedCard.id,
                    normalizedCard.type,
                    localCurrentCard,

                    function(newImdbId) {
                        if (!newImdbId) {
                            updateUI();
                            return;
                        }

                        normalizedCard.imdb_id =
                            newImdbId;

                        cacheKey =
                            normalizedCard.type +
                            '_' +
                            newImdbId;

                        fetchOmdbRatings(
                            normalizedCard,
                            cacheKey,
                            localCurrentCard,
                            render,

                            function(omdbData) {
                                if (omdbData) {
                                    Object.assign(
                                        ratingsData,
                                        omdbData
                                    );

                                    saveOmdbCache(
                                        cacheKey,
                                        omdbData,
                                        localCurrentCard
                                    );
                                }

                                updateUI();
                            }
                        );
                    }
                );
            }
        }


        function updateUI() {
            insertRatings(
                ratingsData.rt,
                ratingsData.mc,
                ratingsData.oscars,
                ratingsData.awards,
                ratingsData.emmy,
                localCurrentCard,
                render
            );

            updateHiddenElements(
                ratingsData,
                localCurrentCard,
                render
            );

            var mode =
                parseInt(
                    localStorage.getItem(
                        'maxsm_ratings_mode'
                    ),
                    10
                );

            if (mode !== 2) {
                calculateAverageRating(
                    localCurrentCard,
                    render
                );
            }

            insertIcons(
                localCurrentCard,
                render
            );

            applyRatingSourceVisibility(
                render
            );

            rateLine.css(
                'visibility',
                'visible'
            );

            var rateElement =
                $('.full-start__rate',
                  render);

            rateElement
                .off(
                    'click.ratings-modal'
                )
                .on(
                    'click.ratings-modal',
                    function(e) {
                        e.stopPropagation();

                        showRatingsModal(
                            localCurrentCard,
                            render
                        );
                    }
                );
        }
    }


    function showRatingsModal(
        cardId,
        render
    ) {
        var showColors =
            localStorage.getItem(
                'maxsm_ratings_colors'
            ) === 'true';

        var modalContent =
            $(
                '<div class="maxsm-modal-ratings"></div>'
            );

        var rateLine =
            $('.full-start-new__rate-line',
              render);

        if (!rateLine.length) {
            return;
        }

        var ratingOrder = [
            'rate--avg',
            'rate--oscars',
            'rate--emmy',
            'rate--awards',
            'rate--tmdb',
            'rate--imdb',
            'rate--kp',
            'rate--rt',
            'rate--mc'
        ];

        ratingOrder.forEach(
            function(className) {
                var element =
                    $('.' + className,
                      rateLine)
                    .not(
                        '.maxsm-source-disabled'
                    );

                if (!element.length) {
                    return;
                }

                var value =
                    element
                    .children()
                    .eq(0)
                    .text()
                    .trim();

                var numericValue =
                    parseFloat(
                        value
                    );

                var label = '';

                switch(className) {
                    case 'rate--avg':
                        label = '';
                        break;

                    case 'rate--oscars':
                        label =
                            Lampa.Lang.translate(
                                'maxsm_ratings_oscars'
                            );
                        break;

                    case 'rate--emmy':
                        label =
                            Lampa.Lang.translate(
                                'maxsm_ratings_emmy'
                            );
                        break;

                    case 'rate--awards':
                        label =
                            Lampa.Lang.translate(
                                'maxsm_ratings_awards'
                            );
                        break;

                    case 'rate--tmdb':
                        label = 'TMDB';
                        break;

                    case 'rate--imdb':
                        label = 'IMDb';
                        break;

                    case 'rate--kp':
                        label = 'Кинопоиск';
                        break;

                    case 'rate--rt':
                        label =
                            'Rotten Tomatoes';
                        break;

                    case 'rate--mc':
                        label =
                            'Metacritic';
                        break;
                }

                var item =
                    $(
                        '<div class="maxsm-modal-rating-line"></div>'
                    );

                if (showColors) {
                    var colorClass;

                    if (
                        className ===
                        'rate--avg'
                    ) {
                        colorClass =
                            getRatingClass(
                                numericValue
                            );
                    }
                    else {
                        colorClass =
                            'maxsm-modal-' +
                            className.replace(
                                'rate--',
                                ''
                            );
                    }

                    if (colorClass) {
                        item.addClass(
                            colorClass
                        );
                    }
                }

                item.text(
                    className === 'rate--avg'
                        ? value
                        : value +
                          ' - ' +
                          label
                );

                modalContent.append(
                    item
                );
            }
        );

        Lampa.Modal.open({
            title:
                Lampa.Lang.translate(
                    'maxsm_ratings_avg_simple'
                ),

            html:
                modalContent,

            width:
                600,

            onBack:
                function() {
                    Lampa.Modal.close();

                    Lampa.Controller.toggle(
                        'content'
                    );

                    return true;
                }
        });
    }


    function insertIcons(
        localCurrentCard,
        render
    ) {
        if (!render) {
            return;
        }

        var showIcons =
            localStorage.getItem(
                'maxsm_ratings_icons'
            ) === 'true';


        function replaceIcon(
            className,
            svg
        ) {
            var elements =
                $('.' + className,
                  render);

            if (!elements.length) {
                return;
            }

            elements.each(
                function() {
                    var element =
                        $(this);

                    var target =
                        element
                        .find(
                            '.source--name'
                        )
                        .first();

                    if (!target.length) {
                        var childDivs =
                            element.children(
                                'div'
                            );

                        if (
                            childDivs.length >=
                            2
                        ) {
                            target =
                                childDivs.eq(
                                    1
                                );
                        }
                    }

                    if (!target.length) {
                        return;
                    }


                    if (showIcons) {
                        if (
                            target.data(
                                'original-html'
                            ) === undefined
                        ) {
                            target.data(
                                'original-html',
                                target.html()
                            );
                        }

                        var iconWrap =
                            $(
                                '<span class="maxsm-icon-container"></span>'
                            );

                        iconWrap.html(
                            svg
                        );

                        target
                            .html(
                                iconWrap
                            )
                            .addClass(
                                'rate--icon'
                            );
                    }
                    else {
                        var original =
                            target.data(
                                'original-html'
                            );

                        if (
                            original !==
                            undefined
                        ) {
                            target.html(
                                original
                            );

                            target.removeClass(
                                'rate--icon'
                            );

                            target.removeData(
                                'original-html'
                            );
                        }
                    }
                }
            );
        }


        replaceIcon(
            'rate--imdb',
            imdb_svg
        );

        replaceIcon(
            'rate--kp',
            kp_svg
        );

        replaceIcon(
            'rate--tmdb',
            tmdb_svg
        );
    }


    function getOmdbCache(key) {
        var cache =
            Lampa.Storage.get(
                OMDB_CACHE
            ) || {};

        var item =
            cache[key];

        return (
            item &&
            (
                Date.now() -
                item.timestamp <
                CACHE_TIME
            )
        )
            ? item
            : null;
    }


    function saveOmdbCache(
        key,
        data,
        localCurrentCard
    ) {
        var cache =
            Lampa.Storage.get(
                OMDB_CACHE
            ) || {};

        cache[key] = {
            rt:
                data.rt,

            mc:
                data.mc,

            imdb:
                data.imdb,

            ageRating:
                data.ageRating,

            oscars:
                data.oscars ||
                null,

            emmy:
                data.emmy ||
                null,

            awards:
                data.awards ||
                null,

            timestamp:
                Date.now()
        };

        Lampa.Storage.set(
            OMDB_CACHE,
            cache
        );
    }


    function getKpCache(key) {
        var cache =
            Lampa.Storage.get(
                KP_CACHE
            ) || {};

        var item =
            cache[key];

        return (
            item &&
            (
                Date.now() -
                item.timestamp <
                CACHE_TIME
            )
        )
            ? item
            : null;
    }


    function saveKpCache(
        key,
        data,
        localCurrentCard
    ) {
        var cache =
            Lampa.Storage.get(
                KP_CACHE
            ) || {};

        cache[key] = {
            kp:
                data.kp ||
                null,

            imdb:
                data.imdb ||
                null,

            timestamp:
                Date.now()
        };

        Lampa.Storage.set(
            KP_CACHE,
            cache
        );
    }


    function getImdbIdFromTmdb(
        tmdbId,
        type,
        localCurrentCard,
        callback
    ) {
        if (!tmdbId) {
            callback(null);
            return;
        }

        var cleanType =
            type === 'movie'
                ? 'movie'
                : 'tv';

        var cacheKey =
            cleanType +
            '_' +
            tmdbId;

        var cache =
            Lampa.Storage.get(
                ID_MAPPING_CACHE
            ) || {};

        if (
            cache[cacheKey] &&
            (
                Date.now() -
                cache[cacheKey].timestamp <
                CACHE_TIME
            )
        ) {
            callback(
                cache[cacheKey].imdb_id
            );

            return;
        }

        var mainPath =
            cleanType +
            '/' +
            tmdbId +
            '/external_ids?api_key=' +
            Lampa.TMDB.key();

        var mainUrl =
            Lampa.TMDB.api(
                mainPath
            );

        new Lampa.Reguest().silent(
            mainUrl,

            function(data) {
                if (
                    data &&
                    data.imdb_id
                ) {
                    cache[cacheKey] = {
                        imdb_id:
                            data.imdb_id,

                        timestamp:
                            Date.now()
                    };

                    Lampa.Storage.set(
                        ID_MAPPING_CACHE,
                        cache
                    );

                    callback(
                        data.imdb_id
                    );

                    return;
                }

                if (
                    cleanType !== 'tv'
                ) {
                    callback(null);
                    return;
                }

                var altPath =
                    'tv/' +
                    tmdbId +
                    '?api_key=' +
                    Lampa.TMDB.key();

                var altUrl =
                    Lampa.TMDB.api(
                        altPath
                    );

                new Lampa.Reguest().silent(
                    altUrl,

                    function(altData) {
                        var imdbId =
                            (
                                altData &&
                                altData.external_ids &&
                                altData.external_ids.imdb_id
                            ) ||
                            null;

                        if (imdbId) {
                            cache[cacheKey] = {
                                imdb_id:
                                    imdbId,

                                timestamp:
                                    Date.now()
                            };

                            Lampa.Storage.set(
                                ID_MAPPING_CACHE,
                                cache
                            );
                        }

                        callback(
                            imdbId
                        );
                    },

                    function() {
                        callback(null);
                    }
                );
            },

            function() {
                callback(null);
            }
        );
    }


    function fetchOmdbRatings(
        card,
        cacheKey,
        localCurrentCard,
        render,
        callback
    ) {
        if (!render) {
            return;
        }

        if (!card.imdb_id) {
            callback(null);
            return;
        }

        var url =
            'https://www.omdbapi.com/?apikey=' +
            getRandomToken(
                OMDB_API_KEYS
            ) +
            '&i=' +
            card.imdb_id;

        new Lampa.Reguest().silent(
            url,

            function(data) {
                if (
                    data &&
                    data.Response ===
                        'True' &&
                    (
                        data.Ratings ||
                        data.imdbRating
                    )
                ) {
                    var parsedAwards =
                        parseAwards(
                            data.Awards ||
                            '',
                            localCurrentCard
                        );

                    callback({
                        rt:
                            extractRating(
                                data.Ratings,
                                'Rotten Tomatoes'
                            ),

                        mc:
                            extractRating(
                                data.Ratings,
                                'Metacritic'
                            ),

                        imdb:
                            data.imdbRating ||
                            null,

                        ageRating:
                            data.Rated ||
                            null,

                        oscars:
                            parsedAwards.oscars,

                        emmy:
                            parsedAwards.emmy,

                        awards:
                            parsedAwards.awards
                    });
                }
                else {
                    callback(null);
                }
            },

            function() {
                callback(null);
            }
        );
    }


    function updateHiddenElements(
        ratings,
        localCurrentCard,
        render
    ) {
        if (!render) {
            return;
        }

        var pgElement =
            $('.full-start__pg.hide',
              render);

        if (
            pgElement.length &&
            ratings.ageRating
        ) {
            var invalidRatings = [
                'N/A',
                'Not Rated',
                'Unrated',
                'NR'
            ];

            var isValid =
                invalidRatings.indexOf(
                    ratings.ageRating
                ) === -1;

            if (isValid) {
                var localizedRating =
                    AGE_RATINGS[
                        ratings.ageRating
                    ] ||
                    ratings.ageRating;

                pgElement
                    .removeClass(
                        'hide'
                    )
                    .text(
                        localizedRating
                    );
            }
        }


        var imdbElement =
            $('.rate--imdb',
              render);

        if (imdbElement.length) {
            var imdbRating;

            if (
                ratings.imdb &&
                !isNaN(
                    ratings.imdb
                )
            ) {
                imdbRating =
                    parseFloat(
                        ratings.imdb
                    ).toFixed(1);

                imdbElement
                    .removeClass(
                        'hide'
                    )
                    .find(
                        '> div'
                    )
                    .eq(0)
                    .text(
                        imdbRating
                    );
            }
            else if (
                ratings.imdb_kp &&
                !isNaN(
                    ratings.imdb_kp
                )
            ) {
                imdbRating =
                    parseFloat(
                        ratings.imdb_kp
                    ).toFixed(1);

                imdbElement
                    .removeClass(
                        'hide'
                    )
                    .find(
                        '> div'
                    )
                    .eq(0)
                    .text(
                        imdbRating
                    );
            }
        }


        var kpElement =
            $('.rate--kp',
              render);

        if (
            kpElement.length &&
            ratings.kp &&
            !isNaN(
                ratings.kp
            )
        ) {
            var kpRating =
                parseFloat(
                    ratings.kp
                ).toFixed(1);

            kpElement
                .removeClass(
                    'hide'
                )
                .find(
                    '> div'
                )
                .eq(0)
                .text(
                    kpRating
                );
        }
    }


    function extractRating(
        ratings,
        source
    ) {
        if (
            !ratings ||
            !Array.isArray(ratings)
        ) {
            return null;
        }

        for (
            var i = 0;
            i < ratings.length;
            i++
        ) {
            if (
                ratings[i].Source ===
                source
            ) {
                try {
                    return (
                        source ===
                        'Rotten Tomatoes'
                    )
                        ? parseFloat(
                            ratings[i]
                                .Value
                                .replace(
                                    '%',
                                    ''
                                )
                          )
                        : parseFloat(
                            ratings[i]
                                .Value
                                .split(
                                    '/'
                                )[0]
                          );
                }
                catch (e) {
                    return null;
                }
            }
        }

        return null;
    }


    function insertRatings(
        rtRating,
        mcRating,
        oscars,
        awards,
        emmy,
        localCurrentCard,
        render
    ) {
        if (!render) {
            return;
        }

        var rateLine =
            $('.full-start-new__rate-line',
              render);

        if (!rateLine.length) {
            return;
        }

        var lastRate =
            $('.full-start__rate:last',
              rateLine);

        var showCritic =
            localStorage.getItem(
                'maxsm_ratings_critic'
            ) === 'true';

        var showAwards =
            localStorage.getItem(
                'maxsm_ratings_awards'
            ) === 'true';

        var showColors =
            localStorage.getItem(
                'maxsm_ratings_colors'
            ) === 'true';


        if (
            showCritic &&
            rtRating &&
            !isNaN(rtRating) &&
            !$('.rate--rt',
              rateLine).length
        ) {
            var rtElement =
                $(
                    '<div class="full-start__rate rate--rt">' +
                        '<div>' +
                            rtRating +
                        '</div>' +
                        '<div class="source--name">Tomatoes</div>' +
                    '</div>'
                );

            if (lastRate.length) {
                rtElement.insertAfter(
                    lastRate
                );
            }
            else {
                rateLine.prepend(
                    rtElement
                );
            }
        }


        if (
            showCritic &&
            mcRating &&
            !isNaN(mcRating) &&
            !$('.rate--mc',
              rateLine).length
        ) {
            var insertAfter =
                $('.rate--rt',
                  rateLine).length
                    ? $('.rate--rt',
                        rateLine)
                    : lastRate;

            var mcElement =
                $(
                    '<div class="full-start__rate rate--mc">' +
                        '<div>' +
                            mcRating +
                        '</div>' +
                        '<div class="source--name">Metacritic</div>' +
                    '</div>'
                );

            if (insertAfter.length) {
                mcElement.insertAfter(
                    insertAfter
                );
            }
            else {
                rateLine.prepend(
                    mcElement
                );
            }
        }


        if (
            showAwards &&
            awards &&
            !isNaN(awards) &&
            awards > 0 &&
            !$('.rate--awards',
              rateLine).length
        ) {
            var awardsElement =
                $(
                    '<div class="full-start__rate rate--awards rate--gold">' +
                        '<div>' +
                            awards +
                        '</div>' +
                        '<div class="source--name">' +
                            Lampa.Lang.translate(
                                'maxsm_ratings_awards'
                            ) +
                        '</div>' +
                    '</div>'
                );

            if (!showColors) {
                awardsElement
                    .removeClass(
                        'rate--gold'
                    );
            }

            rateLine.prepend(
                awardsElement
            );
        }


        if (
            showAwards &&
            oscars &&
            !isNaN(oscars) &&
            oscars > 0 &&
            !$('.rate--oscars',
              rateLine).length
        ) {
            var oscarsElement =
                $(
                    '<div class="full-start__rate rate--oscars rate--gold">' +
                        '<div>' +
                            oscars +
                        '</div>' +
                        '<div class="source--name">' +
                            Lampa.Lang.translate(
                                'maxsm_ratings_oscars'
                            ) +
                        '</div>' +
                    '</div>'
                );

            if (!showColors) {
                oscarsElement
                    .removeClass(
                        'rate--gold'
                    );
            }

            rateLine.prepend(
                oscarsElement
            );
        }


        if (
            showAwards &&
            emmy &&
            !isNaN(emmy) &&
            emmy > 0 &&
            !$('.rate--emmy',
              rateLine).length
        ) {
            var emmyElement =
                $(
                    '<div class="full-start__rate rate--emmy rate--gold">' +
                        '<div>' +
                            emmy +
                        '</div>' +
                        '<div class="source--name">' +
                            Lampa.Lang.translate(
                                'maxsm_ratings_emmy'
                            ) +
                        '</div>' +
                    '</div>'
                );

            if (!showColors) {
                emmyElement
                    .removeClass(
                        'rate--gold'
                    );
            }

            rateLine.prepend(
                emmyElement
            );
        }
    }


    function calculateAverageRating(
        localCurrentCard,
        render
    ) {
        if (!render) {
            return;
        }

        var rateLine =
            $('.full-start-new__rate-line',
              render);

        if (!rateLine.length) {
            return;
        }

        /*
            Средний рейтинг считается по всем
            доступным данным независимо от того,
            скрыта отдельная плашка источника
            в настройках или нет.
        */
        var ratings = {
            imdb:
                parseFloat(
                    $('.rate--imdb div:first',
                      rateLine)
                    .text()
                ) || 0,

            tmdb:
                parseFloat(
                    $('.rate--tmdb div:first',
                      rateLine)
                    .text()
                ) || 0,

            kp:
                parseFloat(
                    $('.rate--kp div:first',
                      rateLine)
                    .text()
                ) || 0,

            mc:
                (
                    parseFloat(
                        $('.rate--mc div:first',
                          rateLine)
                        .text()
                    ) || 0
                ) / 10,

            rt:
                (
                    parseFloat(
                        $('.rate--rt div:first',
                          rateLine)
                        .text()
                    ) || 0
                ) / 10
        };

        var totalWeight = 0;
        var weightedSum = 0;
        var ratingsCount = 0;

        for (
            var key in ratings
        ) {
            if (
                ratings.hasOwnProperty(
                    key
                ) &&
                !isNaN(
                    ratings[key]
                ) &&
                ratings[key] > 0
            ) {
                weightedSum +=
                    ratings[key] *
                    WEIGHTS[key];

                totalWeight +=
                    WEIGHTS[key];

                ratingsCount++;
            }
        }

        $('.rate--avg',
          rateLine).remove();

        var mode =
            parseInt(
                localStorage.getItem(
                    'maxsm_ratings_mode'
                ),
                10
            );

        if (
            totalWeight > 0 &&
            (
                ratingsCount > 1 ||
                mode === 1
            )
        ) {
            var averageRating =
                (
                    weightedSum /
                    totalWeight
                ).toFixed(1);

            var colorClass =
                getRatingClass(
                    averageRating
                );

            if (mode === 1) {
                $('.full-start__rate',
                  rateLine)
                    .not(
                        '.rate--oscars, .rate--avg, .rate--awards'
                    )
                    .hide();
            }

            var avgElement =
                $(
                    '<div class="full-start__rate rate--avg ' +
                        colorClass +
                    '">' +
                        '<div>' +
                            averageRating +
                        '</div>' +
                        '<div class="source--name"></div>' +
                    '</div>'
                );

            var showColors =
                localStorage.getItem(
                    'maxsm_ratings_colors'
                ) === 'true';

            if (!showColors) {
                avgElement
                    .removeClass(
                        colorClass
                    );
            }

            $('.full-start__rate:first',
              rateLine)
                .before(
                    avgElement
                );
        }
    }


    function startPlugin() {
        if (
            window.maxsmRatingsPlugin
        ) {
            return;
        }

        window.maxsmRatingsPlugin =
            true;


        if (
            localStorage.getItem(
                'maxsm_ratings_awards'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_awards',
                'true'
            );
        }

        if (
            localStorage.getItem(
                'maxsm_ratings_critic'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_critic',
                'true'
            );
        }

        if (
            localStorage.getItem(
                'maxsm_ratings_colors'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_colors',
                'false'
            );
        }

        if (
            localStorage.getItem(
                'maxsm_ratings_source_kp'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_source_kp',
                'true'
            );
        }

        if (
            localStorage.getItem(
                'maxsm_ratings_source_tmdb'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_source_tmdb',
                'true'
            );
        }

        if (
            localStorage.getItem(
                'maxsm_ratings_source_imdb'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_source_imdb',
                'true'
            );
        }

        if (
            localStorage.getItem(
                'maxsm_ratings_icons'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_icons',
                'false'
            );
        }

        if (
            localStorage.getItem(
                'maxsm_ratings_mode'
            ) === null
        ) {
            localStorage.setItem(
                'maxsm_ratings_mode',
                '0'
            );
        }


        Lampa.SettingsApi.addComponent({
            component:
                'maxsm_ratings',

            name:
                Lampa.Lang.translate(
                    'maxsm_ratings'
                ),

            icon:
                star_svg
        });


        var modeValue = {};

        modeValue[0] =
            Lampa.Lang.translate(
                'maxsm_ratings_mode_normal'
            );

        modeValue[1] =
            Lampa.Lang.translate(
                'maxsm_ratings_mode_simple'
            );

        modeValue[2] =
            Lampa.Lang.translate(
                'maxsm_ratings_mode_noavg'
            );


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_mode',

                type:
                    'select',

                values:
                    modeValue,

                default:
                    0
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_mode'
                    ),

                description:
                    ''
            },

            onChange:
                function() {
                    refreshRatingSourceSettings();
                }
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_source_kp',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_source_kp'
                    ),

                description:
                    ''
            },

            onChange:
                function() {
                    refreshRatingSourceSettings();
                }
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_source_tmdb',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_source_tmdb'
                    ),

                description:
                    ''
            },

            onChange:
                function() {
                    refreshRatingSourceSettings();
                }
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_source_imdb',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_source_imdb'
                    ),

                description:
                    ''
            },

            onChange:
                function() {
                    refreshRatingSourceSettings();
                }
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_awards',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_awards'
                    ),

                description:
                    ''
            },

            onChange:
                function() {}
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_critic',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_critic'
                    ),

                description:
                    ''
            },

            onChange:
                function() {}
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_colors',

                type:
                    'trigger',

                default:
                    false
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_colors'
                    ),

                description:
                    ''
            },

            onChange:
                function() {
                    refreshRatingSourceSettings();
                }
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_icons',

                type:
                    'trigger',

                default:
                    false
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_icons'
                    ),

                description:
                    ''
            },

            onChange:
                function() {
                    var active =
                        Lampa.Activity.active();

                    if (
                        active &&
                        active.activity
                    ) {
                        var render =
                            active.activity.render();

                        insertIcons(
                            globalCurrentCard,
                            render
                        );
                    }
                }
        });


        Lampa.SettingsApi.addParam({
            component:
                'maxsm_ratings',

            param: {
                name:
                    'maxsm_ratings_cc',

                type:
                    'button'
            },

            field: {
                name:
                    Lampa.Lang.translate(
                        'maxsm_ratings_cc'
                    )
            },

            onChange:
                function() {
                    localStorage.removeItem(
                        OMDB_CACHE
                    );

                    localStorage.removeItem(
                        KP_CACHE
                    );

                    localStorage.removeItem(
                        ID_MAPPING_CACHE
                    );

                    window.location.reload();
                }
        });


        Lampa.Listener.follow(
            'full',

            function(e) {
                if (
                    e.type ===
                    'complite'
                ) {
                    var render =
                        e.object
                            .activity
                            .render();

                    globalCurrentCard =
                        e.data.movie.id;

                    fetchAdditionalRatings(
                        e.data.movie,
                        render
                    );
                }
            }
        );
    }


    if (
        !window.maxsmRatingsPlugin
    ) {
        startPlugin();
    }

})();
