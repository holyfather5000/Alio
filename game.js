"use strict";

function detectTouchDevice() {
try {
const params = new URLSearchParams(location.search);
const forceMobile = params.get('mobile') === '1' || params.get('forceMobile') === '1';
const hasOntouch = ('ontouchstart' in window);
const maxTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
const coarsePointer = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
const uaMobile = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
return !!(forceMobile || hasOntouch || maxTouch || coarsePointer || uaMobile);
} catch (e) { return false; }
}
const isTouchDevice = detectTouchDevice();
if (isTouchDevice) document.documentElement.classList.add('is-touch');

if (isTouchDevice) {
try {
const desktopCards = document.querySelectorAll('.controls-card');
desktopCards.forEach(c => c.style.display = 'none');
const mobileCards = document.querySelectorAll('.controls-card-mobile');
mobileCards.forEach(c => c.style.display = 'block');
const pb = document.getElementById('pause-btn'); if (pb) pb.textContent = 'Pause';
const mp = document.getElementById('mobile-pause-btn'); if (mp) mp.textContent = 'Pause';
} catch (e) { }
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const earthImg = new Image();
earthImg.src = 'assets/img/earth.png';
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");
const pauseBtn = document.getElementById("pause-btn");
const playBtn = document.getElementById("play-btn");
const startOverlay = document.getElementById("start-overlay");
const muteBtn = document.getElementById("mute-btn");
const muteIconUnmuted = document.getElementById("mute-icon-unmuted");
const muteIconMuted = document.getElementById("mute-icon-muted");
const muteBtnInline = document.getElementById("mute-btn-inline");
const muteIconUnmutedInline = muteBtnInline ? muteBtnInline.querySelector('.mute-icon-unmuted') : null;
const muteIconMutedInline = muteBtnInline ? muteBtnInline.querySelector('.mute-icon-muted') : null;
const W = canvas.width;
const H = canvas.height;

// --- RESPONSIVE SCALING FOR IPHONE SE / MOBILE ---
function resizeCanvas() {
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
const targetRatio = W / H;

let newWidth = windowWidth;
if (typeof isTouchDevice !== 'undefined' && isTouchDevice) {
newWidth = Math.min(windowWidth * 0.98, 560);
if (newWidth < 300) newWidth = 300;
}
let newHeight = newWidth / targetRatio;
let controlReserve = (typeof isTouchDevice !== 'undefined' && isTouchDevice) ? 55 : 0;
if ((typeof isTouchDevice !== 'undefined' && isTouchDevice) && windowWidth <= 380) {
controlReserve = 65; // Optimized fit for small screens like iPhone SE
}
const availHeight = Math.max(windowHeight * 0.70, windowHeight - 90 - controlReserve);
if (newHeight > availHeight) {
newHeight = availHeight;
newWidth = Math.floor(newHeight * targetRatio);
}
canvas.style.width = `${newWidth}px`;
canvas.style.height = `${newHeight}px`;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- WEB AUDIO API SOUND & MUSIC SYSTEM ---
let audioCtx = null;
let musicVolume = 0.5; // Starts at 50% volume
let isMuted = false;
let preMuteMasterVol = 1.0;
let preMuteMusicVol = 0.5;
let currentTrack = null;
const tracks = {
rampage: new Audio('assets/mp3/rampage.mp3'),
bossFinal: new Audio('assets/mp3/gp-boss-final.mp3')
};
const trackNodes = {};

function initAudio() {
if (!audioCtx) {
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
}

function initMusicSystem() {
initAudio();
if (Object.keys(trackNodes).length > 0) return;
Object.keys(tracks).forEach(key => {
const audio = tracks[key];
audio.loop = true;
const source = audioCtx.createMediaElementSource(audio);
const gainNode = audioCtx.createGain();
gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
source.connect(gainNode);
gainNode.connect(audioCtx.destination);
trackNodes[key] = { audio, gainNode };
});
}

function playMusicTrack(targetTrackKey, fadeDuration = 1.2) {
if (!audioCtx) initAudio();
if (audioCtx.state === 'suspended') {
audioCtx.resume().then(() => {}).catch(err => {});
}
initMusicSystem();
const now = audioCtx.currentTime;
if (currentTrack === targetTrackKey) {
const node = trackNodes[targetTrackKey];
if (node && node.audio.paused) {
node.audio.play().catch(e => console.log("Audio play blocked by browser:", e));
node.gainNode.gain.cancelScheduledValues(now);
node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, now);
node.gainNode.gain.linearRampToValueAtTime(musicVolume, now + fadeDuration);
}
return;
}
currentTrack = targetTrackKey;
Object.keys(trackNodes).forEach(key => {
const { audio, gainNode } = trackNodes[key];
gainNode.gain.cancelScheduledValues(now);
if (key === targetTrackKey) {
if (audio.paused) {
audio.play().catch(e => console.log("Audio play blocked by browser:", e));
}
gainNode.gain.setValueAtTime(gainNode.gain.value, now);
gainNode.gain.linearRampToValueAtTime(musicVolume, now + fadeDuration);
} else {
gainNode.gain.setValueAtTime(gainNode.gain.value, now);
gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
}
});
}

function toggleMute() {
isMuted = !isMuted;
if (isMuted) {
preMuteMasterVol = masterVolume;
preMuteMusicVol = musicVolume;
masterVolume = 0;
musicVolume = 0;
if (muteIconUnmuted) muteIconUnmuted.classList.add('hidden');
if (muteIconMuted) muteIconMuted.classList.remove('hidden');
if (muteIconUnmutedInline) muteIconUnmutedInline.classList.add('hidden');
if (muteIconMutedInline) muteIconMutedInline.classList.remove('hidden');
} else {
masterVolume = preMuteMasterVol > 0 ? preMuteMasterVol : 1.0;
musicVolume = preMuteMusicVol > 0 ? preMuteMusicVol : 0.5;
if (muteIconUnmuted) muteIconUnmuted.classList.remove('hidden');
if (muteIconMuted) muteIconMuted.classList.add('hidden');
if (muteIconUnmutedInline) muteIconUnmutedInline.classList.remove('hidden');
if (muteIconMutedInline) muteIconMutedInline.classList.add('hidden');
}
const settingSound = document.getElementById('setting-sound-range');
const settingMusic = document.getElementById('setting-music-range');
if (settingSound) settingSound.value = Math.round(masterVolume * 100);
if (settingMusic) settingMusic.value = Math.round(musicVolume * 100);

if (currentTrack && trackNodes[currentTrack] && audioCtx) {
const now = audioCtx.currentTime;
trackNodes[currentTrack].gainNode.gain.cancelScheduledValues(now);
trackNodes[currentTrack].gainNode.gain.setValueAtTime(musicVolume, now);
}
}

if (muteBtn) {
muteBtn.addEventListener('click', toggleMute);
}
if (muteBtnInline) {
muteBtnInline.addEventListener('click', toggleMute);
}

function playSound(type) {
if (!audioCtx || !soundEnabled) return;
const now = audioCtx.currentTime;
if (type === 'laser') {
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(880, now);
osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
gain.gain.setValueAtTime(0.15 * masterVolume, now);
gain.gain.linearRampToValueAtTime(0.01 * masterVolume, now + 0.12);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(now);
osc.stop(now + 0.12);
} else if (type === 'power_laser') {
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = 'square';
osc.frequency.setValueAtTime(1200, now);
osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
gain.gain.setValueAtTime(0.2 * masterVolume, now);
gain.gain.linearRampToValueAtTime(0.01 * masterVolume, now + 0.18);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(now);
osc.stop(now + 0.18);
} else if (type === 'enemy_laser') {
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = 'triangle';
osc.frequency.setValueAtTime(300, now);
osc.frequency.linearRampToValueAtTime(120, now + 0.15);
gain.gain.setValueAtTime(0.12 * masterVolume, now);
gain.gain.linearRampToValueAtTime(0.01 * masterVolume, now + 0.15);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(now);
osc.stop(now + 0.15);
} else if (type === 'hit') {
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = 'square';
osc.frequency.setValueAtTime(220, now);
osc.frequency.linearRampToValueAtTime(60, now + 0.08);
gain.gain.setValueAtTime(0.15 * masterVolume, now);
gain.gain.linearRampToValueAtTime(0.01 * masterVolume, now + 0.08);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(now);
osc.stop(now + 0.08);
} else if (type === 'explosion') {
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(120, now);
osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
gain.gain.setValueAtTime(0.3 * masterVolume, now);
gain.gain.linearRampToValueAtTime(0.01 * masterVolume, now + 0.35);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(now);
osc.stop(now + 0.35);
} else if (type === 'powerup') {
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = 'sine';
osc.frequency.setValueAtTime(400, now);
osc.frequency.linearRampToValueAtTime(800, now + 0.25);
gain.gain.setValueAtTime(0.25 * masterVolume, now);
gain.gain.linearRampToValueAtTime(0.01 * masterVolume, now + 0.25);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(now);
osc.stop(now + 0.25);
} else if (type === '1up') {
const notes = [330, 392, 659, 523, 587, 784];
notes.forEach((freq, idx) => {
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = 'sine';
osc.frequency.setValueAtTime(freq, now + idx * 0.05);
gain.gain.setValueAtTime(0.2 * masterVolume, now + idx * 0.05);
gain.gain.linearRampToValueAtTime(0.01 * masterVolume, now + idx * 0.05 + 0.08);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(now + idx * 0.05);
osc.stop(now + idx * 0.05 + 0.08);
});
}
}

// --- GAME ENGINE STATE ---
const keys = {};
let gameStarted = false;
let score = 0;
let wave = 1;
let lives = 3;
let gameOver = false;
let isPaused = false;
let waveClearTimer = 0;
let fadeBulletsTimer = 0;
let lastTime = 0;
let enemyShootTimer = 0;
let playerShotCooldown = 0;
let powerShots = 0;
let unlockedLaser = false;
let showUnlockOverlay = false;
let unlockTimer = 0;
let unlockDuration = 2.6;
let showWinOverlay = false;
let laserUnlockShown = false;
let testingSkipEnabled = true;
let nextEnemyId = 1;
let stars = [];
let enemies = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let confetti = [];
let player;
const touchScaleFactor = isTouchDevice ? 1.18 : 1;
let stats = { highScore: 0, gamesPlayed: 0, wins: 0, bestWave: 0, totalScore: 0 };
let statsUpdated = false;
let soundEnabled = true;
let touchFireEnabled = true;
let prevPaused = false;
let masterVolume = 1.0;

function loadStats() {
try {
const raw = localStorage.getItem('alienSmasherStats');
if (raw) {
const parsed = JSON.parse(raw);
stats = Object.assign(stats, parsed || {});
}
} catch (err) { }
updateStatsUI();
}
function saveStats() {
try { localStorage.setItem('alienSmasherStats', JSON.stringify(stats)); } catch (e) {}
}
function finalizeStats(win) {
if (statsUpdated) return;
stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
if (win) stats.wins = (stats.wins || 0) + 1;
stats.totalScore = (stats.totalScore || 0) + (score || 0);
stats.bestWave = Math.max(stats.bestWave || 0, wave || 0);
stats.highScore = Math.max(stats.highScore || 0, score || 0);
statsUpdated = true;
saveStats();
updateStatsUI();
}
function updateStatsUI() {
const hs = document.getElementById('highscore'); if (hs) hs.textContent = stats.highScore || 0;
const sg = document.getElementById('stat-games'); if (sg) sg.textContent = stats.gamesPlayed || 0;
const sw = document.getElementById('stat-wins'); if (sw) sw.textContent = stats.wins || 0;
const sb = document.getElementById('stat-bestwave'); if (sb) sb.textContent = stats.bestWave || 0;
const sh = document.getElementById('stat-high'); if (sh) sh.textContent = stats.highScore || 0;
}

for (let i = 0; i < 130; i++) {
stars.push({
x: Math.random() * W,
y: Math.random() * H,
r: Math.random() * 1.7 + .3,
speed: Math.random() * 25 + 8,
alpha: Math.random() * .7 + .2
});
}

function startGame() {
initAudio();
initMusicSystem();
gameStarted = true;
startOverlay.classList.add("hidden");
resetGame();
}

function resetGame() {
score = 0;
wave = 1;
lives = 3;
gameOver = false;
isPaused = false;
waveClearTimer = 0;
fadeBulletsTimer = 0;
enemyShootTimer = 0;
playerShotCooldown = 0;
powerShots = 0;
unlockedLaser = false;
bullets = [];
enemyBullets = [];
particles = [];
confetti = [];
showWinOverlay = false;
laserUnlockShown = false;
const winEl = document.getElementById('win-overlay'); if (winEl) winEl.classList.add('hidden');
const finalEl = document.getElementById('final-overlay'); if (finalEl) finalEl.classList.add('hidden');
const unlockEl = document.getElementById('unlock-overlay'); if (unlockEl) unlockEl.classList.add('hidden');
enemies = [];
const playerScale = isTouchDevice ? 1.18 : 1;
player = {
x: W / 2,
y: H - 85,
width: 38 * playerScale,
height: 30 * playerScale,
speed: 450,
invincible: 0
};
createWave();
updateHUD();
statsUpdated = false;
pauseBtn.textContent = "Pause (P)";
const mpBtn = document.getElementById('mobile-pause-btn'); if (mpBtn) mpBtn.textContent = 'Pause';
}

function togglePause() {
if (gameOver || !gameStarted) return;
isPaused = !isPaused;
pauseBtn.textContent = isPaused ? "Resume (R)" : "Pause (P)";
const mp = document.getElementById('mobile-pause-btn'); if (mp) mp.textContent = isPaused ? 'Resume' : 'Pause';
}

function updateHUD() {
scoreEl.textContent = score;
waveEl.textContent = wave;
livesEl.textContent = lives;
const hs = document.getElementById('highscore'); if (hs) hs.textContent = stats.highScore || 0;
}

function createWave() {
enemies = [];
const isBossWave = wave % 5 === 0;
if (isBossWave && wave / 5 === 6) {
playMusicTrack('bossFinal');
} else {
playMusicTrack('rampage');
}
const mobileEnemyScale = isTouchDevice ? 1.18 : 1;
if (isBossWave) {
const bossTier = wave / 5;
let hp = 10 + bossTier * 8;
if (bossTier === 6) hp = hp * 2;
// Level 30 Final Boss size is set smaller than levels 5, 10, 15, 20, 25
const baseBossSize = (bossTier === 6) ? 56 : Math.min(88, 64 + bossTier * 5);
const size = baseBossSize * mobileEnemyScale;
enemies.push({
x: W / 2,
y: 140,
baseX: W / 2,
id: nextEnemyId++,
row: 0,
col: 0,
size: size,
boss: true,
bossTier: bossTier,
miniBoss: false,
hp: hp,
maxHp: hp,
alive: true,
phase: 0,
dive: false,
diveT: 0,
diveDir: 1,
hitTimer: 0,
heartsSpawned: 0
});
if (bossTier === 2) {
enemies.push({
x: W / 2,
y: 220,
baseX: W / 2,
id: nextEnemyId++,
row: 1,
col: 0,
size: 42 * mobileEnemyScale,
boss: false,
miniBoss: true,
hp: 3,
maxHp: 3,
alive: true,
phase: Math.PI / 2,
dive: false,
diveT: 0,
diveDir: 1,
hitTimer: 0
});
} else if (bossTier >= 3) {
enemies.push({
x: W / 2 - 160,
y: 180,
baseX: W / 2 - 160,
id: nextEnemyId++,
row: 1,
col: 0,
size: 42 * mobileEnemyScale,
boss: false,
miniBoss: true,
hp: 3,
maxHp: 3,
alive: true,
phase: Math.PI / 2,
dive: false,
diveDir: -1,
hitTimer: 0
});
enemies.push({
x: W / 2 + 160,
y: 180,
baseX: W / 2 + 160,
id: nextEnemyId++,
row: 1,
col: 1,
size: 42 * mobileEnemyScale,
boss: false,
miniBoss: true,
hp: 3,
maxHp: 3,
alive: true,
phase: Math.PI,
dive: false,
diveDir: 1,
hitTimer: 0
});
}
} else {
const regularCount = Math.min(20, 8 + Math.floor((wave - 1) * 1.2));
const cols = 5;
const spacingX = 92;
const startX = W / 2 - ((cols - 1) * spacingX) / 2;
const rows = Math.ceil(regularCount / cols);
const hasMiniBosses = wave >= 10;
const miniBossIndexes = hasMiniBosses ? [0, Math.min(regularCount - 1, cols - 1)] : [];
for (let i = 0; i < regularCount; i++) {
const row = Math.floor(i / cols);
const col = i % cols;
const x = startX + col * spacingX;
const y = 105 + row * 62;
const isMini = miniBossIndexes.includes(i);
const isPurple = (!isMini && wave > 4 && Math.random() < 0.10);
const hp = isMini ? 3 : (isPurple ? 2 : 1);
const baseSize = isMini ? 42 : 42;
enemies.push({
id: nextEnemyId++,
x: x,
y: y,
baseX: x,
row: row,
col: col,
size: baseSize * mobileEnemyScale,
boss: false,
miniBoss: isMini,
returning: false,
returnT: 0,
returnDuration: 0.8,
returnStartX: x,
returnStartY: y,
purple: isPurple,
hp: hp,
maxHp: hp,
alive: true,
phase: Math.random() * Math.PI * 2,
dive: false,
diveT: 0,
diveDir: Math.random() < .5 ? -1 : 1,
hitTimer: 0,
fastShooter: (wave > 3) && (row === rows - 1)
});
}
}
}

function shootPlayer() {
if (!gameStarted || playerShotCooldown > 0 || gameOver || isPaused) return;
if (bullets.length >= 5) return;
const isPowered = powerShots > 0;
if (isPowered) powerShots--;
if (unlockedLaser) {
const laserMultiplier = isTouchDevice ? 1.15 : 1;
bullets.push({
x: player.x,
y: player.y - 22,
vx: 0,
vy: -720,
radius: 3 * laserMultiplier,
laser: true,
length: 48 * laserMultiplier
});
playSound('power_laser');
playerShotCooldown = 0.08;
} else {
bullets.push({
x: player.x,
y: player.y - 22,
vx: 0,
vy: -720,
radius: (isPowered ? 8 : 4) * (isTouchDevice ? 1.15 : 1),
powered: isPowered
});
playSound(isPowered ? 'power_laser' : 'laser');
playerShotCooldown = 0.15;
}
updateHUD();
}

function shootEnemy(enemy) {
if (!enemy.alive) return;
if (enemy.y < 0 || enemy.x < 0 || enemy.x > W) return;

const bulletSpeed = 200 + wave * 10;
if (enemy.boss) {
const canSpawnHeart = (enemy.heartsSpawned || 0) < 5;
const isHeartShot = canSpawnHeart && (Math.random() < 0.05);
if (isHeartShot) {
enemy.heartsSpawned = (enemy.heartsSpawned || 0) + 1;
enemyBullets.push({
x: enemy.x,
y: enemy.y + enemy.size / 2,
vx: 0,
vy: bulletSpeed * 0.8,
radius: 14 * (isTouchDevice ? 1.15 : 1),
alpha: 1,
isHeart: true,
ownerId: enemy.id
});
} else {
const tier = enemy.bossTier || Math.max(1, Math.floor(wave / 5));
const baseCount = 3;
const extra = Math.max(0, tier - 2);
const desired = baseCount + extra;
const existing = enemyBullets.filter(b => b.ownerId === enemy.id).length;
const allowed = Math.max(0, 4 - existing);
const count = Math.min(desired, allowed);
const spacing = 40;
const start = -((count - 1) / 2) * spacing;
for (let i = 0; i < count; i++) {
const offsetX = start + i * spacing;
const vx = (offsetX / spacing) * 50;
const vy = bulletSpeed + Math.abs(vx) * 0.5;
enemyBullets.push({ x: enemy.x + offsetX, y: enemy.y + enemy.size / 2, vx: vx, vy: vy, radius: 8 * (isTouchDevice ? 1.15 : 1), alpha: 1, isHeart: false, ownerId: enemy.id });
}
}
} else if (enemy.miniBoss) {
enemyBullets.push({ x: enemy.x - 12, y: enemy.y + enemy.size / 2, vx: -20, vy: bulletSpeed, radius: 7 * (isTouchDevice ? 1.15 : 1), alpha: 1, isHeart: false, tint: 'mini', ownerId: enemy.id });
enemyBullets.push({ x: enemy.x + 12, y: enemy.y + enemy.size / 2, vx: 20, vy: bulletSpeed, radius: 7 * (isTouchDevice ? 1.15 : 1), alpha: 1, isHeart: false, tint: 'mini', ownerId: enemy.id });
} else {
const regularBullet = { x: enemy.x, y: enemy.y + enemy.size / 2, vx: 0, vy: bulletSpeed, radius: 7 * (isTouchDevice ? 1.15 : 1), alpha: 1, isHeart: false };
if (enemy.fastShooter) {
regularBullet.tint = 'back';
regularBullet.vy = bulletSpeed + 40;
}
regularBullet.ownerId = enemy.id;
enemyBullets.push(regularBullet);
}
playSound('enemy_laser');
}

function chooseShooter() {
const livingOnScreen = enemies.filter(e => e.alive && e.y >= 0 && e.x >= 0 && e.x <= W);
if (!livingOnScreen.length) return;
const fast = livingOnScreen.filter(e => e.fastShooter);
let shooter;
if (fast.length && Math.random() < 0.7) {
shooter = fast[Math.floor(Math.random() * fast.length)];
} else {
shooter = livingOnScreen[Math.floor(Math.random() * livingOnScreen.length)];
}
shootEnemy(shooter);
}

function spawnExplosion(x, y, amount = 14) {
for (let i = 0; i < amount; i++) {
const a = Math.random() * Math.PI * 2;
const speed = Math.random() * 180 + 60;
particles.push({
x, y,
vx: Math.cos(a) * speed,
vy: Math.sin(a) * speed,
life: Math.random() * .55 + .3,
maxLife: .85,
size: Math.random() * 3 + 1
});
}
}

function spawnConfetti(amount = 120) {
confetti = [];
const colors = ['#ff4d6d','#ffd166','#7ee787','#9ad0ff','#ff99cc'];
for (let i = 0; i < amount; i++) {
confetti.push({
x: Math.random() * W,
y: -Math.random() * 80,
vx: (Math.random() - 0.5) * 160,
vy: Math.random() * 140 + 60,
size: Math.random() * 8 + 6,
angle: Math.random() * Math.PI * 2,
va: (Math.random() - 0.5) * 6,
color: colors[Math.floor(Math.random() * colors.length)],
life: Math.random() * 4 + 2
});
}
}

function updateConfetti(dt) {
for (const c of confetti) {
c.x += c.vx * dt;
c.y += c.vy * dt;
c.vy += 300 * dt;
c.angle += c.va * dt;
c.life -= dt;
}
confetti = confetti.filter(c => c.life > 0 && c.y < H + 200);
}

function drawConfetti() {
for (const c of confetti) {
ctx.save();
ctx.translate(c.x, c.y);
ctx.rotate(c.angle);
ctx.fillStyle = c.color;
ctx.fillRect(-c.size/2, -c.size/2, c.size, c.size*0.6);
ctx.restore();
}
}

function circleHit(a, b, radius) {
return Math.hypot(a.x - b.x, a.y - b.y) < radius;
}

function circleRectCollision(circle, rect) {
const rectLeft = rect.x - rect.width / 2;
const rectRight = rect.x + rect.width / 2;
const rectTop = rect.y - rect.height / 2;
const rectBottom = rect.y + rect.height / 2;
const nearestX = Math.max(rectLeft, Math.min(circle.x, rectRight));
const nearestY = Math.max(rectTop, Math.min(circle.y, rectBottom));
const dx = circle.x - nearestX;
const dy = circle.y - nearestY;
const r = (circle.radius || 0) + 2;
return (dx * dx + dy * dy) < (r * r);
}

function damagePlayer() {
if (player.invincible > 0 || gameOver) return;
lives--;
player.invincible = 2.0;
spawnExplosion(player.x, player.y, 22);
playSound('explosion');
updateHUD();
if (lives <= 0) {
gameOver = true;
playMusicTrack('rampage');
finalizeStats(false);
}
}

function update(dt) {
if (!gameStarted || isPaused) return;
for (const s of stars) {
s.y += s.speed * dt;
if (s.y > H) {
s.y = 0;
s.x = Math.random() * W;
}
}
if (gameOver) {
updateParticles(dt);
if (showWinOverlay) updateConfetti(dt);
return;
}
playerShotCooldown = Math.max(0, playerShotCooldown - dt);
player.invincible = Math.max(0, player.invincible - dt);
let direction = 0;
if (keys["ArrowLeft"] || keys["a"] || keys["A"]) direction -= 1;
if (keys["ArrowRight"] || keys["d"] || keys["D"]) direction += 1;
player.x += direction * player.speed * dt;
player.x = Math.max(28, Math.min(W - 28, player.x));
if (keys[" "] || keys["Spacebar"]) shootPlayer();

const formationSpeed = 30 + wave * 3;
const formationOffset = Math.sin(performance.now() / 900) * formationSpeed;

for (const e of enemies) {
if (!e.alive) continue;
if (e.hitTimer > 0) e.hitTimer = Math.max(0, e.hitTimer - dt);
if (e.boss) {
e.x = e.baseX + Math.sin(performance.now() / 700) * (160 + wave * 3);
if (e.bossTier === 6) {
const swoopCycle = Math.sin(performance.now() / 1500);
const swoopOffset = Math.max(0, swoopCycle) * (H * 0.5 - 130);
e.y = 130 + swoopOffset + Math.cos(performance.now() / 1000) * 15;
} else {
e.y = 130 + Math.cos(performance.now() / 1000) * 15;
}
} else if (e.dive) {
e.diveT += dt;
e.x += e.diveDir * (70 + wave * 5) * dt;
e.y += (90 + wave * 6) * dt;
if (e.diveT > 3.0 || e.y > H + 60 || e.x < -60 || e.x > W + 60) {
e.dive = false;
e.diveT = 0;
e.returning = true;
e.returnT = 0;
e.targetX = e.baseX;
e.targetY = 100 + e.row * 58;
e.returnStartX = e.x < 0 ? -20 : (e.x > W ? W + 20 : e.x);
e.returnStartY = e.y > H ? -40 : e.y;
e.returnDuration = 2.8;
}
} else {
if (e.returning) {
e.returnT = Math.min(e.returnDuration, e.returnT + dt);
const tNorm = Math.min(1, e.returnT / e.returnDuration);
const easeFunc = (v) => v * v * (3 - 2 * v);
const v = easeFunc(tNorm);
e.x = e.returnStartX + (e.targetX - e.returnStartX) * v;
e.y = e.returnStartY + (e.targetY - e.returnStartY) * v;

if (e.returnT >= e.returnDuration) {
e.returning = false;
e.returnT = 0;
e.x = e.targetX;
e.y = e.targetY;
}
} else {
const desiredX = e.baseX + formationOffset;
const desiredY = 100 + e.row * 58 + Math.sin(performance.now() / 700 + e.phase) * 3;
const smoothK = Math.min(1, dt * 8);
e.x += (desiredX - e.x) * smoothK;
e.y += (desiredY - e.y) * smoothK;
}
}
if (!e.boss && Math.random() < dt * (0.02 + wave * 0.008)) {
e.dive = true;
e.diveT = 0;
}
}

const allEnemiesDefeated = enemies.every(e => !e.alive);
if (!allEnemiesDefeated) {
enemyShootTimer -= dt;
if (enemyShootTimer <= 0) {
chooseShooter();
const minDelay = Math.max(.25, 1.4 - wave * .05);
enemyShootTimer = minDelay + Math.random() * 0.6;
}
for (const b of enemyBullets) {
b.x += b.vx * dt;
b.y += b.vy * dt;
if (circleRectCollision(b, player)) {
b.y = H + 100;
if (b.isHeart) {
lives++;
playSound('1up');
updateHUD();
} else {
damagePlayer();
}
}
}
enemyBullets = enemyBullets.filter(b => b.y < H + 30 && b.x > -30 && b.x < W + 30);
} else {
fadeBulletsTimer += dt;
for (const b of enemyBullets) {
b.alpha = Math.max(0, 1 - fadeBulletsTimer / 0.6);
}
if (fadeBulletsTimer >= 0.6) {
enemyBullets = [];
}
waveClearTimer += dt;
if (waveClearTimer > 1.2) {
const nextWave = wave + 1;
if (nextWave === 30) {
const finalEl = document.getElementById('final-overlay');
if (finalEl) finalEl.classList.remove('hidden');
isPaused = true;
waveClearTimer = 0;
fadeBulletsTimer = 0;
} else if (wave >= 30) {
showWinOverlay = true;
gameOver = true;
playMusicTrack('rampage');
const winEl = document.getElementById('win-overlay'); if (winEl) winEl.classList.remove('hidden');
spawnConfetti(160);
} else {
wave++;
waveClearTimer = 0;
fadeBulletsTimer = 0;
bullets = [];
enemyBullets = [];
createWave();
updateHUD();
}
}
}

for (const b of bullets) b.y += b.vy * dt;
bullets = bullets.filter(b => b.laser ? (b.y > -(b.length || 0)) : (b.y > -20));
for (const b of bullets) {
for (const e of enemies) {
if (!e.alive) continue;
if (b.laser) {
const laserWidth = 4;
const top = b.y - (b.length || 48);
const bottom = b.y;
const overlapY = (e.y + e.size/2) >= top && (e.y - e.size/2) <= bottom;
if (Math.abs(b.x - e.x) < e.size / 2 + laserWidth / 2 && overlapY) {
e.hp--;
e.hitTimer = 0.08;
if (e.hp <= 0) {
e.alive = false;
score += e.boss ? 1000 : (e.miniBoss ? 300 : 100);
spawnExplosion(e.x, e.y, e.boss ? 40 : (e.miniBoss ? 24 : 13));
playSound('explosion');
if (e.miniBoss) {
powerShots += 5;
playSound('powerup');
}
updateHUD();
} else {
spawnExplosion(e.x, e.y, 5);
playSound('hit');
updateHUD();
}
}
} else {
const hitRadius = e.size * .55;
if (Math.hypot(b.x - e.x, b.y - e.y) < hitRadius + b.radius) {
b.y = -100;
e.hp--;
e.hitTimer = 0.08;
if (e.hp <= 0) {
e.alive = false;
score += e.boss ? 1000 : (e.miniBoss ? 300 : 100);
spawnExplosion(e.x, e.y, e.boss ? 40 : (e.miniBoss ? 24 : 13));
playSound('explosion');
if (e.miniBoss) {
powerShots += 5;
playSound('powerup');
}
updateHUD();
if (e.boss) {
const tier = e.bossTier || Math.max(1, Math.floor(wave / 5));
if (tier === 4) {
if (!laserUnlockShown) {
const unlockEl = document.getElementById('unlock-overlay');
if (unlockEl) unlockEl.classList.remove('hidden');
isPaused = true;
laserUnlockShown = true;
}
}
if (tier === 6) {
showWinOverlay = true;
gameOver = true;
playMusicTrack('rampage');
const winEl = document.getElementById('win-overlay'); if (winEl) winEl.classList.remove('hidden');
spawnConfetti(160);
finalizeStats(true);
}
}
} else {
spawnExplosion(e.x, e.y, 5);
playSound('hit');
updateHUD();
}
break;
}
}
}
}

for (const e of enemies) {
if (e.alive && e.y > H - 130) {
const horizOverlap = Math.abs(e.x - player.x) < (player.width / 2 + e.size / 2 + 6);
e.alive = false;
if (horizOverlap) damagePlayer();
}
}
bullets = bullets.filter(b => b.y > -50);
updateParticles(dt);
}

function updateParticles(dt) {
for (const p of particles) {
p.x += p.vx * dt;
p.y += p.vy * dt;
p.vx *= .985;
p.vy *= .985;
p.life -= dt;
}
particles = particles.filter(p => p.life > 0);
}

function drawStars() {
for (const s of stars) {
ctx.globalAlpha = s.alpha;
ctx.fillStyle = "#d8e6ff";
ctx.beginPath();
ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
ctx.fill();
}
ctx.globalAlpha = 1;
}

function drawPlayer() {
ctx.save();
ctx.translate(player.x, player.y);
let mainColor = "#dbe8ff";
let strokeColor = powerShots > 0 ? "#00e5ff" : "#7188bd";
let coreColor = powerShots > 0 ? "#0066aa" : "#1b3e83";
let wingColor = powerShots > 0 ? "#00f0ff" : "#a9c8ff";
if (player.invincible > 0) {
const flashStep = Math.floor(player.invincible * 18) % 4;
if (flashStep === 0) {
mainColor = "#ff3333";
strokeColor = "#ffffff";
coreColor = "#990000";
wingColor = "#ff9999";
} else if (flashStep === 1) {
mainColor = "#ffff33";
strokeColor = "#ffaa00";
coreColor = "#888800";
wingColor = "#ffffaa";
} else if (flashStep === 2) {
mainColor = "#ffffff";
strokeColor = "#ffffff";
coreColor = "#cccccc";
wingColor = "#ffffff";
} else {
mainColor = "#ff7700";
strokeColor = "#ff3300";
coreColor = "#993300";
wingColor = "#ffbb66";
}
}
ctx.beginPath();
ctx.moveTo(0, -25);
ctx.lineTo(30, 18);
ctx.lineTo(7, 12);
ctx.lineTo(0, 27);
ctx.lineTo(-7, 12);
ctx.lineTo(-30, 18);
ctx.closePath();
ctx.fillStyle = mainColor;
ctx.fill();
ctx.lineWidth = 2;
ctx.strokeStyle = strokeColor;
ctx.stroke();
ctx.beginPath();
ctx.moveTo(0, -18);
ctx.lineTo(10, 10);
ctx.lineTo(0, 7);
ctx.lineTo(-10, 10);
ctx.closePath();
ctx.fillStyle = coreColor;
ctx.fill();
ctx.beginPath();
ctx.moveTo(-13, 17);
ctx.lineTo(-7, 27);
ctx.lineTo(-2, 16);
ctx.closePath();
ctx.fillStyle = wingColor;
ctx.fill();
ctx.beginPath();
ctx.moveTo(13, 17);
ctx.lineTo(7, 27);
ctx.lineTo(2, 16);
ctx.closePath();
ctx.fill();
if (showWinOverlay) {
ctx.strokeStyle = 'rgba(255,255,255,0.95)';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.arc(0, 0, 32, 0, Math.PI * 2);
ctx.stroke();
}
ctx.restore();
}

function drawEnemy(e) {
ctx.save();
ctx.translate(e.x, e.y);
const s = e.size;

let baseFill = "#3f687e";
let strokeFill = "#7fb4c9";
let coreFill = "#5c91a7";

if (e.hitTimer > 0) {
baseFill = "#ff3333";
strokeFill = "#ffffff";
coreFill = "#ffffaa";
} else if (e.boss) {
if (e.bossTier === 6) {
baseFill = "#d93838";
strokeFill = "#ff9999";
coreFill = "#ffea79";
} else {
baseFill = "#a82e5f";
strokeFill = "#ff69b4";
coreFill = "#ffd36b";
}
} else if (e.miniBoss) {
baseFill = "#2e9354";
strokeFill = "#78f0a6";
coreFill = "#a3ffca";
} else if (e.purple) {
baseFill = "#7b3fa8";
strokeFill = "#d499ff";
coreFill = "#e6c2ff";
} else if (e.fastShooter) {
baseFill = "#d97724";
strokeFill = "#ffbc75";
coreFill = "#ffe3a3";
}

ctx.fillStyle = baseFill;
ctx.strokeStyle = strokeFill;
ctx.lineWidth = 2.5;

if (e.boss) {
if (e.bossTier === 6) {
// FINAL BOSS: Advanced sleek O.G. ship variant (smaller than major bosses, larger than standard enemies)
ctx.beginPath();
ctx.moveTo(-s * 0.45, -s * 0.40);
ctx.lineTo(s * 0.45, -s * 0.40);
ctx.lineTo(s * 0.18, s * 0.18);
ctx.lineTo(0, s * 0.48);
ctx.lineTo(-s * 0.18, s * 0.18);
ctx.closePath();
ctx.fill();
ctx.stroke();

// Inner armored hull plate
ctx.beginPath();
ctx.moveTo(-s * 0.28, -s * 0.25);
ctx.lineTo(s * 0.28, -s * 0.25);
ctx.lineTo(s * 0.12, s * 0.15);
ctx.lineTo(-s * 0.12, s * 0.15);
ctx.closePath();
ctx.fillStyle = "#0a0a18";
ctx.fill();
ctx.stroke();

// Advanced side wings & energy pods
ctx.beginPath();
ctx.moveTo(-s * 0.35, -s * 0.2);
ctx.lineTo(-s * 0.62, -s * 0.05);
ctx.lineTo(-s * 0.45, s * 0.32);
ctx.lineTo(-s * 0.22, s * 0.2);
ctx.closePath();
ctx.fillStyle = baseFill;
ctx.fill();
ctx.stroke();

ctx.beginPath();
ctx.moveTo(s * 0.35, -s * 0.2);
ctx.lineTo(s * 0.62, -s * 0.05);
ctx.lineTo(s * 0.45, s * 0.32);
ctx.lineTo(s * 0.22, s * 0.2);
ctx.closePath();
ctx.fill();
ctx.stroke();

// Dual stabilization rear fins
ctx.beginPath();
ctx.moveTo(-s * 0.12, -s * 0.4); ctx.lineTo(-s * 0.22, -s * 0.58); ctx.lineTo(-s * 0.04, -s * 0.42);
ctx.moveTo(s * 0.12, -s * 0.4); ctx.lineTo(s * 0.22, -s * 0.58); ctx.lineTo(s * 0.04, -s * 0.42);
ctx.fillStyle = strokeFill;
ctx.fill();

// Glowing Command Core
ctx.fillStyle = coreFill;
ctx.beginPath();
ctx.arc(0, -s * 0.1, s * 0.14, 0, Math.PI * 2);
ctx.fill();
} else {
// REGULAR BOSSES (Levels 5, 10, 15, 20, 25): Heavy, scaled-up advanced O.G. flagship
ctx.beginPath();
ctx.moveTo(-s * 0.5, -s * 0.44);
ctx.lineTo(s * 0.5, -s * 0.44);
ctx.lineTo(s * 0.2, s * 0.18);
ctx.lineTo(0, s * 0.52);
ctx.lineTo(-s * 0.2, s * 0.18);
ctx.closePath();
ctx.fill();
ctx.stroke();

// Command deck inner cavity
ctx.beginPath();
ctx.moveTo(-s * 0.3, -s * 0.28);
ctx.lineTo(s * 0.3, -s * 0.28);
ctx.lineTo(s * 0.15, s * 0.12);
ctx.lineTo(-s * 0.15, s * 0.12);
ctx.closePath();
ctx.fillStyle = "#020c06";
ctx.fill();
ctx.stroke();

// Advanced side wing extension array
ctx.beginPath();
ctx.moveTo(-s * 0.32, -s * 0.1);
ctx.lineTo(-s * 0.68, s * 0.08);
ctx.lineTo(-s * 0.52, s * 0.42);
ctx.lineTo(-s * 0.2, s * 0.28);
ctx.closePath();
ctx.fillStyle = baseFill;
ctx.fill();
ctx.stroke();

ctx.beginPath();
ctx.moveTo(s * 0.32, -s * 0.1);
ctx.lineTo(s * 0.68, s * 0.08);
ctx.lineTo(s * 0.52, s * 0.42);
ctx.lineTo(s * 0.2, s * 0.28);
ctx.closePath();
ctx.fill();
ctx.stroke();

// Quad front cannon tips
ctx.fillStyle = strokeFill;
ctx.beginPath();
ctx.rect(-s * 0.65, s * 0.08, s * 0.06, s * 0.32);
ctx.rect(-s * 0.48, s * 0.35, s * 0.06, s * 0.22);
ctx.rect(s * 0.59, s * 0.08, s * 0.06, s * 0.32);
ctx.rect(s * 0.42, s * 0.35, s * 0.06, s * 0.22);
ctx.fill();

// Core power matrix
ctx.fillStyle = coreFill;
ctx.beginPath();
ctx.arc(0, -s * 0.25, s * 0.1, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.arc(-s * 0.22, -s * 0.08, s * 0.06, 0, Math.PI * 2);
ctx.arc(s * 0.22, -s * 0.08, s * 0.06, 0, Math.PI * 2);
ctx.fill();
}
} else {
// Standard Regular O.G. Enemy Ships
ctx.beginPath();
ctx.moveTo(-s * 0.48, -s * 0.42);
ctx.lineTo(s * 0.48, -s * 0.42);
ctx.lineTo(0, s * 0.48);
ctx.closePath();
ctx.fill();

ctx.beginPath();
ctx.moveTo(-s * 0.28, -s * 0.25);
ctx.lineTo(s * 0.28, -s * 0.25);
ctx.lineTo(s * 0.18, s * 0.12);
ctx.lineTo(-s * 0.18, s * 0.12);
ctx.closePath();
ctx.fillStyle = "#020c06";
ctx.fill();

ctx.stroke();

if (e.miniBoss) { 
ctx.fillStyle = baseFill;
ctx.beginPath();
ctx.moveTo(-s * 0.35, s * 0.05);
ctx.lineTo(-s * 0.45, s * 0.4);
ctx.lineTo(-s * 0.22, s * 0.25);
ctx.closePath();
ctx.fill(); ctx.stroke();

ctx.beginPath();
ctx.moveTo(s * 0.35, s * 0.05);
ctx.lineTo(s * 0.45, s * 0.4);
ctx.lineTo(s * 0.22, s * 0.25);
ctx.closePath();
ctx.fill(); ctx.stroke();
} else if (e.fastShooter) {
ctx.fillStyle = baseFill;
ctx.beginPath();
ctx.moveTo(-s * 0.32, -s * 0.1);
ctx.lineTo(-s * 0.6, s * 0.05);
ctx.lineTo(-s * 0.2, s * 0.25);
ctx.closePath();
ctx.fill(); ctx.stroke();

ctx.beginPath();
ctx.moveTo(s * 0.32, -s * 0.1);
ctx.lineTo(s * 0.6, s * 0.05);
ctx.lineTo(s * 0.2, s * 0.25);
ctx.closePath();
ctx.fill(); ctx.stroke();
} else if (e.purple) {
ctx.fillStyle = baseFill;
ctx.beginPath();
ctx.arc(0, s * 0.18, s * 0.14, 0, Math.PI * 2);
ctx.fill(); ctx.stroke();
}

ctx.fillStyle = coreFill;
ctx.beginPath();
ctx.arc(0, -s * 0.3, s * 0.08, 0, Math.PI * 2);
ctx.fill();
}

if (e.hp < e.maxHp || e.boss || e.miniBoss) {
ctx.fillStyle = "#1b2030";
ctx.fillRect(-s / 2, -s / 2 - 12, s, 6);
ctx.fillStyle = e.boss ? "#ff3366" : (e.miniBoss ? "#ffaa00" : "#ffbf62");
ctx.fillRect(-s / 2, -s / 2 - 12, s * (e.hp / e.maxHp), 6);
}
ctx.restore();
}

function drawBullets() {
for (const b of bullets) {
ctx.save();
if (b.laser) {
const lw = 4;
const h = b.length || 48;
ctx.fillStyle = "#ff3333";
ctx.shadowBlur = 6;
ctx.shadowColor = "#ff4444";
ctx.fillRect(b.x - lw/2, b.y - h, lw, h);
} else if (b.powered) {
ctx.fillStyle = "#a6f3ff";
ctx.shadowBlur = 14;
ctx.shadowColor = "#00e5ff";
ctx.fillRect(b.x - 5, b.y - 12, 10, 24);
} else {
ctx.fillStyle = "#dcecff";
ctx.shadowBlur = 10;
ctx.shadowColor = "#9bc5ff";
ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
}
ctx.restore();
}
for (const b of enemyBullets) {
ctx.save();
ctx.globalAlpha = b.alpha !== undefined ? b.alpha : 1;
if (b.isHeart) {
ctx.fillStyle = "#ff3366";
ctx.shadowBlur = 15;
ctx.shadowColor = "#ff3366";
ctx.beginPath();
const r = b.radius;
ctx.moveTo(b.x, b.y + r * 0.4);
ctx.bezierCurveTo(b.x, b.y - r * 0.5, b.x - r, b.y - r * 0.5, b.x - r, b.y + r * 0.1);
ctx.bezierCurveTo(b.x - r, b.y + r * 0.6, b.x, b.y + r, b.x, b.y + r);
ctx.bezierCurveTo(b.x, b.y + r, b.x + r, b.y + r * 0.6, b.x + r, b.y + r * 0.1);
ctx.bezierCurveTo(b.x + r, b.y - r * 0.5, b.x, b.y - r * 0.5, b.x, b.y + r * 0.4);
ctx.fill();
} else {
if (b.tint === 'mini') {
ctx.strokeStyle = "rgba(255, 80, 20, 0.6)";
ctx.shadowBlur = 14;
ctx.shadowColor = "#ff4500";
ctx.fillStyle = "#ff7733";
} else if (b.tint === 'back') {
ctx.strokeStyle = "rgba(47,127,69,0.45)";
ctx.shadowBlur = 16;
ctx.shadowColor = "#8fe6a1";
ctx.fillStyle = "#bff5d0";
} else {
ctx.strokeStyle = "rgba(255, 40, 0, 0.4)";
}
ctx.lineWidth = b.radius * 1.5;
ctx.beginPath();
ctx.moveTo(b.x, b.y);
ctx.lineTo(b.x - b.vx * 0.08, b.y - b.vy * 0.08);
ctx.stroke();
if (!b.tint || b.tint === 'mini') {
ctx.shadowBlur = 14;
ctx.shadowColor = b.tint === 'mini' ? "#ff3300" : "#ff0044";
ctx.fillStyle = b.tint === 'mini' ? "#ffcc00" : "#ffff55";
ctx.strokeStyle = b.tint === 'mini' ? "#ff3300" : "#ff0044";
ctx.lineWidth = 3;
} else {
ctx.lineWidth = 2.5;
}
ctx.beginPath();
ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();
}
ctx.restore();
}
}

function drawParticles() {
for (const p of particles) {
ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
ctx.fillStyle = "#ffd36b";
ctx.fillRect(p.x, p.y, p.size, p.size);
}
ctx.globalAlpha = 1;
}

function drawEarth() {
const ex = W / 2;
const ey = H - 120;
const er = 220;
ctx.save();
const g = ctx.createRadialGradient(ex, ey, er * 0.1, ex, ey, er);
g.addColorStop(0, 'rgba(40,160,240,0.18)');
g.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = g;
ctx.beginPath();
ctx.arc(ex, ey, er + 30, 0, Math.PI * 2);
ctx.fill();
if (earthImg.complete && earthImg.naturalWidth > 0) {
ctx.save();
ctx.beginPath();
ctx.arc(ex, ey, er, 0, Math.PI * 2);
ctx.closePath();
ctx.clip();
ctx.drawImage(earthImg, ex - er, ey - er, er * 2, er * 2);
ctx.restore();
ctx.lineWidth = 4;
ctx.strokeStyle = 'rgba(255,255,255,0.06)';
ctx.beginPath();
ctx.arc(ex, ey, er - 2, 0, Math.PI * 2);
ctx.stroke();
}
ctx.restore();
}

function drawOverlay() {
if (!gameStarted || (!gameOver && !isPaused && waveClearTimer <= 0 && !showUnlockOverlay && !showWinOverlay)) return;
ctx.fillStyle = "rgba(2, 4, 12, .75)";
ctx.fillRect(0, 0, W, H);
ctx.textAlign = "center";
ctx.fillStyle = "#ffffff";
if (showWinOverlay) {
return;
}
if (isPaused) {
ctx.font = "bold 44px Arial";
ctx.fillText("GAME PAUSED", W / 2, H / 2 - 20);
ctx.font = "18px Arial";
ctx.fillStyle = "#94a3b8";
if (isTouchDevice) ctx.fillText("Tap Resume to continue", W / 2, H / 2 + 25);
else ctx.fillText("Press P or click Resume to continue", W / 2, H / 2 + 25);
} else if (gameOver) {
ctx.font = "bold 44px Arial";
ctx.fillStyle = "#ef4444";
ctx.fillText("GAME OVER", W / 2, H / 2 - 30);
ctx.font = "18px Arial";
ctx.fillStyle = "#94a3b8";
if (isTouchDevice) ctx.fillText("Tap Play Again", W / 2, H / 2 + 18);
else ctx.fillText("Press R to Play Again", W / 2, H / 2 + 18);
} else if (showUnlockOverlay) {
ctx.font = "bold 34px Arial";
ctx.fillStyle = "#fff3b0";
ctx.fillText("You have unlocked the laser rod!", W / 2, H / 2 - 10);
ctx.font = "16px Arial";
ctx.fillStyle = "#94a3b8";
ctx.fillText("Your shots are now a straight red laser.", W / 2, H / 2 + 22);
} else {
ctx.font = "bold 38px Arial";
ctx.fillStyle = "#38bdf8";
ctx.fillText(wave % 5 === 0 ? "BOSS DEFEATED!" : "WAVE CLEARED", W / 2, H / 2 - 20);
ctx.font = "18px Arial";
ctx.fillStyle = "#94a3b8";
ctx.fillText("Prepare for the next attack...", W / 2, H / 2 + 22);
}
}

function draw() {
ctx.clearRect(0, 0, W, H);
const grad = ctx.createLinearGradient(0, 0, 0, H);
grad.addColorStop(0, "#02040d");
grad.addColorStop(1, "#081126");
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);
const hasFinalBoss = enemies.some(e => e.boss && (e.bossTier === 6)) || showWinOverlay;
drawStars();
if (hasFinalBoss) drawEarth();
if (gameStarted) {
for (const e of enemies) if (e.alive) drawEnemy(e);
drawBullets();
drawPlayer();
drawParticles();
if (showWinOverlay) drawConfetti();
}
ctx.strokeStyle = "rgba(110, 140, 200, .18)";
ctx.beginPath();
ctx.moveTo(0, H - 48);
ctx.lineTo(W, H - 48);
ctx.stroke();
drawOverlay();
}

function loop(timestamp) {
const dt = Math.min(.033, (timestamp - lastTime) / 1000 || 0);
lastTime = timestamp;
update(dt);
draw();
requestAnimationFrame(loop);
}

window.addEventListener("keydown", e => {
keys[e.key] = true;
if (e.key === " " || e.code === "Space") {
e.preventDefault();
shootPlayer();
}
if (e.key === "p" || e.key === "P") togglePause();
if (e.key === "r" || e.key === "R") {
if (gameStarted) resetGame();
}
if (testingSkipEnabled && e.key === '7') {
if (!gameStarted || gameOver || showWinOverlay || isPaused) return;
e.preventDefault();
wave++;
bullets = [];
enemyBullets = [];
createWave();
updateHUD();
}
});
window.addEventListener("keyup", e => {
keys[e.key] = false;
});

function handlePointer(x) {
if (!gameStarted || isPaused) return;
const rect = canvas.getBoundingClientRect();
const scaleX = W / rect.width;
player.x = Math.max(28, Math.min(W - 28, (x - rect.left) * scaleX));
}

canvas.addEventListener("mousemove", e => {
handlePointer(e.clientX);
});
canvas.addEventListener("touchstart", e => {
e.preventDefault();
handlePointer(e.touches[0].clientX);
if (touchFireEnabled) shootPlayer();
}, { passive: false });
canvas.addEventListener("touchmove", e => {
handlePointer(e.touches[0].clientX);
}, { passive: true });
canvas.addEventListener("click", () => shootPlayer());

if (playBtn) {
playBtn.addEventListener("click", () => startGame());
playBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); }, { passive: false });
playBtn.style.touchAction = 'manipulation';
}

