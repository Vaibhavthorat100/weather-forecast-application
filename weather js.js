/***********************************************
 * Weather Dashboard - script.js
 * - Uses OpenWeatherMap 5-day / 3-hour forecast API
 * - Shows current weather (from first list item) and 5-day forecast (takes 12:00 entries)
 * - Uses custom icons from icons/ folder
 * - Recent searches saved in localStorage
 ***********************************************/

/* -----------------------
   CONFIG: Put your API key here
   (You already provided your key earlier; it's set below)
   If you want to keep it secret, replace with "PUT_YOUR_KEY" and set server-side later.
   ----------------------- */
const API_KEY = "2a955044611dbd7cccb563d4adb91691";  

/* -----------------------
   DOM references
   ----------------------- */
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const cityInput = document.getElementById("cityInput");
const forecastContainer = document.getElementById("forecast");
const recentCities = document.getElementById("recentCities");
const toggleUnitBtn = document.getElementById("toggleUnit");

/* state flag for unit toggle (we toggle only current temp display) */
let isCelsius = true;

/* -----------------------
   Custom icons mapping
   Map OpenWeather "main" value to your local icon files inside icons/ folder.
   Make sure these files exist in icons/: dry.png, sun.png, clouds.png,
   rainy-day.png, snow.png, thunder.png, haze.png
   ----------------------- */
const customIcons = {
  Clear: "sun.png",
  Clouds: "clouds.png",
  Rain: "rainy-day.png",
  Snow: "snow.png",
  Thunderstorm: "thunder.png",
  Mist: "haze.png"
};

/* -----------------------
   fetchWeather(city)
   - Fetch forecast for given city name (q=city)
   - Using "forecast" endpoint returns 40 entries (3-hourly)
   - We use the first item as "current" and filter 12:00:00 items for daily forecast
   ----------------------- */
async function fetchWeather(city) {
  try {
    // Build request URL (units=metric for Celsius)
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

    const res = await fetch(url);

    // If status not OK, throw and catch below to show alert
    if (!res.ok) {
      // Try to parse a message if available
      const errJson = await res.json().catch(() => ({}));
      const message = errJson.message || "City not found";
      throw new Error(message);
    }

    const data = await res.json();

    // Render data to UI
    displayWeather(data);

    // Save to recent searches
    saveRecentCity(city);
  } catch (err) {
    // User-friendly alert for common errors (city not found, invalid key etc.)
    alert(err.message || "Error fetching weather");
  }
}

/* -----------------------
   fetchWeatherByLocation()
   - Uses browser geolocation to get lat/lon and fetch forecast for coordinates
   ----------------------- */
function fetchWeatherByLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  // Ask for permission and then fetch using lat/lon
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Location weather not available");
        const data = await res.json();
        displayWeather(data);
        // Save city name from response
        if (data.city && data.city.name) saveRecentCity(data.city.name);
      } catch (err) {
        alert(err.message || "Error fetching location weather");
      }
    },
    () => {
      alert("Location access denied");
    }
  );
}

/* -----------------------
   displayWeather(data)
   - data is the JSON from OpenWeather forecast endpoint
   - we take data.list[0] as "current" (closest forecast) and
     filter data.list for entries that include "12:00:00" for daily forecast
   ----------------------- */
