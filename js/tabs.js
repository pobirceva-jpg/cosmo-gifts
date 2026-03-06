// tabs.js — переключение вкладок

console.log("tabs.js начал загружаться");

document.addEventListener('DOMContentLoaded', function () {
  console.log("DOM полностью загружен → привязываем события к вкладкам");

  const navItems = document.querySelectorAll('.nav-item');
  console.log(`Найдено пунктов навигации: ${navItems.length}`);

  navItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault(); // на всякий случай

      const tabId = this.getAttribute('data-tab');
      console.log(`Клик по вкладке: ${tabId}`);

      if (!tabId) {
        console.warn("У элемента нет data-tab");
        return;
      }

      // снимаем active со всех
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });

      document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
      });

      // активируем нужную вкладку
      const targetTab = document.getElementById(tabId);
      if (targetTab) {
        targetTab.classList.add('active');
        console.log(`Открыта вкладка: ${tabId}`);
      } else {
        console.error(`Вкладка ${tabId} не найдена`);
      }

      // активируем кнопку внизу
      this.classList.add('active');
    });
  });

  console.log("События клика на вкладки успешно привязаны");
});