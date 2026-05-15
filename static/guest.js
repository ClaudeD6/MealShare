let meals = [];
let currentUser = null;

// ── Boot ───────────────────────────────────────────────────────────────────
async function boot() {
  try {
    const res = await fetch('/me');
    if (!res.ok) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!data.authenticated) { window.location.href = '/login'; return; }
    currentUser = data.username;
    document.getElementById('navUser').textContent = currentUser;
  } catch {
    window.location.href = '/login';
    return;
  }
  await loadMeals();
  setupListeners();
}

// ── Meals ──────────────────────────────────────────────────────────────────
async function loadMeals() {
  const res = await fetch('/meals');
  if (!res.ok) { window.location.href = '/login'; return; }
  meals = await res.json();
  renderMeals();
}

function convertTimeToNumber(t) {
  const [time, period] = t.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function renderMeals() {
  const mealList = document.getElementById('mealList');
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const sort = document.getElementById('sortSelect').value;

  let filtered = meals.filter(m =>
    m.title.toLowerCase().includes(search) ||
    m.food_type.toLowerCase().includes(search) ||
    m.host.toLowerCase().includes(search)
  );

  if (sort === 'priceLow')  filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'priceHigh') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'time') filtered.sort((a, b) => convertTimeToNumber(a.time) - convertTimeToNumber(b.time));
  else if (sort === 'spots') filtered.sort((a, b) => b.spots_left - a.spots_left);

  // Host's own meals bubble to the front
  filtered.sort((a, b) => {
    const aHost = a.host === currentUser ? 0 : 1;
    const bHost = b.host === currentUser ? 0 : 1;
    return aHost - bHost;
  });

  mealList.innerHTML = '';

  if (filtered.length === 0) {
    mealList.innerHTML = `<p class="empty-state">No meals match your search.</p>`;
    return;
  }

  filtered.forEach(meal => {
    const isHost = meal.host === currentUser;
    const card = document.createElement('article');
    card.className = 'meal-card' + (isHost ? ' host-card' : '');
    card.dataset.id = meal.id;

    let actionBtn = '';
    if (isHost) {
      actionBtn = `<button class="manage-btn" onclick="toggleManage(${meal.id})">Manage</button>`;
    } else if (meal.requested) {
      actionBtn = `<button class="cancel-btn" onclick="cancelRequest(${meal.id})">Cancel Request</button>`;
    } else {
      actionBtn = `<button class="request-btn" onclick="requestMeal(${meal.id})">Request to Join</button>`;
    }

    const requesterRows = (meal.requesters || []).map(r => `
      <div class="requester-row" id="req-row-${meal.id}-${r}">
        <span>👤 ${r}</span>
        <div class="requester-actions">
          <button class="accept-btn"  onclick="acceptRequester(${meal.id}, '${r}')">Accept</button>
          <button class="decline-btn" onclick="declineRequester(${meal.id}, '${r}')">Decline</button>
        </div>
      </div>
    `).join('');

    const managePanel = isHost ? `
      <div class="manage-panel">
        <h3>Join Requests</h3>
        <div class="requester-list" id="requester-list-${meal.id}">
          ${requesterRows || `<p class="no-requesters">No requests yet.</p>`}
        </div>
      </div>
    ` : '';

    card.innerHTML = `
      <div class="card-top">
        <span class="tag">${meal.food_type}</span>
        <span class="price">$${meal.price}</span>
      </div>
      <h2>${meal.title}</h2>
      <p class="description">${meal.description}</p>
      <div class="details">
        <p><strong>Host:</strong> ${meal.host}</p>
        <p><strong>Location:</strong> ${meal.location}</p>
        <p><strong>Time:</strong> ${meal.time}</p>
        <p><strong>Spots Left:</strong> ${meal.spots_left}</p>
      </div>
      ${actionBtn}
      ${managePanel}
    `;

    mealList.appendChild(card);
  });
}