function displayWeather(data) {
  // Defensive checks
  if (!data || !data.list || !data.city) {
    alert("Invalid weather data");
    return;
  }

  // City info
  const city = data.city.name || "Unknown";
  const today = data.list[0]; // nearest forecast => treat as current

  // Extract current weather values
  const temp = today.main.temp;
  const wind = today.wind.speed;
  const humidity = today.main.humidity;
  const desc = today.weather[0].main; // e.g., "Rain", "Clear", "Clouds"

  // Choose custom icon based on mapping; fallback to icons/dry.png if unmapped
  const iconPath = customIcons[desc] || "icons/dry.png";

  // Update current weather DOM
  document.getElementById("cityName").textContent = `${city}`;
  document.getElementById("date").textContent = new Date().toDateString();
  document.getElementById("temperature").textContent = `Temp: ${temp}°C`;
  document.getElementById("wind").textContent = `Wind: ${wind} m/s`;
  document.getElementById("humidity").textContent = `Humidity: ${humidity}%`;
  document.getElementById("description").textContent = desc;
  document.getElementById("weatherIcon").src = iconPath; // replace default dry.png

  // Change page background based on simple condition matching
  document.body.className = ""; // reset classes
  if (desc.includes("Rain")) document.body.classList.add("rainy");
  else if (desc.includes("Cloud")) document.body.classList.add("cloudy");
  else document.body.classList.add("sunny");

  // If very hot, simple alert (as per assignment)
  if (temp > 40) {
    alert("⚠️ Extreme Heat Alert!");
  }

  // Build 5-day forecast cards using entries at 12:00:00
  forecastContainer.innerHTML = ""; // clear previous
  for (let i = 0; i < data.list.length; i++) {
    // We use API's dt_txt string which is like "2025-08-28 12:00:00"
    if (data.list[i].dt_txt && data.list[i].dt_txt.includes("12:00:00")) {
      const day = data.list[i];
      const date = new Date(day.dt_txt).toDateString();
      const dayDesc = day.weather[0].main;
      const dayIcon = customIcons[dayDesc] || "icons/dry.png";

      // Create card HTML (Tailwind classes)
      forecastContainer.innerHTML += `
        <div class="bg-gray-700 text-white rounded-lg shadow p-3 text-center">
          <p class="font-semibold">${date}</p>
          <img src="${dayIcon}" class="w-12 mx-auto" alt="${dayDesc}" />
          <p>Temp: ${day.main.temp}°C</p>
          <p>Wind: ${day.wind.speed} m/s</p>
          <p>Humidity: ${day.main.humidity}%</p>
        </div>
      `;
    }
  }
}

/* -----------------------
   Recent searches: Save & Update
   - stores unique city names in localStorage under key "recentCities"
   ----------------------- */
function saveRecentCity(city) {
  if (!city) return;
  let cities = JSON.parse(localStorage.getItem("recentCities")) || [];

  // keep unique values
  if (!cities.includes(city)) {
    cities.push(city);
    // limit to last 10 searches (optional)
    if (cities.length > 10) cities = cities.slice(-10);
    localStorage.setItem("recentCities", JSON.stringify(cities));
    updateRecentCities();
  }
}

/* Populate the dropdown from localStorage */
function updateRecentCities() {
  const cities = JSON.parse(localStorage.getItem("recentCities")) || [];
  recentCities.innerHTML = `<option value="">Select</option>`;
  cities.forEach(c => {
    recentCities.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

/* -----------------------
   Temperature unit toggle (simple)
   - toggles displayed current temp between °C and °F
   - Note: forecast cards remain in °C for simplicity (assignment asked only today's)
   ----------------------- */
toggleUnitBtn.addEventListener("click", () => {
  const tempEl = document.getElementById("temperature");
  const text = tempEl.textContent || "";
  const valueMatch = text.match(/-?\d+(\.\d+)?/); // extract number
  if (!valueMatch) return;
  let value = parseFloat(valueMatch[0]);

  if (isCelsius) {
    // C -> F
    value = (value * 9/5) + 32;
    tempEl.textContent = `Temp: ${value.toFixed(1)}°F`;
    toggleUnitBtn.textContent = "Switch to °C";
  } else {
    // F -> C
    value = (value - 32) * 5/9;
    tempEl.textContent = `Temp: ${value.toFixed(1)}°C`;
    toggleUnitBtn.textContent = "Switch to °F";
  }
  isCelsius = !isCelsius;
});

/* -----------------------
   Event listeners for buttons / dropdown
   ----------------------- */
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) fetchWeather(city);
  else alert("Enter a valid city name!");
});

locationBtn.addEventListener("click", fetchWeatherByLocation);

recentCities.addEventListener("change", (e) => {
  if (e.target.value) fetchWeather(e.target.value);
});

/* -----------------------
   Initialize UI (load recent cities into dropdown)
   - default icon is already set in index.html (icons/dry.png)
   ----------------------- */
updateRecentCities();
