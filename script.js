
const $ = (id) => document.getElementById(id);

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Depositing rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  61: ["Slight rain", "🌦️"],
  63: ["Moderate rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  71: ["Slight snow", "🌨️"],
  73: ["Moderate snow", "❄️"],
  75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Moderate showers", "🌧️"],
  82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Heavy thunderstorm", "⛈️"]
};

function getWeatherInfo(code) {
  return weatherCodes[code] || ["Unknown", "🌡️"];
}

function setStatus(message, type = "info") {
  const status = $("status-message");
  if (!status) return;

  status.textContent = message;
  status.dataset.type = type;
}

async function searchCity(city) {
  if (!city.trim()) {
    setStatus("Please enter a city name.", "error");
    return;
  }

  try {
    setStatus("Searching for city...", "info");

    const url =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Unable to search for this city.");
    }

    const result = await response.json();

    if (!result.results || result.results.length === 0) {
      throw new Error("City not found. Try another name.");
    }

    const place = result.results[0];

    await loadWeather(
      place.latitude,
      place.longitude,
      place.name,
      place.country || ""
    );

  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadWeather(latitude, longitude, city, country) {
  try {
    setStatus("Loading weather...", "info");

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max` +
      `&timezone=auto&forecast_days=7`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Unable to load weather data.");
    }

    const data = await response.json();

    renderWeather(data, city, country);
    setStatus(`Weather updated for ${city}.`, "success");

  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderWeather(data, city, country) {
  const current = data.current;
  applyWeatherTheme(current.weather_code);
  const daily = data.daily;
  const hourly = data.hourly;

  const [description, icon] = getWeatherInfo(current.weather_code);

  setText("city-name", city);
  setText("country-name", country);
  setText("current-temp", `${Math.round(current.temperature_2m)}°`);
  setText("weather-description", description);
  setText("weather-icon", icon);

  setText("feels-like", `${Math.round(current.apparent_temperature)}°C`);
  setText("humidity", `${current.relative_humidity_2m}%`);
  setText("wind-speed", `${current.wind_speed_10m} km/h`);
  setText("pressure", `${Math.round(current.surface_pressure)} hPa`);
  setText("precipitation", `${current.precipitation} mm`);

  setText("uv-index", daily.uv_index_max?.[0] ?? "--");
  setText("sunrise", formatTime(daily.sunrise?.[0]));
  setText("sunset", formatTime(daily.sunset?.[0]));

  renderHourly(hourly, current.time);
  renderDaily(daily);
  renderTemperatureChart(hourly, current.time);
}

function setText(id, value) {
  const element = $(id);
  if (element) {
    element.textContent = value ?? "--";
  }
}

function formatTime(dateString) {
  if (!dateString) return "--";

  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderHourly(hourly, currentTime) {
  const container = $("hourly-list");

  if (!container) {
    console.warn("Missing HTML element: hourly-list");
    return;
  }

  container.innerHTML = "";

  let startIndex = hourly.time.findIndex(
    time => time >= currentTime
  );

  if (startIndex < 0) startIndex = 0;

  const fragment = document.createDocumentFragment();

  hourly.time.slice(startIndex, startIndex + 24).forEach((time, index) => {
    const i = startIndex + index;
    const [description, icon] = getWeatherInfo(hourly.weather_code[i]);

    const card = document.createElement("div");
    card.className = "hourly-card";

    const timeLabel = document.createElement("p");
    timeLabel.textContent = index === 0
      ? "Now"
      : formatTime(time);

    const weatherIcon = document.createElement("div");
    weatherIcon.textContent = icon;

    const temperature = document.createElement("strong");
    temperature.textContent =
      `${Math.round(hourly.temperature_2m[i])}°`;

    const rain = document.createElement("small");
    rain.textContent =
      `${hourly.precipitation_probability?.[i] ?? 0}% rain`;

    card.title = description;
    card.append(timeLabel, weatherIcon, temperature, rain);
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function renderDaily(daily) {
  const container = $("daily-forecast");

  if (!container) {
    console.warn("Missing HTML element: daily-forecast");
    return;
  }

  container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  daily.time.forEach((date, index) => {
    const [description, icon] = getWeatherInfo(daily.weather_code[index]);

    const card = document.createElement("div");
    card.className = "daily-card";

    const day = document.createElement("strong");
    day.textContent = index === 0
      ? "Today"
      : new Date(date + "T12:00:00").toLocaleDateString("en", {
          weekday: "short"
        });

    const weatherIcon = document.createElement("span");
    weatherIcon.textContent = icon;

    const condition = document.createElement("span");
    condition.textContent = description;

    const temperatures = document.createElement("span");
    temperatures.textContent =
      `${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°`;

    card.append(day, weatherIcon, condition, temperatures);
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function renderTemperatureChart(hourly, currentTime) {
  const canvas = $("temperature-chart");

  if (!canvas) {
    console.warn("Missing HTML element: temperature-chart");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let startIndex = hourly.time.findIndex(
    time => time >= currentTime
  );

  if (startIndex < 0) startIndex = 0;

  const temperatures = hourly.temperature_2m.slice(
    startIndex,
    startIndex + 12
  );

  if (!temperatures.length) return;

  const width = canvas.clientWidth || 600;
  const height = 220;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = `${height}px`;

  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  const min = Math.min(...temperatures) - 2;
  const max = Math.max(...temperatures) + 2;
  const padding = 30;

  const points = temperatures.map((temp, index) => ({
    x: padding + index * (width - padding * 2) /
      Math.max(temperatures.length - 1, 1),
    y: height - padding -
      ((temp - min) / (max - min || 1)) * (height - padding * 2)
  }));

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });

  ctx.strokeStyle = "#8bdcff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${Math.round(temperatures[index])}°`,
      point.x, point.y - 12);
  });
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by your browser.", "error");
    return;
  }

  setStatus("Getting your location...", "info");

  navigator.geolocation.getCurrentPosition(
    position => {
      loadWeather(
        position.coords.latitude,
        position.coords.longitude,
        "Your Location",
        ""
      );
    },
    () => {
      setStatus("Location permission denied or unavailable.", "error");
    }
  );
}

// Search button and Enter key
const searchButton = $("search-button");
const searchInput = $("city-input");

if (searchButton) {
  searchButton.addEventListener("click", () => {
    searchCity(searchInput?.value || "");
  });
}

if (searchInput) {
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchCity(searchInput.value);
    }
  });
}

// Current location button
const locationButton = $("location-button");

if (locationButton) {
  locationButton.addEventListener("click", getCurrentLocation);
}

// Initial weather
document.addEventListener("DOMContentLoaded", () => {
  searchCity("Kolkata");
});
function applyWeatherTheme(weatherCode) {
  document.body.classList.remove(
    "theme-sunny",
    "theme-cloudy",
    "theme-rainy",
    "theme-snowy",
    "theme-stormy",
    "theme-foggy"
  );

  let theme = "theme-sunny";

  if ([0, 1].includes(weatherCode)) {
    theme = "theme-sunny";
  } else if ([2, 3].includes(weatherCode)) {
    theme = "theme-cloudy";
  } else if ([45, 48].includes(weatherCode)) {
    theme = "theme-foggy";
  } else if (
    [51, 53, 55, 56, 57, 61, 63, 65,
     66, 67, 80, 81, 82].includes(weatherCode)
  ) {
    theme = "theme-rainy";
  } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    theme = "theme-snowy";
  } else if ([95, 96, 99].includes(weatherCode)) {
    theme = "theme-stormy";
  }

  document.body.classList.add(theme);
}