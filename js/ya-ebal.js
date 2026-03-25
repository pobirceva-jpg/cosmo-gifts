// Кусок 1/7 — Инициализация (вставь первым)

console.log("ya-ebal.js — чистая версия без конфликтов supabase");

// Инициализация TonConnect с явным bridge (решает большинство ошибок 400)
if (!window.tonConnectUI) {
  window.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://cosmogifts.vercel.app/tonconnect-manifest.json',
    // Явно указываем надёжный bridge
    bridgeUrl: 'https://bridge.tonapi.io/bridge',
    // Дополнительные настройки для стабильности
    enableUniversalLink: true,
    uiPreferences: {
      theme: 'dark'
    }
  });
  console.log("TonConnectUI инициализирован с bridge.tonapi.io");
}

// SUPABASE — используем свою переменную, чтобы не конфликтовать
const SUPABASE_URL = 'https://gsjyskfnhmpcucukwjqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzanlza2ZuaG1wY3VjdWt3anFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzc0NzYsImV4cCI6MjA1NTc1MzQ3Nn0.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ← замени на свой anon key

let mySupabase = null;

if (window.supabase) {
  try {
    mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("mySupabase успешно создан");
  } catch (err) {
    console.error("Ошибка создания mySupabase:", err);
  }
} else {
  console.error("Библиотека @supabase/supabase-js не загружена!");
}

// ====================
// Константы проекта
// ====================
const GAME_DEPOSIT_ADDRESS = 'UQAJ14WtUDaPtSFe8QK b10KI7StBE55eWiK927y-_Yu3xgH7'; // ← замени на свой реальный адрес

const MAX_MULTIPLIER = 15;

// ====================
// Глобальные переменные краш-игры
// ====================
let crashInterval = null;
let currentMultiplier = 1.00;
let crashPoint = 0;
let betAmount = 0;
let hasCashedOut = false;
let ctx = null;
let pastMultipliers = [];
// Кусок 2/7 — Утилиты для графика и истории

function generateCrashPoint() {
  const e = Math.pow(2, 32);
  const h = crypto.getRandomValues(new Uint32Array(1))[0];
  if (h % 33 === 0) return 1.00;
  let point = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.min(point, MAX_MULTIPLIER);
}

function drawGraphAndRocket() {
  if (!ctx) return;
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const progress = Math.min(currentMultiplier / MAX_MULTIPLIER, 1);
  const startX = canvas.width * 0.08;
  const startY = canvas.height * 0.88;
  const endX = canvas.width * (0.08 + progress * 0.82);
  const endY = canvas.height * (0.88 - progress * 0.78);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let i = 0; i <= 100; i++) {
    const ratio = i / 100;
    const x = startX + ratio * (endX - startX);
    let y = startY + ratio * (endY - startY) + Math.sin(ratio * Math.PI * 4) * 18;
    y = Math.max(30, Math.min(y, canvas.height - 30));
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 6;
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ffaa';
  ctx.stroke();

  const tonIcon = document.getElementById('ton-icon');
  if (tonIcon) {
    tonIcon.style.left = `${endX - 35}px`;
    tonIcon.style.bottom = `${canvas.height - endY - 55}px`;
  }
}

function updateHistory() {
  const historyDiv = document.querySelector('.multi-history');
  if (!historyDiv) return;
  historyDiv.innerHTML = '';
  if (pastMultipliers.length === 0) {
    historyDiv.innerHTML = '<span style="color:#aaa; font-size:12px;">Нет крашей</span>';
    return;
  }
  const colors = ['gray', 'purple', 'gray', 'yellow', 'green'];
  pastMultipliers.forEach((mult, i) => {
    const btn = document.createElement('button');
    btn.textContent = mult.toFixed(2) + 'x';
    btn.className = colors[i % colors.length];
    historyDiv.appendChild(btn);
  });
}
// Кусок 3/7 — Функции кошелька

