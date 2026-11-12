// ==========================================
// ATMOS WEATHER DASHBOARD
// Open-Meteo API - No API Key Required
// ==========================================

const $ = (id) => document.getElementById(id);

let temperatureUnit = "C";
let latestWeatherData = null;
let searchInProgress = false;

// ==========================================
// WEATHER INFORMATION
// ==========================================

function getWeatherInfo(code, isDay = 1) {
  if (code === 0) {
    return ["Clear sky", isDay ? "☀️" : "🌙"];
  }

  if (code === 1) {
    return ["Mainly clear", isDay ? "🌤️" : "🌙"];
  }

  if (code === 2) {
    return ["Partly cloudy", "⛅"];
  }

  if (code === 3) {
    return ["Overcast", "☁️"];
  }

  if ([45, 48].includes(code)) {
    return ["Foggy", "🌫️"];
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return ["Drizzle", "🌦️"];
  }

  if ([61, 63, 65, 66, 67].includes(code)) {
    return ["Rainy", "🌧️"];
  }

  if ([71, 73, 75, 77].includes(code)) {
    return ["Snowy", "❄️"];
  }

  if ([80, 81, 82].includes(code)) {
    return ["Rain showers", "🌧️"];
  }

  if ([85, 86].includes(code)) {
    return ["Snow showers", "🌨️"];
  }

  if ([95, 96, 99].includes(code)) {
    return ["Thunderstorm", "⛈️"];
  }

  return ["Weather unavailable", "🌡️"];
}

// ==========================================
// TEMPERATURE CONVERSION
// ==========================================

function convertTemperature(celsius) {
  if (temperatureUnit === "F") {
    return (celsius * 9 / 5) + 32;
  }

  return celsius;
}

function formatTemperature(celsius) {
  if (celsius === null || celsius === undefined ||
      !Number.isFinite(Number(celsius))) {
    return "--";
  }

  return `${Math.round(convertTemperature(Number(celsius)))}°${temperatureUnit}`;
}

function setTemperatureUnit(unit) {
  temperatureUnit = unit;

  $("unit-celsius").classList.toggle("active", unit === "C");
  $("unit-fahrenheit").classList.toggle("active", unit === "F");

  $("unit-celsius").setAttribute("aria-pressed", unit === "C");
  $("unit-fahrenheit").setAttribute("aria-pressed", unit === "F");

  $("chart-unit").textContent = `°${unit}`;

  if (latestWeatherData) {
    renderWeather(
      latestWeatherData.data,
      latestWeatherData.city,
      latestWeatherData.country
    );
  }
}

// ==========================================
// STATUS AND DISPLAY HELPERS
// ==========================================

function setStatus(message, type = "") {
  const element = $("status-message");

  element.textContent = message;
  element.className = `status-message ${type}`;
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value ?? "--";
  }
}

function formatTime(dateString) {
  if (!dateString) return "--:--";

  const parts = dateString.split("T");

  if (parts.length > 1) {
    const [hour, minute] = parts[1].split(":");
    const date = new Date();

    date.setHours(Number(hour), Number(minute), 0, 0);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return dateString;
}

function getDaylightHours(sunrise, sunset) {
  if (!sunrise || !sunset) return "-- hrs";

  const start = new Date(sunrise).getTime();
  const end = new Date(sunset).getTime();

  const hours = (end - start) / 3600000;

  return `${hours.toFixed(1)} hrs`;
}

// ==========================================
// WEATHER THEMES
// ==========================================

function applyWeatherTheme(weatherCode) {
  const themes = [
    "theme-sunny",
    "theme-cloudy",
    "theme-rainy",
    "theme-snowy",
    "theme-stormy",
    "theme-foggy"
  ];

  document.body.classList.remove(...themes);

  let theme = "theme-cloudy";

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

  createWeatherParticles(theme);
}

// ==========================================
// ANIMATED WEATHER PARTICLES
// ==========================================

function createWeatherParticles(theme) {
  const container = $("weather-particles");

  container.innerHTML = "";

  let symbol = "";
  let count = 0;

  if (theme === "theme-rainy") {
    count = 35;
  } else if (theme === "theme-snowy") {
    symbol = "❄";
    count = 20;
  } else if (theme === "theme-sunny") {
    symbol = "✦";
    count = 12;
  } else if (theme === "theme-cloudy") {
    symbol = "·";
    count = 15;
  }

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("span");

    particle.className = "particle";
    particle.textContent = symbol;

    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration =
      `${5 + Math.random() * 9}s`;

    particle.style.animationDelay =
      `${-Math.random() * 12}s`;

    particle.style.opacity = `${0.2 + Math.random() * 0.5}`;

    if (theme === "theme-sunny") {
      particle.style.fontSize = `${8 + Math.random() * 12}px`;
    }

    container.appendChild(particle);
  }
}