pauseBtn.addEventListener("click", togglePause);

const winRestartBtn = document.getElementById('win-restart-btn');
const winOverlayEl = document.getElementById('win-overlay');
if (winRestartBtn) {
winRestartBtn.addEventListener('click', () => {
if (winOverlayEl) winOverlayEl.classList.add('hidden');
showWinOverlay = false;
gameOver = false;
confetti = [];
resetGame();
});
}

const unlockContinueBtn = document.getElementById('unlock-continue-btn');
const unlockOverlayEl = document.getElementById('unlock-overlay');
if (unlockContinueBtn) {
unlockContinueBtn.addEventListener('click', () => {
if (unlockOverlayEl) unlockOverlayEl.classList.add('hidden');
unlockedLaser = true;
isPaused = false;
pauseBtn.textContent = "Pause (P)";
const mpBtn2 = document.getElementById('mobile-pause-btn'); if (mpBtn2) mpBtn2.textContent = 'Pause';
updateHUD();
});
}

const finalStartBtn = document.getElementById('final-start-btn');
const finalOverlayEl = document.getElementById('final-overlay');
if (finalStartBtn) {
finalStartBtn.addEventListener('click', () => {
if (finalOverlayEl) finalOverlayEl.classList.add('hidden');
wave = 30;
bullets = [];
enemyBullets = [];
isPaused = false;
pauseBtn.textContent = "Pause (P)";
const mpBtn = document.getElementById('mobile-pause-btn'); if (mpBtn) mpBtn.textContent = 'Pause';
createWave();
updateHUD();
});
}

