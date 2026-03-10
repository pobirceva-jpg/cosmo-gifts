// intro.js — интро отключено

// Все переменные оставляем на месте
const video = document.getElementById('intro-video');
const overlay = document.getElementById('start-overlay');
const blackout = document.getElementById('blackout');
const welcome = document.getElementById('welcome');
const introDiv = document.getElementById('intro');
const mainApp = document.getElementById('main-app');

// Функция запуска видео — ничего не делает
function startVideo() {
  // Интро отключено
}

// Скрываем оверлей
if (overlay) {
  overlay.style.display = 'none';
  overlay.style.pointerEvents = 'none';
}

// Показываем основной контент
if (mainApp) {
  mainApp.style.opacity = '1';
}

// Если нужно включить интро обратно — раскомментируй эту строку:
// overlay.addEventListener('click', startVideo);