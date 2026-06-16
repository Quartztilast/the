// ===== PREVENT CONTEXT MENU & SELECTION (1.6.2.7) =====
document.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; }, { passive: false, capture: true });
document.addEventListener('selectstart', (e) => { e.preventDefault(); return false; }, { passive: false, capture: true });
document.addEventListener('dragstart', (e) => { e.preventDefault(); return false; }, { passive: false, capture: true });

// ===== WEB AUDIO API - prevents system/notification media players (1.6.2.5 & 1.6.1.6) =====
let audioCtx = null;
let bgMusicBuffer = null;
let mergeSoundBuffer = null;
let bgMusicSource = null;
let bgMusicGainNode = null;
let sfxGainNode = null;
let bgMusicStartTime = 0;
let bgMusicPauseOffset = 0;
let bgMusicPlaying = false;

function getAudioContext() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            bgMusicGainNode = audioCtx.createGain();
            bgMusicGainNode.connect(audioCtx.destination);
            sfxGainNode = audioCtx.createGain();
            sfxGainNode.connect(audioCtx.destination);
        } catch (e) {
            return null;
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

async function loadAudioBuffer(url) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return null;
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
        console.warn('Failed to load audio:', url, err);
        return null;
    }
}

let webAudioInitialized = false;
async function initWebAudio() {
    if (webAudioInitialized) return;
    webAudioInitialized = true;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        bgMusicBuffer = await loadAudioBuffer('asset/bg-music.mp3');
        mergeSoundBuffer = await loadAudioBuffer('asset/cats/meow-merge.mp3');
    } catch (e) {
        console.warn('Web Audio init failed:', e);
    }
}

function playBgMusic() {
    if (!soundEnabled || !bgMusicBuffer) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    stopBgMusic();
    bgMusicSource = ctx.createBufferSource();
    bgMusicSource.buffer = bgMusicBuffer;
    bgMusicSource.loop = true;
    bgMusicSource.connect(bgMusicGainNode);
    bgMusicGainNode.gain.value = musicVolume;
    bgMusicSource.start(0, bgMusicPauseOffset % bgMusicBuffer.duration);
    bgMusicStartTime = ctx.currentTime;
    bgMusicPlaying = true;
}

function stopBgMusic() {
    if (bgMusicSource) {
        try {
            bgMusicSource.stop();
        } catch (e) {}
        bgMusicSource.disconnect();
        bgMusicSource = null;
    }
    if (bgMusicPlaying && audioCtx) {
        bgMusicPauseOffset += audioCtx.currentTime - bgMusicStartTime;
    }
    bgMusicPlaying = false;
}

function pauseBgMusic() {
    stopBgMusic();
}

function resumeBgMusic() {
    if (soundEnabled) {
        playBgMusic();
    }
}

function setBgMusicVolume(vol) {
    musicVolume = vol;
    if (bgMusicGainNode) {
        bgMusicGainNode.gain.value = vol;
    }
}

function playMergeSoundWA() {
    if (!soundEnabled || !mergeSoundBuffer) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = mergeSoundBuffer;
    source.connect(sfxGainNode);
    sfxGainNode.gain.value = sfxVolume;
    source.start(0);
}

function primeAudioContext() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
        const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.start(0);
        src.stop(0);
    } catch (e) {}
}

// Remove any existing <audio> elements from DOM to prevent system player
document.querySelectorAll('audio').forEach(el => el.remove());

// Clear Media Session API to prevent notification player
if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('stop', null);
    } catch(e) {}
}

// ===== USER INTERACTION TO UNLOCK AUDIO =====
function unlockAudio() {
    firstUserInteraction = true;
    primeAudioContext();
    // Initialize Web Audio on first user gesture (avoids autoplay restriction)
    if (!webAudioInitialized) {
        initWebAudio().then(() => {
            if (soundEnabled && bgMusicBuffer && !bgMusicPlaying) {
                playBgMusic();
            }
        }).catch(() => {});
        return;
    }
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
            if (soundEnabled && bgMusicBuffer && !bgMusicPlaying) {
                playBgMusic();
            }
        }).catch(() => {});
    } else if (bgMusicBuffer && !bgMusicPlaying) {
        playBgMusic();
    }
}

window.addEventListener('click', unlockAudio, { once: true });

// Start preparing audio as early as possible on first gesture anywhere
window.addEventListener('pointerdown', unlockAudio, { once: true });

// ===== I18N DEFINITIONS =====
const I18N = window.I18N = {
    ru: {
        play_btn: 'Играть',
        record_label: 'Рекорд:',
        score_label: 'Счёт:',
        next_label: 'Далее',
        pause_title: 'Пауза',
        resume_btn: 'Продолжить',
        settings_btn: 'Настройки',
        exit_btn: 'Выход',
        game_over_title: 'Игра Окончена',
        revive_message: 'Посмотрите рекламу, чтобы возродиться и убрать всех котиков с поля!',
        revive_timer_label: 'Возрождение через:',
        revive_btn: '📺 Смотреть рекламу за возрождение',
        restart_btn: 'Выйти',
        leaderboard_title: 'Таблица Лидеров',
        leaderboard_self: 'Вы',
        leaderboard_best: 'Ваш Рекорд',
        close_btn: 'Закрыть',
        settings_title: 'Настройки',
        language_label: 'Язык',
        music_volume_label: 'Громкость Музыки',
        sfx_volume_label: 'Громкость Звуков'
    },
    en: {
        play_btn: 'Play',
        record_label: 'Record:',
        score_label: 'Score:',
        next_label: 'Next',
        pause_title: 'Pause',
        resume_btn: 'Continue',
        settings_btn: 'Settings',
        exit_btn: 'Exit',
        game_over_title: 'Game Over',
        revive_message: 'Watch an ad to revive and clear all cats from the board!',
        revive_timer_label: 'Reviving in:',
        revive_btn: '📺 Watch Ad for Revival',
        restart_btn: 'Exit',
        leaderboard_title: 'Leaderboard',
        leaderboard_self: 'You',
        leaderboard_best: 'Your Best',
        close_btn: 'Close',
        settings_title: 'Settings',
        language_label: 'Language',
        music_volume_label: 'Music Volume',
        sfx_volume_label: 'SFX Volume'
    }
};

function translateKey(key) {
    if (!key) return '';
    const effectiveLang = getEffectiveLang();
    const langPack = I18N[effectiveLang] || I18N.ru;
    return langPack[key] || key;
}

function getEffectiveLang() {
    return debugLangOverride || portalLangOverride || currentLang;
}

// ===== CAT DEFINITIONS (small → large) =====
const FRUITS = [
    { name: 'kitten-white',  img: 'asset/cats/cat-01.png', radius: 32,  points: 1   },
    { name: 'kitten-ginger', img: 'asset/cats/cat-02.png', radius: 39,  points: 3   },
    { name: 'kitten-gray',   img: 'asset/cats/cat-03.png', radius: 46,  points: 6   },
    { name: 'cat-tabby',     img: 'asset/cats/cat-04.png', radius: 54,  points: 10  },
    { name: 'cat-fluffy',    img: 'asset/cats/cat-05.png', radius: 62,  points: 15  },
    { name: 'cat-sleepy',    img: 'asset/cats/cat-06.png', radius: 71,  points: 21  },
    { name: 'cat-smart',     img: 'asset/cats/cat-07.png', radius: 82,  points: 28  },
    { name: 'cat-royal',     img: 'asset/cats/cat-08.png', radius: 94,  points: 36  },
    { name: 'cat-magic',     img: 'asset/cats/cat-09.png', radius: 108, points: 55  },
    { name: 'cat-legend',    img: 'asset/cats/cat-10.png', radius: 123, points: 100 },
];

const MAX_DROP_LEVEL = 5;
const WALL_T = 15;
const PLAYFIELD_ART_BOUNDS = {
    desktop: { left: 0.34, right: 0.66, top: 0.12, bottom: 0.9 }
};
const FRUIT_FALLBACK_COLORS = [
    '#ff5a6f', '#ff3f56', '#ff6a8a', '#7ed957', '#ffe761',
    '#7bc96f', '#ff9f43', '#ffb07c', '#c6e377', '#b38867', '#4fc3f7'
];

