// ================================================
// ya-ebal.js — ПОЛНАЯ АКТУАЛЬНАЯ ВЕРСИЯ (20.03.2026)
// Все исправления TonConnect + deposit/withdraw + защита
// ================================================

console.log("ya-ebal.js — полная версия запущена");

// === SUPABASE (если ещё не инициализирован — добавь свои данные один раз) ===
const supabaseUrl = 'https://твоя-проект.supabase.co';          // ← замени
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ← anon key из Supabase
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

// ================================================
// ИГРОВЫЕ ПЕРЕМЕННЫЕ
// ================================================
let crashInterval = null;
let currentMultiplier = 1.00;
let crashPoint = 0;
let betAmount = 0;
let hasCashedOut = false;
let ctx = null;
const MAX_MULTIPLIER = 15;
let pastMultipliers = [];

// ================================================
// УТИЛИТЫ
// ================================================
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

// ================================================
// ОСНОВНЫЕ ФУНКЦИИ КОШЕЛЬКА И ИГРЫ
// ================================================
window.connectWallet = async () => {
  if (!window.tonConnectUI) {
    alert('TonConnectUI не инициализирован. Добавьте скрипт в HTML!');
    return;
  }
  if (window.tonConnectUI.connected) {
    await loadUserAndWallet();
    return;
  }
  try {
    document.getElementById('wallet-status').innerText = 'Подключение...';
    await window.tonConnectUI.connectWallet();
    await loadUserAndWallet();
  } catch (err) {
    alert('Ошибка подключения: ' + (err.message || err));
  }
};

window.loadUserAndWallet = async () => {
  if (!window.tonConnectUI) return;

  const addressSpan = document.getElementById('wallet-address');
  const statusSpan = document.getElementById('wallet-status');
  const balanceSpan = document.getElementById('user-balance');
  const connectBtn = document.getElementById('connect-wallet-btn');

  if (window.tonConnectUI.connected) {
    const account = window.tonConnectUI.account;
    if (!account) return;
    const address = account.address;
    addressSpan.innerText = address.slice(0, 6) + '...' + address.slice(-4);
    statusSpan.innerText = 'Кошелёк подключён';
    connectBtn.style.display = 'none';

    // Загружаем баланс
    let { data } = await supabase
      .from('accounts')
      .select('balance')
      .eq('wallet_address', address)
      .single();

    if (!data) {
      await supabase.from('accounts').insert({ wallet_address: address, balance: 0 });
      data = { balance: 0 };
    }
    balanceSpan.innerText = `${data.balance} TON`;
  } else {
    addressSpan.innerText = 'не подключён';
    statusSpan.innerText = 'Подключите кошелёк';
    connectBtn.style.display = 'block';
    balanceSpan.innerText = '0 TON';
  }
};

// ================================================
// ПОПОЛНЕНИЕ (deposit) — только alert + комментарий
// ================================================
const GAME_DEPOSIT_ADDRESS = 'EQ...твой_адрес_куда_шлют_TON...';  // создай отдельный кошелёк для депозитов!

window.deposit = async () => {
  if (!window.tonConnectUI?.connected) return alert('Подключи кошелёк');

  const account = window.tonConnectUI.account;
  const userAddress = account.address;

  // Уникальный комментарий (чтобы бот знал, кому зачислить)
  const comment = `dep_${userAddress.slice(0, 10)}_${Date.now()}`;

  alert(`
    Пополни баланс:\n\n +
    Отправь TON на: ${GAME_DEPOSIT_ADDRESS}\n\n +
    Комментарий (обязательно!): ${comment}\n\n +
    После 1–3 подтверждений баланс обновится (обнови страницу). Мин. 0.05 TON.
  `);

  // Копируем комментарий
  navigator.clipboard.writeText(comment).then(() => alert('Комментарий скопирован!'));
};

// ================================================
// ВЫВОД (withdraw) — запрос + проверка баланса
// ================================================
window.withdraw = async () => {
  const amount = parseFloat(prompt("Сумма вывода (мин 1 TON)"));
  if (isNaN(amount) || amount < 1) return alert("Неверно");

  const { data } = await supabase.from("accounts").select("balance").eq("wallet_address", userAddress).single();
  if (data.balance < amount) return alert("Недостаточно");

  // Запрос в Supabase
  await supabase.from("withdraw_requests").insert({
    user_address: userAddress,
    amount,
    status: "pending",
    created_at: new Date().toISOString()
  });

  alert("Запрос создан! Ожидай обработки (вручную или ботом).");
};

// ================================================
// ОБНОВЛЕНИЕ БАЛАНСА
// ================================================
async function updateBalance(address, amount) {
  const { data } = await supabase
    .from('accounts')
    .select('balance')
    .eq('wallet_address', address)
    .single();

  const newBalance = (data?.balance || 0) + amount;

  await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('wallet_address', address);

  document.getElementById('user-balance').innerText = `${newBalance} TON`;
  return newBalance;
}

// ================================================
// ИГРА КРАШ
// ================================================
window.startCrashGame = async () => {
  if (!window.tonConnectUI?.connected) {
    alert('Сначала подключите кошелёк TON');
    return;
  }

  betAmount = parseFloat(document.getElementById('bet-amount').value);
  if (isNaN(betAmount) || betAmount < 0.05) {
    alert('Минимальная ставка 0.05 TON');
    return;
  }

  const account = window.tonConnectUI.account;
  const address = account.address;
  const { data } = await supabase
    .from('accounts')
    .select('balance')
    .eq('wallet_address', address)
    .single();

  if (!data || data.balance < betAmount) {
    alert('Недостаточно средств');
    return;
  }

  await updateBalance(address, -betAmount);

  // Запуск игры (остальной код без изменений)
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
};

window.cashOut = async () => {
  if (hasCashedOut || currentMultiplier >= crashPoint) return;

  hasCashedOut = true;
  clearInterval(crashInterval);

  const win = betAmount * currentMultiplier;
  const account = window.tonConnectUI.account;
  const address = account.address;

  await updateBalance(address, win);
  alert(`Выиграно ${win.toFixed(2)} TON на ${currentMultiplier.toFixed(2)}x!`);

  pastMultipliers.push(currentMultiplier);
  if (pastMultipliers.length > 5) pastMultipliers.shift();
  updateHistory();

  document.getElementById('cash-out-btn').style.display = 'none';
  document.getElementById('place-bet-btn').style.display = 'block';
  document.getElementById('bet-amount').disabled = false;

  drawGraphAndRocket();
};

// ================================================
// ЗАПУСК ВСЁГО
// ================================================
window.addEventListener('load', () => {
  setTimeout(() => {
    console.log("Проверяем кнопки...");

    // Добавляем слушатели
    document.getElementById('connect-wallet-btn')?.addEventListener('click', window.connectWallet);
    document.getElementById('deposit-btn')?.addEventListener('click', window.deposit);
    document.getElementById('withdraw-btn')?.addEventListener('click', window.withdraw);
    document.getElementById('place-bet-btn')?.addEventListener('click', window.startCrashGame);
    document.getElementById('cash-out-btn')?.addEventListener('click', window.cashOut);

    // Реактивность TonConnect
    if (window.tonConnectUI) {
      window.tonConnectUI.onStatusChange(() => {
        loadUserAndWallet();
      });
    }

    loadUserAndWallet();
    updateHistory();
  }, 500);
});