function toggleManage(id) {
  const card = document.querySelector(`.meal-card[data-id="${id}"]`);
  if (!card) return;
  card.classList.toggle('expanded');
  const btn = card.querySelector('.manage-btn');
  if (btn) btn.textContent = card.classList.contains('expanded') ? 'Close' : 'Manage';
}

// ── Request / Cancel ───────────────────────────────────────────────────────
async function requestMeal(id) {
  const res = await fetch(`/request/${id}`, { method: 'POST' });
  const data = await res.json();
  showStatus(data.message, data.success);
  await loadMeals();
}

async function cancelRequest(id) {
  const res = await fetch(`/cancel/${id}`, { method: 'POST' });
  const data = await res.json();
  showStatus(data.message, data.success);
  await loadMeals();
}

// ── Manage actions ─────────────────────────────────────────────────────────
async function acceptRequester(mealId, requester) {
  const res = await fetch(`/manage/${mealId}/accept/${requester}`, { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    showStatus(`Accepted ${requester}!`, true);
    await loadMeals();
    // Re-expand card after re-render
    const card = document.querySelector(`.meal-card[data-id="${mealId}"]`);
    if (card) {
      card.classList.add('expanded');
      const btn = card.querySelector('.manage-btn');
      if (btn) btn.textContent = 'Close';
    }
  }
}

async function declineRequester(mealId, requester) {
  const res = await fetch(`/manage/${mealId}/decline/${requester}`, { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    showStatus(`Declined ${requester}.`, true);
    await loadMeals();
    const card = document.querySelector(`.meal-card[data-id="${mealId}"]`);
    if (card) {
      card.classList.add('expanded');
      const btn = card.querySelector('.manage-btn');
      if (btn) btn.textContent = 'Close';
    }
  }
}

// ── Create Meal modal ──────────────────────────────────────────────────────
function setupListeners() {
  document.getElementById('searchInput').addEventListener('input', renderMeals);
  document.getElementById('sortSelect').addEventListener('change', renderMeals);

  document.getElementById('openCreateModal').addEventListener('click', () => {
    document.getElementById('createModalOverlay').classList.add('open');
  });

  document.getElementById('closeCreateModal').addEventListener('click', () => {
    document.getElementById('createModalOverlay').classList.remove('open');
  });

  document.getElementById('createModalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('createModalOverlay')) {
      document.getElementById('createModalOverlay').classList.remove('open');
    }
  });

  document.getElementById('submitCreateMeal').addEventListener('click', submitCreateMeal);

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login';
  });
}

async function submitCreateMeal() {
  const err = document.getElementById('createError');
  err.textContent = '';
  const title = document.getElementById('cm-title').value.trim();
  const food_type = document.getElementById('cm-food-type').value.trim();
  const price = parseFloat(document.getElementById('cm-price').value);
  const location = document.getElementById('cm-location').value.trim();
  const time = document.getElementById('cm-time').value.trim();
  const spots_left = parseInt(document.getElementById('cm-spots').value);
  const description = document.getElementById('cm-description').value.trim();

  if (!title || !food_type || !location || !time || isNaN(price) || isNaN(spots_left)) {
    err.textContent = 'Please fill in all fields.';
    return;
  }

  const res = await fetch('/meals/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, food_type, price, location, time, spots_left, description })
  });
  const data = await res.json();
  if (data.success) {
    document.getElementById('createModalOverlay').classList.remove('open');
    // reset form
    ['cm-title','cm-food-type','cm-price','cm-location','cm-time','cm-spots','cm-description']
      .forEach(id => document.getElementById(id).value = '');
    showStatus(`"${data.meal.title}" posted!`, true);
    await loadMeals();
  } else {
    err.textContent = data.message || 'Something went wrong.';
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function showStatus(message, success) {
  const el = document.getElementById('statusMessage');
  el.textContent = message;
  el.className = success ? 'status-message success' : 'status-message error';
  setTimeout(() => { el.textContent = ''; el.className = 'status-message'; }, 4000);
}

boot();