function createFruitFallbackDataUrl(level) {
    const fruit = FRUITS[level];
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    if (!g) return '';

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;
    const color = FRUIT_FALLBACK_COLORS[level % FRUIT_FALLBACK_COLORS.length];

    const grad = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.12, cx, cy, r * 1.05);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.12, color);
    grad.addColorStop(1, '#1f1f1f');

    g.clearRect(0, 0, size, size);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(cx - r * 0.2, cy - r * 0.2, r * 0.45, Math.PI * 1.1, Math.PI * 1.7);
    g.stroke();

    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 34px Segoe UI, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(level + 1), cx, cy);

    return c.toDataURL('image/png');
}

function getFruitImageSrc(level) {
    const fruit = FRUITS[level];
    if (!fruit) return '';
    if (!fruit._resolvedImgSrc) {
        fruit._resolvedImgSrc = fruit.img;
    }
    return fruit._resolvedImgSrc;
}

// ===== GAME STATE =====
let engine, world;
let animFrameId = null;
let score = 0;
// Safe localStorage helpers (iOS private mode may break storage)
function safeLocalGet(key, fallback = null) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn('localStorage get failed:', e?.message || e);
        return fallback;
    }
}

function safeLocalSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('localStorage set failed:', e?.message || e);
    }
}

let record = parseInt(safeLocalGet('catMergeRecord', safeLocalGet('fruitMergeRecord', '0') || '0') || '0');
let ysdkPlayer = null;
let ysdkStorage = null;
let gamesPlayed = 0;
const FULLSCREEN_AD_INTERVAL_MS = 3 * 60 * 1000; // Min interval between fullscreen ads (Yandex requires 3+ minutes)
let lastFullscreenAdTime = 0;
let currentFruitLevel = 0;
let nextFruitLevel = 0;
let canDrop = true;
let gameOver = false;
let gamePaused = false;
let mouseX = 0;
let previewArmed = false;
let fruitBodies = [];
let gameAreaLeft, gameAreaRight, gameAreaTop, gameAreaBottom;
let combo = 0;
let comboTimer = null;
let soundEnabled = safeLocalGet('catMergeSoundEnabled', safeLocalGet('fruitMergeSoundEnabled', 'true')) !== 'false';
let currentLang = safeLocalGet('catMergeLang', safeLocalGet('fruitMergeLang', 'ru') || 'ru') || 'ru';
let portalLangOverride = null;
let debugLangOverride = null;
let userSelectedLanguage = false;
let allowDebugLangOverride = false;
let musicVolume = parseFloat(safeLocalGet('catMergeMusicVolume', safeLocalGet('fruitMergeMusicVolume', '0.35') || '0.35') || '0.35');
let sfxVolume = parseFloat(safeLocalGet('catMergeSfxVolume', safeLocalGet('fruitMergeSfxVolume', '0.8') || '0.8') || '0.8');
let lastTime = 0;
let firstUserInteraction = false;
let fixedGameViewportWidth = 0;
let fixedGameViewportHeight = 0;
let ysdk = null;
let leaderboards = null;
let hasRevived = false;
let lastLeaderboardUpdate = 0;
let _gameOverCountdownInterval = null;
let _gameOverCheckPending = false;
let rewardedReviveInProgress = false;
let loadingScreenHidden = false;
let yandexGameReadyReported = false;
const LEADERBOARD_NAME = 'catMergeLeaderboard';

const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const playBtn = document.getElementById('playBtn');
const canvas = document.getElementById('game-canvas');
const gameBgImg = document.getElementById('gameBg');
const menuBtn = document.getElementById('menuBtn');
const soundBtn = document.getElementById('soundBtn');
const pauseOverlay = document.getElementById('pauseOverlay');
const resumeBtn = document.getElementById('resumeBtn');
const mainMenuBtn = document.getElementById('mainMenuBtn');
const settingsBtnPause = document.getElementById('settingsBtnPause');
const leaderboardModal = document.getElementById('leaderboardModal');
const settingsModal = document.getElementById('settingsModal');
const closeLeaderboard = document.getElementById('closeLeaderboard');
const closeSettings = document.getElementById('closeSettings');
const leaderRecord = document.getElementById('leaderRecord');
const scoreValueEl = document.getElementById('scoreValue');
const recordValueEl = document.getElementById('recordValue');
const recordOnBoardEl = document.getElementById('recordOnBoard');
const scoreOnBoardTextEl = document.getElementById('scoreOnBoardText');
const nextFruitImg = document.getElementById('nextFruitImg');
const dropGuide = document.getElementById('dropGuide');
const currentPreview = document.getElementById('currentFruitPreview');
const particlesContainer = document.getElementById('particlesContainer');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const reviveBtn = document.getElementById('reviveBtn');
const reviveTimer = document.getElementById('reviveTimer');
const timerValue = document.getElementById('timerValue');
const reviveMessage = document.getElementById('reviveMessage');
const gameOverButtons = document.getElementById('gameOverButtons');
const leaderboardModalGlobal = document.getElementById('leaderboardModalGlobal');
const settingsModalGlobal = document.getElementById('settingsModalGlobal');
const closeLeaderboardGlobal = document.getElementById('closeLeaderboardGlobal');
const closeSettingsGlobal = document.getElementById('closeSettingsGlobal');
const leaderRecordGlobal = document.getElementById('leaderRecordGlobal');
const musicVolumeSlider = document.getElementById('musicVolume');
const sfxVolumeSlider = document.getElementById('sfxVolume');
const musicVolumeValue = document.getElementById('musicVolumeValue');
const sfxVolumeValue = document.getElementById('sfxVolumeValue');
const musicVolumeSliderGlobal = document.getElementById('musicVolumeGlobal');
const sfxVolumeSliderGlobal = document.getElementById('sfxVolumeGlobal');
const musicVolumeValueGlobal = document.getElementById('musicVolumeValueGlobal');
const sfxVolumeValueGlobal = document.getElementById('sfxVolumeValueGlobal');
const langButtons = document.querySelectorAll('#settingsModal .lang-btn');
const langButtonsGlobal = document.querySelectorAll('#settingsModalGlobal .lang-btn');
const leaderboardContentEls = document.querySelectorAll('.leaderboard-content');

function refreshScoreUI() {
    if (scoreValueEl) scoreValueEl.textContent = String(score);
    if (recordValueEl) recordValueEl.textContent = String(record);
    const scorePrefix = translateKey('score_label') + ' ';
    const recordPrefix = translateKey('record_label') + ' ';
    if (scoreOnBoardTextEl) scoreOnBoardTextEl.textContent = scorePrefix + score;
    if (recordOnBoardEl) recordOnBoardEl.textContent = recordPrefix + record;
    if (leaderRecord) leaderRecord.textContent = String(record);
    if (leaderRecordGlobal) leaderRecordGlobal.textContent = String(record);
}

function syncLanguageButtons() {
    const effectiveLang = getEffectiveLang();
    [...langButtons, ...langButtonsGlobal].forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === effectiveLang);
    });
}

function saveProgress() {
    safeLocalSet('catMergeRecord', String(record));
    safeLocalSet('catMergeMusicVolume', String(musicVolume));
    safeLocalSet('catMergeSfxVolume', String(sfxVolume));
    safeLocalSet('catMergeLang', currentLang);
    safeLocalSet('catMergeSoundEnabled', String(soundEnabled));
    // Cloud save (Yandex Games)
    saveCloudProgress();
}

async function saveCloudProgress() {
    if (!ysdkStorage) return;
    try {
        await ysdkStorage.set({
            catMergeRecord: record,
            catMergeMusicVolume: musicVolume,
            catMergeSfxVolume: sfxVolume,
            catMergeLang: currentLang,
            catMergeSoundEnabled: soundEnabled
        });
    } catch (e) {}
}

async function loadCloudProgress() {
    if (!ysdkStorage) return;
    try {
        const data = await ysdkStorage.get([
            'catMergeRecord',
            'catMergeMusicVolume',
            'catMergeSfxVolume',
            'catMergeLang',
            'catMergeSoundEnabled',
            'fruitMergeRecord',
            'fruitMergeMusicVolume',
            'fruitMergeSfxVolume',
            'fruitMergeLang',
            'fruitMergeSoundEnabled'
        ]);
        if (data) {
            const cloudRecord = typeof data.catMergeRecord === 'number' ? data.catMergeRecord : data.fruitMergeRecord;
            if (typeof cloudRecord === 'number' && cloudRecord > record) {
                record = cloudRecord;
                refreshScoreUI();
            }
            const cloudMusicVolume = typeof data.catMergeMusicVolume === 'number' ? data.catMergeMusicVolume : data.fruitMergeMusicVolume;
            if (typeof cloudMusicVolume === 'number') {
                musicVolume = cloudMusicVolume;
                setBgMusicVolume(musicVolume);
            }
            const cloudSfxVolume = typeof data.catMergeSfxVolume === 'number' ? data.catMergeSfxVolume : data.fruitMergeSfxVolume;
            if (typeof cloudSfxVolume === 'number') {
                sfxVolume = cloudSfxVolume;
            }
            const cloudLang = data.catMergeLang || data.fruitMergeLang;
            if (cloudLang === 'ru' || cloudLang === 'en') {
                if (!userSelectedLanguage) {
                    applyLanguage(cloudLang, { persist: false });
                }
            }
            const cloudSoundEnabled = typeof data.catMergeSoundEnabled === 'boolean' ? data.catMergeSoundEnabled : data.fruitMergeSoundEnabled;
            if (typeof cloudSoundEnabled === 'boolean') {
                soundEnabled = cloudSoundEnabled;
            }
            updateSettingsUI();
        }
    } catch (e) {}
}

