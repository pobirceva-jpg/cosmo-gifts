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
// Загрузка баланса и wallet (обнови loadWallet)
window.loadWallet = async (userId) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('wallet_address, balance')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error("Ошибка загрузки:", error);
    document.getElementById('wallet-status').innerText = 'Кошелёк не подключён';
    document.getElementById('user-balance').innerText = '0 TON';
  } else {
    const wallet = data?.wallet_address || 'не подключён';
    const balance = data?.balance || 0;
    document.getElementById('wallet-status').innerText = `Кошелёк: ${wallet.slice(0,6)}...`;
    document.getElementById('user-balance').innerText = `${balance} TON`;
  }
};

// Функция для обновления баланса в DB (используй для операций: покупка, награда, ставка)
window.updateBalance = async (userId, amount) => {  // amount >0 для прибавки, <0 для вычета
  const { data: current } = await supabase
    .from('accounts')
    .select('balance')
    .eq('user_id', userId)
    .single();

  const newBalance = (current?.balance || 0) + amount;

  if (newBalance < 0) {
    throw new Error('Недостаточно средств');
  }

  const { error } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('user_id', userId);

  if (error) throw error;
  return newBalance;
};

// Симуляция пополнения (позже замени на реальное sendTransaction)
window.deposit = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Сначала войди');

  const amount = parseFloat(prompt('Сумма пополнения (TON):'));
  if (isNaN(amount) || amount <= 0) return alert('Неверная сумма');

  try {
    // Симуляция: просто обнови DB
    const newBalance = await updateBalance(user.id, amount);
    document.getElementById('user-balance').innerText = `${newBalance} TON`;
    alert(`Баланс пополнен на ${amount} TON!`);

    // Реальное пополнение: раскомментируй и настрой мастер-адрес
    // const transaction = {
    //   validUntil: Math.floor(Date.now() / 1000) + 60,
    //   messages: [{ address: 'ВАШ_МАСТЕР_АДРЕС', amount: (amount * 1e9).toString() }]  // в наноTON
    // };
    // await window.tonConnectUI.sendTransaction(transaction);
    // // Затем backend подтвердит и вызовет updateBalance
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
};

// Симуляция вывода (позже замени на реальный запрос к backend)
window.withdraw = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Сначала войди');

  const amount = parseFloat(prompt('Сумма вывода (TON):'));
  if (isNaN(amount) || amount <= 0) return alert('Неверная сумма');

  try {
    // Симуляция: обнови DB
    const newBalance = await updateBalance(user.id, -amount);
    document.getElementById('user-balance').innerText = `${newBalance} TON`;
    alert(`Вывод ${amount} TON успешен!`);

    // Реальный вывод: отправь запрос на Edge Function
    // const { error } = await supabase.functions.invoke('withdraw-ton', {
    //   body: { userId: user.id, amount }
    // });
    // if (error) throw error;
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
};