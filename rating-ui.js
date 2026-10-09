/*
    Lampa ratings plugin — rating-only build.

    Rating sources:
    - Kinopoisk: kinopoiskapiunofficial.tech
    - TMDB / IMDb: Lampa native + Kinopoisk XML fallback

    This build contains only rating-related functionality:
    TMDB, IMDb, Kinopoisk and average rating.
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

    /* New colored Kinopoisk icon (attached SVG) */
var kp_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" xmlns=\"http://www.w3.org/2000/svg\">" +
    "<path fill=\"#FF5500\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"" +
    "M45 0H157C181.853 0 202 20.1472 202 45V157C202 181.853 181.853 202 157 202H45C20.1472 202 0 181.853 0 157V45C0 20.1472 20.1472 0 45 0Z " +
    "M41 41H61.7432V84.5449L93.1143 41H118.657L72.5771 88.3301L161 41V63.2861L81.9473 94.9971L161 89.8574V112.143L81.4434 106.798L161 138.714V161L73.7734 115.158L118.657 161H93.1143L61.7432 117.526V161H41V41Z\"/>" +
    "</svg>";
    var avg_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1228_135)\">\n<path d=\"M201.5 0.5V201.5H0.5V0.5H201.5ZM81.21 77.4688H42.918L38 92.625L68.9795 115.164L57.1465 151.633L70.0215 161L101 138.461L131.979 161L144.854 151.633L133.021 115.164L164 92.625L159.082 77.4688H120.79L108.957 41H93.043L81.21 77.4688Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1228_135\">\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var imdb_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1228_123)\">\n<path d=\"M201.5 0.5V201.5H0.5V0.5H201.5ZM25.25 72.5938V129.406H41.0312V72.5938H25.25ZM47.3438 72.5938V129.406H60.7314L60.7832 91.8906L66.4189 129.406H75.9502L81.2998 91.0635L81.3389 129.406H94.6875V72.5938H74.7168L71.1846 99.1328L68.9902 84.6982C68.354 80.0746 67.7435 76.0396 67.1592 72.5938H47.3438ZM101 72.5938V129.406H125.633C131.21 129.406 135.719 124.917 135.719 119.38V82.6201C135.719 77.0757 131.203 72.5938 125.633 72.5938H101ZM142.031 72.5938V128.677H156.184L157.093 125.203C158.95 127.745 162.015 129.406 165.481 129.406H166.49C172.158 129.406 176.75 124.972 176.75 119.502V96.7227C176.75 91.2555 172.156 86.8184 166.49 86.8184H165.481C162.089 86.8185 159.083 88.4075 157.132 90.8389V72.5938H142.031ZM159.49 95.6006C160.323 95.6006 161.511 96.0322 161.809 96.7041C162.106 97.376 162.249 98.8362 162.249 101.061V114.522C162.249 117.059 162.118 118.67 161.856 119.33C161.595 119.99 160.347 120.34 159.49 120.34C158.634 120.34 157.409 119.979 157.123 119.33V96.542C157.373 95.9514 158.657 95.6007 159.49 95.6006ZM115.843 82.3174C117.585 82.3174 118.782 82.48 119.408 82.8184C120.048 83.1567 120.442 83.6834 120.619 84.4102C120.796 85.1371 120.892 86.7784 120.892 89.3467V111.375C120.892 115.159 120.62 117.465 120.089 118.317C119.558 119.182 118.142 119.595 115.843 119.595V82.3174Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1228_123\">\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