async function updateLeaderboardScore(value) {
    lastLeaderboardUpdate = value;
    try {
        const boards = ysdk?.leaderboards;
        if (typeof ysdk?.isAvailableMethod === 'function') {
            const available = await ysdk.isAvailableMethod('leaderboards.setScore').catch(() => false);
            if (!available) return;
        }
        if (boards?.setScore) {
            await boards.setScore(LEADERBOARD_NAME, value);
        } else if (boards?.setLeaderboardScore) {
            await boards.setLeaderboardScore(LEADERBOARD_NAME, value);
        }
    } catch (e) {}
}

async function loadLeaderboard() {
    // Show own record immediately as fallback
    leaderboardContentEls.forEach((contentEl) => {
        contentEl.innerHTML = `<div class="leaderboard-entry self"><span class="name">${translateKey('leaderboard_best')}</span><span class="score">${record}</span></div>`;
    });
    // Try to load real top entries from Yandex
    const boards = ysdk?.leaderboards;
    if (!boards?.getEntries && !boards?.getLeaderboardEntries) return;
    try {
        const result = await (boards.getEntries || boards.getLeaderboardEntries).call(boards, LEADERBOARD_NAME, {
            quantityTop: 10,
            includeUser: true,
            quantityAround: 3
        });
        if (!result || !Array.isArray(result.entries)) return;
        const selfLabel = translateKey('leaderboard_self');
        const html = result.entries.map((entry) => {
            const rank = entry.rank;
            const score = entry.score || 0;
            const isSelf = result.userRank && entry.rank === result.userRank;
            const name = (entry.player && (entry.player.publicName || entry.player.lang)) || (isSelf ? selfLabel : '');
            const cls = rank === 1 ? 'gold' : (rank === 2 ? 'silver' : (rank === 3 ? 'bronze' : ''));
            const selfCls = isSelf ? ' self' : '';
            return `<div class="leaderboard-entry ${cls}${selfCls}"><span class="rank">${rank}</span><span class="name">${escapeHtml(name)}</span><span class="score">${score}</span></div>`;
        }).join('');
        if (html) {
            leaderboardContentEls.forEach((contentEl) => {
                contentEl.innerHTML = html;
            });
        }
    } catch (e) {}
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

// ===== YANDEX ADS: Fullscreen interstitial =====
async function showFullscreenAd() {
    if (!ysdk?.adv?.showFullscreenAdv) return;
    const now = Date.now();
    if (now - lastFullscreenAdTime < FULLSCREEN_AD_INTERVAL_MS) return;
    lastFullscreenAdTime = now;
    try {
        ysdk.adv.showFullscreenAdv({
            callbacks: {
                onOpen: () => {
                    pauseBgMusic();
                    try { if (ysdk?.features?.GameplayAPI) ysdk.features.GameplayAPI.stop(); } catch (e) {}
                },
                onClose: () => {
                    if (soundEnabled && !gamePaused && !gameOver) resumeBgMusic();
                    try { if (ysdk?.features?.GameplayAPI && !gamePaused && !gameOver) ysdk.features.GameplayAPI.start(); } catch (e) {}
                },
                onError: () => {
                    if (soundEnabled && !gamePaused && !gameOver) resumeBgMusic();
                }
            }
        });
    } catch (e) {}
}

// ===== YANDEX ADS: Sticky banner =====
function getYandexBannerHeight() {
    // Yandex sticky banner is injected as a fixed/absolute element at the bottom.
    // Scan all direct children of body for fixed-position bottom-anchored elements
    // that look like ad containers (iframes, known class/id patterns).
    let maxH = 0;
    try {
        const candidates = document.querySelectorAll(
            'div[id*="yandex"], div[id*="adfox"], div[class*="yandex"], div[class*="adfox"], div[id*="rtb"]'
        );
        candidates.forEach(el => {
            const style = window.getComputedStyle(el);
            if ((style.position === 'fixed' || style.position === 'absolute') &&
                el.offsetHeight > 0 && el.offsetWidth > 100) {
                const rect = el.getBoundingClientRect();
                const vpH = window.innerHeight || document.documentElement.clientHeight;
                // Consider it a bottom banner if its bottom edge is near viewport bottom
                if (rect.bottom >= vpH - 5 && rect.top > vpH * 0.5) {
                    maxH = Math.max(maxH, rect.height);
                }
            }
        });
        // Fallback: check all fixed children of body
        if (maxH === 0) {
            for (let i = 0; i < document.body.children.length; i++) {
                const el = document.body.children[i];
                if (el.id === 'game-screen' || el.id === 'menu-screen') continue;
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' && style.display !== 'none') {
                    const rect = el.getBoundingClientRect();
                    const vpH = window.innerHeight || document.documentElement.clientHeight;
                    if (rect.bottom >= vpH - 5 && rect.top > vpH * 0.5 && rect.height > 20 && rect.height < 200) {
                        maxH = Math.max(maxH, rect.height);
                    }
                }
            }
        }
    } catch (e) {}
    return maxH;
}

async function showStickyBanner() {
    if (!ysdk?.adv?.showBannerAdv) return;
    try {
        await ysdk.adv.showBannerAdv();
        // Banner may appear asynchronously; adjust layout if game is already running
        setTimeout(() => {
            if (gameScreen.style.display === 'block') applyLockedGameViewport();
        }, 500);
    } catch (e) {}
}

function applyLanguage(lang, options = {}) {
    currentLang = lang === 'en' ? 'en' : 'ru';
    if (options.userSelected) {
        userSelectedLanguage = true;
        portalLangOverride = null;
        debugLangOverride = null;
    }
    if (options.persist) {
        safeLocalSet('catMergeLang', currentLang);
    }
    updateLanguage();
    switchBackgroundImages();
    updateSettingsUI();
    return currentLang;
}

function updateLanguage() {
    const effectiveLang = getEffectiveLang();
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = translateKey(key);
        if (translation) {
            el.textContent = translation;
        }
    });

    try {
        document.documentElement.lang = effectiveLang;
        document.title = effectiveLang === 'ru' ? 'Котослияние' : 'Cat Merge';
    } catch (e) {}

    refreshScoreUI();
    syncLanguageButtons();
}

function updateSettingsUI() {
    const vol = Math.round(musicVolume * 100);
    const sfx = Math.round(sfxVolume * 100);
    if (musicVolumeSlider) musicVolumeSlider.value = String(vol);
    if (musicVolumeValue) musicVolumeValue.textContent = vol + '%';
    if (sfxVolumeSlider) sfxVolumeSlider.value = String(sfx);
    if (sfxVolumeValue) sfxVolumeValue.textContent = sfx + '%';
    if (musicVolumeSliderGlobal) musicVolumeSliderGlobal.value = String(vol);
    if (musicVolumeValueGlobal) musicVolumeValueGlobal.textContent = vol + '%';
    if (sfxVolumeSliderGlobal) sfxVolumeSliderGlobal.value = String(sfx);
    if (sfxVolumeValueGlobal) sfxVolumeValueGlobal.textContent = sfx + '%';
}

function showLeaderboard() {
    if (!leaderboardModalGlobal) return;
    if (leaderRecordGlobal) leaderRecordGlobal.textContent = String(record);
    leaderboardModalGlobal.style.display = 'flex';
    loadLeaderboard();
}

function showSettings() {
    if (!settingsModalGlobal) return;
    updateSettingsUI();
    settingsModalGlobal.style.display = 'flex';
}

window.showLeaderboard = showLeaderboard;
window.showSettings = showSettings;
window.translateKey = translateKey;
window.setGameLanguage = (lang) => applyLanguage(lang, { persist: true, userSelected: true });