window.connectWallet = async () => {
  if (!window.tonConnectUI) {
    alert('TonConnectUI не загружен. Проверьте скрипт в HTML.');
    return;
  }
  try {
    document.getElementById('wallet-status').innerText = 'Подключение...';
    if (!window.tonConnectUI.connected) {
      await window.tonConnectUI.connectWallet();
    }
    await loadUserAndWallet();
  } catch (err) {
    alert('Ошибка подключения: ' + (err.message || err));
  }
};

window.loadUserAndWallet = async () => {
  if (!mySupabase || !window.tonConnectUI) return;

  const addressSpan = document.getElementById('wallet-address');
  const statusSpan = document.getElementById('wallet-status');
  const balanceSpan = document.getElementById('user-balance');
  const connectBtn = document.getElementById('connect-wallet-btn');

  if (window.tonConnectUI.connected) {
    try {
      const account = window.tonConnectUI.account;
      if (!account?.address) throw new Error('Нет адреса');

      const address = account.address;
      addressSpan.innerText = address.slice(0, 6) + '...' + address.slice(-4);
      statusSpan.innerText = 'Кошелёк подключён';
      connectBtn.style.display = 'none';

      let { data } = await mySupabase
        .from('accounts')
        .select('balance')
        .eq('wallet_address', address)
        .single();

      if (!data) {
        await mySupabase.from('accounts').insert({ wallet_address: address, balance: 0 });
        data = { balance: 0 };
      }

      balanceSpan.innerText = `${data.balance} TON`;
    } catch (err) {
      console.error(err);
      statusSpan.innerText = 'Ошибка загрузки';
    }
  } else {
    addressSpan.innerText = 'не подключён';
    statusSpan.innerText = 'Подключите кошелёк';
    connectBtn.style.display = 'block';
    balanceSpan.innerText = '0 TON';
  }
};

async function updateBalance(address, delta) {
  if (!mySupabase) return 0;
  try {
    const { data } = await mySupabase
      .from('accounts')
      .select('balance')
      .eq('wallet_address', address)
      .single();

    const newBalance = (data?.balance || 0) + delta;

    await mySupabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('wallet_address', address);

    document.getElementById('user-balance').innerText = `${newBalance} TON`;
    return newBalance;
  } catch (err) {
    console.error('updateBalance ошибка:', err);
    return 0;
  }
}
// Кусок 4/7 — Пополнение и вывод

window.deposit = async () => {
  if (!window.tonConnectUI?.connected) return alert('Сначала подключите кошелёк');

  const account = window.tonConnectUI.account;
  const userAddress = account.address;

  const comment = `dep_${userAddress.slice(0, 10)}_${Date.now()}`;

  alert(`
    Пополнение CosmicGifts\n\n +
    Отправьте TON на:\n${GAME_DEPOSIT_ADDRESS}\n\n +
    В комментарии обязательно укажите:\n${comment}\n\n +
    Минимум 0.05 TON
  `);

  try {
    await navigator.clipboard.writeText(comment);
    alert('Комментарий скопирован в буфер!');
  } catch (e) {}
};

window.withdraw = async () => {
  if (!window.tonConnectUI?.connected) return alert('Сначала подключите кошелёк');

  const amountStr = prompt('Сколько TON вывести? (минимум 0.2 TON)', '1');
  if (!amountStr) return;

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount < 0.2) return alert('Неверная сумма');

  const account = window.tonConnectUI.account;
  const userAddress = account.address;

  try {
    const { data, error } = await mySupabase
      .from('accounts')
      .select('balance')
      .eq('wallet_address', userAddress)
      .single();

    if (error || !data || data.balance < amount) {
      return alert(`Недостаточно средств. Баланс: ${data?.balance || 0} TON`);
    }

    const { error: insertError } = await mySupabase
      .from('withdraw_requests')
      .insert({ user_address: userAddress, amount, status: 'pending' });

    if (insertError) throw insertError;

    alert(`Запрос на вывод ${amount} TON создан. Ожидайте обработки.`);

  } catch (err) {
    alert('Ошибка при выводе: ' + (err.message || err));
  }
};
// Кусок 5/7 — Краш-игра (начало)

