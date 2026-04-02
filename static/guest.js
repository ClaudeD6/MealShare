let meals = [];

async function loadMeals() {
  const response = await fetch("/meals");
  meals = await response.json();
  renderMeals();
}

function convertTimeToNumber(timeString) {
  const [time, period] = timeString.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

function renderMeals() {
  const mealList = document.getElementById("mealList");
  const searchValue = document.getElementById("searchInput").value.toLowerCase().trim();
  const sortValue = document.getElementById("sortSelect").value;

  let filteredMeals = meals.filter((meal) => {
    return (
      meal.title.toLowerCase().includes(searchValue) ||
      meal.food_type.toLowerCase().includes(searchValue) ||
      meal.host.toLowerCase().includes(searchValue)
    );
  });

  if (sortValue === "priceLow") {
    filteredMeals.sort((a, b) => a.price - b.price);
  } else if (sortValue === "priceHigh") {
    filteredMeals.sort((a, b) => b.price - a.price);
  } else if (sortValue === "time") {
    filteredMeals.sort((a, b) => convertTimeToNumber(a.time) - convertTimeToNumber(b.time));
  } else if (sortValue === "spots") {
    filteredMeals.sort((a, b) => b.spots_left - a.spots_left);
  }

  mealList.innerHTML = "";

  if (filteredMeals.length === 0) {
    mealList.innerHTML = `<p class="empty-state">No meals match your search.</p>`;
    return;
  }

  filteredMeals.forEach((meal) => {
    const card = document.createElement("article");
    card.className = "meal-card";

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

      <button
        class="${meal.requested ? "cancel-btn" : "request-btn"}"
        onclick="${meal.requested ? `cancelRequest(${meal.id})` : `requestMeal(${meal.id})`}"
      >
        ${meal.requested ? "Cancel Request" : "Request to Join"}
      </button>
    `;

    mealList.appendChild(card);
  });
}

async function requestMeal(id) {
  const response = await fetch(`/request/${id}`, {
    method: "POST"
  });

  const result = await response.json();
  showStatus(result.message, result.success);
  await loadMeals();
}

async function cancelRequest(id) {
  const response = await fetch(`/cancel/${id}`, {
    method: "POST"
  });

  const result = await response.json();
  showStatus(result.message, result.success);
  await loadMeals();
}

function showStatus(message, success) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = message;
  statusMessage.className = success
    ? "status-message success"
    : "status-message error";
}

document.getElementById("searchInput").addEventListener("input", renderMeals);
document.getElementById("sortSelect").addEventListener("change", renderMeals);

loadMeals();