function reportYandexGameReady() {
    if (!loadingScreenHidden || yandexGameReadyReported) return;
    try {
        if (ysdk?.features?.LoadingAPI?.ready) {
            ysdk.features.LoadingAPI.ready();
            yandexGameReadyReported = true;
        }
    } catch (e) {}
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) {
        loadingScreenHidden = true;
        reportYandexGameReady();
        return;
    }
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loadingScreen.remove();
        loadingScreenHidden = true;
        reportYandexGameReady();
    }, 300);
}

updateSettingsUI();
window.addEventListener('load', hideLoadingScreen, { once: true });
document.addEventListener('DOMContentLoaded', hideLoadingScreen, { once: true });
setTimeout(hideLoadingScreen, 1500);

const fruitImages = Object.fromEntries(FRUITS.map((fruit, level) => {
    const img = new Image();
    let fallbackApplied = false;
    img.onerror = () => {
        if (fallbackApplied) return;
        fallbackApplied = true;
        const fallback = createFruitFallbackDataUrl(level);
        if (fallback) {
            fruit._resolvedImgSrc = fallback;
            img.src = fallback;
        }
    };
    img.src = fruit.img;
    fruit._resolvedImgSrc = fruit.img;
    return [fruit.name, img];
}));

function switchBackgroundImages() {
    const menuBg = document.getElementById('menuBg');
    const effectiveLang = getEffectiveLang();
    const menuBgSrc = effectiveLang === 'en' && menuBg?.dataset.en
        ? menuBg.dataset.en
        : 'asset/cats/cat-room-bg.png';
    if (menuBg) {
        menuBg.src = menuBgSrc;
    }
    if (gameBgImg) {
        gameBgImg.src = 'asset/cats/cat-room-bg.png';
    }
}

function startGame() {
    if (!menuScreen || !gameScreen) return;
    if (menuScreen.style.display === 'none') return;
    menuScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    lockGameViewport();
    document.body.classList.add('game-active');
    score = 0;
    combo = 0;
    hasRevived = false;
    refreshScoreUI();
    initGame();
    try {
        if (ysdk?.features?.GameplayAPI) {
            ysdk.features.GameplayAPI.start();
        }
    } catch (e) {}
    if (soundEnabled) {
        bgMusicPauseOffset = 0;
        playBgMusic();
    }
}

function cleanupAndReturnToMenu() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    pauseBgMusic();
    bgMusicPauseOffset = 0;
    bgMusicStartTime = 0;
    if (engine) {
        Matter.Events.off(engine, 'collisionStart', handleCollision);
        if (world) {
            Matter.World.clear(world, false);
            Matter.Engine.clear(engine);
        }
        engine = null;
        world = null;
    }
    fruitBodies = [];
    gamePaused = false;
    gameOver = false;
    canDrop = true;
    _gameOverCheckPending = false;
    if (_gameOverCountdownInterval) {
        clearInterval(_gameOverCountdownInterval);
        _gameOverCountdownInterval = null;
    }
    if (comboTimer) {
        clearTimeout(comboTimer);
        comboTimer = null;
    }
    combo = 0;
    currentPreview.style.display = 'none';
    dropGuide.style.display = 'none';
    pauseOverlay.style.display = 'none';
    gameOverEl.style.display = 'none';
    if (reviveBtn) reviveBtn.style.display = '';
    if (reviveTimer) reviveTimer.style.display = 'none';
    if (gameOverButtons) gameOverButtons.style.display = 'none';
    menuScreen.style.display = 'flex';
    gameScreen.style.display = 'none';
    document.body.classList.remove('game-active');
    unlockGameViewport();
}

function handleRestartBtn() {
    hasRevived = false;
    resetGame();
}

function handleMainMenuBtn() {
    cleanupAndReturnToMenu();
}

function applyReviveReward() {
    fruitBodies.forEach((body) => {
        Matter.Composite.remove(world, body);
    });
    fruitBodies = [];
    gameOver = false;
    canDrop = true;
    gamePaused = false;
    gameOverEl.style.display = 'none';
    if (soundEnabled) {
        bgMusicPauseOffset = 0;
        playBgMusic();
    }
}

async function showRewardedReviveAd() {
    if (!ysdk?.adv?.showRewardedVideo) return false;
    return await new Promise((resolve) => {
        let rewarded = false;
        ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    try {
                        if (ysdk?.features?.GameplayAPI) ysdk.features.GameplayAPI.stop();
                    } catch (e) {}
                },
                onRewarded: () => {
                    rewarded = true;
                },
                onClose: () => {
                    try {
                        if (ysdk?.features?.GameplayAPI && !gamePaused && !gameOver) {
                            ysdk.features.GameplayAPI.start();
                        }
                    } catch (e) {}
                    resolve(rewarded === true);
                },
                onError: () => {
                    try {
                        if (ysdk?.features?.GameplayAPI && !gamePaused && !gameOver) {
                            ysdk.features.GameplayAPI.start();
                        }
                    } catch (e) {}
                    resolve(false);
                }
            }
        });
    });
}

async function handleReviveBtn() {
    if (hasRevived || !gameOver || rewardedReviveInProgress) return;
    rewardedReviveInProgress = true;
    if (reviveBtn) reviveBtn.disabled = true;

    const rewarded = await showRewardedReviveAd();
    if (rewarded) {
        hasRevived = true;
        applyReviveReward();
    } else if (reviveBtn) {
        reviveBtn.disabled = false;
    }
    rewardedReviveInProgress = false;
}

function resetGame() {
    if (animFrameId) cancelAnimationFrame(animFrameId);

    // Complete engine cleanup
    if (engine) {
        Matter.Events.off(engine, 'collisionStart', handleCollision);

        if (world) {
            Matter.World.clear(world, false);
            Matter.Engine.clear(engine);
        }
    }

    // Reset all state
    fruitBodies = [];
    score = 0;
    combo = 0;
    gameOver = false;
    canDrop = true;
    gamePaused = false;

    refreshScoreUI();
    gameOverEl.style.display = 'none';
    pauseOverlay.style.display = 'none';

    // Reinitialize game
    initGame();

    // Resume music
    if (soundEnabled) {
        resumeBgMusic();
    }
}

function togglePause() {
    gamePaused = !gamePaused;
    pauseOverlay.style.display = gamePaused ? 'flex' : 'none';

    // Notify Yandex about gameplay state
    try {
        if (ysdk?.features?.GameplayAPI) {
            if (gamePaused) {
                ysdk.features.GameplayAPI.stop();
            } else {
                ysdk.features.GameplayAPI.start();
            }
        }
    } catch (e) {}
}

async function initYandexSDK() {
    // SDK is loaded via <script> in HTML head per Yandex documentation.
    // Only initialize if running inside Yandex Games iframe.
    const inIframe = (() => {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    })();
    if (!inIframe) {
        ysdk = null;
        leaderboards = null;
        return;
    }

    try {
        if (window.YaGames?.init) {
            ysdk = await window.YaGames.init();
            leaderboards = ysdk.leaderboards || null;
            reportYandexGameReady();
            try {
                if (typeof ysdk?.on === 'function') {
                    ysdk.on('game_api_pause', () => {
                        gamePaused = true;
                        pauseBgMusic();
                    });
                    ysdk.on('game_api_resume', () => {
                        gamePaused = false;
                        if (!gameOver && soundEnabled) {
                            resumeBgMusic();
                        }
                    });
                }
            } catch (e) {}
            // Apply portal language unless user picked one manually
            try {
                const portalLang = ysdk?.environment?.i18n?.lang;
                if (portalLang && (portalLang === 'ru' || portalLang === 'en') && !userSelectedLanguage) {
                    portalLangOverride = portalLang;
                    updateLanguage();
                    switchBackgroundImages();
                }
            } catch (e) {}
            // Cloud storage
            try {
                if (typeof ysdk.getStorage === 'function') {
                    ysdkStorage = await ysdk.getStorage();
                    await loadCloudProgress();
                }
            } catch (e) {}
            // Player info can be useful for Yandex services, but the in-game leaderboard is hidden.
            try {
                if (typeof ysdk.getPlayer === 'function') {
                    ysdkPlayer = await ysdk.getPlayer({ scopes: false }).catch(() => null);
                }
            } catch (e) {}
            // Show sticky banner
            showStickyBanner();
        }
    } catch (e) {
        ysdk = null;
        leaderboards = null;
    }
}

