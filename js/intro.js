console.log("intro.js загружен");

const video = document.getElementById('intro-video');
const overlay = document.getElementById('start-overlay');
const blackout = document.getElementById('blackout');
const welcome = document.getElementById('welcome');
const introDiv = document.getElementById('intro');
const mainApp = document.getElementById('main-app');

function startVideo() {
  console.log("Клик — запускаем видео");

  // Удаляем оверлей сразу
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
    console.log("Оверлей удалён");
  }

  video.currentTime = 0;
  video.play()
    .then(() => console.log("Видео запущено"))
    .catch(err => {
      console.error("Ошибка play:", err);
      showMainContent(); // на случай ошибки показываем контент
    });
}

overlay.addEventListener('click', startVideo);

video.addEventListener('timeupdate', () => {
  if (video.duration && video.currentTime >= video.duration - 0.4) {
    console.log("Почти конец видео — затемняем");
    blackout.style.opacity = '1';
  }
});

video.addEventListener('ended', () => {
  console.log("Видео закончилось");

  setTimeout(() => {
    blackout.style.opacity = '0';
    welcome.style.opacity = '1';

    setTimeout(() => {
      welcome.style.opacity = '0';

      // Полностью удаляем ненужные слои
      if (introDiv && introDiv.parentNode) {
        introDiv.parentNode.removeChild(introDiv);
        console.log("Интро полностью удалено");
      }
      if (blackout && blackout.parentNode) {
        blackout.parentNode.removeChild(blackout);
        console.log("#blackout удалён — клики теперь свободны");
      }
      if (welcome && welcome.parentNode) {
        welcome.parentNode.removeChild(welcome);
      }

      setTimeout(() => {
        mainApp.style.opacity = '1';
        console.log("Главный экран показан");
      }, 1200);
    }, 2000);
  }, 100);
});

// Функция на случай, если видео не запустилось
function showMainContent() {
  console.log("Экстренный показ основного контента");
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  if (introDiv && introDiv.parentNode) introDiv.parentNode.removeChild(introDiv);
  if (blackout && blackout.parentNode) blackout.parentNode.removeChild(blackout);
  if (welcome && welcome.parentNode) welcome.parentNode.removeChild(welcome);
  mainApp.style.opacity = '1';
}