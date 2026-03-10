import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

window.supabase = createClient(
  'https://gsjyskfnhmcpucukwjqb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzanlza2ZuaG1jcHVjdWt3anFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTI5MDcsImV4cCI6MjA4ODUyODkwN30.sP8rFNtSZp5NLGw25N3fXKj4EVAQLU0VboZdbumgw2A'
);

window.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://gsjyskfnhmcpucukwjqb.supabase.co/storage/v1/object/public/assets/tonconnect-manifest.json'
});

// Игнорируем ошибки аналитики TON
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('TON_CONNECT_SDK')) {
    event.preventDefault();
  }
});

const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');

function devLog(...args) {
  if (isDev) console.log(...args);
}

function waitTonConnect(callback, attempts = 0) {
  if (attempts > 40) return;
  if (window.tonConnectUI?.connectWallet && typeof window.tonConnectUI.connectWallet === 'function') {
    callback();
  } else {
    setTimeout(() => waitTonConnect(callback, attempts + 1), 300);
  }
}

let crashInterval = null;
let currentMultiplier = 1.00;
let crashPoint = 0;
let betAmount = 0;
let hasCashedOut = false;
let ctx = null;
const MAX_MULTIPLIER = 15;
let pastMultipliers = [];

function generateCrashPoint() {
  const e = Math.pow(2, 32);
  const h = crypto.getRandomValues(new Uint32Array(1))[0];
  if (h % 50 === 0) return 1.00;
  let point = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.min(point, MAX_MULTIPLIER);
}

function drawGraphAndRocket() {
  if (!ctx) {
    console.warn("ctx is null — cannot draw graph");
    return;
  }

  const canvas = ctx.canvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const progress = Math.min(currentMultiplier / MAX_MULTIPLIER, 1);

  // Фиксированная стартовая точка слева внизу
  const startX = canvas.width * 0.08;   // 8% от левого края
  const startY = canvas.height * 0.88;  // ближе к низу

  // Текущая конечная точка (позиция ₿)
  const endX = canvas.width * (0.08 + progress * 0.82);
  const endY = canvas.height * (0.88 - progress * 0.78);

  // Рисуем ТОЛЬКО видимую часть графика (до progress)
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  const segments = 100; // плавность
  const stepX = (endX - startX) / segments;

  for (let i = 0; i <= segments; i++) {
    const ratio = i / segments;
    const x = startX + ratio * (endX - startX);

    // Линейный подъём
    let baseY = startY + ratio * (endY - startY);

    // Лёгкие волны (можно убрать, если хочешь строго прямую линию)
    const wave = Math.sin(ratio * Math.PI * 4) * 18; // 4 волны за весь путь
    const y = baseY + wave;

    const clampedY = Math.max(30, Math.min(y, canvas.height - 30));

    ctx.lineTo(x, clampedY);
  }

  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ffaa';
  ctx.stroke();

  // Логотип TON всегда на конце видимой линии
  const tonIcon = document.getElementById('ton-icon');
  if (tonIcon) {
    tonIcon.style.left = `${endX - 25}px`;
    tonIcon.style.bottom = `${canvas.height - endY - 15}px`;
  } else {
    console.warn("Элемент #ton-icon не найден");
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
    btn.textContent = mult.toFixed(2);
    btn.classList.add(colors[i % colors.length]);
    historyDiv.appendChild(btn);
  });
}

window.startCrashGame = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Сначала войдите');
  betAmount = parseFloat(document.getElementById('bet-amount').value);
  if (isNaN(betAmount) || betAmount < 0.05) return alert('Минимальная ставка 0.05 TON');

  try {
    await updateBalance(user.id, -betAmount);

    document.getElementById('place-bet-btn').style.display = 'none';
    document.getElementById('cash-out-btn').style.display = 'block';
    document.getElementById('bet-amount').disabled = true;

    currentMultiplier = 1.00;
    hasCashedOut = false;
    crashPoint = generateCrashPoint();

    // Безопасное получение canvas и ctx
    const canvasElement = document.getElementById('crash-graph');
    if (!canvasElement) {
      console.error("Canvas #crash-graph не найден!");
      return;
    }

    ctx = canvasElement.getContext('2d');
    if (!ctx) {
      console.error("Не удалось получить 2D контекст");
      return;
    }

    // Установка размера canvas
    const gameZone = document.querySelector('.game-zone');
    if (gameZone) {
      canvasElement.width = gameZone.clientWidth;
      canvasElement.height = gameZone.clientHeight;
    }

    // Начальный сброс
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const tonIcon = document.getElementById('ton-icon');
    if (tonIcon) {
      tonIcon.style.left = '100px';
      tonIcon.style.bottom = '100px';
    }

    drawGraphAndRocket(); // первый кадр

    crashInterval = setInterval(() => {
      currentMultiplier += 0.015;

      if (currentMultiplier >= MAX_MULTIPLIER) {
        currentMultiplier = MAX_MULTIPLIER;
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

        if (!hasCashedOut) alert(`Краш на ${currentMultiplier.toFixed(2)}x! Проигрыш ${betAmount} TON`);

        drawGraphAndRocket();
        return;
      }

      document.getElementById('current-multiplier').innerText = `${currentMultiplier.toFixed(2)}x`;

      drawGraphAndRocket();
    }, 70);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
};

