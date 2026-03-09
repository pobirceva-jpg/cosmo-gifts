console.log("intro.js загружен — интро отключено");

// Все переменные оставляем на месте
const video = document.getElementById('intro-video');
const overlay = document.getElementById('start-overlay');
const blackout = document.getElementById('blackout');
const welcome = document.getElementById('welcome');
const introDiv = document.getElementById('intro');
const mainApp = document.getElementById('main-app');

// Функция запуска видео — теперь ничего не делает
function startVideo() {
  console.log("Интро отключено — startVideo не запускается");
  // Если захочешь включить обратно — раскомментируй ниже
  // if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  // video.currentTime = 0;
  // video.play().catch(() => {});
}

// Если оверлей всё ещё есть — скрываем его
if (overlay) {
  overlay.style.display = 'none';
  overlay.style.pointerEvents = 'none';
}

// Отключаем события
// overlay.removeEventListener('click', startVideo); // если нужно

// Отключаем timeupdate и ended
if (video) {
  video.removeEventListener('timeupdate', () => {});
  video.removeEventListener('ended', () => {});
}

// Сразу показываем основной контент (если ещё не показан)
if (mainApp) {
  mainApp.style.opacity = '1';
  console.log("Основной контент показан сразу");
}

// Если нужно включить интро обратно — раскомментируй эту строку:
// overlay.addEventListener('click', startVideo);