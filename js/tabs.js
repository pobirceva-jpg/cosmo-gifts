document.addEventListener('DOMContentLoaded', function () {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();

      const tabId = this.getAttribute('data-tab');

      if (!tabId) {
        return;
      }

      // Снимаем active со всех вкладок
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });

      // Снимаем active со всех пунктов навигации
      document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
      });

      // Активируем целевую вкладку
      const targetTab = document.getElementById(tabId);
      if (targetTab) {
        targetTab.classList.add('active');
      }

      // Активируем текущий пункт навигации
      this.classList.add('active');
    });
  });
});