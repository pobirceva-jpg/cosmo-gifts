// =============================================
// ya-ebal.js — CosmicGifts (Telegram версия)
// =============================================

console.log("ya-ebal.js — Telegram Mini App версия запущена");

// ====================== SUPABASE ======================
const SUPABASE_URL = 'https://gsjyskfnhmpcucukwjqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzanlza2ZuaG1wY3VjdWt3anFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzc0NzYsImV4cCI6MjA1NTc1MzQ3Nn0.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

let mySupabase = null;
let currentUser = null;        // будет содержать telegram_id, username, balance и т.д.

if (window.supabase) {
  mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("mySupabase клиент создан");
}

// ====================== TELEGRAM ======================
const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  console.log("Telegram WebApp готов. User ID:", tg.initDataUnsafe?.user?.id);
} else {
  console.warn("Telegram WebApp не найден. Тестируй только внутри Telegram!");
}

// ====================== КОНСТАНТЫ ======================
const GAME_DEPOSIT_ADDRESS = 'EQ...твой_фиксированный_адрес_игры...'; // ← ОБЯЗАТЕЛЬНО замени!
const MAX_MULTIPLIER = 15;

let crashInterval = null;
let currentMultiplier = 1.00;
let crashPoint = 0;
let betAmount = 0;
let hasCashedOut = false;
let ctx = null;
let pastMultipliers = [];

// ====================== ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ ======================
async function initUser() {
  if (!tg?.initDataUnsafe?.user || !mySupabase) {
    document.getElementById('user-info').innerHTML = 
      <span style="color:red;">Ошибка: откройте игру внутри Telegram</span>;
    return null;
  }

  const userData = tg.initDataUnsafe.user;
  const telegram_id = BigInt(userData.id);   // важно использовать BigInt для telegram_id
  const username = userData.username ? `@${userData.username}` : `user_${userData.id}`;

  try {
    // Ищем пользователя
    let { data: user, error } = await mySupabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (error && error.code === 'PGRST116') { // пользователь не найден
      const newUser = {
        telegram_id: telegram_id,
        username: username,
        balance: 0,
        ton_wallet: null
      };

      const { data: inserted } = await mySupabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      user = inserted;
      console.log("Создан новый пользователь:", username);
    } else if (error) {
      throw error;
    }

    // Обновляем username, если он поменялся
    if (user.username !== username) {
      await mySupabase.from('users').update({ username }).eq('telegram_id', telegram_id);
      user.username = username;
    }

    currentUser = user;
    updateUserUI();
    return user;

  } catch (err) {
    console.error("initUser ошибка:", err);
    document.getElementById('user-info').innerHTML = <span style="color:red;">Ошибка базы данных</span>;
    return null;
  }
}