addTapHandler(playBtn, () => {
    if (!webAudioInitialized) {
        initWebAudio().catch(() => {});
    } else {
        getAudioContext();
    }
    startGame();
});
addTapHandler(menuBtn, togglePause);
addTapHandler(resumeBtn, togglePause);
addTapHandler(mainMenuBtn, handleMainMenuBtn);
addTapHandler(soundBtn, () => {
    soundEnabled = !soundEnabled;
    const icon = soundBtn?.querySelector('svg use');
    if (soundEnabled) {
        if (icon) icon.setAttribute('href', '#sound-on');
        playBgMusic();
    } else {
        if (icon) icon.setAttribute('href', '#sound-off');
        pauseBgMusic();
    }
    saveProgress();
});
addTapHandler(restartBtn, handleRestartBtn);
if (reviveBtn) addTapHandler(reviveBtn, handleReviveBtn);
addTapHandler(closeLeaderboard, () => {
    leaderboardModal.style.display = 'none';
    pauseOverlay.style.display = 'flex';
});
addTapHandler(closeSettings, () => {
    settingsModal.style.display = 'none';
    pauseOverlay.style.display = 'flex';
});
addTapHandler(settingsBtnPause, () => {
    updateSettingsUI();
    settingsModal.style.display = 'flex';
    pauseOverlay.style.display = 'none';
});
addTapHandler(closeLeaderboardGlobal, () => {
    leaderboardModalGlobal.style.display = 'none';
});
addTapHandler(closeSettingsGlobal, () => {
    settingsModalGlobal.style.display = 'none';
});
langButtons.forEach((btn) => {
    addTapHandler(btn, () => {
        const lang = btn.getAttribute('data-lang');
        applyLanguage(lang, { persist: true, userSelected: true });
    });
});
langButtonsGlobal.forEach((btn) => {
    addTapHandler(btn, () => {
        const lang = btn.getAttribute('data-lang');
        applyLanguage(lang, { persist: true, userSelected: true });
    });
});
if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', (e) => {
        musicVolume = Number(e.target.value) / 100;
        updateSettingsUI();
        setBgMusicVolume(musicVolume);
        saveProgress();
    });
}
if (sfxVolumeSlider) {
    sfxVolumeSlider.addEventListener('input', (e) => {
        sfxVolume = Number(e.target.value) / 100;
        updateSettingsUI();
        saveProgress();
    });
}
if (musicVolumeSliderGlobal) {
    musicVolumeSliderGlobal.addEventListener('input', (e) => {
        musicVolume = Number(e.target.value) / 100;
        updateSettingsUI();
        setBgMusicVolume(musicVolume);
        saveProgress();
    });
}
if (sfxVolumeSliderGlobal) {
    sfxVolumeSliderGlobal.addEventListener('input', (e) => {
        sfxVolume = Number(e.target.value) / 100;
        updateSettingsUI();
        saveProgress();
    });
}
switchBackgroundImages();
updateLanguage();
initYandexSDK();

// ===== INPUT LISTENERS =====
const gameScreenEl = document.getElementById('game-screen');
if (gameScreenEl) gameScreenEl.addEventListener('mousemove', onMouseMove);
if (gameScreenEl) gameScreenEl.addEventListener('click', (e) => {
    if (e.target.closest('.score-on-board') || e.target.closest('.top-left-controls') ||
        e.target.closest('#game-over') || e.target.closest('.pause-overlay') ||
        e.target.closest('.next-fruit-panel')) return;
    onClickDrop(e);
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (gameScreen.style.display === 'block') {
            e.preventDefault();
            togglePause();
        }
    }
});

// Unified touch/click handler helper — prevents double-fire on mobile
function addTapHandler(element, handler) {
    if (!element) return;
    element.addEventListener('click', (e) => {
        e.stopPropagation();
        handler();
    });
}

// Setup main menu buttons
function setupMobileMenuButtons() {
    const leaderboardArea = document.querySelector('.leaderboard-area');
    const settingsArea = document.querySelector('.settings-area');

    if (leaderboardArea && !leaderboardArea.dataset.bound) {
        leaderboardArea.dataset.bound = 'true';
        addTapHandler(leaderboardArea, showLeaderboard);
    }

    if (settingsArea && !settingsArea.dataset.bound) {
        settingsArea.dataset.bound = 'true';
        addTapHandler(settingsArea, showSettings);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenuButtons();
});

// Also setup immediately in case DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setupMobileMenuButtons();
}

function getFruitScaleFactorForViewport(viewportWidth, viewportHeight) {
    const minDimension = Math.min(viewportWidth, viewportHeight);
    const reference = 900;
    const raw = minDimension / reference;
    return Math.min(0.78, Math.max(0.42, raw * 0.74));
}

function getFruitScaleFactor() {
    return getFruitScaleFactorForViewport(_gameLockedW || getViewportWidth(), _gameLockedH || getViewportHeight());
}

function getFruitRadius(baseRadius) {
    return baseRadius * getFruitScaleFactor();
}

