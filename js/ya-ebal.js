console.log("%cya-ebal.js — CosmicGifts v2026.04", "color:#00ffaa; font-size:15px; font-weight:bold");

// ====================== ЗАГЛУШКА SUPABASE ======================
const USE_SUPABASE_MOCK = true;

const SUPABASE_URL = "https://gsjyskfnhmpcucukwjqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzanlza2ZuaG1jcHVjdWt3anFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTI5MDcsImV4cCI6MjA4ODUyODkwN30.sP8rFNtSZp5NLGw25N3fXKj4EVAQLU0VboZdbumgw2A";

let mySupabase = null;
let currentUser = null;

if (!USE_SUPABASE_MOCK && window.supabase) {
  mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("✅ Реальный Supabase клиент создан");
} else if (USE_SUPABASE_MOCK) {
  console.log("🟡 ЗАГЛУШКА SUPABASE ВКЛЮЧЕНА");
}

const GAME_DEPOSIT_ADDRESS = "UQAJ14WtUDaPtSFe8QKb1OKI7StBE55eWiK927y-_Yu3xgH7";
const LIGHT_TURQUOISE = "#00f0d0";
// ====================== НАВИГАЦИЯ (исправленная) ======================
function switchTab(tabId) {
  const protectedTabs = ["crash-tab", "wallet-tab", "cases-tab"];
  if (protectedTabs.includes(tabId) && !currentUser) {
    alert("Сначала зарегистрируй никнейм в разделе «Аккаунт»!");
    switchTab("profile-tab");
    return;
  }

  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-tab") === tabId) item.classList.add("active");
  });
}

function initNavigation() {
  setTimeout(() => {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const tabId = item.getAttribute("data-tab");
        if (tabId) switchTab(tabId);
      });
    });
    console.log("✅ Навигация готова");
  }, 200);
}
// ====================== АВТО ВХОД + РЕГИСТРАЦИЯ ======================
async function autoLogin() {
  const savedUsername = localStorage.getItem("cosmic_username");
  if (!savedUsername) return null;

  if (USE_SUPABASE_MOCK) {
    currentUser = { username: savedUsername, balance: parseFloat(localStorage.getItem("mock_balance")) || 0 };
    return currentUser;
  }

  try {
    const { data, error } = await mySupabase.from("users").select("*").eq("username", savedUsername).single();
    if (error || !data) return null;
    currentUser = data;
    return currentUser;
  } catch (err) {
    console.error("Ошибка авто-входа:", err);
    return null;
  }
}

