(function () {
    'use strict';

    // ==========================================
    // ВАША ССЫЛКА НА JPG
    // ==========================================
    var customImageUrl = 'https://shust.github.io/shust-rating/lampa-welcome.jpg'; 
    // ==========================================

    function initPlugin() {
        if (typeof Lampa === 'undefined') {
            setTimeout(initPlugin, 500);
            return;
        }

        function replaceWelcomeBackground() {
            var welcomeElement = document.querySelector('.welcome');
            
            if (welcomeElement) {
                // Сбрасываем старые стили
                welcomeElement.style.backgroundImage = 'none';
                welcomeElement.style.backgroundColor = '#000000'; // Черный фон как на вашем JPG
                
                // Создаем элемент img
                var img = document.createElement('img');
                img.src = customImageUrl;
                
                // Стилизуем картинку, чтобы она красиво легла на фон
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain'; // Сохраняем пропорции
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
                img.style.zIndex = '9999';

                // Очищаем стандартное содержимое
                welcomeElement.innerHTML = ''; 
                
                // Вставляем нашу картинку
                welcomeElement.appendChild(img);
                
                console.log('✅ Стартовый экран заменен на ваш JPG!');
            } else {
                setTimeout(replaceWelcomeBackground, 100);
            }
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            replaceWelcomeBackground();
        } else {
            document.addEventListener('DOMContentLoaded', replaceWelcomeBackground);
        }

        // Страховка на случай долгой загрузки
        setTimeout(replaceWelcomeBackground, 1000);
    }

    initPlugin();
})();