window.startCrashGame = async () => {
  if (!window.tonConnectUI?.connected) return alert('Сначала подключите кошелёк');

  betAmount = parseFloat(document.getElementById('bet-amount').value || 0);
  if (isNaN(betAmount) || betAmount < 0.05) return alert('Минимальная ставка 0.05 TON');

  const account = window.tonConnectUI.account;
  const address = account.address;

  try {
    const { data } = await mySupabase
      .from('accounts')
      .select('balance')
      .eq('wallet_address', address)
      .single();

    if (!data || data.balance < betAmount) return alert('Недостаточно средств');

    await updateBalance(address, -betAmount);

    if (crashInterval) clearInterval(crashInterval);

    document.getElementById('place-bet-btn').style.display = 'none';
    document.getElementById('cash-out-btn').style.display = 'block';
    document.getElementById('bet-amount').disabled = true;

    currentMultiplier = 1.00;
    hasCashedOut = false;
    crashPoint = generateCrashPoint();

    const canvas = document.getElementById('crash-graph');
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGraphAndRocket();

    crashInterval = setInterval(() => {
      currentMultiplier += 0.015;

      if (currentMultiplier >= MAX_MULTIPLIER) {
        clearInterval(crashInterval);
        cashOut();
        return;
      }

      if (currentMultiplier >= crashPoint) {
        clearInterval(crashInterval);
        document.getElementById('place-bet-btn').style.display = 'block';
        document.getElementById('cash-out-btn').style.display = 'none';
        document.getElementById('bet-amount').disabled = false;

        pastMultipliers.push(currentMultiplier);
        if (pastMultipliers.length > 5) pastMultipliers.shift();
        updateHistory();

        if (!hasCashedOut) alert(`Краш на ${currentMultiplier.toFixed(2)}x!`);
        return;
      }

      document.getElementById('current-multiplier').innerText = `${currentMultiplier.toFixed(2)}x`;
      drawGraphAndRocket();
    }, 70);
  } catch (err) {
    alert('Ошибка запуска игры: ' + err.message);
  }
};
// Кусок 6/7 — Функция cashOut

window.cashOut = async () => {
  if (hasCashedOut || currentMultiplier >= crashPoint) return;

  hasCashedOut = true;
  if (crashInterval) clearInterval(crashInterval);

  const win = betAmount * currentMultiplier;
  const account = window.tonConnectUI.account;
  const address = account.address;

  try {
    await updateBalance(address, win);
    alert(`Выиграно ${win.toFixed(2)} TON на ${currentMultiplier.toFixed(2)}x!`);
  } catch (err) {
    alert('Ошибка начисления выигрыша');
  }

  pastMultipliers.push(currentMultiplier);
  if (pastMultipliers.length > 5) pastMultipliers.shift();
  updateHistory();

  document.getElementById('cash-out-btn').style.display = 'none';
  document.getElementById('place-bet-btn').style.display = 'block';
  document.getElementById('bet-amount').disabled = false;

  drawGraphAndRocket();
};
// Кусок 7/7 — Запуск при загрузке страницы

window.addEventListener('load', () => {
  setTimeout(() => {
    console.log("Кнопки инициализированы");

    // Добавляем слушатели кнопок
    document.getElementById('connect-wallet-btn')?.addEventListener('click', window.connectWallet);
    document.getElementById('deposit-btn')?.addEventListener('click', window.deposit);
    document.getElementById('withdraw-btn')?.addEventListener('click', window.withdraw);
    document.getElementById('place-bet-btn')?.addEventListener('click', window.startCrashGame);
    document.getElementById('cash-out-btn')?.addEventListener('click', window.cashOut);

    // Реактивность TonConnect
    if (window.tonConnectUI) {
      window.tonConnectUI.onStatusChange(() => loadUserAndWallet());
    }

    loadUserAndWallet();
    updateHistory();
  }, 500);
});