async function registerUsername() {
  const input = document.getElementById("reg-username");
  if (!input) return;
  const username = input.value.trim().toLowerCase();

  if (username.length < 5 || username.length > 15 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return alert("Никнейм 5–15 символов, только английские буквы, цифры и _");
  }

  if (USE_SUPABASE_MOCK) {
    currentUser = { username: username, balance: 0 };
    localStorage.setItem("cosmic_username", username);
    localStorage.setItem("mock_balance", "0");
    alert(`✅ Никнейм "${username}" зарегистрирован (локально)`);
  } else {
    try {
      const { data, error } = await mySupabase.from("users").upsert({ username: username, balance: 0 }, { onConflict: "username" }).select().single();
      if (error) throw error;
      currentUser = data;
      localStorage.setItem("cosmic_username", username);
      alert(`✅ Никнейм "${username}" успешно зарегистрирован!`);
    } catch (err) {
      alert(err.message.includes("unique") ? "Никнейм уже занят!" : "Ошибка регистрации");
      return;
    }
  }

  renderProfile();
  switchTab("wallet-tab");
}
// ====================== РЕНДЕР ПРОФИЛЯ ======================
function renderProfile() {
  const container = document.getElementById("profile-content");
  if (!container) return;

  if (!currentUser || !currentUser.username) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px 0;">
        <h3>Регистрация аккаунта</h3>
        <p style="margin:20px 0; color:#ccc;">Придумай уникальный никнейм:</p>
        <input type="text" id="reg-username" placeholder="my_nickname" maxlength="15"
               style="width:100%; padding:16px; font-size:18px; border-radius:12px; border:none; background:#1f1f1f; color:white; margin-bottom:20px;">
        <button onclick="registerUsername()" style="width:100%; padding:16px; background:${LIGHT_TURQUOISE}; color:#000; border:none; border-radius:12px; font-weight:bold;">
          Зарегистрировать никнейм
        </button>
      </div>
    `;
  } else {
    container.innerHTML =` 
      <div style="text-align:center; padding:20px 0;">
        <h2 style="color:${LIGHT_TURQUOISE};">${currentUser.username}</h2>
        <p style="font-size:15px; color:#aaa; margin-bottom:25px;">Действия на аккаунте одобрены</p>
        
        <div class="profile-stats">
          <div><span>Баланс</span><span style="color:${LIGHT_TURQUOISE};">${currentUser.balance || 0} TON</span></div>
          <div><span>Краши</span><span style="color:${LIGHT_TURQUOISE};">0 игр</span></div>
          <div><span>Кейсы</span><span style="color:${LIGHT_TURQUOISE};">0 открыто</span></div>
          <div><span>Tasks</span><span style="color:${LIGHT_TURQUOISE};">0 выполнено</span></div>
          <div><span>Referral</span><span style="color:${LIGHT_TURQUOISE};">0 TON</span></div>
        </div>

        <div style="display:flex; gap:15px;">
          <button onclick="showTasksModal()" style="flex:1; padding:18px; background:#1f1f1f; border:2px solid ${LIGHT_TURQUOISE}; border-radius:12px; color:#fff;">Tasks</button>
          <button onclick="showReferralModal()" style="flex:1; padding:18px; background:#1f1f1f; border:2px solid ${LIGHT_TURQUOISE}; border-radius:12px; color:#fff;">Referral</button>
        </div>
      </div>
    `;
  }
}
// ====================== КОШЕЛЁК ======================
function initWalletTab() {
  const addrEl = document.getElementById("deposit-address");
  if (addrEl) {
    addrEl.addEventListener("click", () => {
      navigator.clipboard.writeText(GAME_DEPOSIT_ADDRESS);
      alert("Адрес скопирован!");
    });
  }

  const depositBtn = document.getElementById("deposit-btn");
  if (depositBtn) {
    depositBtn.textContent = "Пополнить в Wallet";
    depositBtn.style.background = LIGHT_TURQUOISE;
    depositBtn.style.color = "#000";
    depositBtn.addEventListener("click", () => {
      window.open(`https://t.me/wallet?startapp=transfer&address=${GAME_DEPOSIT_ADDRESS}`, "_blank");
    });
  }

  const withdrawBtn = document.getElementById("withdraw-btn");
  if (withdrawBtn) withdrawBtn.addEventListener("click", showWithdrawModal);

  const balanceEl = document.getElementById("balance-display");
  if (balanceEl) balanceEl.style.color = LIGHT_TURQUOISE;
}
// ====================== МОДАЛКИ ======================
function createModal(title, contentHTML) {
  document.querySelectorAll(".custom-modal").forEach(m => m.remove());
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="margin:0;color:${LIGHT_TURQUOISE};">${title}</h3>
        <button onclick="this.closest('.custom-modal').remove()" style="background:none;border:none;font-size:28px;color:#888;cursor:pointer;">×</button>
      </div>
      ${contentHTML}
    </div>
  `;
  document.body.appendChild(modal);
}

function showTasksModal() {
  createModal(`"Tasks", <p style="color:#aaa;text-align:center;">Задания появятся здесь</p><button onclick="this.closest('.custom-modal').remove()" style="width:100%;padding:16px;background:${LIGHT_TURQUOISE};color:#000;border:none;border-radius:12px;margin-top:20px;">Закрыть</button>`);
}

function showReferralModal() {
  const refLink = `https://t.me/yourbot?start=${currentUser ? currentUser.username : "friend"}`;
  createModal("Referral", `
    <p style="color:#aaa;">Приглашай друзей и получай % от их пополнений</p>
    <div style="background:#1a1a1a;padding:15px;border-radius:12px;margin:15px 0;word-break:break-all;">${refLink}</div>
    <button onclick="navigator.clipboard.writeText('${refLink}');alert('Ссылка скопирована!');this.closest('.custom-modal').remove()" style="width:100%;padding:16px;background:${LIGHT_TURQUOISE};color:#000;border:none;border-radius:12px;margin-bottom:10px;">Скопировать ссылку</button>
    <button onclick="this.closest('.custom-modal').remove()" style="width:100%;padding:16px;background:#333;color:white;border:none;border-radius:12px;">Закрыть</button>
  `);
}

function showWithdrawModal() {
  createModal("Вывод TON", `
    <p>Сумма вывода (TON):</p>
    <input type="number" id="withdraw-amount" placeholder="0.00" step="0.01" style="width:100%;padding:14px;margin:10px 0;background:#1f1f1f;border:none;border-radius:12px;color:white;">
    <p>Твой TON-адрес:</p>
    <input type="text" id="withdraw-address" placeholder="UQ..." style="width:100%;padding:14px;margin:10px 0;background:#1f1f1f;border:none;border-radius:12px;color:white;">
    <button onclick="submitWithdraw()" style="width:100%;padding:16px;background:${LIGHT_TURQUOISE};color:#000;border:none;border-radius:12px;margin-top:15px;">Подтвердить вывод</button>
    <p style="text-align:center;font-size:13px;color:#888;margin-top:15px;">Вывод обрабатывается администратором, возможна комиссия</p>
  `);
}

function submitWithdraw() {
  const amount = document.getElementById("withdraw-amount").value;
  const addr = document.getElementById("withdraw-address").value;
  if (!amount || !addr) return alert("Заполни все поля");
  alert(`Запрос на вывод ${amount} TON создан!`);
  document.querySelector(".custom-modal").remove();
}

// ====================== ЗАПУСК ======================
window.addEventListener("load", async () => {
  console.log("🚀 CosmicGifts запущен");

  initNavigation();
  switchTab("title-tab");

  await autoLogin();
  renderProfile();
  initWalletTab();

  console.log("✅ Готово. Стиль возвращён к оригинальному виду.");
});