/**
 * ============================================================================
 *  4K SDR Badge — плагин для Lampa
 * ============================================================================
 *
 *  НАЗНАЧЕНИЕ:
 *  Помечает 4K-раздачи без HDR как "4K SDR" — чтобы сразу было видно,
 *  что это SDR-релиз (а не HDR/Dolby Vision), и такие раздачи легко
 *  отличались от HDR-версий при выборе торрента.
 *
 *  ЧТО ДЕЛАЕТ ПЛАГИН:
 *
 *  1. Меняет бейдж "4K" на "4K SDR" у раздач, где:
 *       • разрешение 4K (по названию или по бейджу `.m-resolution` = "4K"),
 *       • в названии есть слово "SDR" ЛИБО нет бейджа "HDR",
 *       • в названии нет явных признаков HDR.
 *
 *  2. Стилизует бейдж "4K SDR":
 *       • белый полупрозрачный фон (rgba(255,255,255,0.85)),
 *       • тёмный текст (#1d1f20),
 *       • жирный шрифт,
 *       • без бордера.
 *
 *  3. Скрывает плашки субтитров `.m-subtitle` во всех торрент-раздачах —
 *     они визуально загромождают список и редко нужны при выборе.
 *
 *  ЧТО НЕ ТРОГАЕТ:
 *  • Раздачи с явными признаками HDR: HDR10, HDR10+, HDR, HDR 10,
 *    Dolby Vision, DV P8/P5, HLG — остаются как есть ("4K").
 *  • Раздачи, у которых нет бейджа "4K" — не считаются 4K-релизами.
 *
 *  КАК РАБОТАЕТ:
 *  • Плагин находит все элементы `.torrent-item` в DOM.
 *  • Для каждой раздачи берёт `.torrent-item__title` (название) и
 *    `.torrent-item__ffprobe` (блок с бейджами разрешения/аудио/субтитров).
 *  • Определяет 4K и SDR по описанным выше правилам.
 *  • Подменяет текст бейджа и добавляет CSS-класс `.m-resolution--sdr`.
 *
 *  ДИНАМИКА:
 *  • Плагин запускается сразу и через 300/1000/2500 мс после загрузки —
 *    на случай позднего рендера списка.
 *  • Использует MutationObserver — реагирует на подгрузку новых раздач
 *    (скролл, смена сезона, переключение вкладок и т.п.).
 *  • Флаг `data-sdr-processed="1"` на элементе раздачи защищает от
 *    повторной обработки одной и той же карточки.
 *
 *  ОТЛАДКА:
 *  • Установите DEBUG = true — в консоль будут выводиться данные по каждой
 *    раздаче: title, is4k, titleHasHDR, titleHasSDR, hasHdrBadge.
 *  • Вручную перезапустить обработку можно из консоли:
 *      window.__4kSdrDebug()
 *    — это сбросит флаги и заново обработает все раздачи.
 *
 * ============================================================================
 */

(function () {
    'use strict';

    var DEBUG = false; // Поставьте true для отладки

    var styleId = 'lampa-4k-sdr-badge-style';
    var css = `
        /* Стиль для бейджа 4K SDR */
        .m-resolution.m-resolution--sdr {
            background-color: rgba(255, 255, 255, 0.85) !important;
            color: #1d1f20 !important;
            font-weight: 700 !important;
            border: none !important;
        }

        /* Скрываем плашки субтитров */
        .torrent-item__ffprobe .m-subtitle {
            display: none !important;
        }
    `;

    function injectStyles() {
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // Только надёжные признаки HDR — без коротких/неоднозначных
    function hasHDR(text) {
        if (!text) return false;
        var t = text.toUpperCase();
        return /(HDR10\+|HDR10|HDR\s*10|\bHDR\b|DOLBY\s*VISION|DV\s*P\d|\bHLG\b)/.test(t);
    }

    function hasSDR(text) {
        if (!text) return false;
        return /\bSDR\b/.test(text.toUpperCase());
    }

    function is4K(name, badgeContainer) {
        if (name && /(\b4K\b|2160P|UHD)/i.test(name)) return true;
        if (!badgeContainer) return false;
        var resolutions = badgeContainer.querySelectorAll('.m-resolution');
        var found = false;
        resolutions.forEach(function (r) {
            if (r.textContent.trim().toUpperCase() === '4K') found = true;
        });
        return found;
    }

    function processTorrents() {
        var items = document.querySelectorAll('.torrent-item');
        var changed = 0;

        items.forEach(function (item, idx) {
            if (item.dataset.sdrProcessed === '1') return;

            var titleEl = item.querySelector('.torrent-item__title');
            var title = titleEl ? titleEl.textContent : '';

            var block = item.querySelector('.torrent-item__ffprobe');
            if (!block) return;

            var is4k = is4K(title, block);
            if (!is4k) {
                item.dataset.sdrProcessed = '1';
                return;
            }

            var titleHasHDR = hasHDR(title);
            var titleHasSDR = hasSDR(title);

            var hasHdrBadge = false;
            var res4kBadge = null;
            block.querySelectorAll('.m-resolution').forEach(function (b) {
                var txt = b.textContent.trim().toUpperCase();
                if (txt === 'HDR') hasHdrBadge = true;
                if (txt === '4K') res4kBadge = b;
            });

            if (!res4kBadge) {
                item.dataset.sdrProcessed = '1';
                return;
            }

            if (DEBUG) {
                console.log('[4k-sdr] #' + idx, {
                    title: title,
                    is4k: is4k,
                    titleHasHDR: titleHasHDR,
                    titleHasSDR: titleHasSDR,
                    hasHdrBadge: hasHdrBadge
                });
            }

            // Защита: если в названии есть явный HDR — не трогаем
            if (titleHasHDR) {
                item.dataset.sdrProcessed = '1';
                return;
            }

            // SDR = в названии SDR ИЛИ нет бейджа HDR
            var isSDR = titleHasSDR || !hasHdrBadge;

            if (isSDR) {
                res4kBadge.textContent = '4K SDR';
                res4kBadge.classList.add('m-resolution--sdr');
                changed++;
            }

            item.dataset.sdrProcessed = '1';
        });

        if (DEBUG && changed > 0) console.log('[4k-sdr] изменено:', changed);
        return changed;
    }

    function init() {
        injectStyles();
        setTimeout(processTorrents, 300);
        setTimeout(processTorrents, 1000);
        setTimeout(processTorrents, 2500);

        var observer = new MutationObserver(function (mutations) {
            var need = false;
            mutations.forEach(function (m) {
                if (m.addedNodes.length > 0) need = true;
            });
            if (need) processTorrents();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__4kSdrDebug = function () {
        document.querySelectorAll('.torrent-item').forEach(function (x) {
            delete x.dataset.sdrProcessed;
        });
        return processTorrents();
    };

})();