window.cashOut = async () => {
  if (hasCashedOut || currentMultiplier >= crashPoint) return;

  const fixedMultiplier = Math.min(currentMultiplier, MAX_MULTIPLIER);
  const win = betAmount * fixedMultiplier;

  hasCashedOut = true;
  clearInterval(crashInterval);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('Сессия истекла.');
    hasCashedOut = false;
    return;
  }

  try {
    await updateBalance(user.id, win);
    alert(`Выиграно ${win.toFixed(2)} TON на ${fixedMultiplier.toFixed(2)}x!`);

    pastMultipliers.push(fixedMultiplier);
    if (pastMultipliers.length > 5) pastMultipliers.shift();
    updateHistory();

    document.getElementById('cash-out-btn').style.display = 'none';
    document.getElementById('place-bet-btn').style.display = 'block';
    document.getElementById('bet-amount').disabled = false;
  } catch (err) {
    alert('Ошибка: ' + err.message);
    hasCashedOut = false;
  }

  drawGraphAndRocket();
};

// Авторизация и кошелёк (без изменений)
window.signUp = async () => {
  const email = document.getElementById('email')?.value?.trim();
  const password = document.getElementById('password')?.value?.trim();
  if (!email || !password) return alert('Заполните поля');

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert(error.message);
  else alert('Зарегистрирован!');
};

window.signIn = async () => {
  const email = document.getElementById('email')?.value?.trim();
  const password = document.getElementById('password')?.value?.trim();
  if (!email || !password) return alert('Заполните поля');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
  else loadUserAndWallet();
};

window.logout = async () => {
  await supabase.auth.signOut();
  loadUserAndWallet();
};

window.connectWallet = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Войдите');

  try {
    const wallet = await window.tonConnectUI.connectWallet();
    const address = wallet.account.address;

    await supabase.from('accounts').upsert({
      user_id: user.id,
      wallet_address: address
    }, { onConflict: 'user_id' });

    alert('Кошелёк подключён!');
    loadUserAndWallet();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
};

window.deposit = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Войдите');

  const amount = parseFloat(prompt('Сумма пополнения (TON):'));
  if (isNaN(amount) || amount <= 0) return alert('Неверно');

  try {
    const newBalance = await updateBalance(user.id, amount);
    document.getElementById('user-balance').innerText = `${newBalance} TON`;
  } catch (err) {
    alert(err.message);
  }
};

window.withdraw = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Войдите');

  const amount = parseFloat(prompt('Сумма вывода (TON):'));
  if (isNaN(amount) || amount <= 0) return alert('Неверно');

  try {
    const newBalance = await updateBalance(user.id, -amount);
    document.getElementById('user-balance').innerText = `${newBalance} TON`;
  } catch (err) {
    alert(err.message);
  }
};

window.loadUserAndWallet = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('wallet-info').style.display = 'block';
    document.getElementById('user-email').innerText = user.email;
    document.getElementById('logout-btn').style.display = 'inline';

    let { data, error } = await supabase.from('accounts')
      .select('wallet_address, balance')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      ({ data, error } = await supabase.from('accounts')
        .insert({ user_id: user.id, balance: 0 })
        .select()
        .single());
    }
    if (error) {
      document.getElementById('wallet-status').innerText = 'Ошибка';
    } else {
      const wallet = data?.wallet_address ? data.wallet_address : 'не подключён';
      const balance = data?.balance ?? 0;
      document.getElementById('wallet-status').innerText = `Кошелёк: ${wallet.slice(0,6)}...`;
      document.getElementById('user-balance').innerText = `${balance} TON`;
    }
  } else {
    document.getElementById('auth-form').style.display = 'block';
    document.getElementById('wallet-info').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
  }
};

async function updateBalance(userId, amount) {
  const { data } = await supabase.from('accounts')
    .select('balance')
    .eq('user_id', userId)
    .single();

  const newBalance = (data.balance || 0) + amount;

  await supabase.from('accounts')
    .update({ balance: newBalance })
    .eq('user_id', userId);

  return newBalance;
}

window.addEventListener('load', () => {
  waitTonConnect(async () => {
    await loadUserAndWallet();

    document.getElementById('signup-btn')?.addEventListener('click', signUp);
    document.getElementById('signin-btn')?.addEventListener('click', signIn);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('connect-wallet-btn')?.addEventListener('click', connectWallet);
    document.getElementById('deposit-btn')?.addEventListener('click', deposit);
    document.getElementById('withdraw-btn')?.addEventListener('click', withdraw);
    document.getElementById('place-bet-btn')?.addEventListener('click', startCrashGame);
    document.getElementById('cash-out-btn')?.addEventListener('click', cashOut);
    updateHistory();
  });
});