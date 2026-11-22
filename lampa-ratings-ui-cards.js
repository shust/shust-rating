/* Lampa: rating UI, 4K SDR badge and card rating sources. */
try {
/*
    Lampa ratings plugin — rating-only build.

    Rating sources:
    - Kinopoisk: rating.kinopoisk.ru XML + KP API fallback
    - IMDb: OMDb + Kinopoisk XML imdb_rating fallback
    - TMDB: fallback, только если IMDb и KP выключены/не найдены

    Optimizations:
    - KP-XML напрямую (без прокси), прокси только при неудаче
    - IMDb параллельно через OMDb, не ждём KP
    - Короткий таймаут прокси, один прокси вместо двух
    - Android TV фикс: applyPgVisibility вызывается многократно + setInterval
    - Фиксированная ширина и плейсхолдеры -.- для IMDb и KP
*/

(function() {
    'use strict';

    if (!document.getElementById('maxsm-ratings-inter-font')) {
        var interFontLink = document.createElement('link');
        interFontLink.id = 'maxsm-ratings-inter-font';
        interFontLink.rel = 'stylesheet';
        interFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';
        document.head.appendChild(interFontLink);
    }

    var star_svg = '<svg viewBox="5 5 54 54" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="white" stroke-width="2" d="M32 18.7461L36.2922 27.4159L46.2682 28.6834L38.9675 35.3631L40.7895 44.8469L32 40.2489L23.2105 44.8469L25.0325 35.3631L17.7318 28.6834L27.7078 27.4159L32 18.7461ZM32 23.2539L29.0241 29.2648L22.2682 30.1231L27.2075 34.6424L25.9567 41.1531L32 37.9918L38.0433 41.1531L36.7925 34.6424L41.7318 30.1231L34.9759 29.2648L32 23.2539Z"/><path fill="none" stroke="white" stroke-width="2" d="M32 9C19.2975 9 9 19.2975 9 32C9 44.7025 19.2975 55 32 55C44.7025 55 55 44.7025 55 32C55 19.2975 44.7025 9 32 9ZM7 32C7 18.1929 18.1929 7 32 7C45.8071 7 57 18.1929 57 32C57 45.8071 45.8071 57 32 57C18.1929 57 7 45.8071 7 32Z"/></svg>';

    var avg_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1228_135)\">\n<path d=\"M201.5 0.5V201.5H0.5V0.5H201.5ZM81.21 77.4688H42.918L38 92.625L68.9795 115.164L57.1465 151.633L70.0215 161L101 138.461L131.979 161L144.854 151.633L133.021 115.164L164 92.625L159.082 77.4688H120.79L108.957 41H93.043L81.21 77.4688Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1228_135\">\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var tmdb_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1219_22)\">\n<path d=\"M201.5 0.5H0.5V201.5H201.5V0.5Z\" fill=\"#0D253F\"/>\n<g clip-path=\"url(#clip1_1219_22)\">\n<path d=\"M109.536 97.0107H162.904C166.641 97.0107 170.225 95.5267 172.869 92.885C175.512 90.2432 176.998 86.6599 177 82.9228C177 79.1844 175.515 75.599 172.871 72.9556C170.228 70.3121 166.643 68.827 162.904 68.827H109.536C105.798 68.827 102.212 70.3121 99.5687 72.9556C96.9253 75.599 95.4402 79.1844 95.4402 82.9228C95.4423 86.6599 96.9283 90.2432 99.5716 92.885C102.215 95.5267 105.799 97.0107 109.536 97.0107ZM39.3359 132.909H100.681C104.418 132.909 108.002 131.425 110.646 128.783C113.289 126.141 114.775 122.558 114.777 118.821C114.777 115.082 113.292 111.497 110.649 108.853C108.005 106.21 104.42 104.725 100.681 104.725H39.3359C35.5974 104.725 32.0121 106.21 29.3686 108.853C26.7251 111.497 25.24 115.082 25.24 118.821C25.2421 122.558 26.7281 126.141 29.3714 128.783C32.0147 131.425 35.5988 132.909 39.3359 132.909ZM33.5444 96.5002H39.7666V73.7649H47.8237V68.2446H25.4873V73.749H33.5444V96.5002ZM55.9605 96.5002H62.1828V74.8259H62.2626L69.4422 96.4842H74.2285L81.6474 74.8259H81.7272V96.4842H87.9495V68.2446H78.4964L71.955 86.6722H71.8752L65.3737 68.2446H55.9605V96.5002ZM146.838 112.654C146.006 110.919 144.769 109.409 143.232 108.251C141.637 107.085 139.826 106.249 137.903 105.794C135.798 105.268 133.636 105 131.466 104.996H122.132V133.236H132.303C134.346 133.245 136.379 132.936 138.326 132.318C140.165 131.759 141.883 130.86 143.392 129.67C144.859 128.479 146.049 126.981 146.878 125.282C147.774 123.395 148.219 121.325 148.178 119.235C148.243 116.968 147.784 114.716 146.838 112.654ZM140.911 122.969C140.444 124.033 139.72 124.965 138.805 125.681C137.853 126.381 136.766 126.875 135.614 127.133C134.306 127.434 132.967 127.582 131.625 127.572H128.394V110.819H132.064C133.323 110.813 134.577 110.982 135.789 111.322C136.905 111.623 137.954 112.129 138.884 112.814C139.737 113.485 140.43 114.338 140.911 115.311C141.459 116.432 141.732 117.668 141.708 118.916C141.743 120.309 141.471 121.693 140.911 122.969ZM176.513 122.865C176.232 122.094 175.804 121.384 175.253 120.775C174.705 120.169 174.051 119.669 173.322 119.299C172.528 118.898 171.674 118.629 170.794 118.502V118.422C172.162 118.029 173.387 117.247 174.32 116.172C175.239 115.051 175.716 113.632 175.66 112.184C175.72 110.884 175.401 109.596 174.742 108.474C174.142 107.56 173.318 106.813 172.349 106.304C171.307 105.766 170.178 105.415 169.015 105.267C167.794 105.093 166.562 105.005 165.329 105.004H154.799V133.244H166.366C167.632 133.244 168.894 133.111 170.132 132.845C171.336 132.604 172.491 132.158 173.546 131.528C174.544 130.933 175.391 130.114 176.019 129.135C176.691 128.009 177.024 126.713 176.976 125.402C176.977 124.537 176.829 123.679 176.537 122.865H176.513ZM161.021 110.301H165.249C165.745 110.303 166.239 110.351 166.725 110.444C167.197 110.529 167.654 110.683 168.081 110.899C168.476 111.114 168.81 111.424 169.055 111.801C169.324 112.236 169.457 112.741 169.438 113.253C169.449 113.753 169.331 114.247 169.094 114.688C168.879 115.076 168.573 115.404 168.201 115.646C167.814 115.891 167.388 116.066 166.941 116.164C166.478 116.273 166.004 116.327 165.529 116.324H161.021V110.301ZM170.371 126.255C170.131 126.672 169.798 127.027 169.398 127.293C168.992 127.565 168.537 127.755 168.057 127.851C167.581 127.958 167.094 128.012 166.606 128.01H161.021V121.629H165.728C166.262 121.634 166.795 121.674 167.324 121.748C167.885 121.825 168.434 121.973 168.959 122.187C169.448 122.392 169.879 122.715 170.211 123.128C170.558 123.586 170.736 124.15 170.714 124.724C170.739 125.256 170.621 125.785 170.371 126.255Z\" fill=\"url(#paint0_linear_1219_22)\"/>\n</g>\n</g>\n<defs>\n<linearGradient id=\"paint0_linear_1219_22\" x1=\"25.24\" y1=\"100.76\" x2=\"177\" y2=\"100.76\" gradientUnits=\"userSpaceOnUse\">\n<stop stop-color=\"#90CEA1\"/>\n<stop offset=\"0.56\" stop-color=\"#3CBEC9\"/>\n<stop offset=\"1\" stop-color=\"#00B3E5\"/>\n</linearGradient>\n<clipPath id=\"clip0_1219_22\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n<clipPath id=\"clip1_1219_22\">\n<rect width=\"151.76\" height=\"65.0309\" fill=\"white\" transform=\"translate(25.24 68.2446)\"/>\n</clipPath>\n</defs>\n</svg>";

    var imdb_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1219_60)\">\n<path d=\"M201.5 0.5V201.5H0.5V0.5H201.5ZM25.25 72.5938V129.406H41.0312V72.5938H25.25ZM47.3438 72.5938V129.406H60.7314L60.7832 91.8906L66.4189 129.406H75.9502L81.2998 91.0635L81.3389 129.406H94.6875V72.5938H74.7168L71.1846 99.1328L68.9902 84.6982C68.354 80.0746 67.7435 76.0396 67.1592 72.5938H47.3438ZM101 72.5938V129.406H125.633C131.21 129.406 135.719 124.917 135.719 119.38V82.6201C135.719 77.0757 131.203 72.5938 125.633 72.5938H101ZM142.031 72.5938V128.677H156.184L157.093 125.203C158.95 127.745 162.015 129.406 165.481 129.406H166.49C172.158 129.406 176.75 124.972 176.75 119.502V96.7227C176.75 91.2555 172.156 86.8184 166.49 86.8184H165.481C162.089 86.8185 159.083 88.4075 157.132 90.8389V72.5938H142.031ZM159.49 95.6006C160.323 95.6006 161.511 96.0322 161.809 96.7041C162.106 97.376 162.249 98.8362 162.249 101.061V114.522C162.249 117.059 162.118 118.67 161.856 119.33C161.595 119.99 160.347 120.34 159.49 120.34C158.634 120.34 157.409 119.979 157.123 119.33V96.542C157.373 95.9514 158.657 95.6007 159.49 95.6006ZM115.843 82.3174C117.585 82.3174 118.782 82.48 119.408 82.8184C120.048 83.1567 120.442 83.6834 120.619 84.4102C120.796 85.1371 120.892 86.7784 120.892 89.3467V111.375C120.892 115.159 120.62 117.465 120.089 118.317C119.558 119.182 118.142 119.595 115.843 119.595V82.3174Z\" fill=\"#F5C518\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1219_60\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var kp_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" xmlns=\"http://www.w3.org/2000/svg\">" +
        "<path fill=\"#FF5500\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"" +
        "M45 0H157C181.853 0 202 20.1472 202 45V157C202 181.853 181.853 202 157 202H45C20.1472 202 0 181.853 0 157V45C0 20.1472 20.1472 0 45 0Z " +
        "M41 41H61.7432V84.5449L93.1143 41H118.657L72.5771 88.3301L161 41V63.2861L81.9473 94.9971L161 89.8574V112.143L81.4434 106.798L161 138.714V161L73.7734 115.158L118.657 161H93.1143L61.7432 117.526V161H41V41Z\"/>" +
        "</svg>";

    var kp_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" xmlns=\"http://www.w3.org/2000/svg\">" +
        "<path fill=\"white\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"" +
        "M45 0H157C181.853 0 202 20.1472 202 45V157C202 181.853 181.853 202 157 202H45C20.1472 202 0 181.853 0 157V45C0 20.1472 20.1472 0 45 0Z " +
        "M41 41H61.7432V84.5449L93.1143 41H118.657L72.5771 88.3301L161 41V63.2861L81.9473 94.9971L161 89.8574V112.143L81.4434 106.798L161 138.714V161L73.7734 115.158L118.657 161H93.1143L61.7432 117.526V161H41V41Z\"/>" +
        "</svg>";

    var kp_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" xmlns=\"http://www.w3.org/2000/svg\">" +
        "<rect width=\"202\" height=\"202\" rx=\"45\" fill=\"white\" fill-opacity=\"0.2\"/>" +
        "<path d=\"M41 41H61.7432V84.5449L93.1143 41H118.657L72.5771 88.3301L161 41V63.2861L81.9473 94.9971L161 89.8574V112.143L81.4434 106.798L161 138.714V161L73.7734 115.158L118.657 161H93.1143L61.7432 117.526V161H41V41Z\" fill=\"white\"/>" +
        "</svg>";

    var avg_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1228_135)\">\n<path d=\"M201.5 0.5V201.5H0.5V0.5H201.5ZM81.21 77.4688H42.918L38 92.625L68.9795 115.164L57.1465 151.633L70.0215 161L101 138.461L131.979 161L144.854 151.633L133.021 115.164L164 92.625L159.082 77.4688H120.79L108.957 41H93.043L81.21 77.4688Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1228_135\">\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var imdb_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1228_123)\">\n<path d=\"M201.5 0.5V201.5H0.5V0.5H201.5ZM25.25 72.5938V129.406H41.0312V72.5938H25.25ZM47.3438 72.5938V129.406H60.7314L60.7832 91.8906L66.4189 129.406H75.9502L81.2998 91.0635L81.3389 129.406H94.6875V72.5938H74.7168L71.1846 99.1328L68.9902 84.6982C68.354 80.0746 67.7435 76.0396 67.1592 72.5938H47.3438ZM101 72.5938V129.406H125.633C131.21 129.406 135.719 124.917 135.719 119.38V82.6201C135.719 77.0757 131.203 72.5938 125.633 72.5938H101ZM142.031 72.5938V128.677H156.184L157.093 125.203C158.95 127.745 162.015 129.406 165.481 129.406H166.49C172.158 129.406 176.75 124.972 176.75 119.502V96.7227C176.75 91.2555 172.156 86.8184 166.49 86.8184H165.481C162.089 86.8185 159.083 88.4075 157.132 90.8389V72.5938H142.031ZM159.49 95.6006C160.323 95.6006 161.511 96.0322 161.809 96.7041C162.106 97.376 162.249 98.8362 162.249 101.061V114.522C162.249 117.059 162.118 118.67 161.856 119.33C161.595 119.99 160.347 120.34 159.49 120.34C158.634 120.34 157.409 119.979 157.123 119.33V96.542C157.373 95.9514 158.657 95.6007 159.49 95.6006ZM115.843 82.3174C117.585 82.3174 118.782 82.48 119.408 82.8184C120.048 83.1567 120.442 83.6834 120.619 84.4102C120.796 85.1371 120.892 86.7784 120.892 89.3467V111.375C120.892 115.159 120.62 117.465 120.089 118.317C119.558 119.182 118.142 119.595 115.843 119.595V82.3174Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1228_123\">\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var tmdb_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<defs>\n<mask id=\"maxsm_tmdb_white_mask\">\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\"/>\n<path d=\"M109.536 97.0107H162.904C166.641 97.0107 170.225 95.5267 172.869 92.885C175.512 90.2432 176.998 86.6599 177 82.9228C177 79.1844 175.515 75.599 172.871 72.9556C170.228 70.3121 166.643 68.827 162.904 68.827H109.536C105.798 68.827 102.212 70.3121 99.5687 72.9556C96.9253 75.599 95.4402 79.1844 95.4402 82.9228C95.4423 86.6599 96.9283 90.2432 99.5716 92.885C102.215 95.5267 105.799 97.0107 109.536 97.0107ZM39.3359 132.909H100.681C104.418 132.909 108.002 131.425 110.646 128.783C113.289 126.141 114.775 122.558 114.777 118.821C114.777 115.082 113.292 111.497 110.649 108.853C108.005 106.21 104.42 104.725 100.681 104.725H39.3359C35.5974 104.725 32.0121 106.21 29.3686 108.853C26.7251 111.497 25.24 115.082 25.24 118.821C25.2421 122.558 26.7281 126.141 29.3714 128.783C32.0147 131.425 35.5988 132.909 39.3359 132.909ZM33.5444 96.5002H39.7666V73.7649H47.8237V68.2446H25.4873V73.749H33.5444V96.5002ZM55.9605 96.5002H62.1828V74.8259H62.2626L69.4422 96.4842H74.2285L81.6474 74.8259H81.7272V96.4842H87.9495V68.2446H78.4964L71.955 86.6722H71.8752L65.3737 68.2446H55.9605V96.5002ZM146.838 112.654C146.006 110.919 144.769 109.409 143.232 108.251C141.637 107.085 139.826 106.249 137.903 105.794C135.798 105.268 133.636 105 131.466 104.996H122.132V133.236H132.303C134.346 133.245 136.379 132.936 138.326 132.318C140.165 131.759 141.883 130.86 143.392 129.67C144.859 128.479 146.049 126.981 146.878 125.282C147.774 123.395 148.219 121.325 148.178 119.235C148.243 116.968 147.784 114.716 146.838 112.654ZM140.911 122.969C140.444 124.033 139.72 124.965 138.805 125.681C137.853 126.381 136.766 126.875 135.614 127.133C134.306 127.434 132.967 127.582 131.625 127.572H128.394V110.819H132.064C133.323 110.813 134.577 110.982 135.789 111.322C136.905 111.623 137.954 112.129 138.884 112.814C139.737 113.485 140.43 114.338 140.911 115.311C141.459 116.432 141.732 117.668 141.708 118.916C141.743 120.309 141.471 121.693 140.911 122.969ZM176.513 122.865C176.232 122.094 175.804 121.384 175.253 120.775C174.705 120.169 174.051 119.669 173.322 119.299C172.528 118.898 171.674 118.629 170.794 118.502V118.422C172.162 118.029 173.387 117.247 174.32 116.172C175.239 115.051 175.716 113.632 175.66 112.184C175.72 110.884 175.401 109.596 174.742 108.474C174.142 107.56 173.318 106.813 172.349 106.304C171.307 105.766 170.178 105.415 169.015 105.267C167.794 105.093 166.562 105.005 165.329 105.004H154.799V133.244H166.366C167.632 133.244 168.894 133.111 170.132 132.845C171.336 132.604 172.491 132.158 173.546 131.528C174.544 130.933 175.391 130.114 176.019 129.135C176.691 128.009 177.024 126.713 176.976 125.402C176.977 124.537 176.829 123.679 176.537 122.865H176.513ZM161.021 110.301H165.249C165.745 110.303 166.239 110.351 166.725 110.444C167.197 110.529 167.654 110.683 168.081 110.899C168.476 111.114 168.81 111.424 169.055 111.801C169.324 112.236 169.457 112.741 169.438 113.253C169.449 113.753 169.331 114.247 169.094 114.688C168.879 115.076 168.573 115.404 168.201 115.646C167.814 115.891 167.388 116.066 166.941 116.164C166.478 116.273 166.004 116.327 165.529 116.324H161.021V110.301ZM170.371 126.255C170.131 126.672 169.798 127.027 169.398 127.293C168.992 127.565 168.537 127.755 168.057 127.851C167.581 127.958 167.094 128.012 166.606 128.01H161.021V121.629H165.728C166.262 121.634 166.795 121.674 167.324 121.748C167.885 121.825 168.434 121.973 168.959 122.187C169.448 122.392 169.879 122.715 170.211 123.128C170.558 123.586 170.736 124.15 170.714 124.724C170.739 125.256 170.621 125.785 170.371 126.255Z\" fill=\"black\"/>\n</mask>\n</defs>\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\" mask=\"url(#maxsm_tmdb_white_mask)\"/>\n</svg>";

    var avg_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1235_49)\">\n<path d=\"M201.5 0.5H0.5V201.5H201.5V0.5Z\" fill=\"white\" fill-opacity=\"0.2\"/>\n<path d=\"M108.957 41H93.0429L81.2101 77.4688L42.9177 77.4689L38 92.6253L68.9792 115.164L57.1464 151.633L70.0212 161L101 138.461L131.979 161L144.854 151.633L133.021 115.164L164 92.6252L159.082 77.4688H120.79L108.957 41Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1235_49\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var imdb_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1235_52)\">\n<path d=\"M201.5 0.5H0.5V201.5H201.5V0.5Z\" fill=\"white\" fill-opacity=\"0.2\"/>\n<path d=\"M25.25 72.5938V129.406H41.0312V72.5938H25.25Z\" fill=\"white\"/>\n<path d=\"M74.7164 72.5938L71.1844 99.133L68.9899 84.698C68.3537 80.0744 67.7434 76.0396 67.159 72.5938H47.3438V129.406H60.7314L60.7833 91.8905L66.4189 129.406H75.95L81.2998 91.0635L81.3388 129.406H94.6875V72.5938H74.7164Z\" fill=\"white\"/>\n<path d=\"M101 129.406V72.5938H125.633C131.203 72.5938 135.719 77.0754 135.719 82.6199V119.38C135.719 124.917 131.211 129.406 125.633 129.406H101ZM119.408 82.8185C118.782 82.4802 117.585 82.3173 115.843 82.3173V119.595C118.142 119.595 119.558 119.182 120.088 118.317C120.619 117.465 120.891 115.159 120.891 111.375V89.3468C120.891 86.7781 120.796 85.1366 120.619 84.4098C120.442 83.6831 120.048 83.1568 119.408 82.8185Z\" fill=\"white\"/>\n<path d=\"M165.482 86.8185H166.491C172.157 86.8185 176.75 91.2556 176.75 96.7229V119.502C176.75 124.972 172.158 129.406 166.491 129.406H165.482C162.015 129.406 158.95 127.745 157.092 125.203L156.184 128.676H142.031V72.5938H157.132V90.8386C159.083 88.4071 162.09 86.8185 165.482 86.8185ZM162.249 114.522V101.06C162.249 98.8359 162.106 97.3762 161.809 96.7042C161.511 96.0323 160.324 95.6009 159.491 95.6009C158.658 95.6009 157.373 95.9515 157.123 96.5423V119.33C157.409 119.979 158.634 120.34 159.491 120.34C160.347 120.34 161.594 119.99 161.856 119.33C162.118 118.67 162.249 117.059 162.249 114.522Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1235_52\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var tmdb_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1235_43)\">\n<path d=\"M201.5 0.5H0.5V201.5H201.5V0.5Z\" fill=\"white\" fill-opacity=\"0.2\"/>\n<g clip-path=\"url(#clip1_1235_43)\">\n<path d=\"M109.536 97.0107H162.904C166.641 97.0107 170.225 95.5267 172.869 92.885C175.512 90.2432 176.998 86.6599 177 82.9228C177 79.1844 175.515 75.599 172.871 72.9556C170.228 70.3121 166.643 68.827 162.904 68.827H109.536C105.798 68.827 102.212 70.3121 99.5688 72.9556C96.9253 75.599 95.4402 79.1844 95.4402 82.9228C95.4423 86.6599 96.9283 90.2432 99.5716 92.885C102.215 95.5267 105.799 97.0107 109.536 97.0107ZM39.3359 132.909H100.681C104.418 132.909 108.002 131.425 110.646 128.783C113.289 126.141 114.775 122.558 114.777 118.821C114.777 115.082 113.292 111.497 110.649 108.853C108.005 106.21 104.42 104.725 100.681 104.725H39.3359C35.5974 104.725 32.0121 106.21 29.3686 108.853C26.7251 111.497 25.24 115.082 25.24 118.821C25.2421 122.558 26.7282 126.141 29.3714 128.783C32.0147 131.425 35.5988 132.909 39.3359 132.909ZM33.5444 96.5002H39.7667V73.7649H47.8237V68.2446H25.4873V73.749H33.5444V96.5002ZM55.9606 96.5002H62.1828V74.8259H62.2626L69.4422 96.4842H74.2286L81.6474 74.8259H81.7272V96.4842H87.9495V68.2446H78.4964L71.955 86.6722H71.8752L65.3738 68.2446H55.9606V96.5002ZM146.838 112.654C146.006 110.919 144.769 109.409 143.232 108.251C141.637 107.085 139.826 106.249 137.903 105.794C135.798 105.268 133.636 105 131.466 104.996H122.132V133.236H132.303C134.346 133.245 136.379 132.936 138.326 132.318C140.165 131.759 141.883 130.86 143.392 129.67C144.859 128.479 146.049 126.981 146.878 125.282C147.774 123.395 148.219 121.325 148.178 119.235C148.243 116.968 147.784 114.716 146.838 112.654ZM140.911 122.969C140.444 124.033 139.72 124.965 138.805 125.681C137.853 126.381 136.766 126.875 135.614 127.133C134.306 127.434 132.967 127.582 131.625 127.572H128.394V110.819H132.064C133.323 110.813 134.577 110.982 135.789 111.322C136.905 111.623 137.954 112.129 138.885 112.814C139.737 113.485 140.43 114.338 140.911 115.311C141.459 116.432 141.732 117.668 141.708 118.916C141.743 120.309 141.471 121.693 140.911 122.969ZM176.513 122.865C176.232 122.094 175.804 121.384 175.253 120.775C174.705 120.169 174.051 119.669 173.322 119.299C172.528 118.898 171.674 118.629 170.794 118.502V118.422C172.162 118.029 173.387 117.247 174.32 116.172C175.239 115.051 175.716 113.632 175.66 112.184C175.72 110.884 175.401 109.596 174.742 108.474C174.142 107.56 173.318 106.813 172.349 106.304C171.307 105.766 170.178 105.415 169.015 105.267C167.794 105.093 166.562 105.005 165.329 105.004H154.799V133.244H166.366C167.632 133.244 168.894 133.111 170.132 132.845C171.336 132.604 172.491 132.158 173.546 131.528C174.544 130.933 175.391 130.114 176.019 129.135C176.691 128.009 177.024 126.713 176.976 125.402C176.977 124.537 176.829 123.679 176.537 122.865H176.513ZM161.021 110.301H165.249C165.745 110.303 166.239 110.351 166.725 110.444C167.197 110.529 167.654 110.683 168.081 110.899C168.476 111.114 168.81 111.424 169.055 111.801C169.324 112.236 169.457 112.741 169.438 113.253C169.449 113.753 169.331 114.247 169.095 114.688C168.879 115.076 168.573 115.404 168.201 115.646C167.814 115.891 167.388 116.066 166.941 116.164C166.478 116.273 166.004 116.327 165.529 116.324H161.021V110.301ZM170.371 126.255C170.131 126.672 169.798 127.027 169.398 127.293C168.992 127.565 168.537 127.755 168.057 127.851C167.581 127.958 167.094 128.012 166.606 128.01H161.021V121.629H165.728C166.262 121.634 166.795 121.674 167.324 121.748C167.885 121.825 168.434 121.973 168.959 122.187C169.448 122.392 169.879 122.715 170.211 123.128C170.558 123.586 170.736 124.15 170.714 124.724C170.739 125.256 170.621 125.785 170.371 126.255Z\" fill=\"white\"/>\n</g>\n</g>\n<defs>\n<clipPath id=\"clip0_1235_43\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n<clipPath id=\"clip1_1235_43\">\n<rect width=\"151.76\" height=\"65.0309\" fill=\"white\" transform=\"translate(25.24 68.2446)\"/>\n</clipPath>\n</defs>\n</svg>";

    Lampa.Lang.add({
        maxsm_ratings: {
            ru: 'Рейтинги', en: 'Ratings', uk: 'Рейтинги', be: 'Рэйтынгі',
            pt: 'Classificações', zh: '评分', he: 'דירוגים', cs: 'Hodnocení', bg: 'Рейтинги'
        },
        maxsm_ratings_cc: {
            ru: 'Очистить локальный кеш', en: 'Clear local cache', uk: 'Очистити локальний кеш',
            be: 'Ачысціць лакальны кэш', pt: 'Limpar cache local', zh: '清除本地缓存',
            he: 'נקה מטמון מקומי', cs: 'Vymazat místní mezipaměť', bg: 'Изчистване на локалния кеш'
        },
        maxsm_ratings_mode: {
            ru: 'Средний рейтинг', en: 'Average rating', uk: 'Середній рейтинг',
            be: 'Сярэдні рэйтынг', pt: 'Classificação média', zh: '平均评分',
            he: 'דירוג ממוצע', cs: 'Průměrné hodnocení', bg: 'Среден рейтинг'
        },
        maxsm_ratings_icons: {
            ru: 'Иконки вместо текста', en: 'Icons instead of text', uk: 'Іконки замість тексту',
            be: 'Іконкі замест тэксту', pt: 'Ícones em vez de texto', zh: '使用图标代替文字',
            he: 'סמלים במקום טקסט', cs: 'Ikony místo textu', bg: 'Икони вместо текст'
        },
        maxsm_ratings_avg_icon: {
            ru: 'Иконка среднего рейтинга', en: 'Average rating icon', uk: 'Іконка середнього рейтингу',
            be: 'Іконка сярэдняга рэйтынгу', pt: 'Ícone da classificação média', zh: '平均评分图标',
            he: 'סמל דירוג ממוצע', cs: 'Ikona průměrného hodnocení', bg: 'Икона на средния рейтинг'
        },
        maxsm_ratings_icon_style: {
            ru: 'Вид иконок рейтинга', en: 'Rating icon style', uk: 'Вигляд іконок рейтингу',
            be: 'Выгляд іконак рэйтынгу', pt: 'Estilo dos ícones de classificação', zh: '评分图标样式',
            he: 'סגנון אייקוני הדירוג', cs: 'Styl ikon hodnocení', bg: 'Вид на иконите за рейтинг'
        },
        maxsm_ratings_icon_style_color: {
            ru: 'Цветные', en: 'Colored', uk: 'Кольорові', be: 'Каляровыя',
            pt: 'Coloridos', zh: '彩色', he: 'צבעוניים', cs: 'Barevné', bg: 'Цветни'
        },
        maxsm_ratings_icon_style_white: {
            ru: 'Белые', en: 'White', uk: 'Білі', be: 'Белыя',
            pt: 'Brancos', zh: '白色', he: 'לבנים', cs: 'Bílé', bg: 'Бели'
        },
        maxsm_ratings_icon_style_translucent: {
            ru: 'Полупрозрачные', en: 'Translucent', uk: 'Напівпрозорі', be: 'Паўпразрыстыя',
            pt: 'Semitransparentes', zh: '半透明', he: 'חצי-שקופים', cs: 'Poloprůhledné', bg: 'Полупрозрачни'
        },
        maxsm_ratings_font_weight: {
            ru: 'Толщина шрифта рейтинга', en: 'Rating font weight', uk: 'Товщина шрифту рейтингу',
            be: 'Таўшчыня шрыфту рэйтынгу', pt: 'Espessura da fonte da classificação', zh: '评分字体粗细',
            he: 'עובי גופן הדירוג', cs: 'Tloušťka písma hodnocení', bg: 'Дебелина на шрифта на рейтинга'
        },
        maxsm_ratings_avg_separator: {
            ru: 'Разделительная полоса после среднего рейтинга', en: 'Separator after average rating',
            uk: 'Розділювальна смуга після середнього рейтингу', be: 'Раздзяляльная паласа пасля сярэдняга рэйтынгу',
            pt: 'Separador após a classificação média', zh: '平均评分后的分隔线',
            he: 'מפריד אחרי הדירוג הממוצע', cs: 'Oddělovač za průměrným hodnocením', bg: 'Разделител след средния рейтинг'
        },
        maxsm_ratings_source_kp: {
            ru: 'Кинопоиск', en: 'Kinopoisk', uk: 'Кінопошук', be: 'Кінапошук',
            pt: 'Kinopoisk', zh: 'Kinopoisk', he: 'Kinopoisk', cs: 'Kinopoisk', bg: 'Kinopoisk'
        },
        maxsm_ratings_source_tmdb: {
            ru: 'TMDB (fallback)', en: 'TMDB (fallback)', uk: 'TMDB (резерв)', be: 'TMDB (рэзерв)',
            pt: 'TMDB (fallback)', zh: 'TMDB (备用)', he: 'TMDB (גיבוי)', cs: 'TMDB (záloha)', bg: 'TMDB (резерва)'
        },
        maxsm_ratings_source_imdb: {
            ru: 'IMDb', en: 'IMDb', uk: 'IMDb', be: 'IMDb',
            pt: 'IMDb', zh: 'IMDb', he: 'IMDb', cs: 'IMDb', bg: 'IMDb'
        },
        maxsm_ratings_colors: {
            ru: 'Цвета', en: 'Colors', uk: 'Кольори', be: 'Колеры',
            pt: 'Cores', zh: '颜色', he: 'צבעים', cs: 'Barvy', bg: 'Цветове'
        },
        maxsm_ratings_pg: {
            ru: 'Возрастной рейтинг', en: 'Age rating', uk: 'Віковий рейтинг', be: 'Узроставы рэйтынг',
            pt: 'Classificação etária', zh: '年龄分级', he: 'דירוג גיל', cs: 'Věkové hodnocení', bg: 'Възрастов рейтинг'
        },
        maxsm_ratings_avg: {
            ru: 'ИТОГ', en: 'TOTAL', uk: 'ПІДСУМОК', be: 'ВЫНІК',
            pt: 'TOTAL', zh: '总评', he: 'סה"כ', cs: 'VÝSLEDEK', bg: 'РЕЗУЛЬТАТ'
        },
        maxsm_ratings_avg_simple: {
            ru: 'Оценка', en: 'Rating', uk: 'Оцінка', be: 'Ацэнка',
            pt: 'Avaliação', zh: '评分', he: 'דירוג', cs: 'Hodnocení', bg: 'Оценка'
        }
    });

    var modalStyle = "<style id=\"maxsm_ratings_modal\">" +
        ".maxsm-modal-ratings { padding: 1.25em; font-size: 1.4em; line-height: 1.6; }" +
        ".maxsm-modal-rating-line { padding: 0.5em 0; border-bottom: 0.0625em solid rgba(255, 255, 255, 0.1); }" +
        ".maxsm-modal-rating-line:last-child { border-bottom: none; }" +
        ".maxsm-modal-imdb { color: #f5c518; }" +
        ".maxsm-modal-kp { color: #4CAF50; }" +
        ".maxsm-modal-tmdb { color: #01b4e4; }" +
        "</style>";

    Lampa.Template.add('maxsm_ratings_modal', modalStyle);
    $('body').append(Lampa.Template.get('maxsm_ratings_modal', {}, true));

    var style = "<style id=\"maxsm_ratings\">" +
        ".full-start-new__rate-line {" +
            "visibility: visible;" +
            "flex-wrap: wrap;" +
            "gap: 0.4em 0;" +
            "padding-left: 0 !important;" +
            "margin-left: 0 !important;" +
            "margin-right: 0.5em;" +
            "left: 0 !important;" +
            "padding-right: 1em !important;" +
            "box-sizing: border-box;" +
        "}" +
        ".full-start-new__rate-line > :first-child {" +
            "margin-left: 0 !important;" +
        "}" +
        ".full-start-new__rate-line > * {" +
            "margin-right: 0.85em !important;" +
        "}" +
        ".full-start-new__rate-line > .full-start__pg {" +
            "margin-left: 0.55em !important;" +
        "}" +
        ".full-start__rate.rate--avg.maxsm-has-separator::after {" +
            "content: '';" +
            "display: block;" +
            "width: 1px;" +
            "height: 1.45em;" +
            "margin-left: 0.55em;" +
            "background: rgba(255,255,255,0.28);" +
            "border-radius: 1px;" +
            "pointer-events: none;" +
        "}" +
        ".rate--blue   { color: #03A9F4; }" +
        ".rate--green  { color: #4caf50; }" +
        ".rate--lime   { color: #cddc39; }" +
        ".rate--orange { color: #ff9800; }" +
        ".rate--red    { color: #f44336; }" +
        ".rate--gold   { color: gold; }" +
        ".rate--icon    { height: 1.8em; }" +
        ".full-start__rate > div:last-child { padding: 0 !important; }" +
        ".jr { min-width: 5.0em; }" +
        ".rutor { min-width: 7.0em; }" +
        ".maxsm-icon-container {" +
            "display: inline-flex;" +
            "align-items: center;" +
            "justify-content: center;" +
            "width: 1.288em;" +
            "height: 1.288em;" +
            "padding: 0 !important;" +
            "margin: 0 !important;" +
            "overflow: hidden;" +
            "vertical-align: middle;" +
            "line-height: 0;" +
            "background: transparent !important;" +
            "box-shadow: none !important;" +
        "}" +
        ".maxsm-icon-container svg {" +
            "display: block;" +
            "width: 100%;" +
            "height: 100%;" +
            "object-fit: contain;" +
        "}" +
        ".maxsm-source-text-hidden {" +
            "display: none !important;" +
        "}" +
        ".full-start__rate > .maxsm-rating-leading-icon {" +
            "display: inline-flex !important;" +
            "align-items: center;" +
            "justify-content: center;" +
            "flex: 0 0 auto;" +
            "width: 1.288em !important;" +
            "height: 1.288em !important;" +
            "padding: 0 !important;" +
            "margin: 0 0.30em 0 0 !important;" +
            "overflow: hidden;" +
            "background: transparent !important;" +
            "background-color: transparent !important;" +
            "box-shadow: none !important;" +
            "border: 0 !important;" +
        "}" +
        ".full-start__rate > .maxsm-rating-leading-icon svg {" +
            "display: block;" +
            "width: 100%;" +
            "height: 100%;" +
        "}" +
        ".full-start__rate > .maxsm-source-icon {" +
            "border-radius: 30% !important;" +
        "}" +
        ".full-start__rate > .maxsm-source-icon svg {" +
            "border-radius: 30% !important;" +
        "}" +
        ".full-start__rate > .maxsm-average-icon {" +
            "border-radius: 30% !important;" +
            "color: inherit !important;" +
        "}" +
        ".full-start__rate > .maxsm-average-icon svg {" +
            "border-radius: 30% !important;" +
        "}" +
        ".full-start__rate > .maxsm-average-icon.maxsm-average-rating-color svg path {" +
            "fill: currentColor !important;" +
        "}" +
        ".rate--icon {" +
            "display: inline-flex;" +
            "align-items: center;" +
            "justify-content: center;" +
            "padding: 0 !important;" +
            "margin: 0 !important;" +
            "background: transparent !important;" +
            "background-color: transparent !important;" +
            "box-shadow: none !important;" +
            "border: 0 !important;" +
        "}" +
        ".full-start__rate {" +
            "display: flex;" +
            "align-items: center;" +
            "font-family: 'Inter', sans-serif !important;" +
            "padding: 0 !important;" +
            "background: transparent !important;" +
            "background-color: transparent !important;" +
            "box-shadow: none !important;" +
            "border: 0 !important;" +
        "}" +
        ".full-start__rate > div, .full-start__rate > span {" +
            "padding: 0 !important;" +
            "margin: 0 !important;" +
            "background: transparent !important;" +
            "background-color: transparent !important;" +
            "box-shadow: none !important;" +
            "border: 0 !important;" +
            "border-radius: 0 !important;" +
        "}" +
        ".full-start__rate > div:first-child {" +
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
        ".full-start-new__rate-line .full-start__rate > div, .full-start-new__rate-line .full-start__rate > span {" +
            "padding: 0 !important;" +
            "min-width: 0 !important;" +
            "min-height: 0 !important;" +
        "}" +
        ".maxsm-source-disabled {" +
            "display: none !important;" +
        "}" +
        "html.maxsm-hide-pg .full-start__pg," +
        "html.maxsm-hide-pg .full-start-new__rate-line > .full-start__pg {" +
            "display: none !important;" +
        "}" +
        /* Фиксированная ширина блоков IMDb и KP */
        ".full-start-new__rate-line .rate--imdb," +
        ".full-start-new__rate-line .rate--kp {" +
            "min-width: 1.6em !important;" +
            "display: inline-flex !important;" +
            "align-items: center;" +
            "justify-content: flex-start;" +
        "}" +
        ".full-start-new__rate-line .rate--imdb > div:first-of-type," +
        ".full-start-new__rate-line .rate--kp > div:first-of-type {" +
            "width: 1.6em !important;" +
            "text-align: left;" +
        "}" +
        /* Плейсхолдер -.- */
        ".maxsm-rating-placeholder {" +
            "opacity: 0.6;" +
            "letter-spacing: -0.02em;" +
        "}" +
        ".rate--avg > div:first-of-type, .rate--tmdb > div:first-of-type, .rate--imdb > div:first-of-type, .rate--kp > div:first-of-type {" +
            "font-family: 'Inter', sans-serif !important;" +
            "font-size: 1.04em !important;" +
            "font-weight: var(--maxsm-rating-font-weight, 500) !important;" +
            "letter-spacing: -0.02em !important;" +
            "line-height: 1.1;" +
        "}" +
        "</style>";

    Lampa.Template.add('maxsm_ratings_css', style);
    $('body').append(Lampa.Template.get('maxsm_ratings_css', {}, true));

    var globalCurrentCard = null;

    var C_LOGGING = false;
    var CACHE_TIME = 3 * 24 * 60 * 60 * 1000;
    var KP_CACHE = 'maxsm_ratings_kp_cache_v2';
    var ID_MAPPING_CACHE = 'maxsm_ratings_id_mapping_cache';
    var OMDB_CACHE = 'maxsm_ratings_omdb_cache';

    var KP_API_KEYS = (window.RATINGS_PLUGIN_TOKENS && window.RATINGS_PLUGIN_TOKENS.KP_API_KEYS) || ['3c47e3a8-a70f-447c-80a7-8ce15d93e66e'];
    var OMDB_API_KEYS = ['73ff4450', '4a3b71a1', 'b9a5e69d'];

    var PROXY_TIMEOUT = 2500;
    var PROXY_LIST = ['https://cors.bwa.workers.dev/'];

    var WEIGHTS = {
        imdb: 0.35,
        tmdb: 0.15,
        kp: 0.20
    };

    function getRandomToken(arr) {
        if (!arr || !arr.length) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function applyPgVisibility(value) {
        var visible;

        if (value !== undefined && value !== null) {
            visible = (value === true || value === 'true' || value === 1 || value === '1');
            try { Lampa.Storage.set('maxsm_ratings_show_pg', visible); } catch (e) {}
        } else {
            var stored = true;
            try { stored = Lampa.Storage.get('maxsm_ratings_show_pg', true); } catch (e) {}
            visible = (stored === true || stored === 'true' || stored === 1 || stored === '1');
        }

        var html = document.documentElement;
        if (!html) return;

        if (visible) {
            html.classList.remove('maxsm-hide-pg');
        } else {
            html.classList.add('maxsm-hide-pg');
        }

        try {
            var els = document.querySelectorAll('.full-start__pg');
            for (var i = 0; i < els.length; i++) {
                if (visible) {
                    els[i].style.removeProperty('display');
                } else {
                    els[i].style.setProperty('display', 'none', 'important');
                }
            }
        } catch (e) {}
    }

    function fetchWithProxy(url, localCurrentCard, callback) {
        var callbackCalled = false;
        var pending = PROXY_LIST.length;

        if (!pending) {
            callback(new Error('No proxies configured'));
            return;
        }

        function finish(error, data) {
            if (callbackCalled) return;
            callbackCalled = true;
            clearTimeout(globalTimeout);
            callback(error, data);
        }

        function failed() {
            pending--;
            if (pending <= 0) {
                finish(new Error('All proxies failed'));
            }
        }

        var globalTimeout = setTimeout(function() {
            finish(new Error('Proxy timeout'));
        }, PROXY_TIMEOUT);

        PROXY_LIST.forEach(function(proxy) {
            var proxyUrl = proxy + encodeURIComponent(url);

            fetch(proxyUrl)
                .then(function(response) {
                    if (!response.ok) throw new Error('Proxy error: ' + response.status);
                    return response.text();
                })
                .then(function(data) {
                    if (!callbackCalled) finish(null, data);
                })
                .catch(function() {
                    if (!callbackCalled) failed();
                });
        });
    }

    //-----------------------------------------------------get---kinopoisk-------------------------------------
    var kpRequestsInFlight = {};

    function ratingRequest(url, options, format, timeout) {
        return new Promise(function(resolve, reject) {
            var finished = false;
            var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var requestOptions = {};
            for (var key in (options || {})) requestOptions[key] = options[key];
            if (controller) requestOptions.signal = controller.signal;
            function finish(error, value) {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                if (error) reject(error);
                else resolve(value);
            }
            var timer = setTimeout(function() {
                finish(new Error('Rating request timeout'));
                if (controller) controller.abort();
            }, timeout);
            fetch(url, requestOptions).then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return format === 'json' ? response.json() : response.text();
            }).then(function(value) { finish(null, value); }, function(error) { finish(error); });
        });
    }

    function getKPRatings(normalizedCard, apiKey, localCurrentCard, callback) {
        var mappingKey = normalizedCard.type + '_tmdb_' + normalizedCard.id;
        var imdbMappingKey = normalizedCard.imdb_id ? normalizedCard.type + '_imdb_' + normalizedCard.imdb_id : null;
        var requestKey = normalizedCard.type + '_' + (normalizedCard.kinopoisk_id || normalizedCard.imdb_id || normalizedCard.id);
        if (kpRequestsInFlight[requestKey]) {
            kpRequestsInFlight[requestKey].push(callback);
            return;
        }
        kpRequestsInFlight[requestKey] = [callback];
        function finish(result) {
            var listeners = kpRequestsInFlight[requestKey] || [];
            delete kpRequestsInFlight[requestKey];
            listeners.forEach(function(listener) { listener(result); });
        }
        var mappings = Lampa.Storage.get(ID_MAPPING_CACHE) || {};
        var mapped = mappings[mappingKey] || (imdbMappingKey && mappings[imdbMappingKey]);
        var filmId = normalizedCard.kinopoisk_id ||
            (mapped && mapped.version === 2 && Date.now() - mapped.timestamp < CACHE_TIME && mapped.kinopoisk_id);
        if (filmId) {
            fetchRatings(filmId);
            return;
        }

        var year = normalizedCard.release_date && typeof normalizedCard.release_date === 'string' ? normalizedCard.release_date.split('-')[0] : '';
        var titles = [];
        [normalizedCard.title, normalizedCard.original_title].forEach(function(title) {
            title = String(title || '').replace(/[:\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
            if (title && titles.indexOf(title) === -1) titles.push(title);
        });
        function titleKey(title) {
            return String(title || '').toLowerCase().replace(/ё/g, 'е').replace(/[\s.,:;!?\-–—'"«»()[\]{}\/\\]+/g, '');
        }
        function numberRating(value) {
            if (!/^\d+(?:[.,]\d+)?$/.test(String(value))) return null;
            var valueNumber = parseFloat(String(value).replace(',', '.'));
            return valueNumber > 0 && valueNumber <= 10 ? valueNumber : null;
        }
        function chooseMatch(films) {
            var best = null, bestScore = -1, tied = false;
            (films || []).forEach(function(film) {
                var candidateType = film.type;
                if (candidateType && normalizedCard.type === 'tv' && candidateType === 'FILM') return;
                if (candidateType && normalizedCard.type === 'movie' && /^(TV_SERIES|MINI_SERIES|TV_SHOW)$/.test(candidateType)) return;
                var candidateYear = parseInt(film.year, 10), targetYear = parseInt(year, 10);
                var difference = candidateYear && targetYear ? Math.abs(candidateYear - targetYear) : null;
                if (difference !== null && difference > 1) return;
                var score = -1;
                var names = [film.nameRu, film.nameEn, film.nameOriginal];
                names.forEach(function(name) {
                    var key = titleKey(name);
                    if (!key) return;
                    titles.forEach(function(title) {
                        var target = titleKey(title);
                        if (key === target) score = Math.max(score, 100);
                        else if (difference === 0 && Math.min(key.length, target.length) >= 5 &&
                            (key.indexOf(target) >= 0 || target.indexOf(key) >= 0)) score = Math.max(score, 60);
                    });
                });
                if (score < 0) return;
                score += difference === 0 ? 20 : difference === 1 ? 10 : 0;
                if (score > bestScore) { best = film; bestScore = score; tied = false; }
                else if (score === bestScore && String(film.filmId || film.kinopoiskId) !== String(best.filmId || best.kinopoiskId)) tied = true;
            });
            return tied ? null : best;
        }
        function useMatch(film) {
            var id = film && (film.kinopoiskId || film.filmId);
            if (!id) return false;
            var mapping = {kinopoisk_id: id, timestamp: Date.now(), version: 2};
            var currentMappings = Lampa.Storage.get(ID_MAPPING_CACHE) || {};
            currentMappings[mappingKey] = mapping;
            if (imdbMappingKey) currentMappings[imdbMappingKey] = mapping;
            Lampa.Storage.set(ID_MAPPING_CACHE, currentMappings);
            // Both search endpoints can already contain the KP rating.
            var kp = numberRating(film.ratingKinopoisk);
            if (kp === null) kp = numberRating(film.rating);
            if (kp !== null) finish({kinopoisk: kp, imdb: numberRating(film.ratingImdb)});
            else fetchRatings(id);
            return true;
        }
        function searchByTitle(index) {
            if (index >= titles.length) { finish(null); return; }
            var searchUrl = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(titles[index]);
            ratingRequest(searchUrl, {
                method: 'GET', headers: {'X-API-KEY': apiKey, 'Content-Type': 'application/json'}
            }, 'json', 5000).then(function(data) {
                if (!useMatch(chooseMatch(data.films || data.items))) searchByTitle(index + 1);
            }, function() { searchByTitle(index + 1); });
        }
        // IMDb ID gives an exact cross-catalog match, independent of translation.
        if (/^tt\d+$/.test(normalizedCard.imdb_id || '')) {
            ratingRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films?imdbId=' + encodeURIComponent(normalizedCard.imdb_id), {
                headers: {'X-API-KEY': apiKey}
            }, 'json', 3500).then(function(data) {
                var exact = null;
                (data.items || []).forEach(function(film) {
                    if (film.imdbId === normalizedCard.imdb_id) exact = film;
                });
                if (!useMatch(exact)) searchByTitle(0);
            }, function() { searchByTitle(0); });
        } else searchByTitle(0);

        function fetchRatings(filmId) {
            var xmlUrl = 'https://rating.kinopoisk.ru/' + filmId + '.xml';
            var settled = false;
            var apiStarted = false;
            var proxyStarted = false;
            var pending = 1;
            var partial = null;
            var apiTimer, proxyTimer;
            function validRating(value) {
                var number = parseFloat(value);
                return isFinite(number) && number > 0 && number <= 10 ? number : null;
            }
            function complete(result) {
                if (settled) return;
                if (result) {
                    partial = partial || {kinopoisk: null, imdb: null};
                    if (result.kinopoisk != null) partial.kinopoisk = result.kinopoisk;
                    if (result.imdb != null) partial.imdb = result.imdb;
                }
                pending--;
                if (partial && partial.kinopoisk != null) {
                    settled = true;
                    clearTimeout(apiTimer);
                    clearTimeout(proxyTimer);
                    finish(partial);
                } else if (pending === 0 && apiStarted && proxyStarted) {
                    settled = true;
                    clearTimeout(apiTimer);
                    clearTimeout(proxyTimer);
                    finish(partial);
                }
            }
            function parseXml(xmlText) {
                var xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');
                var kpNode = xmlDoc.getElementsByTagName('kp_rating')[0];
                var imdbNode = xmlDoc.getElementsByTagName('imdb_rating')[0];
                return {
                    kinopoisk: validRating(kpNode && kpNode.textContent),
                    imdb: validRating(imdbNode && imdbNode.textContent)
                };
            }
            function startApi() {
                if (settled || apiStarted) return;
                apiStarted = true;
                pending++;
                ratingRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + filmId, {
                    headers: {'X-API-KEY': apiKey}
                }, 'json', 4500).then(function(data) {
                    complete({kinopoisk: validRating(data.ratingKinopoisk), imdb: validRating(data.ratingImdb)});
                }, function() { complete(null); });
            }
            function startProxy() {
                if (settled || proxyStarted) return;
                proxyStarted = true;
                pending++;
                fetchWithProxy(xmlUrl, localCurrentCard, function(error, xmlText) {
                    var result = null;
                    if (!error && xmlText) { try { result = parseXml(xmlText); } catch (e) {} }
                    complete(result);
                });
            }
            // Prefer the free XML endpoint. A slow/blocked XML request no longer
            // makes the API wait for both the direct and proxy timeouts.
            apiTimer = setTimeout(startApi, 250);
            proxyTimer = setTimeout(startProxy, 700);
            ratingRequest(xmlUrl, {}, 'text', 3500).then(function(xmlText) {
                var result = null;
                try { result = parseXml(xmlText); } catch (e) {}
                if (!result || result.kinopoisk == null) { startApi(); startProxy(); }
                complete(result);
            }, function() {
                startApi();
                startProxy();
                complete(null);
            });
        }
    }
    //-------------------------------------------------end---get---kinopoisk-----------------------------------

    function getCardType(card) {
        if (card.media_type === 'movie' || card.media_type === 'tv') return card.media_type;
        if (card.type === 'movie' || card.type === 'tv') return card.type;
        if (card.first_air_date || card.name || card.original_name || card.number_of_seasons) return 'tv';
        if (card.release_date || card.title || card.original_title) return 'movie';
        return 'movie';
    }

    function updateAverageSeparator(render) {
        if (!render) return;
        var rateLine = $('.full-start-new__rate-line', render);
        if (!rateLine.length) return;
        $('.rate--avg', rateLine).removeClass('maxsm-has-separator');
        var showSeparator = localStorage.getItem('maxsm_ratings_avg_separator') !== 'false';
        if (!showSeparator) return;
        var avgElement = $('.rate--avg:not(.hide):not(.maxsm-source-disabled)', rateLine).first();
        if (!avgElement.length) return;
        var otherRatings = $('.full-start__rate', rateLine).not('.rate--avg').not('.hide').not('.maxsm-source-disabled');
        if (otherRatings.length) avgElement.addClass('maxsm-has-separator');
    }

    function applyRatingFontWeight(value) {
        var weight = String(value !== undefined && value !== null ? value : (localStorage.getItem('maxsm_ratings_font_weight') || '500'));
        if (['400', '500', '600', '700'].indexOf(weight) === -1) weight = '500';
        document.documentElement.style.setProperty('--maxsm-rating-font-weight', weight);
    }

    function getAverageRatingClass(rating) {
        rating = parseFloat(rating) || 0;
        if (rating >= 8.5) return 'rate--blue';
        if (rating >= 8.0) return 'rate--green';
        if (rating >= 7.0) return 'rate--lime';
        if (rating >= 6.0) return 'rate--orange';
        return 'rate--red';
    }

    function isRatingSourceEnabled(source) {
        var keyMap = { kp: 'maxsm_ratings_source_kp', tmdb: 'maxsm_ratings_source_tmdb', imdb: 'maxsm_ratings_source_imdb' };
        var key = keyMap[source];
        return !key || localStorage.getItem(key) !== 'false';
    }

    function isAverageRatingEnabled() {
        return localStorage.getItem('maxsm_ratings_show_average') !== 'false';
    }

    function hasRatingValue(element) {
        if (!element || !element.length) return false;
        var value = parseFloat(element.find('> div').eq(0).text().replace(',', '.'));
        return !isNaN(value) && value > 0;
    }

    /*
     * TMDB показываем только если ОБА источника (KP и IMDb) выключены.
     * Если хотя бы один включён — TMDB скрыт, даже если рейтинг ещё грузится.
     */
    function applyRatingSourceVisibility(render) {
        if (!render) return;
        var kpElement = $('.rate--kp', render);
        var imdbElement = $('.rate--imdb', render);
        var tmdbElement = $('.rate--tmdb', render);
        var kpEnabled = isRatingSourceEnabled('kp');
        var imdbEnabled = isRatingSourceEnabled('imdb');

        var tmdbEnabled = !kpEnabled && !imdbEnabled;

        kpElement.toggleClass('maxsm-source-disabled', !kpEnabled);
        imdbElement.toggleClass('maxsm-source-disabled', !imdbEnabled);
        tmdbElement.toggleClass('maxsm-source-disabled', !tmdbEnabled);
    }

    function refreshRatingSourceSettings() {
        try {
            var active = Lampa.Activity.active();
            if (!active || !active.activity) return;
            var render = active.activity.render();
            if (!render) return;
            applyRatingSourceVisibility(render);
            calculateAverageRating(globalCurrentCard, render);
            insertIcons(globalCurrentCard, render);
            updateAverageSeparator(render);
        } catch (e) {}
    }

    function fetchAdditionalRatings(card, render) {
        if (!render) return;

        var localCurrentCard = card.id;

        var normalizedCard = {
            id: card.id,
            tmdb: card.vote_average || null,
            kinopoisk_id: card.kinopoisk_id || card.kinopoiskId || card.kp_id || null,
            imdb_id: card.imdb_id || (card.external_ids && card.external_ids.imdb_id) || card.imdb || null,
            title: card.title || card.name || '',
            original_title: card.original_title || card.original_name || '',
            type: getCardType(card),
            release_date: card.release_date || card.first_air_date || ''
        };

        var rateLine = $('.full-start-new__rate-line', render);
        if (rateLine.length) {
            rateLine.css('visibility', 'visible');
            rateLine.addClass('done');
        }

        var initialCacheKey = normalizedCard.type + '_tmdb_' + normalizedCard.id;
        var legacyCacheKey = normalizedCard.type + '_' + (normalizedCard.imdb_id || normalizedCard.kinopoisk_id || normalizedCard.id);
        var ratingsData = {};

        var kpElement = $('.rate--kp:not(.hide)', render);
        var imdbElement = $('.rate--imdb:not(.hide)', render);

        var kpText = kpElement.length ? kpElement.find('> div').eq(0).text().trim() : '';
        var imdbText = imdbElement.length ? imdbElement.find('> div').eq(0).text().trim() : '';

        var kpExists = kpText && !isNaN(parseFloat(kpText));
        var imdbExists = imdbText && !isNaN(parseFloat(imdbText));

        if (kpExists) ratingsData.kp = parseFloat(kpText);
        if (imdbExists) ratingsData.imdb = parseFloat(imdbText);

        /* Ставим плейсхолдеры -.- для тех, которых ещё нет */
        if (!imdbExists && imdbElement.length) {
            var imdbDiv = imdbElement.find('> div').eq(0);
            if (!imdbDiv.text().trim() || isNaN(parseFloat(imdbDiv.text()))) {
                imdbDiv.text('–.–').addClass('maxsm-rating-placeholder');
            }
        }
        if (!kpExists && kpElement.length) {
            var kpDiv = kpElement.find('> div').eq(0);
            if (!kpDiv.text().trim() || isNaN(parseFloat(kpDiv.text()))) {
                kpDiv.text('–.–').addClass('maxsm-rating-placeholder');
            }
        }

        var uiTimer = null;

        function updateUI() {
            if (!render) return;
            updateHiddenElements(ratingsData, localCurrentCard, render);
            calculateAverageRating(localCurrentCard, render);
            insertIcons(localCurrentCard, render);
            applyRatingSourceVisibility(render);
            updateAverageSeparator(render);
            rateLine.css('visibility', 'visible');

            var rateElement = $('.full-start__rate', render);
            rateElement.off('click.ratings-modal').on('click.ratings-modal', function (e) {
                e.stopPropagation();
                showRatingsModal(localCurrentCard, render);
            });
        }

        function scheduleUI() {
            if (uiTimer) clearTimeout(uiTimer);
            uiTimer = setTimeout(updateUI, 16);
        }

        function mergeKpData(kpRatings) {
            if (!kpRatings) return;
            if (kpRatings.kinopoisk != null) ratingsData.kp = kpRatings.kinopoisk;
            if (kpRatings.imdb != null) {
                ratingsData.imdb_kp = kpRatings.imdb;
                if (!ratingsData.imdb) ratingsData.imdb = kpRatings.imdb;
            }
        }

        updateUI();

        if (!imdbExists && normalizedCard.imdb_id) {
            var omdbCache = Lampa.Storage.get(OMDB_CACHE) || {};
            var cachedOmdb = omdbCache[normalizedCard.imdb_id];

            if (cachedOmdb && (Date.now() - cachedOmdb.timestamp < CACHE_TIME)) {
                ratingsData.imdb = cachedOmdb.imdb;
                scheduleUI();
            } else {
                var omdbKey = getRandomToken(OMDB_API_KEYS);
                var omdbUrl = 'https://www.omdbapi.com/?apikey=' + omdbKey + '&i=' + normalizedCard.imdb_id;

                new Lampa.Reguest().silent(omdbUrl, function(data) {
                    if (data && data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A') {
                        var imdb = parseFloat(data.imdbRating);
                        if (!isNaN(imdb) && imdb > 0) {
                            ratingsData.imdb = imdb;
                            omdbCache[normalizedCard.imdb_id] = { imdb: imdb, timestamp: Date.now() };
                            Lampa.Storage.set(OMDB_CACHE, omdbCache);
                        }
                    }
                    scheduleUI();
                }, function() {
                    scheduleUI();
                });
            }
        }

        var cachedKpData = getKpCache(initialCacheKey) || getKpCache(legacyCacheKey);

        if (cachedKpData) {
            mergeKpData({ kinopoisk: cachedKpData.kp, imdb: cachedKpData.imdb });
            scheduleUI();
        }
        if (!kpExists && (!cachedKpData || !cachedKpData.kp)) {
            getKPRatings(normalizedCard, getRandomToken(KP_API_KEYS), localCurrentCard, function(kpRatings) {
                if (kpRatings) {
                    mergeKpData(kpRatings);
                    saveKpCache(initialCacheKey, { kp: kpRatings.kinopoisk, imdb: kpRatings.imdb }, localCurrentCard);
                }
                scheduleUI();
            });
        }
    }

    function showRatingsModal(cardId, render) {
        var showColors = localStorage.getItem('maxsm_ratings_colors') === 'true';
        var modalContent = $('<div class="maxsm-modal-ratings"></div>');
        var rateLine = $('.full-start-new__rate-line', render);
        if (!rateLine.length) return;

        var ratingOrder = ['rate--avg', 'rate--tmdb', 'rate--imdb', 'rate--kp'];

        ratingOrder.forEach(function(className) {
            var element = $('.' + className, rateLine).not('.maxsm-source-disabled');
            if (element.length) {
                var value = element.children('div').eq(0).text().trim();
                var numericValue = parseFloat(value);
                var label = '';
                switch(className) {
                    case 'rate--avg': label = ''; break;
                    case 'rate--tmdb': label = 'TMDB'; break;
                    case 'rate--imdb': label = 'IMDb'; break;
                    case 'rate--kp': label = 'Кинопоиск'; break;
                }
                var item = $('<div class="maxsm-modal-rating-line"></div>');
                if (showColors) {
                    var colorClass;
                    if (className === 'rate--avg') {
                        colorClass = getAverageRatingClass(numericValue);
                        if (colorClass) item.addClass(colorClass);
                    } else {
                        colorClass = 'maxsm-modal-' + className.replace('rate--', '');
                        item.addClass(colorClass);
                    }
                }
                item.text(className === 'rate--avg' ? value : value + ' - ' + label);
                modalContent.append(item);
            }
        });

        Lampa.Modal.open({
            title: Lampa.Lang.translate("maxsm_ratings_avg_simple"),
            html: modalContent,
            width: 600,
            onBack: function() {
                Lampa.Modal.close();
                Lampa.Controller.toggle('content');
                return true;
            }
        });
    }

    function insertIcons(localCurrentCard, render) {
        if (!render) return;
        var showIcons = localStorage.getItem('maxsm_ratings_icons') === 'true';
        var showAverageIcon = localStorage.getItem('maxsm_ratings_avg_icon') !== 'false';
        var iconStyle = localStorage.getItem('maxsm_ratings_icon_style') || '2';
        var colorizeAverageIcon = localStorage.getItem('maxsm_ratings_colors') === 'true';

        function replaceIcon(className, coloredSvg, whiteSvg, translucentSvg, iconType) {
            var elements = $('.' + className, render);
            if (!elements.length) return;

            elements.each(function() {
                var element = $(this);
                element.children('.maxsm-rating-leading-icon').remove();

                var sourceName = element.find('.source--name').first();
                if (!sourceName.length) {
                    var childDivs = element.children('div');
                    if (childDivs.length >= 2) sourceName = childDivs.eq(1);
                }
                if (sourceName.length) sourceName.removeClass('maxsm-source-text-hidden rate--icon');

                var shouldShowIcon = iconType === 'average' ? showAverageIcon : showIcons;
                if (!shouldShowIcon) return;

                if (iconType !== 'average' && sourceName.length) sourceName.addClass('maxsm-source-text-hidden');

                var ratingValue = element.children('div').first();

                if (iconType === 'source' &&
                    (className === 'rate--imdb' || className === 'rate--kp')) {

                    var currentText = ratingValue.text().trim();
                    if (!currentText || currentText === '' || isNaN(parseFloat(currentText))) {
                        ratingValue.text('–.–').addClass('maxsm-rating-placeholder');
                    } else {
                        ratingValue.removeClass('maxsm-rating-placeholder');
                    }
                }

                var extraClass = iconType === 'average' ? 'maxsm-average-icon' : 'maxsm-source-icon';
                var styleClass = iconStyle === '1'
                    ? 'maxsm-icon-style-white'
                    : (iconStyle === '2' ? 'maxsm-icon-style-translucent' : 'maxsm-icon-style-color');
                var colorClass = iconType === 'average' && colorizeAverageIcon ? ' maxsm-average-rating-color' : '';

                var iconWrap = $('<span class="maxsm-rating-leading-icon maxsm-icon-container ' + extraClass + ' ' + styleClass + colorClass + '"></span>');
                iconWrap.html(iconStyle === '1' ? whiteSvg : (iconStyle === '2' ? translucentSvg : coloredSvg));

                if (ratingValue.length) iconWrap.insertBefore(ratingValue);
                else element.prepend(iconWrap);
            });
        }

        replaceIcon('rate--avg', avg_svg, avg_white_svg, avg_translucent_svg, 'average');
        replaceIcon('rate--imdb', imdb_svg, imdb_white_svg, imdb_translucent_svg, 'source');
        replaceIcon('rate--kp', kp_svg, kp_white_svg, kp_translucent_svg, 'source');
        replaceIcon('rate--tmdb', tmdb_svg, tmdb_white_svg, tmdb_translucent_svg, 'source');
    }

    function getKpCache(key) {
        var cache = Lampa.Storage.get(KP_CACHE) || {};
        var item = cache[key];
        return item && (Date.now() - item.timestamp < CACHE_TIME) ? item : null;
    }

    function saveKpCache(key, data, localCurrentCard) {
        var cache = Lampa.Storage.get(KP_CACHE) || {};
        cache[key] = { kp: data.kp || null, imdb: data.imdb || null, timestamp: Date.now() };
        Lampa.Storage.set(KP_CACHE, cache);
    }

    function updateHiddenElements(ratings, localCurrentCard, render) {
        if (!render) return;

        var imdbElement = $('.rate--imdb', render);
        if (imdbElement.length) {
            var imdbRating;
            if (ratings.imdb && !isNaN(ratings.imdb)) {
                imdbRating = parseFloat(ratings.imdb).toFixed(1);
                imdbElement
                    .removeClass('hide')
                    .find('> div').eq(0)
                    .removeClass('maxsm-rating-placeholder')
                    .text(imdbRating);
            } else if (ratings.imdb_kp && !isNaN(ratings.imdb_kp)) {
                imdbRating = parseFloat(ratings.imdb_kp).toFixed(1);
                imdbElement
                    .removeClass('hide')
                    .find('> div').eq(0)
                    .removeClass('maxsm-rating-placeholder')
                    .text(imdbRating);
            }
        }

        var kpElement = $('.rate--kp', render);
        if (kpElement.length && ratings.kp && !isNaN(ratings.kp)) {
            var kpRating = parseFloat(ratings.kp).toFixed(1);
            kpElement
                .removeClass('hide')
                .find('> div').eq(0)
                .removeClass('maxsm-rating-placeholder')
                .text(kpRating);
        }
    }

    function calculateAverageRating(localCurrentCard, render) {
        if (!render) return;
        var rateLine = $('.full-start-new__rate-line', render);
        if (!rateLine.length) return;

        var ratings = {
            imdb: parseFloat($('.rate--imdb div:first', rateLine).text()) || 0,
            tmdb: parseFloat($('.rate--tmdb div:first', rateLine).text()) || 0,
            kp: parseFloat($('.rate--kp div:first', rateLine).text()) || 0
        };

        var totalWeight = 0, weightedSum = 0, ratingsCount = 0;
        for (var key in ratings) {
            if (ratings.hasOwnProperty(key) && !isNaN(ratings[key]) && ratings[key] > 0) {
                weightedSum += ratings[key] * WEIGHTS[key];
                totalWeight += WEIGHTS[key];
                ratingsCount++;
            }
        }

        $('.rate--avg', rateLine).remove();
        if (!isAverageRatingEnabled()) { updateAverageSeparator(render); return; }

        if (totalWeight > 0 && ratingsCount > 1) {
            var averageRating = (weightedSum / totalWeight).toFixed(1);
            var colorClass = getAverageRatingClass(averageRating);
            var avgElement = $(
                '<div class="full-start__rate rate--avg ' + colorClass + '">' +
                '<div>' + averageRating + '</div>' +
                '<div class="source--name"></div>' +
                '</div>'
            );
            var showColors = localStorage.getItem('maxsm_ratings_colors') === 'true';
            if (!showColors) avgElement.removeClass(colorClass);
            $('.full-start__rate:first', rateLine).before(avgElement);
        }
    }

    function findCurrentMovie() {
        try {
            var active = Lampa.Activity.active();
            if (!active) return null;

            var card = active.card;
            if (card && (card.id || active.id)) {
                if (!card.id && active.id) card.id = active.id;
                if (!card.media_type && active.method) card.media_type = active.method;
                if (!card.title && card.name) card.title = card.name;
                if (!card.release_date && card.first_air_date) card.release_date = card.first_air_date;
                return card;
            }

            if (active.id) {
                return { id: active.id, media_type: active.method || 'movie' };
            }

            var fallbacks = [
                active.movie,
                active.activity && active.activity.movie,
                active.activity && active.activity.card,
                active.activity && active.activity.activity && active.activity.activity.movie
            ];
            for (var i = 0; i < fallbacks.length; i++) {
                var c = fallbacks[i];
                if (!c) continue;
                if (c.id || c.tmdb_id || c.movie_id) {
                    if (!c.id && c.tmdb_id) c.id = c.tmdb_id;
                    if (!c.id && c.movie_id) c.id = c.movie_id;
                    if (!c.title && c.name) c.title = c.name;
                    if (!c.release_date && c.first_air_date) c.release_date = c.first_air_date;
                    if (!c.media_type && active.method) c.media_type = active.method;
                    return c;
                }
            }
        } catch (e) {}
        return null;
    }

    function tryProcessCardInDom() {
        var rateLine = $('.full-start-new__rate-line').first();
        if (!rateLine.length) return;
        if (rateLine.data('maxsm-processed') === true) return;

        var render = rateLine.closest('.activity__body');
        if (!render.length) render = $(document);

        var movie = findCurrentMovie();
        if (!movie || !movie.id) return;

        rateLine.data('maxsm-processed', true);
        globalCurrentCard = movie.id;

        applyPgVisibility();
        setTimeout(applyPgVisibility, 50);
        setTimeout(applyPgVisibility, 200);
        setTimeout(applyPgVisibility, 600);

        fetchAdditionalRatings(movie, render);
    }

    function startPlugin() {
        window.maxsmRatingsPlugin = true;

        if (!localStorage.getItem('maxsm_ratings_colors')) localStorage.setItem('maxsm_ratings_colors', 'false');
        if (localStorage.getItem('maxsm_ratings_source_kp') === null) localStorage.setItem('maxsm_ratings_source_kp', 'true');
        if (localStorage.getItem('maxsm_ratings_source_tmdb') === null) localStorage.setItem('maxsm_ratings_source_tmdb', 'false');
        if (localStorage.getItem('maxsm_ratings_source_imdb') === null) localStorage.setItem('maxsm_ratings_source_imdb', 'true');
        if (!localStorage.getItem('maxsm_ratings_icons')) localStorage.setItem('maxsm_ratings_icons', 'false');
        if (localStorage.getItem('maxsm_ratings_avg_icon') === null) localStorage.setItem('maxsm_ratings_avg_icon', 'true');
        if (localStorage.getItem('maxsm_ratings_icon_style') === null) localStorage.setItem('maxsm_ratings_icon_style', '2');
        if (localStorage.getItem('maxsm_ratings_show_average') === null) localStorage.setItem('maxsm_ratings_show_average', 'true');
        if (localStorage.getItem('maxsm_ratings_font_weight') === null) localStorage.setItem('maxsm_ratings_font_weight', '500');

        try { localStorage.removeItem('maxsm_ratings_hide_pg'); } catch (e) {}

        applyRatingFontWeight();
        applyPgVisibility();

        Lampa.SettingsApi.addComponent({
            component: "maxsm_ratings",
            name: Lampa.Lang.translate("maxsm_ratings"),
            icon: star_svg
        });

        var iconStyleValue = {};
        iconStyleValue[0] = Lampa.Lang.translate("maxsm_ratings_icon_style_color");
        iconStyleValue[1] = Lampa.Lang.translate("maxsm_ratings_icon_style_white");
        iconStyleValue[2] = Lampa.Lang.translate("maxsm_ratings_icon_style_translucent");

        var fontWeightValue = { 400: '400', 500: '500', 600: '600', 700: '700' };

        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_show_average", type: "trigger", default: true },
            field: { name: Lampa.Lang.translate("maxsm_ratings_mode"), description: '' },
            onChange: function() { refreshRatingSourceSettings(); }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_source_kp", type: "trigger", default: true },
            field: { name: Lampa.Lang.translate("maxsm_ratings_source_kp"), description: '' },
            onChange: function() { refreshRatingSourceSettings(); }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_source_imdb", type: "trigger", default: true },
            field: { name: Lampa.Lang.translate("maxsm_ratings_source_imdb"), description: '' },
            onChange: function() { refreshRatingSourceSettings(); }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_source_tmdb", type: "trigger", default: false },
            field: { name: Lampa.Lang.translate("maxsm_ratings_source_tmdb"), description: '' },
            onChange: function() { refreshRatingSourceSettings(); }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_show_pg", type: "trigger", default: true },
            field: { name: Lampa.Lang.translate("maxsm_ratings_pg"), description: '' },
            onChange: function(value) { applyPgVisibility(value); }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_colors", type: "trigger", default: false },
            field: { name: Lampa.Lang.translate("maxsm_ratings_colors"), description: '' },
            onChange: function() { refreshRatingSourceSettings(); }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_icons", type: "trigger", default: false },
            field: { name: Lampa.Lang.translate("maxsm_ratings_icons"), description: '' },
            onChange: function() {
                var render = Lampa.Activity.active().activity.render();
                insertIcons(globalCurrentCard, render);
                updateAverageSeparator(render);
            }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_icon_style", type: "select", values: iconStyleValue, default: 2 },
            field: { name: Lampa.Lang.translate("maxsm_ratings_icon_style"), description: '' },
            onChange: function() {
                var render = Lampa.Activity.active().activity.render();
                insertIcons(globalCurrentCard, render);
                updateAverageSeparator(render);
            }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_avg_icon", type: "trigger", default: true },
            field: { name: Lampa.Lang.translate("maxsm_ratings_avg_icon"), description: '' },
            onChange: function() {
                var render = Lampa.Activity.active().activity.render();
                insertIcons(globalCurrentCard, render);
                updateAverageSeparator(render);
            }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_font_weight", type: "select", values: fontWeightValue, default: 500 },
            field: { name: Lampa.Lang.translate("maxsm_ratings_font_weight"), description: '' },
            onChange: function(value) { applyRatingFontWeight(value); }
        });
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: { name: "maxsm_ratings_avg_separator", type: "trigger", default: true },
            field: { name: Lampa.Lang.translate("maxsm_ratings_avg_separator"), description: '' },
            onChange: function() {
                var render = Lampa.Activity.active().activity.render();
                updateAverageSeparator(render);
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'maxsm_ratings',
            param: { name: 'maxsm_ratings_cc', type: 'button' },
            field: { name: Lampa.Lang.translate('maxsm_ratings_cc') },
            onChange: function() {
                localStorage.removeItem(KP_CACHE);
                localStorage.removeItem(ID_MAPPING_CACHE);
                localStorage.removeItem(OMDB_CACHE);
                window.location.reload();
            }
        });

        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                var render = e.object.activity.render();
                globalCurrentCard = e.data.movie.id;
                applyPgVisibility();
                setTimeout(applyPgVisibility, 50);
                setTimeout(applyPgVisibility, 200);
                setTimeout(applyPgVisibility, 600);
                fetchAdditionalRatings(e.data.movie, render);
            }
        });

        Lampa.Listener.follow('activity', function (e) {
            if (e.type !== 'render' && e.type !== 'start') return;
            setTimeout(tryProcessCardInDom, 300);
        });

        var domObserver = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes || [];
                for (var j = 0; j < nodes.length; j++) {
                    var node = nodes[j];
                    if (!node || node.nodeType !== 1) continue;

                    try {
                        if ($(node).is('.full-start__pg') || $(node).find('.full-start__pg').length) {
                            applyPgVisibility();
                            setTimeout(applyPgVisibility, 100);
                            setTimeout(applyPgVisibility, 400);
                        }
                    } catch (e) {}

                    if ($(node).is('.full-start-new__rate-line') ||
                        $(node).find('.full-start-new__rate-line').length) {
                        setTimeout(tryProcessCardInDom, 100);
                        setTimeout(applyPgVisibility, 300);
                        return;
                    }
                }
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });

        setTimeout(tryProcessCardInDom, 500);

        setInterval(function () {
            try {
                if (document.querySelectorAll('.full-start__pg').length > 0) {
                    applyPgVisibility();
                }
            } catch (e) {}
        }, 1000);
    }

    if (!window.maxsmRatingsPlugin) startPlugin();
})();

} catch (error) {
  if (window.console && window.console.error) window.console.error('[Ratings: UI]', error);
}
try {
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
      function _0x30d21b(useKeyword) {
        var _0x5ac620 = _0x25d6a0,
          _0x355e90 = _0x4a4497.url,
          _0x5a26d0 = Lampa.Utils["addUrlComponent"](
            _0x355e90 + "api/v2.1/films/search-by-keyword",
            "keyword=" + encodeURIComponent(_0xb68257),
          );
        if (_0x1508f8["imdb_id"] && !useKeyword)
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
                else if (_0x1508f8.imdb_id && !useKeyword && _0xb68257) _0x30d21b(true);
                else _0x23090c([]);
              }
            },
            function () {
              var _0x1c35a1 = _0x5ac620;
              if (_0x1508f8.imdb_id && !useKeyword && _0xb68257) _0x30d21b(true);
              else (releaseRequest(_0x1c9a63), _0x1612cf("0.0"));
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
          var candidate = _0x337fe4[0], source = Lampa.Storage.get("rating_source", "tmdb");
          var original = _0x3a0b92 || "", localTitle = _0x1508f8.title || _0x1508f8.name || "";
          var names = [candidate.nameRu, candidate.nameEn, candidate.nameOriginal, candidate.title, candidate.ru_title, candidate.orig_title, candidate.en_title];
          var exact = names.some(function (name) { return name && ((original && _0x24ff8e(name, original)) || (localTitle && _0x24ff8e(name, localTitle))); });
          var yearMatches = _0xbd9ef7 && candidate.tmp_year && Math.abs(_0xbd9ef7 - candidate.tmp_year) <= 1;
          var value = source === "kp" ? (candidate.ratingKinopoisk || candidate.rating) : candidate.ratingImdb;
          var number = typeof value === "string" && !/^\d+(?:[.,]\d+)?$/.test(value.trim()) ? 0 : parseFloat(String(value || "0").replace(",", "."));
          var fallback = exact && yearMatches && number > 0 && number <= 10 ? number.toFixed(1) : "0.0";
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
                    _0x1612cf(_0x43bdd9 ? parseFloat(_0x43bdd9)["toFixed"](0x1) : fallback));
                },
                function () {
                  var _0x55a24b = _0x4b9ea5;
                  (releaseRequest(_0x1c9a63), _0x1612cf(fallback));
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


} catch (error) {
  if (window.console && window.console.error) window.console.error('[Ratings: cards]', error);
}