// ==========================================
// CITY SEARCH
// ==========================================

async function searchCity(city) {
  if (searchInProgress) return;

  const searchTerm = city.trim();

  if (!searchTerm) {
    setStatus("Please enter a city name.", "error");
    return;
  }

  searchInProgress = true;
  $("search-button").disabled = true;
  setStatus(`Searching weather for ${searchTerm}...`);

  try {
    const geoURL =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`;

    const geoResponse = await fetch(geoURL);

    if (!geoResponse.ok) {
      throw new Error("Unable to search for this city.");
    }

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found. Try another city name.");
    }

    const place = geoData.results[0];

    await fetchWeather(
      place.latitude,
      place.longitude,
      place.name,
      place.country || ""
    );

  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    searchInProgress = false;
    $("search-button").disabled = false;
  }
}

// ==========================================
// CURRENT LOCATION
// ==========================================

function getUserLocation() {
  if (!navigator.geolocation) {
    setStatus("Your browser does not support location services.", "error");
    return;
  }

  if (searchInProgress) return;

  searchInProgress = true;
  $("location-button").disabled = true;

  setStatus("Finding your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await fetchWeather(
          position.coords.latitude,
          position.coords.longitude,
          "Your Location",
          "Local weather"
        );
      } catch (error) {
        setStatus(error.message, "error");
      } finally {
        searchInProgress = false;
        $("location-button").disabled = false;
      }
    },

    (error) => {
      const messages = {
        1: "Location permission was denied. Please allow location access.",
        2: "Your location could not be determined.",
        3: "Location request timed out. Try again."
      };

      setStatus(
        messages[error.code] || "Unable to get your location.",
        "error"
      );

      searchInProgress = false;
      $("location-button").disabled = false;
    },

    {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000
    }
  );
}

// ==========================================
// FETCH WEATHER DATA
// ==========================================

async function fetchWeather(latitude, longitude, city, country) {
  setStatus(`Getting the latest weather for ${city}...`);

  const params = new URLSearchParams({
    latitude,
    longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "surface_pressure"
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "weather_code"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "uv_index_max",
      "sunrise",
      "sunset"
    ].join(","),
    timezone: "auto",
    forecast_days: "7"
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  if (!response.ok) {
    throw new Error("Weather service is unavailable. Please try again.");
  }

  const data = await response.json();

  if (!data.current || !data.hourly || !data.daily) {
    throw new Error("Weather data is incomplete. Please try again.");
  }

  renderWeather(data, city, country);

  setStatus(`Weather updated for ${city}.`, "success");
}

// ==========================================
// RENDER MAIN WEATHER
// ==========================================

function renderWeather(data, city, country) {
  latestWeatherData = { data, city, country };

  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  applyWeatherTheme(current.weather_code);

  const [description, icon] = getWeatherInfo(
    current.weather_code,
    current.is_day
  );

  setText("city-name", city);
  setText("country-name", country);

  setText("current-temp", formatTemperature(current.temperature_2m));
  setText("weather-description", description);
  setText("weather-icon", icon);

  setText("feels-like", formatTemperature(current.apparent_temperature));

  setText("humidity", `${current.relative_humidity_2m}%`);
  setText("wind-speed", `${current.wind_speed_10m} km/h`);
  setText("pressure", `${Math.round(current.surface_pressure)} hPa`);
  setText("precipitation", `${current.precipitation} mm`);

  setText("uv-index", daily.uv_index_max?.[0] ?? "--");

  const sunrise = daily.sunrise?.[0];
  const sunset = daily.sunset?.[0];

  setText("sunrise", formatTime(sunrise));
  setText("sunset", formatTime(sunset));

  setText("sunrise-card", formatTime(sunrise));
  setText("sunset-card", formatTime(sunset));

  setText("daylight", getDaylightHours(sunrise, sunset));

  setText(
    "today-label",
    new Date().toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long"
    })
  );

  renderHourly(hourly, current.time);
  renderDaily(daily);
  renderTemperatureChart(hourly, current.time);
}

// ==========================================
// HOURLY FORECAST
// ==========================================

function renderHourly(hourly, currentTime) {
  const container = $("hourly-list");

  container.innerHTML = "";

  let startIndex = hourly.time.findIndex(
    time => time >= currentTime
  );

  if (startIndex < 0) startIndex = 0;

  const fragment = document.createDocumentFragment();

  hourly.time.slice(startIndex, startIndex + 24).forEach(
    (time, index) => {
      const i = startIndex + index;

      const [description, icon] = getWeatherInfo(
        hourly.weather_code[i]
      );

      const card = document.createElement("div");
      card.className = "hourly-card";

      const timeLabel = document.createElement("p");
      timeLabel.textContent = index === 0
        ? "Now"
        : formatTime(time);

      const weatherIcon = document.createElement("div");
      weatherIcon.className = "hourly-icon";
      weatherIcon.textContent = icon;

      const temperature = document.createElement("strong");
      temperature.textContent =
        formatTemperature(hourly.temperature_2m[i]);

      const rain = document.createElement("small");
      rain.textContent =
        `${hourly.precipitation_probability?.[i] ?? 0}% rain`;

      card.title = description;

      card.append(timeLabel, weatherIcon, temperature, rain);
      fragment.appendChild(card);
    }
  );

  container.appendChild(fragment);
}

// ==========================================
// 7-DAY FORECAST
// ==========================================

function renderDaily(daily) {
  const container = $("daily-forecast");

  container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  daily.time.forEach((date, index) => {
    const [description, icon] = getWeatherInfo(
      daily.weather_code[index]
    );

    const card = document.createElement("div");
    card.className = "daily-card";

    const day = document.createElement("strong");

    day.textContent = index === 0
      ? "Today"
      : new Date(date + "T12:00:00").toLocaleDateString(
          undefined,
          { weekday: "short" }
        );

    const weatherIcon = document.createElement("span");
    weatherIcon.className = "daily-icon";
    weatherIcon.textContent = icon;

    const condition = document.createElement("span");
    condition.className = "daily-condition";
    condition.textContent = description;

    const temperatures = document.createElement("span");
    temperatures.className = "daily-temperatures";

    temperatures.textContent =
      `${formatTemperature(daily.temperature_2m_max[index])} / ${formatTemperature(daily.temperature_2m_min[index])}`;

    card.append(day, weatherIcon, condition, temperatures);

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

// ==========================================
// TEMPERATURE CHART
// ==========================================

function renderTemperatureChart(hourly, currentTime) {
  const canvas = $("temperature-chart");
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  let startIndex = hourly.time.findIndex(
    time => time >= currentTime
  );

  if (startIndex < 0) startIndex = 0;

  const temperatures = hourly.temperature_2m
    .slice(startIndex, startIndex + 12)
    .map(convertTemperature);

  const times = hourly.time.slice(startIndex, startIndex + 12);

  if (!temperatures.length) return;

  const width = canvas.clientWidth || 600;
  const height = 220;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 32, right: 28, bottom: 35, left: 28 };

  const min = Math.min(...temperatures) - 2;
  const max = Math.max(...temperatures) + 2;

  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  const points = temperatures.map((temp, index) => ({
    x: padding.left + index * chartWidth /
      Math.max(temperatures.length - 1, 1),

    y: padding.top +
      (max - temp) / (max - min || 1) * chartHeight
  }));

  // Draw chart grid
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const y = padding.top + i * chartHeight / 3;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Draw filled area
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height);

  gradient.addColorStop(0, "rgba(139,220,255,0.28)");
  gradient.addColorStop(1, "rgba(139,220,255,0)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding.bottom);

  points.forEach(point => ctx.lineTo(point.x, point.y));

  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();

  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw temperature line
  ctx.beginPath();

  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });

  ctx.strokeStyle = "#91ddff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Draw points and labels
  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.font = "bold 11px DM Sans, Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";

    ctx.fillText(
      `${Math.round(temperatures[index])}°`,
      point.x,
      point.y - 12
    );

    if (index % 2 === 0 || index === points.length - 1) {
      ctx.font = "10px DM Sans, Arial";
      ctx.fillStyle = "rgba(255,255,255,0.7)";

      ctx.fillText(
        formatTime(times[index]),
        point.x,
        height - 9
      );
    }
  });
}

// ==========================================
// EVENT LISTENERS
// ==========================================

$("search-button").addEventListener("click", () => {
  searchCity($("city-input").value);
});

$("city-input").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchCity($("city-input").value);
  }
});

$("location-button").addEventListener("click", getUserLocation);

$("unit-celsius").addEventListener("click", () => {
  setTemperatureUnit("C");
});

$("unit-fahrenheit").addEventListener("click", () => {
  setTemperatureUnit("F");
});

// Redraw chart when the browser window changes size
let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    if (latestWeatherData) {
      renderTemperatureChart(
        latestWeatherData.data.hourly,
        latestWeatherData.data.current.time
      );
    }
  }, 150);
});

// ==========================================
// INITIAL WEATHER
// ==========================================

searchCity("Kolkata");