function getFruitSpawnY(radius) {
    return Math.min(gameAreaTop + radius + 12, gameAreaBottom - radius - 8);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getImageVisibleRect(imgW, imgH, vpW, vpH) {
    const imgRatio = imgW / imgH;
    const vpRatio = vpW / vpH;
    let drawW, drawH, offsetX, offsetY;
    if (vpRatio > imgRatio) {
        drawW = vpW;
        drawH = vpW / imgRatio;
        offsetX = 0;
        offsetY = (vpH - drawH) / 2;
    } else {
        drawH = vpH;
        drawW = vpH * imgRatio;
        offsetX = (vpW - drawW) / 2;
        offsetY = 0;
    }
    return { drawW, drawH, offsetX, offsetY };
}

function getPlayfieldHorizontalBounds(W, H, safeMargin, isMobile) {
    const desiredWidth = W * 0.32;
    const fallbackWidth = Math.max(240, Math.min(desiredWidth, W - safeMargin * 2));
    let left = (W - fallbackWidth) / 2;
    let right = left + fallbackWidth;

    if (gameBgImg && gameBgImg.naturalWidth && gameBgImg.naturalHeight) {
        const { drawW, offsetX } = getImageVisibleRect(gameBgImg.naturalWidth, gameBgImg.naturalHeight, W, H);
        const artBounds = PLAYFIELD_ART_BOUNDS.desktop;
        left = offsetX + drawW * artBounds.left;
        right = offsetX + drawW * artBounds.right;
    }

    const minWidth = Math.min(220, Math.max(160, W - safeMargin * 2));
    if (right - left < minWidth) {
        const centerX = (left + right) / 2;
        left = centerX - minWidth / 2;
        right = centerX + minWidth / 2;
    }

    if (left < safeMargin) {
        right += safeMargin - left;
        left = safeMargin;
    }
    if (right > W - safeMargin) {
        left -= right - (W - safeMargin);
        right = W - safeMargin;
    }

    const maxLeft = Math.max(safeMargin, W - safeMargin - minWidth);
    left = clamp(left, safeMargin, maxLeft);
    right = Math.max(left + minWidth, Math.min(right, W - safeMargin));

    if (right > W - safeMargin) {
        right = W - safeMargin;
        left = Math.max(safeMargin, right - minWidth);
    }

    const fieldWidthBeforeTrim = right - left;
    const trimLeftPx = Math.min(56, Math.max(0, fieldWidthBeforeTrim * 0.12));
    const trimRightPx = Math.min(48, Math.max(0, fieldWidthBeforeTrim * 0.1));
    if (fieldWidthBeforeTrim - trimLeftPx - trimRightPx >= minWidth) {
        left += trimLeftPx;
        right -= trimRightPx;
    }

    if (right > W - safeMargin) {
        const overflow = right - (W - safeMargin);
        left -= overflow;
        right -= overflow;
    }

    return { left, right };
}

function updateGameLayoutDimensions(W, H) {
    const isMobile = false;
    const safeMargin = Math.min(Math.max(W * 0.025, 22), 70);
    const safeTop = Math.min(Math.max(H * 0.035, 24), 58);
    const topUiReserve = Math.min(Math.max(H * 0.17, 118), Math.max(86, H * 0.32), 176);
    const horizontalBounds = getPlayfieldHorizontalBounds(W, H, safeMargin, isMobile);
    gameAreaLeft = horizontalBounds.left;
    gameAreaRight = horizontalBounds.right;

    // Reserve bottom space for Yandex sticky banner.
    // If ysdk is active, always reserve at least 70px even if banner not yet visible.
    const detectedBannerH = getYandexBannerHeight();
    const reservedBannerH = ysdk ? Math.max(detectedBannerH, 70) : detectedBannerH;
    const safeBottom = H - reservedBannerH - Math.min(Math.max(H * 0.025, 20), 52);

    // Use background image for vertical bounds to keep fruits aligned with PNG background
    if (gameBgImg && gameBgImg.naturalWidth && gameBgImg.naturalHeight) {
        const { drawH, offsetY } = getImageVisibleRect(gameBgImg.naturalWidth, gameBgImg.naturalHeight, W, H);
        const artBounds = PLAYFIELD_ART_BOUNDS.desktop;
        gameAreaTop = Math.max(Math.round(offsetY + drawH * artBounds.top), safeTop, topUiReserve);
        gameAreaBottom = Math.min(Math.round(offsetY + drawH * artBounds.bottom), safeBottom);
    } else {
        const topMargin = Math.max(Math.min(H * 0.08, 140), 40);
        const bottomMargin = Math.max(Math.min(H * 0.09, 180), 60);
        gameAreaTop = Math.max(topMargin, safeTop, topUiReserve);
        gameAreaBottom = Math.min(Math.max(gameAreaTop + 320, H - bottomMargin), safeBottom);
    }

    // Hard-clamp bounds to viewport to prevent any off-screen physics
    gameAreaLeft = Math.max(0, gameAreaLeft);
    gameAreaRight = Math.min(W, gameAreaRight);
    gameAreaTop = Math.max(0, gameAreaTop);
    gameAreaBottom = Math.min(H - 10, gameAreaBottom);

    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.style.left = '0px';
    canvas.style.top = '0px';
}

function createWallBodies() {
    const wallOptions = {
        isStatic: true,
        friction: 0.95,
        restitution: 0,
        render: { visible: false },
        label: 'wall',
        slop: 0.01
    };

    const bottomWall = Matter.Bodies.rectangle(
        (gameAreaLeft + gameAreaRight) / 2,
        gameAreaBottom + WALL_T / 2,
        gameAreaRight - gameAreaLeft + WALL_T * 2,
        WALL_T,
        wallOptions
    );

    const wallExtension = 400;
    const wallTop = gameAreaTop - wallExtension;
    const wallHeight = gameAreaBottom - wallTop + WALL_T;

    const leftWall = Matter.Bodies.rectangle(
        gameAreaLeft - WALL_T / 2,
        (wallTop + gameAreaBottom) / 2,
        WALL_T,
        wallHeight,
        wallOptions
    );

    const rightWall = Matter.Bodies.rectangle(
        gameAreaRight + WALL_T / 2,
        (wallTop + gameAreaBottom) / 2,
        WALL_T,
        wallHeight,
        wallOptions
    );

    return [bottomWall, leftWall, rightWall];
}

function initGame() {
    // Use the locked game-screen dimensions — guaranteed to match CSS rendering
    const W = _gameLockedW || getViewportWidth();
    const H = _gameLockedH || getViewportHeight();

    updateGameLayoutDimensions(W, H);

    engine = Matter.Engine.create({
        gravity: { x: 0, y: 1.8 }, // Нормальная гравитация
        enableSleeping: false, // Отключен sleeping для предотвращения зависания
        timing: {
            timeScale: 1
        }
    });
    world = engine.world;

    // Configure world for better stability
    world.gravity.scale = 0.001;

    // Physics iterations: balanced for stability and mobile performance
    engine.constraintIterations = 4;
    engine.positionIterations = 16;
    engine.velocityIterations = 12;

    Matter.Composite.add(world, createWallBodies());
    Matter.Events.on(engine, 'collisionStart', handleCollision);

    currentFruitLevel = randomDropLevel();
    nextFruitLevel = randomDropLevel();
    updateNextFruitUI();
    updateCurrentPreview();

    _lastResizeW = W;
    _lastResizeH = H;

    if (animFrameId) cancelAnimationFrame(animFrameId);
    lastTime = performance.now();
    animFrameId = requestAnimationFrame(gameLoop);
}

function rescaleGameArea(oldViewportW, oldViewportH) {
    if (!engine || !world) return;
    // Skip if viewport didn't actually change (prevents wall destruction on phantom resizes)
    const newW = _gameLockedW || getViewportWidth();
    const newH = _gameLockedH || getViewportHeight();
    if (newW === oldViewportW && newH === oldViewportH) return;

    const oldLeft = gameAreaLeft;
    const oldRight = gameAreaRight;
    const oldBottom = gameAreaBottom;
    const oldFieldWidth = Math.max(1, oldRight - oldLeft);

    updateGameLayoutDimensions(newW, newH);

    const newFieldWidth = Math.max(1, gameAreaRight - gameAreaLeft);
    const bottomDelta = gameAreaBottom - oldBottom;
    const pad = 5;

    fruitBodies.forEach((body) => {
        if (!body || body.label !== 'fruit') return;

        const radius = body.circleRadius;
        const minX = gameAreaLeft + radius + pad;
        const maxX = gameAreaRight - radius - pad;

        const nextX = gameAreaLeft + (body.position.x - oldLeft) * (newFieldWidth / oldFieldWidth);
        const nextY = body.position.y + bottomDelta;

        Matter.Body.setPosition(body, {
            x: clamp(nextX, minX, maxX),
            y: nextY
        });
        // Reset velocity so fruits don't keep falling/bouncing after the shift
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
    });

    world.bodies
        .filter((body) => body.label === 'wall')
        .forEach((body) => Matter.Composite.remove(world, body));
    Matter.Composite.add(world, createWallBodies());

    mouseX = clamp(mouseX || (gameAreaLeft + gameAreaRight) / 2, gameAreaLeft, gameAreaRight);
    updateCurrentPreview();
    updatePreviewPosition();
}

function keepFruitsInsidePlayfield() {
    const pad = 3;
    fruitBodies.forEach((body) => {
        if (!body || body.label !== 'fruit' || body.merged) return;
        const radius = body.circleRadius || getFruitRadius(FRUITS[body.fruitLevel].radius);
        const minX = gameAreaLeft + radius + pad;
        const maxX = gameAreaRight - radius - pad;
        const bottomY = gameAreaBottom - radius - pad;
        let nextX = body.position.x;
        let nextY = body.position.y;
        let needsClamp = false;

        if (nextX < minX || nextX > maxX) {
            nextX = clamp(nextX, minX, maxX);
            needsClamp = true;
        }

        if (nextY > gameAreaBottom + radius) {
            nextY = bottomY;
            needsClamp = true;
        }

        if (needsClamp) {
            Matter.Body.setPosition(body, { x: nextX, y: nextY });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(body, 0);
        }
    });
}

// ===== FRUIT HELPERS =====
function randomDropLevel() {
    return Math.floor(Math.random() * MAX_DROP_LEVEL);
}

function updateNextFruitUI() {
    nextFruitImg.src = getFruitImageSrc(nextFruitLevel);
}

function updateCurrentPreview() {
    const fruit = FRUITS[currentFruitLevel];
    const radius = getFruitRadius(fruit.radius);
    currentPreview.src = getFruitImageSrc(currentFruitLevel);
    currentPreview.style.width = (radius * 2) + 'px';
    currentPreview.style.height = (radius * 2) + 'px';
    currentPreview.style.display = 'none';
}

function updateScore(pts) {
    score += pts;
    if (score > record) {
        record = score;
        saveProgress();
        updateLeaderboardScore(record);
    }
    refreshScoreUI();
}

// ===== DROP FRUIT =====
function dropFruit(x) {
    if (!world || !engine) return;
    if (!canDrop || gameOver || gamePaused) return;
    canDrop = false;

    const fruit = FRUITS[currentFruitLevel];
    const radius = getFruitRadius(fruit.radius);
    const clampedX = Math.max(gameAreaLeft + radius + 5, Math.min(x, gameAreaRight - radius - 5));

    const isMobile = window.innerWidth <= 768;
    const dropY = getFruitSpawnY(radius);

    const body = Matter.Bodies.circle(clampedX, dropY, radius, {
        restitution: 0.02,
        friction: 0.15,
        frictionAir: isMobile ? 0.01 : 0.002,
        frictionStatic: 0.35,
        density: 0.025,
        label: 'fruit',
        fruitLevel: currentFruitLevel,
        isNew: true,
        slop: 0.02,
        collisionFilter: {
            category: 0x0001,
            mask: 0xFFFFFFFF
        }
    });

    body.circleRadius = radius;
    Matter.Body.setVelocity(body, { x: 0, y: 2 });

    Matter.Composite.add(world, body);
    fruitBodies.push(body);

    setTimeout(() => { body.isNew = false; }, 1000);

    currentFruitLevel = nextFruitLevel;
    nextFruitLevel = randomDropLevel();
    updateNextFruitUI();
    updateCurrentPreview();
    previewArmed = false;
    currentPreview.style.display = 'none';
    dropGuide.style.display = 'none';

    setTimeout(() => { canDrop = true; }, 500);
}

// ===== COLLISION / MERGE =====
function handleCollision(event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const { bodyA, bodyB } = pairs[i];

        if (bodyA.label === 'fruit' && bodyB.label === 'fruit' &&
            bodyA.fruitLevel !== undefined && bodyB.fruitLevel !== undefined &&
            bodyA.fruitLevel === bodyB.fruitLevel &&
            !bodyA.merged && !bodyB.merged) {

            const level = bodyA.fruitLevel;
            if (level >= FRUITS.length - 1) continue;

            bodyA.merged = true;
            bodyB.merged = true;

            const midX = (bodyA.position.x + bodyB.position.x) / 2;
            const midY = (bodyA.position.y + bodyB.position.y) / 2;

            Matter.Composite.remove(world, bodyA);
            Matter.Composite.remove(world, bodyB);
            fruitBodies = fruitBodies.filter(b => b !== bodyA && b !== bodyB);

            const newLevel = level + 1;
            const newFruit = FRUITS[newLevel];
            const newRadius = getFruitRadius(newFruit.radius);

            const isMobile = window.innerWidth <= 768;

            const newBody = Matter.Bodies.circle(midX, midY, newRadius, {
                restitution: 0.02,
                friction: 0.15,
                frictionAir: isMobile ? 0.01 : 0.002,
                frictionStatic: 0.35,
                density: 0.025,
                label: 'fruit',
                fruitLevel: newLevel,
                isNew: false,
                slop: 0.02,
                collisionFilter: {
                    category: 0x0001,
                    mask: 0xFFFFFFFF
                }
            });

            newBody.circleRadius = newRadius;

            const randomHorizontal = (Math.random() - 0.5) * 5.2;
            Matter.Body.setVelocity(newBody, { x: randomHorizontal, y: -8.4 });
            Matter.Body.setAngularVelocity(newBody, randomHorizontal * 0.026);

            Matter.Composite.add(world, newBody);
            fruitBodies.push(newBody);

            combo++;
            if (comboTimer) clearTimeout(comboTimer);
            comboTimer = setTimeout(() => { combo = 0; }, 2000);

            const comboBonus = combo > 1 ? Math.floor(newFruit.points * (combo * 0.3)) : 0;
            const totalPoints = newFruit.points + comboBonus;
            updateScore(totalPoints);

            playMergeSound();
            spawnMergeEffects(midX, midY, newRadius);
            spawnScorePopup(midX, midY, totalPoints);

            if (combo >= 3) {
                spawnComboIndicator(combo);
            }
        }
    }
}