const mobileSlider = document.getElementById('mobile-slider');
const mobileFireBtn = document.getElementById('mobile-fire');
const settingsOverlayEl = document.getElementById('settings-overlay');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingSoundRange = document.getElementById('setting-sound-range');
const settingMusicRange = document.getElementById('setting-music-range');
const settingsRestartBtn = document.getElementById('settings-restart-btn');
const topSettingsBtn = document.getElementById('top-settings-btn');

if (topSettingsBtn) {
topSettingsBtn.addEventListener('click', () => {
if (!settingsOverlayEl) return;
prevPaused = isPaused;
isPaused = true;
pauseBtn.textContent = "Resume";
settingsOverlayEl.classList.remove('hidden');
if (settingSoundRange) settingSoundRange.value = Math.round(masterVolume * 100);
if (settingMusicRange) settingMusicRange.value = Math.round(musicVolume * 100);
});
}

if (mobileSlider) {
const updateSliderPosition = (clientX) => {
try {
const rect = mobileSlider.getBoundingClientRect();
const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
mobileSlider.value = String(Math.round(pct * 100));
const targetX = canvas.getBoundingClientRect().left + pct * canvas.getBoundingClientRect().width;
handlePointer(targetX);
} catch (err) {}
};
mobileSlider.value = 50;
mobileSlider.addEventListener('input', function(e){
try{
const rect = canvas.getBoundingClientRect();
const pct = Number(e.target.value) / 100;
const clientX = rect.left + pct * rect.width;
handlePointer(clientX);
}catch(err){}
});
mobileSlider.addEventListener('pointerdown', function(e){ e.preventDefault(); updateSliderPosition(e.clientX); });
mobileSlider.addEventListener('pointermove', function(e){ if (e.pointerType === 'touch' || e.pressure > 0) { e.preventDefault(); updateSliderPosition(e.clientX); } }, { passive: false });
mobileSlider.addEventListener('touchstart', function(e){ e.preventDefault(); updateSliderPosition(e.touches[0].clientX); }, { passive: false });
mobileSlider.addEventListener('touchmove', function(e){ e.preventDefault(); updateSliderPosition(e.touches[0].clientX); }, { passive: false });
}

