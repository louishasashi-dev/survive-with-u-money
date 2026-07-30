// ============ KONFIGURASI STORAGE ============
const KEY_CURRENT = "swum_current_challenge";
const KEY_HISTORY = "swum_history";

// ============ ELEMENT REFERENCES ============
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const startFormWrapper = document.getElementById("start-form-wrapper");
const lockedInfo = document.getElementById("locked-info");
const activeChallengeBox = document.getElementById("active-challenge");

const startForm = document.getElementById("start-form");
const startAmountInput = document.getElementById("start-amount");

const expenseForm = document.getElementById("expense-form");
const itemNameInput = document.getElementById("item-name");
const itemPriceInput = document.getElementById("item-price");

const remainingAmountEl = document.getElementById("remaining-amount");
const progressBar = document.getElementById("progress-bar");
const spentInfoEl = document.getElementById("spent-info");
const moneyEmptyMsg = document.getElementById("money-empty-msg");
const transactionListEl = document.getElementById("transaction-list");

const historyListEl = document.getElementById("history-list");

// ============ HELPER ============
function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

function getCurrentChallenge() {
  const raw = localStorage.getItem(KEY_CURRENT);
  return raw ? JSON.parse(raw) : null;
}

function saveCurrentChallenge(data) {
  localStorage.setItem(KEY_CURRENT, JSON.stringify(data));
}

function clearCurrentChallenge() {
  localStorage.removeItem(KEY_CURRENT);
}

function getHistory() {
  const raw = localStorage.getItem(KEY_HISTORY);
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(historyArr) {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(historyArr));
}

function archiveChallenge(challenge) {
  const history = getHistory();
  const totalSpent = challenge.transactions.reduce(
    (sum, t) => sum + t.price,
    0,
  );

  history.unshift({
    date: challenge.date,
    startAmount: challenge.startAmount,
    totalSpent: totalSpent,
    remaining: challenge.remaining,
    transactions: challenge.transactions,
  });

  saveHistory(history);
  clearCurrentChallenge();
}

// ============ TAB SWITCHING ============
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");

    if (btn.dataset.tab === "history") {
      renderHistory();
    }
  });
});

// ============ RENDER: CHALLENGE TAB ============
function renderChallengeTab() {
  const current = getCurrentChallenge();
  const today = todayString();

  // Tidak ada tantangan tersimpan sama sekali
  if (!current) {
    showStartForm();
    return;
  }

  // Ada tantangan, tapi tanggalnya sudah lewat (hari sudah berganti)
  if (current.date !== today) {
    archiveChallenge(current);
    showStartForm();
    return;
  }

  // Ada tantangan aktif untuk hari ini
  showActiveChallenge(current);
}

function showStartForm() {
  startFormWrapper.classList.remove("hidden");
  lockedInfo.classList.add("hidden");
  activeChallengeBox.classList.add("hidden");
}

function showActiveChallenge(challenge) {
  startFormWrapper.classList.add("hidden");
  lockedInfo.classList.add("hidden");
  activeChallengeBox.classList.remove("hidden");

  renderActiveChallengeDetails(challenge);
}

function renderActiveChallengeDetails(challenge) {
  const totalSpent = challenge.transactions.reduce(
    (sum, t) => sum + t.price,
    0,
  );
  const percentLeft = Math.max(
    0,
    Math.min(100, (challenge.remaining / challenge.startAmount) * 100),
  );

  remainingAmountEl.textContent = formatRupiah(challenge.remaining);
  progressBar.style.width = percentLeft + "%";
  spentInfoEl.textContent = `Terpakai ${formatRupiah(totalSpent)} dari ${formatRupiah(
    challenge.startAmount,
  )}`;

  // Render list transaksi
  transactionListEl.innerHTML = "";
  if (challenge.transactions.length === 0) {
    transactionListEl.innerHTML =
      '<li class="muted small">Belum ada transaksi.</li>';
  } else {
    // tampilkan terbaru di atas
    [...challenge.transactions].reverse().forEach((t) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(t.name)}</span><span class="item-price">- ${formatRupiah(
        t.price,
      )}</span>`;
      transactionListEl.appendChild(li);
    });
  }

  // Kalau uang habis, kunci form
  if (challenge.remaining <= 0) {
    moneyEmptyMsg.classList.remove("hidden");
    itemNameInput.disabled = true;
    itemPriceInput.disabled = true;
    expenseForm.querySelector("button").disabled = true;
  } else {
    moneyEmptyMsg.classList.add("hidden");
    itemNameInput.disabled = false;
    itemPriceInput.disabled = false;
    expenseForm.querySelector("button").disabled = false;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============ FORM: MULAI TANTANGAN ============
startForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const amount = parseInt(startAmountInput.value, 10);
  if (!amount || amount <= 0) return;

  const newChallenge = {
    date: todayString(),
    startAmount: amount,
    remaining: amount,
    transactions: [],
  };

  saveCurrentChallenge(newChallenge);
  startForm.reset();
  renderChallengeTab();
});

// ============ FORM: CATAT PENGELUARAN ============
expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const current = getCurrentChallenge();
  if (!current) return;

  const name = itemNameInput.value.trim();
  const price = parseInt(itemPriceInput.value, 10);

  if (!name || !price || price <= 0) return;

  if (price > current.remaining) {
    alert("Harga melebihi sisa uang kamu! Masukkan jumlah yang sesuai.");
    return;
  }

  current.transactions.push({
    name,
    price,
    time: new Date().toISOString(),
  });
  current.remaining -= price;

  saveCurrentChallenge(current);
  expenseForm.reset();
  renderActiveChallengeDetails(current);
});

// ============ RENDER: HISTORY TAB ============
function renderHistory() {
  const history = getHistory();

  if (history.length === 0) {
    historyListEl.innerHTML =
      '<p class="muted">Belum ada riwayat tantangan.</p>';
    return;
  }

  historyListEl.innerHTML = "";

  history.forEach((h) => {
    const card = document.createElement("div");
    card.className = "history-card";

    const transactionsHtml = h.transactions
      .map(
        (t) =>
          `<li>${escapeHtml(t.name)} <span class="item-price">- ${formatRupiah(
            t.price,
          )}</span></li>`,
      )
      .join("");

    card.innerHTML = `
      <div class="history-date">${h.date}</div>
      <div class="history-row"><span>Modal Awal</span><span>${formatRupiah(h.startAmount)}</span></div>
      <div class="history-row"><span>Total Terpakai</span><span>${formatRupiah(h.totalSpent)}</span></div>
      <div class="history-row"><span>Sisa Akhir</span><span>${formatRupiah(h.remaining)}</span></div>
      <details>
        <summary>Lihat ${h.transactions.length} transaksi</summary>
        <ul class="transaction-list">${transactionsHtml || "<li class='muted small'>Tidak ada transaksi</li>"}</ul>
      </details>
    `;

    historyListEl.appendChild(card);
  });
}

// ============ INIT ============
document.addEventListener("DOMContentLoaded", () => {
  renderChallengeTab();
  renderHistory();
});

// ============ SERVICE WORKER (PWA) ============
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.log("Service worker gagal didaftarkan:", err);
    });
  });
}