var kp_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" xmlns=\"http://www.w3.org/2000/svg\">" +
    "<path fill=\"white\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"" +
    "M45 0H157C181.853 0 202 20.1472 202 45V157C202 181.853 181.853 202 157 202H45C20.1472 202 0 181.853 0 157V45C0 20.1472 20.1472 0 45 0Z " +
    "M41 41H61.7432V84.5449L93.1143 41H118.657L72.5771 88.3301L161 41V63.2861L81.9473 94.9971L161 89.8574V112.143L81.4434 106.798L161 138.714V161L73.7734 115.158L118.657 161H93.1143L61.7432 117.526V161H41V41Z\"/>" +
    "</svg>";
    var tmdb_white_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<defs>\n<mask id=\"maxsm_tmdb_white_mask\">\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\"/>\n<path d=\"M109.536 97.0107H162.904C166.641 97.0107 170.225 95.5267 172.869 92.885C175.512 90.2432 176.998 86.6599 177 82.9228C177 79.1844 175.515 75.599 172.871 72.9556C170.228 70.3121 166.643 68.827 162.904 68.827H109.536C105.798 68.827 102.212 70.3121 99.5687 72.9556C96.9253 75.599 95.4402 79.1844 95.4402 82.9228C95.4423 86.6599 96.9283 90.2432 99.5716 92.885C102.215 95.5267 105.799 97.0107 109.536 97.0107ZM39.3359 132.909H100.681C104.418 132.909 108.002 131.425 110.646 128.783C113.289 126.141 114.775 122.558 114.777 118.821C114.777 115.082 113.292 111.497 110.649 108.853C108.005 106.21 104.42 104.725 100.681 104.725H39.3359C35.5974 104.725 32.0121 106.21 29.3686 108.853C26.7251 111.497 25.24 115.082 25.24 118.821C25.2421 122.558 26.7281 126.141 29.3714 128.783C32.0147 131.425 35.5988 132.909 39.3359 132.909ZM33.5444 96.5002H39.7666V73.7649H47.8237V68.2446H25.4873V73.749H33.5444V96.5002ZM55.9605 96.5002H62.1828V74.8259H62.2626L69.4422 96.4842H74.2285L81.6474 74.8259H81.7272V96.4842H87.9495V68.2446H78.4964L71.955 86.6722H71.8752L65.3737 68.2446H55.9605V96.5002ZM146.838 112.654C146.006 110.919 144.769 109.409 143.232 108.251C141.637 107.085 139.826 106.249 137.903 105.794C135.798 105.268 133.636 105 131.466 104.996H122.132V133.236H132.303C134.346 133.245 136.379 132.936 138.326 132.318C140.165 131.759 141.883 130.86 143.392 129.67C144.859 128.479 146.049 126.981 146.878 125.282C147.774 123.395 148.219 121.325 148.178 119.235C148.243 116.968 147.784 114.716 146.838 112.654ZM140.911 122.969C140.444 124.033 139.72 124.965 138.805 125.681C137.853 126.381 136.766 126.875 135.614 127.133C134.306 127.434 132.967 127.582 131.625 127.572H128.394V110.819H132.064C133.323 110.813 134.577 110.982 135.789 111.322C136.905 111.623 137.954 112.129 138.884 112.814C139.737 113.485 140.43 114.338 140.911 115.311C141.459 116.432 141.732 117.668 141.708 118.916C141.743 120.309 141.471 121.693 140.911 122.969ZM176.513 122.865C176.232 122.094 175.804 121.384 175.253 120.775C174.705 120.169 174.051 119.669 173.322 119.299C172.528 118.898 171.674 118.629 170.794 118.502V118.422C172.162 118.029 173.387 117.247 174.32 116.172C175.239 115.051 175.716 113.632 175.66 112.184C175.72 110.884 175.401 109.596 174.742 108.474C174.142 107.56 173.318 106.813 172.349 106.304C171.307 105.766 170.178 105.415 169.015 105.267C167.794 105.093 166.562 105.005 165.329 105.004H154.799V133.244H166.366C167.632 133.244 168.894 133.111 170.132 132.845C171.336 132.604 172.491 132.158 173.546 131.528C174.544 130.933 175.391 130.114 176.019 129.135C176.691 128.009 177.024 126.713 176.976 125.402C176.977 124.537 176.829 123.679 176.537 122.865H176.513ZM161.021 110.301H165.249C165.745 110.303 166.239 110.351 166.725 110.444C167.197 110.529 167.654 110.683 168.081 110.899C168.476 111.114 168.81 111.424 169.055 111.801C169.324 112.236 169.457 112.741 169.438 113.253C169.449 113.753 169.331 114.247 169.094 114.688C168.879 115.076 168.573 115.404 168.201 115.646C167.814 115.891 167.388 116.066 166.941 116.164C166.478 116.273 166.004 116.327 165.529 116.324H161.021V110.301ZM170.371 126.255C170.131 126.672 169.798 127.027 169.398 127.293C168.992 127.565 168.537 127.755 168.057 127.851C167.581 127.958 167.094 128.012 166.606 128.01H161.021V121.629H165.728C166.262 121.634 166.795 121.674 167.324 121.748C167.885 121.825 168.434 121.973 168.959 122.187C169.448 122.392 169.879 122.715 170.211 123.128C170.558 123.586 170.736 124.15 170.714 124.724C170.739 125.256 170.621 125.785 170.371 126.255Z\" fill=\"black\"/>\n</mask>\n</defs>\n<rect width=\"202\" height=\"202\" rx=\"50\" fill=\"white\" mask=\"url(#maxsm_tmdb_white_mask)\"/>\n</svg>";

    var avg_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1235_49)\">\n<path d=\"M201.5 0.5H0.5V201.5H201.5V0.5Z\" fill=\"white\" fill-opacity=\"0.2\"/>\n<path d=\"M108.957 41H93.0429L81.2101 77.4688L42.9177 77.4689L38 92.6253L68.9792 115.164L57.1464 151.633L70.0212 161L101 138.461L131.979 161L144.854 151.633L133.021 115.164L164 92.6252L159.082 77.4688H120.79L108.957 41Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1235_49\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

    var imdb_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1235_52)\">\n<path d=\"M201.5 0.5H0.5V201.5H201.5V0.5Z\" fill=\"white\" fill-opacity=\"0.2\"/>\n<path d=\"M25.25 72.5938V129.406H41.0312V72.5938H25.25Z\" fill=\"white\"/>\n<path d=\"M74.7164 72.5938L71.1844 99.133L68.9899 84.698C68.3537 80.0744 67.7434 76.0396 67.159 72.5938H47.3438V129.406H60.7314L60.7833 91.8905L66.4189 129.406H75.95L81.2998 91.0635L81.3388 129.406H94.6875V72.5938H74.7164Z\" fill=\"white\"/>\n<path d=\"M101 129.406V72.5938H125.633C131.203 72.5938 135.719 77.0754 135.719 82.6199V119.38C135.719 124.917 131.211 129.406 125.633 129.406H101ZM119.408 82.8185C118.782 82.4802 117.585 82.3173 115.843 82.3173V119.595C118.142 119.595 119.558 119.182 120.088 118.317C120.619 117.465 120.891 115.159 120.891 111.375V89.3468C120.891 86.7781 120.796 85.1366 120.619 84.4098C120.442 83.6831 120.048 83.1568 119.408 82.8185Z\" fill=\"white\"/>\n<path d=\"M165.482 86.8185H166.491C172.157 86.8185 176.75 91.2556 176.75 96.7229V119.502C176.75 124.972 172.158 129.406 166.491 129.406H165.482C162.015 129.406 158.95 127.745 157.092 125.203L156.184 128.676H142.031V72.5938H157.132V90.8386C159.083 88.4071 162.09 86.8185 165.482 86.8185ZM162.249 114.522V101.06C162.249 98.8359 162.106 97.3762 161.809 96.7042C161.511 96.0323 160.324 95.6009 159.491 95.6009C158.658 95.6009 157.373 95.9515 157.123 96.5423V119.33C157.409 119.979 158.634 120.34 159.491 120.34C160.347 120.34 161.594 119.99 161.856 119.33C162.118 118.67 162.249 117.059 162.249 114.522Z\" fill=\"white\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_1235_52\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n</defs>\n</svg>";

