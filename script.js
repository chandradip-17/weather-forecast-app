
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const locationButton = document.getElementById("locationButton");
const statusText = document.getElementById("status");

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Heavy thunderstorm", "⛈️"]
};

function getWeatherInfo(code, isDay = 1) {
  const info = weatherCodes[code] || ["Unknown conditions", "🌤️"];

  if (code === 0 && !isDay) {
    return ["Clear night", "🌙"];
  }

  return info;
}

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#ffd0d0" : "";
}

function formatDay(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("en-US", {
    weekday: "short"
  });
}

async function searchCity(city) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");

  url.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json"
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not search for that city.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Please try another name.");
  }

  return data.results[0];
}

async function getWeather(latitude, longitude, locationName) {
  showStatus("Getting the latest weather...");

  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude,
    longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max"
    ].join(","),
    timezone: "auto",
    forecast_days: "5",
    wind_speed_unit: "kmh"
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather service is unavailable. Please try again.");
  }

  const data = await response.json();

  if (!data.current || !data.daily) {
    throw new Error("Weather data could not be loaded.");
  }

  displayCurrentWeather(data, locationName);
  displayForecast(data.daily);

  showStatus(`Weather updated for ${locationName}.`);
}

function displayCurrentWeather(data, locationName) {
  const current = data.current;
  const [description, icon] = getWeatherInfo(
    current.weather_code,
    current.is_day
  );

  document.getElementById("cityName").textContent = locationName;
  document.getElementById("dateText").textContent =
    new Date().toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  document.getElementById("mainIcon").textContent = icon;
  document.getElementById("temperature").innerHTML =
    `${Math.round(current.temperature_2m)}<span>°</span>`;

  document.getElementById("conditionText").textContent = description;
  document.getElementById("feelsLike").textContent =
    `${Math.round(current.apparent_temperature)}°C`;

  document.getElementById("humidity").textContent =
    `${current.relative_humidity_2m}%`;

  document.getElementById("wind").textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;

  document.getElementById("precipitation").textContent =
    `${current.precipitation} mm`;

  document.getElementById("smallCondition").textContent = description;
  document.getElementById("sideIcon").textContent = icon;

  const tips = {
    0: ["Perfectly clear!", "A lovely time to enjoy the outdoors."],
    1: ["A bright day ahead.", "Enjoy the sunshine and stay hydrated."],
    2: ["A little cloud cover.", "A comfortable day for outdoor plans."],
    3: ["Cloudy skies.", "Keep an eye on changing weather."],
    45: ["A misty atmosphere.", "Take extra care while travelling."],
    48: ["Foggy conditions.", "Drive carefully and use caution."],
    51: ["Light drizzle.", "A light jacket may be useful."],
    53: ["Drizzly weather.", "Consider carrying an umbrella."],
    55: ["Wet weather ahead.", "An umbrella is a good idea."],
    61: ["Rain is possible.", "Consider carrying an umbrella."],
    63: ["Rainy conditions.", "Take an umbrella if heading out."],
    65: ["Heavy rain!", "Stay safe and avoid waterlogged areas."],
    71: ["Snowy weather.", "Dress warmly if going outside."],
    73: ["Snow is falling.", "Wear warm clothing outdoors."],
    75: ["Heavy snowfall.", "Take care on slippery surfaces."],
    80: ["Showers possible.", "Keep an umbrella nearby."],
    81: ["Rain showers.", "Plan outdoor activities carefully."],
    82: ["Heavy showers!", "Be cautious when travelling."],
    95: ["Stormy weather!", "Stay indoors if possible."]
  };

  const tip = tips[current.weather_code] ||
    ["Stay weather-ready.", "Check the forecast before heading out."];

  document.getElementById("weatherTip").textContent = tip[0];
  document.getElementById("weatherDescription").textContent = tip[1];
}

function displayForecast(daily) {
  const forecastGrid = document.getElementById("forecastGrid");
  forecastGrid.innerHTML = "";

  daily.time.forEach((date, index) => {
    const code = daily.weather_code[index];
    const [description, icon] = getWeatherInfo(code, 1);

    const high = Math.round(daily.temperature_2m_max[index]);
    const low = Math.round(daily.temperature_2m_min[index]);
    const rain = daily.precipitation_probability_max[index];

    const card = document.createElement("article");
    card.className = "forecast-card glass";

    const day = document.createElement("p");
    day.className = "forecast-day";
    day.textContent = index === 0 ? "Today" : formatDay(date);

    const weatherIcon = document.createElement("div");
    weatherIcon.className = "forecast-icon";
    weatherIcon.textContent = icon;

    const weatherDescription = document.createElement("p");
    weatherDescription.className = "forecast-description";
    weatherDescription.textContent = description;

    const temperatures = document.createElement("div");
    temperatures.className = "forecast-temps";

    const highText = document.createElement("span");
    highText.textContent = `${high}°`;

    const lowText = document.createElement("span");
    lowText.textContent = `${low}°`;

    temperatures.append(highText, lowText);

    const rainText = document.createElement("p");
    rainText.className = "forecast-rain";
    rainText.textContent =
      rain == null ? "Rain: --" : `💧 ${rain}% rain`;

    card.append(day, weatherIcon, weatherDescription, temperatures, rainText);
    forecastGrid.appendChild(card);
  });
}

async function loadCityWeather(city) {
  if (!city.trim()) {
    showStatus("Please enter a city name.", true);
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Loading...";

  try {
    const place = await searchCity(city.trim());

    const locationName = [
      place.name,
      place.admin1,
      place.country
    ].filter(Boolean).join(", ");

    await getWeather(
      place.latitude,
      place.longitude,
      locationName
    );
  } catch (error) {
    showStatus(error.message || "Something went wrong.", true);
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search";
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadCityWeather(cityInput.value);
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Location is not supported by this browser.", true);
    return;
  }

  showStatus("Requesting your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        await getWeather(
          latitude,
          longitude,
          "Your current location"
        );
      } catch (error) {
        showStatus(error.message, true);
      }
    },
    (error) => {
      const message = error.code === 1
        ? "Location permission was denied. Search for a city instead."
        : "Could not get your location. Please search for a city.";

      showStatus(message, true);
    },
    {
      enableHighAccuracy: false,
      timeout: 10000
    }
  );
});

// Load a default city when the app opens.
loadCityWeather("Kolkata");