// ===== EFFECTS =====
function playMergeSound() {
    playMergeSoundWA();
}

function spawnMergeEffects(x, y, radius) {
    const flash = document.createElement('div');
    flash.className = 'merge-flash';
    flash.style.left = x + 'px';
    flash.style.top = y + 'px';
    flash.style.width = (radius * 3.5) + 'px';
    flash.style.height = (radius * 3.5) + 'px';
    particlesContainer.appendChild(flash);
    setTimeout(() => flash.remove(), 600);

    const colors = ['#F9FFE2', '#C8F56C', '#73D65B', '#2FB457', '#FFE680', '#B7F7A2'];
    const symbols = ['🐾', '🌿', '✦', '💚', '🐱'];
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'particle cat-particle';
        const size = 14 + Math.random() * 12;
        const color = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.color = color;
        p.style.fontSize = size + 'px';
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        const angle = (Math.PI * 2 / 18) * i + Math.random() * 0.5;
        const dist = radius * 0.5 + Math.random() * radius;
        p.style.left = (x + Math.cos(angle) * dist) + 'px';
        p.style.top = (y + Math.sin(angle) * dist) + 'px';
        particlesContainer.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }
}

function spawnScorePopup(x, y, pts) {
    const el = document.createElement('div');
    el.className = 'score-popup';
    el.textContent = '+' + pts;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    particlesContainer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function spawnComboIndicator(comboCount) {
    const el = document.createElement('div');
    el.className = 'combo-indicator';

    const colors = ['#F9FFE2', '#D8FF7A', '#95EA5F', '#FFE680'];
    el.style.color = colors[(comboCount - 3) % colors.length];

    const randX = 22 + Math.random() * 56;
    const randY = 18 + Math.random() * 34;
    el.style.left = randX + '%';
    el.style.top = randY + '%';

    const lang = getEffectiveLang();
    const comboLabel = lang === 'ru' ? 'МЯУ-КОМБО' : 'MEOW COMBO';
    el.textContent = comboLabel + ' x' + comboCount + '!';
    particlesContainer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// ===== INPUT =====
function isPointerOverGameUi(target) {
    return !!target.closest('.score-on-board, .top-left-controls, #game-over, .pause-overlay, .next-fruit-panel');
}

function onMouseMove(e) {
    if (gamePaused) return;
    if (isPointerOverGameUi(e.target)) {
        previewArmed = false;
        updatePreviewPosition();
        return;
    }
    mouseX = getGamePointerX(e.clientX);
    previewArmed = true;
    updatePreviewPosition();
}

function onClickDrop(e) {
    if (gamePaused) return;
    dropFruit(getGamePointerX(e.clientX));
}

function onTouchMove(e) {
    if (gamePaused) return;
    e.preventDefault();
    if (isPointerOverGameUi(e.target)) {
        previewArmed = false;
        updatePreviewPosition();
        return;
    }
    if (e.touches.length > 0) {
        mouseX = getGamePointerX(e.touches[0].clientX);
        previewArmed = true;
        updatePreviewPosition();
    }
}

function onTouchDrop(e) {
    if (gamePaused) return;
    dropFruit(mouseX);
}

function updatePreviewPosition() {
    if (gameOver || gamePaused || gameAreaLeft === undefined || !previewArmed) {
        currentPreview.style.display = 'none';
        dropGuide.style.display = 'none';
        return;
    }
    const fruit = FRUITS[currentFruitLevel];
    const radius = getFruitRadius(fruit.radius);
    const clampedX = Math.max(gameAreaLeft + radius + 5, Math.min(mouseX, gameAreaRight - radius - 5));
    currentPreview.style.left = clampedX + 'px';
    currentPreview.style.top = getFruitSpawnY(radius) + 'px';
    currentPreview.style.display = canDrop ? 'block' : 'none';
    currentPreview.style.width = (radius * 2) + 'px';
    currentPreview.style.height = (radius * 2) + 'px';

    dropGuide.style.left = clampedX + 'px';
    dropGuide.style.top = gameAreaTop + 'px';
    dropGuide.style.height = (gameAreaBottom - gameAreaTop) + 'px';
    dropGuide.style.display = canDrop ? 'block' : 'none';
}

// ===== GAME OVER CHECK =====
function checkGameOver() {
    const dangerY = gameAreaTop + 80;

    for (let i = 0; i < fruitBodies.length; i++) {
        const b = fruitBodies[i];
        if (b.isNew) continue;
        const topOfFruit = b.position.y - b.circleRadius;
        if (topOfFruit < dangerY) {
            setTimeout(() => {
                const stillDanger = fruitBodies.some(fb => {
                    if (fb.isNew) return false;
                    return (fb.position.y - fb.circleRadius) < dangerY;
                });
                if (stillDanger) triggerGameOver();
            }, 1500);
            return;
        }
    }
}

function triggerGameOver() {
    gameOver = true;
    canDrop = false;
    currentPreview.style.display = 'none';
    dropGuide.style.display = 'none';
    finalScoreEl.textContent = score;

    // Notify Yandex GameplayAPI that active gameplay stopped
    try {
        if (ysdk?.features?.GameplayAPI) {
            ysdk.features.GameplayAPI.stop();
        }
    } catch (e) {}

    gamesPlayed++;
    // Show fullscreen ad at every natural pause (game over). 3-min interval guard is inside showFullscreenAd.
    showFullscreenAd();

    gameOverEl.style.display = 'flex';

    if (hasRevived) {
        if (reviveMessage) reviveMessage.style.display = 'none';
        if (reviveTimer) reviveTimer.style.display = 'none';
        if (gameOverButtons) {
            gameOverButtons.style.display = 'flex';
            if (reviveBtn) reviveBtn.style.display = 'none';
        }
        return;
    }

    if (reviveMessage) reviveMessage.style.display = 'block';
    if (gameOverButtons) gameOverButtons.style.display = 'none';
    if (reviveTimer) reviveTimer.style.display = 'none';

    let countdown = 3;
    if (timerValue) timerValue.textContent = countdown;
    if (reviveTimer) reviveTimer.style.display = 'block';

    const countdownInterval = setInterval(() => {
        countdown--;
        if (timerValue) timerValue.textContent = countdown;

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            if (reviveTimer) reviveTimer.style.display = 'none';
            if (reviveMessage) reviveMessage.style.display = 'none';
            if (gameOverButtons) gameOverButtons.style.display = 'flex';
        }
    }, 1000);
}

// ===== RENDER LOOP =====
const ctx = canvas.getContext('2d');

function gameLoop(timestamp) {
    if (!engine) return;

    // === VIEWPORT POLLING: catch F11 changes that don't fire resize event ===
    if (gameScreen.style.display === 'block' && _lastResizeW > 0) {
        const curVpW = getViewportWidth();
        const curVpH = getViewportHeight();
        if (Math.abs(curVpW - _lastResizeW) >= 5 || Math.abs(curVpH - _lastResizeH) >= 5) {
            handleResize(true);
        }
    }

    if (!gamePaused) {
        const delta = Math.min(timestamp - lastTime, 33.33);
        lastTime = timestamp;

        Matter.Engine.update(engine, delta);
        keepFruitsInsidePlayfield();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < fruitBodies.length; i++) {
            const body = fruitBodies[i];
            if (body.merged) continue;
            const fruit = FRUITS[body.fruitLevel];
            const img = fruitImages[fruit.name];

            if (img && img.complete) {
                ctx.save();
                ctx.translate(body.position.x, body.position.y);
                ctx.rotate(body.angle);

                const radius = getFruitRadius(fruit.radius);
                const size = radius * 2;

                const glowColors = ['rgba(255,224,130,0.25)', 'rgba(255,138,101,0.25)', 'rgba(174,213,129,0.25)', 'rgba(79,195,247,0.25)', 'rgba(240,98,146,0.25)'];
                ctx.shadowColor = glowColors[body.fruitLevel % glowColors.length];
                ctx.shadowBlur = 14;
                ctx.shadowOffsetY = 4;

                ctx.drawImage(img, -size / 2, -size / 2, size, size);

                ctx.restore();
            }
        }

        if (!gameOver) {
            checkGameOver();
            updatePreviewPosition();
        }
    }

    animFrameId = requestAnimationFrame(gameLoop);
}