var kp_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" xmlns=\"http://www.w3.org/2000/svg\">" +
    "<rect width=\"202\" height=\"202\" rx=\"45\" fill=\"white\" fill-opacity=\"0.2\"/>" +
    "<path d=\"M41 41H61.7432V84.5449L93.1143 41H118.657L72.5771 88.3301L161 41V63.2861L81.9473 94.9971L161 89.8574V112.143L81.4434 106.798L161 138.714V161L73.7734 115.158L118.657 161H93.1143L61.7432 117.526V161H41V41Z\" fill=\"white\"/>" +
    "</svg>";
    var tmdb_translucent_svg = "<svg width=\"202\" height=\"202\" viewBox=\"0 0 202 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g clip-path=\"url(#clip0_1235_43)\">\n<path d=\"M201.5 0.5H0.5V201.5H201.5V0.5Z\" fill=\"white\" fill-opacity=\"0.2\"/>\n<g clip-path=\"url(#clip1_1235_43)\">\n<path d=\"M109.536 97.0107H162.904C166.641 97.0107 170.225 95.5267 172.869 92.885C175.512 90.2432 176.998 86.6599 177 82.9228C177 79.1844 175.515 75.599 172.871 72.9556C170.228 70.3121 166.643 68.827 162.904 68.827H109.536C105.798 68.827 102.212 70.3121 99.5688 72.9556C96.9253 75.599 95.4402 79.1844 95.4402 82.9228C95.4423 86.6599 96.9283 90.2432 99.5716 92.885C102.215 95.5267 105.799 97.0107 109.536 97.0107ZM39.3359 132.909H100.681C104.418 132.909 108.002 131.425 110.646 128.783C113.289 126.141 114.775 122.558 114.777 118.821C114.777 115.082 113.292 111.497 110.649 108.853C108.005 106.21 104.42 104.725 100.681 104.725H39.3359C35.5974 104.725 32.0121 106.21 29.3686 108.853C26.7251 111.497 25.24 115.082 25.24 118.821C25.2421 122.558 26.7282 126.141 29.3714 128.783C32.0147 131.425 35.5988 132.909 39.3359 132.909ZM33.5444 96.5002H39.7667V73.7649H47.8237V68.2446H25.4873V73.749H33.5444V96.5002ZM55.9606 96.5002H62.1828V74.8259H62.2626L69.4422 96.4842H74.2286L81.6474 74.8259H81.7272V96.4842H87.9495V68.2446H78.4964L71.955 86.6722H71.8752L65.3738 68.2446H55.9606V96.5002ZM146.838 112.654C146.006 110.919 144.769 109.409 143.232 108.251C141.637 107.085 139.826 106.249 137.903 105.794C135.798 105.268 133.636 105 131.466 104.996H122.132V133.236H132.303C134.346 133.245 136.379 132.936 138.326 132.318C140.165 131.759 141.883 130.86 143.392 129.67C144.859 128.479 146.049 126.981 146.878 125.282C147.774 123.395 148.219 121.325 148.178 119.235C148.243 116.968 147.784 114.716 146.838 112.654ZM140.911 122.969C140.444 124.033 139.72 124.965 138.805 125.681C137.853 126.381 136.766 126.875 135.614 127.133C134.306 127.434 132.967 127.582 131.625 127.572H128.394V110.819H132.064C133.323 110.813 134.577 110.982 135.789 111.322C136.905 111.623 137.954 112.129 138.885 112.814C139.737 113.485 140.43 114.338 140.911 115.311C141.459 116.432 141.732 117.668 141.708 118.916C141.743 120.309 141.471 121.693 140.911 122.969ZM176.513 122.865C176.232 122.094 175.804 121.384 175.253 120.775C174.705 120.169 174.051 119.669 173.322 119.299C172.528 118.898 171.674 118.629 170.794 118.502V118.422C172.162 118.029 173.387 117.247 174.32 116.172C175.239 115.051 175.716 113.632 175.66 112.184C175.72 110.884 175.401 109.596 174.742 108.474C174.142 107.56 173.318 106.813 172.349 106.304C171.307 105.766 170.178 105.415 169.015 105.267C167.794 105.093 166.562 105.005 165.329 105.004H154.799V133.244H166.366C167.632 133.244 168.894 133.111 170.132 132.845C171.336 132.604 172.491 132.158 173.546 131.528C174.544 130.933 175.391 130.114 176.019 129.135C176.691 128.009 177.024 126.713 176.976 125.402C176.977 124.537 176.829 123.679 176.537 122.865H176.513ZM161.021 110.301H165.249C165.745 110.303 166.239 110.351 166.725 110.444C167.197 110.529 167.654 110.683 168.081 110.899C168.476 111.114 168.81 111.424 169.055 111.801C169.324 112.236 169.457 112.741 169.438 113.253C169.449 113.753 169.331 114.247 169.095 114.688C168.879 115.076 168.573 115.404 168.201 115.646C167.814 115.891 167.388 116.066 166.941 116.164C166.478 116.273 166.004 116.327 165.529 116.324H161.021V110.301ZM170.371 126.255C170.131 126.672 169.798 127.027 169.398 127.293C168.992 127.565 168.537 127.755 168.057 127.851C167.581 127.958 167.094 128.012 166.606 128.01H161.021V121.629H165.728C166.262 121.634 166.795 121.674 167.324 121.748C167.885 121.825 168.434 121.973 168.959 122.187C169.448 122.392 169.879 122.715 170.211 123.128C170.558 123.586 170.736 124.15 170.714 124.724C170.739 125.256 170.621 125.785 170.371 126.255Z\" fill=\"white\"/>\n</g>\n</g>\n<defs>\n<clipPath id=\"clip0_1235_43\">\n<rect width=\"202\" height=\"202\" fill=\"white\"/>\n</clipPath>\n<clipPath id=\"clip1_1235_43\">\n<rect width=\"151.76\" height=\"65.0309\" fill=\"white\" transform=\"translate(25.24 68.2446)\"/>\n</clipPath>\n</defs>\n</svg>";

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
        maxsm_ratings_avg_icon: {
            ru: 'Иконка среднего рейтинга',
            en: 'Average rating icon',
            uk: 'Іконка середнього рейтингу',
            be: 'Іконка сярэдняга рэйтынгу',
            pt: 'Ícone da classificação média',
            zh: '平均评分图标',
            he: 'סמל דירוג ממוצע',
            cs: 'Ikona průměrného hodnocení',
            bg: 'Икона на средния рейтинг'
        },
        maxsm_ratings_icon_style: {
            ru: 'Вид иконок рейтинга',
            en: 'Rating icon style',
            uk: 'Вигляд іконок рейтингу',
            be: 'Выгляд іконак рэйтынгу',
            pt: 'Estilo dos ícones de classificação',
            zh: '评分图标样式',
            he: 'סגנון אייקוני הדירוג',
            cs: 'Styl ikon hodnocení',
            bg: 'Вид на иконите за рейтинг'
        },
        maxsm_ratings_icon_style_color: {
            ru: 'Цветные',
            en: 'Colored',
            uk: 'Кольорові',
            be: 'Каляровыя',
            pt: 'Coloridos',
            zh: '彩色',
            he: 'צבעוניים',
            cs: 'Barevné',
            bg: 'Цветни'
        },
        maxsm_ratings_icon_style_white: {
            ru: 'Белые',
            en: 'White',
            uk: 'Білі',
            be: 'Белыя',
            pt: 'Brancos',
            zh: '白色',
            he: 'לבנים',
            cs: 'Bílé',
            bg: 'Бели'
        },
        maxsm_ratings_icon_style_translucent: {
            ru: 'Полупрозрачные',
            en: 'Translucent',
            uk: 'Напівпрозорі',
            be: 'Паўпразрыстыя',
            pt: 'Semitransparentes',
            zh: '半透明',
            he: 'חצי-שקופים',
            cs: 'Poloprůhledné',
            bg: 'Полупрозрачни'
        },
        maxsm_ratings_font_weight: {
            ru: 'Толщина шрифта рейтинга',
            en: 'Rating font weight',
            uk: 'Товщина шрифту рейтингу',
            be: 'Таўшчыня шрыфту рэйтынгу',
            pt: 'Espessura da fonte da classificação',
            zh: '评分字体粗细',
            he: 'עובי גופן הדירוג',
            cs: 'Tloušťka písma hodnocení',
            bg: 'Дебелина на шрифта на рейтинга'
        },
        maxsm_ratings_avg_separator: {
            ru: 'Разделительная полоса после среднего рейтинга',
            en: 'Separator after average rating',
            uk: 'Розділювальна смуга після середнього рейтингу',
            be: 'Раздзяляльная паласа пасля сярэдняга рэйтынгу',
            pt: 'Separador após a classificação média',
            zh: '平均评分后的分隔线',
            he: 'מפריד אחרי הדירוג הממוצע',
            cs: 'Oddělovač za průměrným hodnocením',
            bg: 'Разделител след средния рейтинг'
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
        }
    });

    // Стили
    var modalStyle = "<style id=\"maxsm_ratings_modal\">" +
        ".maxsm-modal-ratings {" +
        "    padding: 1.25em;" +
        "    font-size: 1.4em;" +
        "    line-height: 1.6;" +
        "}" +
        ".maxsm-modal-rating-line {" +
        "    padding: 0.5em 0;" +
        "    border-bottom: 0.0625em solid rgba(255, 255, 255, 0.1);" +
        "}" +
        ".maxsm-modal-rating-line:last-child {" +
        "    border-bottom: none;" +
        "}" +
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
        "left: 0 !important;" +
        "padding-right: 1em !important;" +
        "box-sizing: border-box;" +
        "}" +
        ".full-start-new__rate-line > :first-child {" +
        "margin-left: 0 !important;" +
        "}" +
        ".full-start-new__rate-line > * {" +
        "margin-right: 0.55em !important;" +
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
        "margin: 0 0.30em 0 !important;" +
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

    // Глобальная переменная текущей карточки
    var globalCurrentCard = null;

    // Переменные настройки
    var C_LOGGING = false;
    var CACHE_TIME = 3 * 24 * 60 * 60 * 1000;
    var KP_CACHE = 'maxsm_ratings_kp_cache';
    var ID_MAPPING_CACHE = 'maxsm_ratings_id_mapping_cache';
    var KP_API_KEYS = (window.RATINGS_PLUGIN_TOKENS && window.RATINGS_PLUGIN_TOKENS.KP_API_KEYS) || ['3c47e3a8-a70f-447c-80a7-8ce15d93e66e'];
    var PROXY_TIMEOUT = 5000;
    var PROXY_LIST = [
        'https://cors.bwa.workers.dev/',
        'https://api.allorigins.win/raw?url='
    ];

    // Весовые коэффициенты для источников рейтингов
    var WEIGHTS = {
        imdb: 0.35,
        tmdb: 0.15,
        kp: 0.20
    };

    // Берем случайный токен из массива
    function getRandomToken(arr) {
        if (!arr || !arr.length) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Получение данных через прокси
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

            if (C_LOGGING) {
                console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Fetch with proxy in parallel: " + proxyUrl);
            }

            fetch(proxyUrl)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Proxy error: ' + response.status);
                    }
                    return response.text();
                })
                .then(function(data) {
                    if (!callbackCalled) {
                        finish(null, data);
                    }
                })
                .catch(function() {
                    if (!callbackCalled) {
                        failed();
                    }
                });
        });
    }

    //-----------------------------------------------------get---kinopoisk-------------------------------------
    function getKPRatings(normalizedCard, apiKey, localCurrentCard, callback) {
        if (normalizedCard.kinopoisk_id) {
            if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Using provided kinopoisk_id: " + normalizedCard.kinopoisk_id);
            return fetchRatings(normalizedCard.kinopoisk_id, localCurrentCard);
        }

        var queryTitle = (normalizedCard.original_title || normalizedCard.title || '').replace(/[:\-–—]/g, ' ').trim();
        var year = '';
        if (normalizedCard.release_date && typeof normalizedCard.release_date === 'string') {
            year = normalizedCard.release_date.split('-')[0];
        }

        if (!year) {
            callback(null);
            return;
        }

        var encodedTitle = encodeURIComponent(queryTitle);
        var searchUrl = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodedTitle;
        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Find information in KP by title and year");
        fetch(searchUrl, {
            method: 'GET',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            if (!response.ok) throw new Error('HTTP error: ' + response.status);
            return response.json();
        })
        .then(function(data) {
            if (!data.films || !data.films.length) {
                callback(null);
                return;
            }

            var bestMatch = null;
            if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Match KP inf");
            var filmYear;
            var targetYear;
            var film2;

            for (var j = 0; j < data.films.length; j++) {
                film2 = data.films[j];
                if (!film2.year) continue;

                filmYear = parseInt(film2.year.substring(0, 4), 10);
                targetYear = parseInt(year, 10);

                if (isNaN(filmYear)) continue;
                if (isNaN(targetYear)) continue;

                if (filmYear === targetYear) {
                    bestMatch = film2;
                    if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", KP EXACT match for: " + queryTitle + " / " + year + " is id: " + bestMatch.filmId + " / " + film2.nameRu + " / " + film2.nameEn + " / " + film2.year);
                    break;
                }
            }

            if (!bestMatch) {
                for (var k = 0; k < data.films.length; k++) {
                    film2 = data.films[k];
                    if (!film2.year) continue;

                    filmYear = parseInt(film2.year.substring(0, 4), 10);
                    targetYear = parseInt(year, 10);

                    if (isNaN(filmYear)) continue;
                    if (isNaN(targetYear)) continue;

                    if (Math.abs(filmYear - targetYear) <= 1) {
                        bestMatch = film2;
                        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", KP APPROXIMATE match for: " + queryTitle + " / " + year + " is id: " + bestMatch.filmId + " / " + film2.nameRu + " / " + film2.nameEn + " / " + film2.year);
                        break;
                    }
                }
            }

            if (!bestMatch || !bestMatch.filmId) {
                callback(null);
                return;
            }

            fetchRatings(bestMatch.filmId, localCurrentCard);
        })
        .catch(function() {
            console.warn("MAXSM-RATINGS", "card: " + localCurrentCard + "Kinopoisk API request failed");
            callback(null);
        });

        function fetchRatings(filmId, localCurrentCard) {
            var xmlUrl = 'https://rating.kinopoisk.ru/' + filmId + '.xml';

            fetchWithProxy(xmlUrl, localCurrentCard, function(error, xmlText) {
                if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Try to get KP ratings from XML");
                if (!error && xmlText) {
                    try {
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(xmlText, "text/xml");
                        var kpRatingNode = xmlDoc.getElementsByTagName("kp_rating")[0];
                        var imdbRatingNode = xmlDoc.getElementsByTagName("imdb_rating")[0];

                        var kpRating = kpRatingNode ? parseFloat(kpRatingNode.textContent) : null;
                        var imdbRating = imdbRatingNode ? parseFloat(imdbRatingNode.textContent) : null;

                        var hasValidKp = !isNaN(kpRating) && kpRating > 0;
                        var hasValidImdb = !isNaN(imdbRating) && imdbRating > 0;

                        if (hasValidKp || hasValidImdb) {
                            if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Got KP ratings from XML");
                            return callback({
                                kinopoisk: hasValidKp ? kpRating : null,
                                imdb: hasValidImdb ? imdbRating : null
                            });
                        }
                    } catch (e) {
                        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", XML parse error, fallback to API");
                    }
                }

                if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Try to get KP ratings from API");
                fetch('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + filmId, {
                    headers: { 'X-API-KEY': apiKey }
                })
                    .then(function(response) {
                        if (!response.ok) throw new Error('API error');
                        return response.json();
                    })
                    .then(function(data) {
                        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Got KP ratings from API");
                        callback({
                            kinopoisk: data.ratingKinopoisk || null,
                            imdb: data.ratingImdb || null
                        });
                    })
                    .catch(function() {
                        callback(null);
                    });
            });
        }
    }
    //-------------------------------------------------end---get---kinopoisk-----------------------------------

    function getCardType(card) {
        var type = card.media_type || card.type;
        if (type === 'movie' || type === 'tv') return type;
        return card.name || card.original_name ? 'tv' : 'movie';
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

        var otherRatings = $('.full-start__rate', rateLine)
            .not('.rate--avg')
            .not('.hide')
            .not('.maxsm-source-disabled');

        if (otherRatings.length) {
            avgElement.addClass('maxsm-has-separator');
        }
    }

    function applyRatingFontWeight(value) {
        var weight = String(
            value !== undefined && value !== null
                ? value
                : (localStorage.getItem('maxsm_ratings_font_weight') || '500')
        );

        if (['400', '500', '600', '700'].indexOf(weight) === -1) {
            weight = '500';
        }

        document.documentElement.style.setProperty('--maxsm-rating-font-weight', weight);
    }

    function getRatingClass(rating) {
        if (rating >= 8.5) return 'rate--green';
        if (rating >= 7.0) return 'rate--lime';
        if (rating >= 5.0) return 'rate--orange';
        return 'rate--red';
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
        var keyMap = {
            kp: 'maxsm_ratings_source_kp',
            tmdb: 'maxsm_ratings_source_tmdb',
            imdb: 'maxsm_ratings_source_imdb'
        };
        var key = keyMap[source];
        return !key || localStorage.getItem(key) !== 'false';
    }

    function isAverageRatingEnabled() {
        return localStorage.getItem('maxsm_ratings_show_average') !== 'false';
    }

    function hasRatingValue(element) {
        if (!element || !element.length) return false;

        var value = parseFloat(
            element.find('> div').eq(0).text().replace(',', '.')
        );

        return !isNaN(value) && value > 0;
    }

    function applyRatingSourceVisibility(render) {
        if (!render) return;

        var kpElement = $('.rate--kp', render);
        var imdbElement = $('.rate--imdb', render);
        var tmdbElement = $('.rate--tmdb', render);

        var kpEnabled = isRatingSourceEnabled('kp');
        var imdbEnabled = isRatingSourceEnabled('imdb');

        var kpHasRating = hasRatingValue(kpElement);
        var imdbHasRating = hasRatingValue(imdbElement);

        var noPrimaryRating = !kpHasRating && !imdbHasRating;

        var tmdbEnabled = isRatingSourceEnabled('tmdb') || noPrimaryRating;

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
        } catch (e) {
            if (C_LOGGING) console.warn('MAXSM-RATINGS', 'Unable to refresh source visibility', e);
        }
    }

    // Основная функция
    function fetchAdditionalRatings(card, render) {
        if (!render) return;

        var localCurrentCard = card.id;

        if (C_LOGGING) {
            console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Start - card data: ", card);
        }

        var normalizedCard = {
            id: card.id,
            tmdb: card.vote_average || null,
            kinopoisk_id: card.kinopoisk_id,
            imdb_id: card.imdb_id || card.imdb || null,
            title: card.title || card.name || '',
            original_title: card.original_title || card.original_name || '',
            type: getCardType(card),
            release_date: card.release_date || card.first_air_date || ''
        };

        if (C_LOGGING) {
            console.log(
                "MAXSM-RATINGS",
                "card: " + localCurrentCard + ", imdb id: " + normalizedCard.imdb_id +
                " title: " + normalizedCard.title +
                " orig: " + normalizedCard.original_title +
                " type: " + normalizedCard.type +
                " date: " + normalizedCard.release_date
            );
        }

        var rateLine = $('.full-start-new__rate-line', render);
        if (rateLine.length) {
            rateLine.css('visibility', 'visible');
            rateLine.addClass('done');
        }

        var initialCacheKey = normalizedCard.type + '_' + (normalizedCard.imdb_id || normalizedCard.id);
        var ratingsData = {};

        var kpElement = $('.rate--kp:not(.hide)', render);
        var imdbElement = $('.rate--imdb:not(.hide)', render);

        var kpText = kpElement.length ? kpElement.find('> div').eq(0).text().trim() : '';
        var imdbText = imdbElement.length ? imdbElement.find('> div').eq(0).text().trim() : '';

        var kpExists = kpText && !isNaN(parseFloat(kpText));
        var imdbExists = imdbText && !isNaN(parseFloat(imdbText));

        if (kpExists) {
            ratingsData.kp = parseFloat(kpText);
        }

        if (imdbExists) {
            ratingsData.imdb = parseFloat(imdbText);
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
            rateElement
                .off('click.ratings-modal')
                .on('click.ratings-modal', function(e) {
                    e.stopPropagation();
                    showRatingsModal(localCurrentCard, render);
                });

            if (C_LOGGING) {
                console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", RATE UI UPDATED");
            }
        }

        function scheduleUI() {
            if (uiTimer) {
                clearTimeout(uiTimer);
            }
            uiTimer = setTimeout(updateUI, 16);
        }

        function mergeKpData(kpRatings) {
            if (!kpRatings) return;

            if (kpRatings.kinopoisk !== undefined && kpRatings.kinopoisk !== null) {
                ratingsData.kp = kpRatings.kinopoisk;
            }

            if (kpRatings.imdb !== undefined && kpRatings.imdb !== null) {
                ratingsData.imdb_kp = kpRatings.imdb;

                if (!ratingsData.imdb) {
                    ratingsData.imdb = kpRatings.imdb;
                }
            }
        }

        updateUI();

        // Kinopoisk branch
        var cachedKpData = getKpCache(initialCacheKey);

        if (cachedKpData) {
            mergeKpData({
                kinopoisk: cachedKpData.kp,
                imdb: cachedKpData.imdb
            });
            scheduleUI();
        } else if (!kpExists) {
            getKPRatings(
                normalizedCard,
                getRandomToken(KP_API_KEYS),
                localCurrentCard,
                function(kpRatings) {
                    if (kpRatings) {
                        mergeKpData(kpRatings);

                        saveKpCache(
                            initialCacheKey,
                            {
                                kp: kpRatings.kinopoisk,
                                imdb: kpRatings.imdb
                            },
                            localCurrentCard
                        );
                    }
                    scheduleUI();
                }
            );
        }

        // IMDb ID resolution only if needed for potential future use / correctness
        if (!normalizedCard.imdb_id && !imdbExists) {
            getImdbIdFromTmdb(
                normalizedCard.id,
                normalizedCard.type,
                localCurrentCard,
                function(newImdbId) {
                    if (newImdbId) {
                        normalizedCard.imdb_id = newImdbId;
                    }
                    scheduleUI();
                }
            );
        }
    }

    //-------------------------------------------MODALKA---------------------------------------------------------
    function showRatingsModal(cardId, render) {
        var showColors = localStorage.getItem('maxsm_ratings_colors') === 'true';

        var modalContent = $('<div class="maxsm-modal-ratings"></div>');

        var rateLine = $('.full-start-new__rate-line', render);
        if (!rateLine.length) return;

        var ratingOrder = [
            'rate--avg',
            'rate--tmdb',
            'rate--imdb',
            'rate--kp'
        ];

        ratingOrder.forEach(function(className) {
            var element = $('.' + className, rateLine).not('.maxsm-source-disabled');
            if (element.length) {
                var value = element.children('div').eq(0).text().trim();
                var numericValue = parseFloat(value);

                var label = '';
                switch(className) {
                    case 'rate--avg':
                        label = '';
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
                }

                var item = $('<div class="maxsm-modal-rating-line"></div>');
                if (showColors) {
                    var colorClass;
                    if (className === 'rate--avg') {
                        colorClass = getAverageRatingClass(numericValue);
                        if (colorClass) {
                            item.addClass(colorClass);
                        }
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
    //------------------------------------------------------------------------------------------------------------------------

    function insertIcons(localCurrentCard, render) {
        if (!render) return;

        if (C_LOGGING) {
            console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Insert icons");
        }

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

                    if (childDivs.length >= 2) {
                        sourceName = childDivs.eq(1);
                    }
                }

                if (sourceName.length) {
                    sourceName.removeClass('maxsm-source-text-hidden rate--icon');
                }

                var shouldShowIcon = iconType === 'average' ? showAverageIcon : showIcons;

                if (!shouldShowIcon) return;

                if (iconType !== 'average' && sourceName.length) {
                    sourceName.addClass('maxsm-source-text-hidden');
                }

                var ratingValue = element.children('div').first();

                var extraClass = iconType === 'average' ? 'maxsm-average-icon' : 'maxsm-source-icon';

                var styleClass = iconStyle === '1'
                    ? 'maxsm-icon-style-white'
                    : (iconStyle === '2'
                        ? 'maxsm-icon-style-translucent'
                        : 'maxsm-icon-style-color');

                var colorClass = iconType === 'average' && colorizeAverageIcon
                    ? ' maxsm-average-rating-color'
                    : '';

                var iconWrap = $(
                    '<span class="maxsm-rating-leading-icon maxsm-icon-container ' +
                    extraClass + ' ' + styleClass + colorClass + '"></span>'
                );

                iconWrap.html(
                    iconStyle === '1'
                        ? whiteSvg
                        : (iconStyle === '2'
                            ? translucentSvg
                            : coloredSvg)
                );

                if (ratingValue.length) {
                    iconWrap.insertBefore(ratingValue);
                } else {
                    element.prepend(iconWrap);
                }
            });
        }

        replaceIcon('rate--avg', avg_svg, avg_white_svg, avg_translucent_svg, 'average');
        replaceIcon('rate--imdb', imdb_svg, imdb_white_svg, imdb_translucent_svg, 'source');
        replaceIcon('rate--kp', kp_svg, kp_white_svg, kp_translucent_svg, 'source');
        replaceIcon('rate--tmdb', tmdb_svg, tmdb_white_svg, tmdb_translucent_svg, 'source');
    }

    // Кеш Кинопоиска
    function getKpCache(key) {
        var cache = Lampa.Storage.get(KP_CACHE) || {};
        var item = cache[key];
        return item && (Date.now() - item.timestamp < CACHE_TIME) ? item : null;
    }

    function saveKpCache(key, data, localCurrentCard) {
        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Save KP cache");

        var cache = Lampa.Storage.get(KP_CACHE) || {};

        cache[key] = {
            kp: data.kp || null,
            imdb: data.imdb || null,
            timestamp: Date.now()
        };

        Lampa.Storage.set(KP_CACHE, cache);
    }

    // Получаем IMDB id из TMDB id по API
    function getImdbIdFromTmdb(tmdbId, type, localCurrentCard, callback) {
        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Get IMDb id From TMDB");
        if (!tmdbId) {
            if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", TMDB id is empty - aborting");
            return callback(null);
        }

        var cleanType = type === 'movie' ? 'movie' : 'tv';
        var cacheKey = cleanType + '_' + tmdbId;
        var cache = Lampa.Storage.get(ID_MAPPING_CACHE) || {};

        if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TIME)) {
            if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", find in cache imdb id is: " + cache[cacheKey].imdb_id);
            return callback(cache[cacheKey].imdb_id);
        }

        var mainPath = cleanType + '/' + tmdbId + '/external_ids?api_key=' + Lampa.TMDB.key();
        var mainUrl = Lampa.TMDB.api(mainPath);

        new Lampa.Reguest().silent(mainUrl, function(data) {
            if (data && data.imdb_id) {
                if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", received IMDb id: " + data.imdb_id);
                cache[cacheKey] = {
                    imdb_id: data.imdb_id,
                    timestamp: Date.now()
                };
                Lampa.Storage.set(ID_MAPPING_CACHE, cache);
                callback(data.imdb_id);
            } else {
                if (cleanType === 'tv') {
                    var altPath = 'tv/' + tmdbId + '?api_key=' + Lampa.TMDB.key();
                    var altUrl = Lampa.TMDB.api(altPath);

                    new Lampa.Reguest().silent(altUrl, function(altData) {
                        var imdbId = (altData && altData.external_ids && altData.external_ids.imdb_id) || null;
                        if (imdbId) {
                            cache[cacheKey] = {
                                imdb_id: imdbId,
                                timestamp: Date.now()
                            };
                            Lampa.Storage.set(ID_MAPPING_CACHE, cache);
                        }
                        callback(imdbId);
                    }, function() {
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            }
        }, function() {
            callback(null);
        });
    }

    function updateHiddenElements(ratings, localCurrentCard, render) {
        if (!render) return;
        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Update hidden elements");

        var imdbElement = $('.rate--imdb', render);
        if (imdbElement.length) {
            var imdbRating;
            if (ratings.imdb && !isNaN(ratings.imdb)) {
                imdbRating = parseFloat(ratings.imdb).toFixed(1);
                imdbElement.removeClass('hide').find('> div').eq(0).text(imdbRating);
            } else if (ratings.imdb_kp && !isNaN(ratings.imdb_kp)) {
                imdbRating = parseFloat(ratings.imdb_kp).toFixed(1);
                imdbElement.removeClass('hide').find('> div').eq(0).text(imdbRating);
            }
        }

        var kpElement = $('.rate--kp', render);
        if (kpElement.length && ratings.kp && !isNaN(ratings.kp)) {
            var kpRating = parseFloat(ratings.kp).toFixed(1);
            kpElement.removeClass('hide').find('> div').eq(0).text(kpRating);
        }
    }

    function calculateAverageRating(localCurrentCard, render) {
        if (!render) return;
        if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Calculate average rating");

        var rateLine = $('.full-start-new__rate-line', render);
        if (!rateLine.length) return;

        var ratings = {
            imdb: parseFloat($('.rate--imdb div:first', rateLine).text()) || 0,
            tmdb: parseFloat($('.rate--tmdb div:first', rateLine).text()) || 0,
            kp: parseFloat($('.rate--kp div:first', rateLine).text()) || 0
        };

        var totalWeight = 0;
        var weightedSum = 0;
        var ratingsCount = 0;

        for (var key in ratings) {
            if (ratings.hasOwnProperty(key) && !isNaN(ratings[key]) && ratings[key] > 0) {
                weightedSum += ratings[key] * WEIGHTS[key];
                totalWeight += WEIGHTS[key];
                ratingsCount++;
            }
        }

        $('.rate--avg', rateLine).remove();

        if (!isAverageRatingEnabled()) {
            updateAverageSeparator(render);
            return;
        }

        if (totalWeight > 0 && ratingsCount > 1) {
            var averageRating = (weightedSum / totalWeight).toFixed(1);
            var colorClass = getAverageRatingClass(averageRating);

            if (C_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", Average rating: " + averageRating);

            var avgElement = $(
                '<div class="full-start__rate rate--avg ' + colorClass + '">' +
                '<div>' + averageRating + '</div>' +
                '<div class="source--name"></div>' +
                '</div>'
            );

            var showColors = localStorage.getItem('maxsm_ratings_colors') === 'true';

            if (!showColors) {
                avgElement.removeClass(colorClass);
            }

            $('.full-start__rate:first', rateLine).before(avgElement);
        }
    }

    /*
     * ===== ПАТЧ: правильный поиск movie в Lampa =====
     *
     * В вашей сборке Lampa структура активной activity такая:
     *   active.id     — TMDB id (строка)
     *   active.card   — объект movie целиком
     *   active.method — 'movie' или 'tv' (media_type)
     *   active.source — 'tmdb' или 'cub'
     *
     * Ни active.movie, ни active.activity.movie не существует.
     */
    function findCurrentMovie() {
        try {
            var active = Lampa.Activity.active();
            if (!active) return null;

            // Основной путь: active.card — объект movie
            var card = active.card;
            if (card && (card.id || active.id)) {
                if (!card.id && active.id) card.id = active.id;
                if (!card.media_type && active.method) card.media_type = active.method;
                if (!card.title && card.name) card.title = card.name;
                if (!card.release_date && card.first_air_date) card.release_date = card.first_air_date;

                if (C_LOGGING) console.log('MAXSM-RATINGS', 'findCurrentMovie: card', card);
                return card;
            }

            // Резерв: синтезируем объект из active.id + active.method
            if (active.id) {
                var synth = {
                    id: active.id,
                    media_type: active.method || 'movie'
                };
                if (C_LOGGING) console.log('MAXSM-RATINGS', 'findCurrentMovie: synth', synth);
                return synth;
            }

            // Совсем резервные пути — на случай других сборок Lampa
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
        } catch (e) {
            if (C_LOGGING) console.log('MAXSM-RATINGS', 'findCurrentMovie error', e);
        }
        return null;
    }

    function tryProcessCardInDom() {
        var rateLine = $('.full-start-new__rate-line').first();
        if (!rateLine.length) return;
        if (rateLine.data('maxsm-processed') === true) return;

        var render = rateLine.closest('.activity__body');
        if (!render.length) render = $(document);

        var movie = findCurrentMovie();
        if (!movie || !movie.id) {
            if (C_LOGGING) console.log('MAXSM-RATINGS', 'tryProcessCardInDom: no movie');
            return;
        }

        rateLine.data('maxsm-processed', true);
        globalCurrentCard = movie.id;

        if (C_LOGGING) console.log('MAXSM-RATINGS', 'tryProcessCardInDom: id=' + movie.id);

        fetchAdditionalRatings(movie, render);
    }

    // Инициализация плагина
    function startPlugin() {
        if (C_LOGGING) console.log("MAXSM-RATINGS", " Hello!");
        window.maxsmRatingsPlugin = true;

        if (!localStorage.getItem('maxsm_ratings_colors')) {
            localStorage.setItem('maxsm_ratings_colors', 'false');
        }
        if (localStorage.getItem('maxsm_ratings_source_kp') === null) {
            localStorage.setItem('maxsm_ratings_source_kp', 'true');
        }
        if (localStorage.getItem('maxsm_ratings_source_tmdb') === null) {
            localStorage.setItem('maxsm_ratings_source_tmdb', 'false');
        }
        if (localStorage.getItem('maxsm_ratings_source_imdb') === null) {
            localStorage.setItem('maxsm_ratings_source_imdb', 'true');
        }

        if (!localStorage.getItem('maxsm_ratings_icons')) {
            localStorage.setItem('maxsm_ratings_icons', 'false');
        }
        if (localStorage.getItem('maxsm_ratings_avg_icon') === null) {
            localStorage.setItem('maxsm_ratings_avg_icon', 'true');
        }
        if (localStorage.getItem('maxsm_ratings_icon_style') === null) {
            localStorage.setItem('maxsm_ratings_icon_style', '2');
        }

        if (localStorage.getItem('maxsm_ratings_show_average') === null) {
            localStorage.setItem('maxsm_ratings_show_average', 'true');
        }

        if (localStorage.getItem('maxsm_ratings_font_weight') === null) {
            localStorage.setItem('maxsm_ratings_font_weight', '500');
        }

        applyRatingFontWeight();

        Lampa.SettingsApi.addComponent({
            component: "maxsm_ratings",
            name: Lampa.Lang.translate("maxsm_ratings"),
            icon: star_svg
        });

        var iconStyleValue = {};
        iconStyleValue[0] = Lampa.Lang.translate("maxsm_ratings_icon_style_color");
        iconStyleValue[1] = Lampa.Lang.translate("maxsm_ratings_icon_style_white");
        iconStyleValue[2] = Lampa.Lang.translate("maxsm_ratings_icon_style_translucent");

        var fontWeightValue = {};
        fontWeightValue[400] = '400';
        fontWeightValue[500] = '500';
        fontWeightValue[600] = '600';
        fontWeightValue[700] = '700';

        // ===== 1. Средний рейтинг =====
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_show_average",
                type: "trigger",
                default: true
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_mode"),
                description: ''
            },
            onChange: function(value) {
                refreshRatingSourceSettings();
            }
        });

        // ===== 2. Источники =====
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_source_kp",
                type: "trigger",
                default: true
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_source_kp"),
                description: ''
            },
            onChange: function(value) {
                refreshRatingSourceSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_source_imdb",
                type: "trigger",
                default: true
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_source_imdb"),
                description: ''
            },
            onChange: function(value) {
                refreshRatingSourceSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_source_tmdb",
                type: "trigger",
                default: false
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_source_tmdb"),
                description: ''
            },
            onChange: function(value) {
                refreshRatingSourceSettings();
            }
        });

        // ===== 3. Цвета =====
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_colors",
                type: "trigger",
                default: false
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_colors"),
                description: ''
            },
            onChange: function(value) {
                refreshRatingSourceSettings();
            }
        });

        // ===== 4. Иконки =====
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_icons",
                type: "trigger",
                default: false
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_icons"),
                description: ''
            },
            onChange: function(value) {
                var render = Lampa.Activity.active().activity.render();
                insertIcons(globalCurrentCard, render);
                updateAverageSeparator(render);
            }
        });

        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_icon_style",
                type: "select",
                values: iconStyleValue,
                default: 2
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_icon_style"),
                description: ''
            },
            onChange: function(value) {
                var render = Lampa.Activity.active().activity.render();
                insertIcons(globalCurrentCard, render);
                updateAverageSeparator(render);
            }
        });

        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_avg_icon",
                type: "trigger",
                default: true
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_avg_icon"),
                description: ''
            },
            onChange: function(value) {
                var render = Lampa.Activity.active().activity.render();
                insertIcons(globalCurrentCard, render);
                updateAverageSeparator(render);
            }
        });

        // ===== 5. Внешний вид =====
        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_font_weight",
                type: "select",
                values: fontWeightValue,
                default: 500
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_font_weight"),
                description: ''
            },
            onChange: function(value) {
                applyRatingFontWeight(value);
            }
        });

        Lampa.SettingsApi.addParam({
            component: "maxsm_ratings",
            param: {
                name: "maxsm_ratings_avg_separator",
                type: "trigger",
                default: true
            },
            field: {
                name: Lampa.Lang.translate("maxsm_ratings_avg_separator"),
                description: ''
            },
            onChange: function(value) {
                var render = Lampa.Activity.active().activity.render();
                updateAverageSeparator(render);
            }
        });

        // ===== 6. Очистка кеша =====
        Lampa.SettingsApi.addParam({
            component: 'maxsm_ratings',
            param: {
                name: 'maxsm_ratings_cc',
                type: 'button'
            },
            field: {
                name: Lampa.Lang.translate('maxsm_ratings_cc')
            },
            onChange: function() {
                localStorage.removeItem(KP_CACHE);
                localStorage.removeItem(ID_MAPPING_CACHE);
                window.location.reload();
            }
        });

        // Рейтинги внутри карточки — основной путь
        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                var render = e.object.activity.render();
                globalCurrentCard = e.data.movie.id;
                fetchAdditionalRatings(e.data.movie, render);
            }
        });

        /*
         * ===== ПАТЧ: резервные триггеры для карточек,
         * которые не эмитят full/complite (например, source=tmdb).
         */

        // Триггер по смене активности
        Lampa.Listener.follow('activity', function (e) {
            if (e.type !== 'render' && e.type !== 'start') return;
            setTimeout(tryProcessCardInDom, 300);
        });

        // MutationObserver — ловит появление .full-start-new__rate-line в DOM
        var domObserver = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes || [];
                for (var j = 0; j < nodes.length; j++) {
                    var node = nodes[j];
                    if (!node || node.nodeType !== 1) continue;
                    if ($(node).is('.full-start-new__rate-line') ||
                        $(node).find('.full-start-new__rate-line').length) {
                        setTimeout(tryProcessCardInDom, 100);
                        return;
                    }
                }
            }
        });

        domObserver.observe(document.body, { childList: true, subtree: true });

        // Один раз сразу — на случай, если карточка уже открыта
        setTimeout(tryProcessCardInDom, 500);
    }

    if (!window.maxsmRatingsPlugin) startPlugin();
})();