function updateUserUI() {
  if (!currentUser) return;

  const infoEl = document.getElementById('user-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <strong>@${currentUser.username.replace('@','')}</strong><br>
      Баланс: <span id="user-balance" style="color:#00ffaa; font-size:20px;">
        ${Number(currentUser.balance || 0).toFixed(2)} TON
      </span>
    `;
  }
}

// ====================== ПОПОЛНЕНИЕ ======================
window.deposit = function() {
  if (!currentUser) return alert("Сначала загрузите профиль");

  const message =` Пополнение баланса\n\n` +
                  `Адрес для перевода:\n${UQAJ14WtUDaPtSFe8QKb1OKI7StBE55eWiK927y-_Yu3xgH7}\n\n` +
                  `В комментарии (memo) обязательно укажи:\n` +
                  `<b>${currentUser.username}</b>\n\n` +
                  `Минимум: 1 TON\n` +
                  `После отправки баланс зачислится автоматически (обычно до 30 сек)`;

  alert(message);

  // Копируем username в буфер (удобно)
  navigator.clipboard.writeText(currentUser.username).then(() => {
    console.log("Username скопирован в буфер");
  });
};
// ====================== ВЫВОД ======================
window.withdraw = async function() {
  if (!currentUser) return alert("Профиль не загружен");

  const amountStr = prompt("Сумма вывода (минимум 0.2 TON):", "1");
  if (!amountStr) return;

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount < 0.2) {
    return alert("Минимальная сумма вывода — 0.2 TON");
  }

  if (Number(currentUser.balance) < amount) {
    return alert("Недостаточно средств на балансе");
  }

  const tonAddress = prompt("Введи свой TON адрес для вывода:", currentUser.ton_wallet || "");
  if (!tonAddress || tonAddress.length < 10) {
    return alert("Некорректный адрес");
  }

  try {
    const { error } = await mySupabase
      .from('withdraw_requests')
      .insert({
        telegram_id: currentUser.telegram_id,
        username: currentUser.username,
        amount: amount,
        ton_address: tonAddress,
        status: 'pending'
      });

    if (error) throw error;

    alert(`Запрос на вывод ${amount} TON создан!\nОжидайте подтверждения администратора.`);
    
    // Можно сразу обновить баланс локально (опционально)
    currentUser.balance = Number(currentUser.balance) - amount;
    updateUserUI();

  } catch (err) {
    console.error(err);
    alert("Ошибка при создании запроса на вывод");
  }
};

// ====================== КРАШ-ИГРА (адаптировано) ======================
window.startCrashGame = async () => {
  if (!currentUser) return alert("Профиль не загружен");

  betAmount = parseFloat(document.getElementById('bet-amount').value || 0);
  if (isNaN(betAmount) || betAmount < 0.05) return alert('Минимум 0.05 TON');

  if (Number(currentUser.balance) < betAmount) {
    return alert('Недостаточно средств');
  }

  // Снимаем ставку
  const { error } = await mySupabase
    .from('users')
    .update({ balance: Number(currentUser.balance) - betAmount })
    .eq('telegram_id', currentUser.telegram_id);

  if (error) return alert("Ошибка списания ставки");

  currentUser.balance = Number(currentUser.balance) - betAmount;
  updateUserUI();

  // === дальше идёт старая логика краша (оставляем почти без изменений) ===
  if (crashInterval) clearInterval(crashInterval);

  document.getElementById('place-bet-btn').style.display = 'none';
  document.getElementById('cash-out-btn').style.display = 'block';
  document.getElementById('bet-amount').disabled = true;

  currentMultiplier = 1.00;
  hasCashedOut = false;
  crashPoint = generateCrashPoint();

  const canvas = document.getElementById('crash-graph');
  ctx = canvas.getContext('2d');
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
      endCrashGame();
      return;
    }
    document.getElementById('current-multiplier').innerText = `${currentMultiplier.toFixed(2)}x`;
    drawGraphAndRocket();
  }, 70);
};

function endCrashGame() {
  document.getElementById('place-bet-btn').style.display = 'block';
  document.getElementById('cash-out-btn').style.display = 'none';
  document.getElementById('bet-amount').disabled = false;

  pastMultipliers.push(currentMultiplier);
  if (pastMultipliers.length > 5) pastMultipliers.shift();
  updateHistory();

  if (!hasCashedOut) alert(`Краш на ${currentMultiplier.toFixed(2)}x!`);
}

window.cashOut = async () => {
  if (hasCashedOut || currentMultiplier >= crashPoint) return;
  hasCashedOut = true;
  if (crashInterval) clearInterval(crashInterval);

  const win = betAmount * currentMultiplier;

  // Добавляем выигрыш
  const { error } = await mySupabase
    .from('users')
    .update({ balance: Number(currentUser.balance) + win })
    .eq('telegram_id', currentUser.telegram_id);

  if (!error) {
    currentUser.balance = Number(currentUser.balance) + win;
    updateUserUI();
  }

  alert(`Выигрыш ${win.toFixed(2)} TON на ${currentMultiplier.toFixed(2)}x`);
  pastMultipliers.push(currentMultiplier);
  if (pastMultipliers.length > 5) pastMultipliers.shift();
  updateHistory();

  document.getElementById('cash-out-btn').style.display = 'none';
  document.getElementById('place-bet-btn').style.display = 'block';
  document.getElementById('bet-amount').disabled = false;
  drawGraphAndRocket();
};

// ====================== УТИЛИТЫ ======================
function generateCrashPoint() {
  const e = Math.pow(2, 32);
  const h = crypto.getRandomValues(new Uint32Array(1))[0];
  if (h % 33 === 0) return 1.00;
  let point = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.min(point, MAX_MULTIPLIER);
}

function drawGraphAndRocket() { /* твой старый код без изменений */ 
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

// ====================== ЗАПУСК ======================
window.addEventListener('load', async () => {
  console.log("Страница загружена — инициализация CosmicGifts");

  // Инициализация пользователя из Telegram
  await initUser();

  // Привязка кнопок
  document.getElementById('deposit-btn')?.addEventListener('click', window.deposit);
  document.getElementById('withdraw-btn')?.addEventListener('click', window.withdraw);
  document.getElementById('place-bet-btn')?.addEventListener('click', window.startCrashGame);
  document.getElementById('cash-out-btn')?.addEventListener('click', window.cashOut);

  // Инициализация холста
  const canvas = document.getElementById('crash-graph');
  if (canvas) {
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  updateHistory();
});