let _lastResizeW = 0;
let _lastResizeH = 0;
let _resizeRafId = null;

function handleResize(force) {
    // Defer to next frame so viewport dimensions stabilize after F11/fullscreen transition
    if (_resizeRafId) cancelAnimationFrame(_resizeRafId);
    _resizeRafId = requestAnimationFrame(() => {
        _resizeRafId = null;
        const viewportWidth = getViewportWidth();
        const viewportHeight = getViewportHeight();
        // Ignore tiny changes (< 5px) to prevent constant rescaling from browser chrome fluctuations
        const dw = Math.abs(viewportWidth - _lastResizeW);
        const dh = Math.abs(viewportHeight - _lastResizeH);
        if (dw < 5 && dh < 5) return;
        const oldW = _lastResizeW || _gameLockedW;
        const oldH = _lastResizeH || _gameLockedH;
        _lastResizeW = viewportWidth;
        _lastResizeH = viewportHeight;
        if (gameScreen.style.display === 'block' && _gameLockedW) {
            // Re-lock game-screen to calculate scale and logical bounds
            applyLockedGameViewport();

            // Rescale physics to match new dimensions
            if (engine && world && oldW > 0 && oldH > 0) {
                rescaleGameArea(oldW, oldH);
            }
        }
    });
}

let _gameLockedW = 0;
let _gameLockedH = 0;

function lockGameViewport() {
    // Position game-screen to fill entire viewport with no gaps
    gameScreen.style.position = 'fixed';
    document.body.style.overflow = 'hidden';

    // We must initialize _gameLockedW/H so applyLockedGameViewport doesn't return early
    _gameLockedW = 1;
    _gameLockedH = 1;

    // Calculate and apply scaling and logical bounds
    applyLockedGameViewport();

    // Sync resize tracking so game loop doesn't trigger phantom resize
    _lastResizeW = getViewportWidth();
    _lastResizeH = getViewportHeight();
}

function unlockGameViewport() {
    _gameLockedW = 0;
    _gameLockedH = 0;
    document.body.classList.remove('fullscreen-viewport');
    gameScreen.style.width = '';
    gameScreen.style.height = '';
    gameScreen.style.left = '';
    gameScreen.style.top = '';
    gameScreen.style.transform = '';
    gameScreen.style.transformOrigin = '';
}

function applyLockedGameViewport() {
    if (!_gameLockedW || !_gameLockedH) return;
    const vpW = getViewportWidth();
    const vpH = getViewportHeight();
    updateViewportModeClass(vpH);

    // Do not force width/height in px. Let CSS top:0;bottom:0;left:0;right:0 handle it.
    // This ensures bottom-anchored UI elements and borders aren't pushed off-screen.
    gameScreen.style.transform = 'none';

    _gameLockedW = vpW;
    _gameLockedH = vpH;
}

function updateViewportModeClass(viewportHeight = getViewportHeight()) {
    const screenHeight = window.screen?.height || viewportHeight;
    const fullscreenLike = !!document.fullscreenElement || screenHeight - viewportHeight <= 48;
    document.body.classList.toggle('fullscreen-viewport', fullscreenLike);
}

function getViewportWidth() {
    // Prioritize documentElement.clientWidth to get exact 100vw CSS size, avoiding mobile layout viewport bugs
    return document.documentElement.clientWidth || window.innerWidth || 360;
}

function getViewportHeight() {
    // Prioritize documentElement.clientHeight to get exact 100vh/100dvh CSS size
    return document.documentElement.clientHeight || window.innerHeight || 640;
}

function getGamePointerX(clientX) {
    const rect = gameScreen.getBoundingClientRect();
    if (!rect.width) return clientX;
    // If the gameScreen is scaled down, we must adjust the coordinates
    const scale = rect.width / _gameLockedW;
    return (clientX - rect.left) / scale;
}

// F11 triggers resize event automatically
window.addEventListener('resize', () => handleResize(false));

// F11 keydown fallback (some browsers don't fire resize on F11)
window.addEventListener('keydown', (e) => {
    if (e.key === 'F11' || e.keyCode === 122) {
        setTimeout(() => handleResize(true), 100);
        setTimeout(() => handleResize(true), 500);
    }
});

// ResizeObserver as another fallback for viewport changes
if (typeof ResizeObserver !== 'undefined') {
    try {
        const ro = new ResizeObserver(() => handleResize(false));
        ro.observe(document.documentElement);
    } catch (e) {}
}

// MutationObserver: detect Yandex sticky banner being added to body
try {
    let _bannerCheckPending = false;
    const _bannerObserver = new MutationObserver(() => {
        if (_bannerCheckPending) return;
        _bannerCheckPending = true;
        setTimeout(() => {
            _bannerCheckPending = false;
            // Only act if game is running and banner just appeared
            if (gameScreen.style.display === 'block') {
                applyLockedGameViewport();
            }
        }, 200);
    });
    _bannerObserver.observe(document.body, { childList: true, subtree: false });
} catch (e) {}

// ===== YANDEX GAMES: Pause/mute on tab visibility change =====
let _autoPausedByVisibility = false;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab hidden — pause music, mark auto-paused
        if (bgMusicPlaying) {
            pauseBgMusic();
            _autoPausedByVisibility = true;
        }
        try {
            if (ysdk?.features?.GameplayAPI && !gamePaused && !gameOver) {
                ysdk.features.GameplayAPI.stop();
            }
        } catch (e) {}
    } else {
        // Tab visible — resume if was auto-paused
        if (_autoPausedByVisibility && soundEnabled && !gamePaused && !gameOver) {
            resumeBgMusic();
        }
        _autoPausedByVisibility = false;
        try {
            if (ysdk?.features?.GameplayAPI && !gamePaused && !gameOver) {
                ysdk.features.GameplayAPI.start();
            }
        } catch (e) {}
    }
});