/* ===== Integrated: lampa_rating_icons_toggle.js ===== */
(function () {
    'use strict';

    var PLUGIN_ID = 'rating_icons_toggle';
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
        style.textContent = [
            '.' + HIDE_CLASS + '{',
            '  display:none!important;',
            '  visibility:hidden!important;',
            '  width:0!important;',
            '  min-width:0!important;',
            '  max-width:0!important;',
            '  height:0!important;',
            '  min-height:0!important;',
            '  max-height:0!important;',
            '  margin:0!important;',
            '  padding:0!important;',
            '  border:0!important;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function providerHint(el) {
        if (!el || el.nodeType !== 1) return false;

        var attrs = [
            el.className || '',
            el.id || '',
            el.getAttribute('alt') || '',
            el.getAttribute('title') || '',
            el.getAttribute('aria-label') || '',
            el.getAttribute('data-source') || '',
            el.getAttribute('data-provider') || '',
            el.getAttribute('src') || ''
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

        var selectors = [
            '.card__rate',
            '.card__rating',
            '.card__vote',
            '.card__vote-rate',
            '.card__vote-number',
            '[class^="card__rate-"]',
            '[class*=" card__rate-"]',
            '[class^="card__rating-"]',
            '[class*=" card__rating-"]'
        ].join(',');

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

            if (providerHint(child)) {
                child.classList.add(HIDE_CLASS);
                continue;
            }

            try {
                var cs = window.getComputedStyle(child);
                var bg = cs && cs.backgroundImage ? cs.backgroundImage : 'none';
                var rect2 = child.getBoundingClientRect();

                if (bg !== 'none' && rect2.width <= 80 && rect2.height <= 80) {
                    child.classList.add(HIDE_CLASS);
                }
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
            if (n >= 10) {
                clearInterval(rescanTimer);
                rescanTimer = null;
            }
        }, 500);
    }

    function startPlugin() {
        if (window.__lampa_rating_icons_toggle_fixed_loaded) return;
        window.__lampa_rating_icons_toggle_fixed_loaded = true;

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: SETTING,
                type: 'trigger',
                'default': true
            },
            field: {
                name: 'Иконки возле рейтинга',
                description: 'Показывать логотипы IMDb, Кинопоиска и других источников только на карточках фильмов и сериалов'
            },
            onChange: function () {
                setTimeout(function () {
                    applySetting();
                    rescanBurst();
                }, 50);
            }
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

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