if (mobileFireBtn) {
mobileFireBtn.addEventListener('pointerdown', function(e){ e.preventDefault(); shootPlayer(); });
mobileFireBtn.addEventListener('touchstart', function(e){ e.preventDefault(); shootPlayer(); }, { passive:false });
}

if (settingsCloseBtn) {
settingsCloseBtn.addEventListener('click', () => {
if (!settingsOverlayEl) return;
settingsOverlayEl.classList.add('hidden');
isPaused = !!prevPaused;
pauseBtn.textContent = isPaused ? "Resume" : "Pause";
const mpBtn = document.getElementById('mobile-pause-btn'); if (mpBtn) mpBtn.textContent = 'Pause';
});
}

if (settingSoundRange) {
settingSoundRange.value = 100;
settingSoundRange.addEventListener('input', (e) => {
masterVolume = Number(e.target.value) / 100;
if (masterVolume > 0 && !audioCtx) initAudio();
});
}

if (settingMusicRange) {
settingMusicRange.value = 50;
settingMusicRange.addEventListener('input', (e) => {
musicVolume = Number(e.target.value) / 100;
if (currentTrack && trackNodes[currentTrack]) {
const now = audioCtx ? audioCtx.currentTime : 0;
if (audioCtx) {
trackNodes[currentTrack].gainNode.gain.setValueAtTime(musicVolume, now);
}
}
});
}

window.addEventListener('click', () => { playMusicTrack('rampage'); }, { once: true });
window.addEventListener('touchstart', () => { playMusicTrack('rampage'); }, { once: true });

if (settingsRestartBtn) {
settingsRestartBtn.addEventListener('click', () => {
resetGame();
if (settingsOverlayEl) settingsOverlayEl.classList.add('hidden');
});
}

requestAnimationFrame(loop);
loadStats();

