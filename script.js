/* ── Nimbus Weather Dashboard · Main Script ──────────────────────────────── */
// Uses CONFIG from config.js (loaded first)

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  unit: 'C',          // 'C' or 'F'
  currentData: null,  // current weather response
  lat: null,
  lon: null,
  refreshTimer: null,
  hourlyChart: null,
};

// ── DOM Refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const cityInput      = $('cityInput');
const searchBtn      = $('searchBtn');
const locateBtn      = $('locateBtn');
const errorMsg       = $('errorMsg');
const mainContent    = $('mainContent');
const loaderScreen   = $('loaderScreen');
const themeToggle    = $('themeToggle');
const themeIcon      = $('themeIcon');
const refreshBtn     = $('refreshBtn');
const bgVideo        = $('bgVideo');
const bgVideoSrc     = $('bgVideoSrc');
const recentDiv      = $('recentSearches');
const favoritesList  = $('favoritesList');
const addFavBtn      = $('addFavBtn');

// ── Video backgrounds keyed by OWM weather condition groups ───────────────
// Free Pexels / Pixabay HD mp4 videos (no API key needed)
const VIDEO_MAP = {
  clear:        'https://assets.mixkit.co/videos/preview/mixkit-sun-and-clouds-time-lapse-3328-large.mp4',
  clouds:       'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
  rain:         'https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-the-water-of-a-lake-seen-up-close-18312-large.mp4',
  drizzle:      'https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-the-water-of-a-lake-seen-up-close-18312-large.mp4',
  thunderstorm: 'https://assets.mixkit.co/videos/preview/mixkit-lightning-storm-in-an-open-field-1201-large.mp4',
  snow:         'https://assets.mixkit.co/videos/preview/mixkit-snow-covered-mountains-and-forests-seen-from-above-34910-large.mp4',
  mist:         'https://assets.mixkit.co/videos/preview/mixkit-fog-and-clouds-in-the-mountains-4793-large.mp4',
  fog:          'https://assets.mixkit.co/videos/preview/mixkit-fog-and-clouds-in-the-mountains-4793-large.mp4',
  haze:         'https://assets.mixkit.co/videos/preview/mixkit-fog-and-clouds-in-the-mountains-4793-large.mp4',
  default:      'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
};

// ── AQI label mapping ──────────────────────────────────────────────────────
const AQI_LABELS = [
  { label: 'Good',        color: '#4ade80', rotation: -85 },
  { label: 'Fair',        color: '#a3e635', rotation: -45 },
  { label: 'Moderate',    color: '#facc15', rotation:   0 },
  { label: 'Poor',        color: '#fb923c', rotation:  45 },
  { label: 'Very Poor',   color: '#f87171', rotation:  85 },
];

// ── Utility helpers ────────────────────────────────────────────────────────

/** Convert Celsius to Fahrenheit */
const toF = c => Math.round(c * 9/5 + 32);

/** Format temperature string based on current unit */
const fmtTemp = c => state.unit === 'C' ? `${Math.round(c)}°C` : `${toF(c)}°F`;

/** Format epoch seconds to HH:MM */
const fmtTime = (epoch, tz) => {
  const d = new Date((epoch + tz) * 1000);
  return d.toUTCString().slice(17, 22);
};

/** Format epoch to "HH:MM, Day Month" */
const fmtDateTime = epoch => {
  const d = new Date(epoch * 1000);
  return d.toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit',
    day: 'numeric', month: 'short',
  });
};

/** Get weather condition group string (lowercase first word) */
const conditionGroup = main => {
  const map = {
    Thunderstorm: 'thunderstorm',
    Drizzle:      'drizzle',
    Rain:         'rain',
    Snow:         'snow',
    Mist:         'mist',
    Smoke:        'haze',
    Haze:         'haze',
    Dust:         'haze',
    Fog:          'fog',
    Sand:         'haze',
    Ash:          'haze',
    Squall:       'clouds',
    Tornado:      'thunderstorm',
    Clear:        'clear',
    Clouds:       'clouds',
  };
  return map[main] || 'default';
};

// ── Local Storage helpers ──────────────────────────────────────────────────

const getRecents = () => JSON.parse(localStorage.getItem('nimbus_recents') || '[]');
const saveRecents = arr => localStorage.setItem('nimbus_recents', JSON.stringify(arr));

const addRecent = city => {
  let arr = getRecents().filter(c => c.toLowerCase() !== city.toLowerCase());
  arr.unshift(city);
  if (arr.length > 6) arr = arr.slice(0, 6);
  saveRecents(arr);
  renderRecents();
};

const getFavorites = () => JSON.parse(localStorage.getItem('nimbus_favs') || '[]');
const saveFavorites = arr => localStorage.setItem('nimbus_favs', JSON.stringify(arr));

// ── Render recent searches ─────────────────────────────────────────────────
function renderRecents() {
  const arr = getRecents();
  recentDiv.innerHTML = arr.map(c =>
    `<button class="recent-chip" data-city="${c}">${c}</button>`
  ).join('');
  recentDiv.querySelectorAll('.recent-chip').forEach(btn =>
    btn.addEventListener('click', () => fetchWeatherByCity(btn.dataset.city))
  );
}

// ── Render favorites ───────────────────────────────────────────────────────
function renderFavorites() {
  const arr = getFavorites();
  if (arr.length === 0) {
    favoritesList.innerHTML = '<span style="font-size:0.82rem;color:var(--text-muted)">No favorites yet</span>';
    return;
  }
  favoritesList.innerHTML = arr.map(c => `
    <div class="fav-chip">
      <span class="fav-name" data-city="${c}">${c}</span>
      <button class="fav-remove" data-city="${c}" title="Remove">✕</button>
    </div>
  `).join('');

  favoritesList.querySelectorAll('.fav-name').forEach(el =>
    el.addEventListener('click', () => fetchWeatherByCity(el.dataset.city))
  );
  favoritesList.querySelectorAll('.fav-remove').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      let arr = getFavorites().filter(c => c.toLowerCase() !== btn.dataset.city.toLowerCase());
      saveFavorites(arr);
      renderFavorites();
    })
  );
}

// ── Show / hide loader ─────────────────────────────────────────────────────
function showLoader() { loaderScreen.classList.remove('hidden'); }
function hideLoader() { loaderScreen.classList.add('hidden'); }

// ── Show error ─────────────────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  setTimeout(() => { errorMsg.textContent = ''; }, 5000);
}

// ── Set background video based on condition ────────────────────────────────
function setVideo(conditionMain) {
  const key = conditionGroup(conditionMain);
  const url = VIDEO_MAP[key] || VIDEO_MAP.default;
  if (bgVideoSrc.src !== url) {
    bgVideo.style.opacity = '0';
    bgVideoSrc.src = url;
    bgVideo.load();
    bgVideo.play().then(() => {
      bgVideo.style.transition = 'opacity 1.5s';
      bgVideo.style.opacity = '0.45';
    }).catch(() => {
      bgVideo.style.opacity = '0.45';
    });
  }
}

// ── Fetch current weather + forecast + AQI ────────────────────────────────
async function fetchWeatherByCoords(lat, lon) {
  state.lat = lat;
  state.lon = lon;
  showLoader();
  setError('');

  try {
    const [weatherRes, forecastRes, aqiRes] = await Promise.all([
      fetch(`${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=metric`),
      fetch(`${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=metric&cnt=40`),
      fetch(`${CONFIG.AQI_URL}?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`),
    ]);

    if (!weatherRes.ok) {
      const err = await weatherRes.json();
      throw new Error(err.message || 'Weather data unavailable');
    }

    const weather  = await weatherRes.json();
    const forecast = await forecastRes.json();
    const aqi      = aqiRes.ok ? await aqiRes.json() : null;

    state.currentData = { weather, forecast, aqi };

    renderWeather(weather);
    renderForecast(forecast);
    renderHourlyChart(forecast);
    if (aqi) renderAQI(aqi);

    setVideo(weather.weather[0].main);
    mainContent.style.display = 'flex';

  } catch (err) {
    showError(`Error: ${err.message}`);
    console.error(err);
  } finally {
    hideLoader();
  }
}

function setError(msg) { errorMsg.textContent = msg; }

async function fetchWeatherByCity(city) {
  if (!city.trim()) return;
  showLoader();
  setError('');

  try {
    // Geocode city name
    const geoRes = await fetch(
      `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${CONFIG.API_KEY}`
    );
    const geoData = await geoRes.json();

    if (!geoData.length) throw new Error(`City "${city}" not found. Try a different spelling.`);

    const { lat, lon, name } = geoData[0];
    addRecent(name);
    await fetchWeatherByCoords(lat, lon);
  } catch (err) {
    showError(err.message);
    hideLoader();
    console.error(err);
  }
}

// ── Render current weather ─────────────────────────────────────────────────
function renderWeather(d) {
  $('cityName').textContent    = d.name;
  $('countryName').textContent = d.sys.country;
  $('conditionText').textContent = d.weather[0].description;

  const iconCode = d.weather[0].icon;
  $('weatherIcon').src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  $('weatherIcon').alt = d.weather[0].description;

  updateTemps(d);

  // Metrics
  $('humidity').textContent  = `${d.main.humidity}%`;
  $('humidityBar').style.width = `${d.main.humidity}%`;
  $('windSpeed').textContent = `${(d.wind.speed * 3.6).toFixed(1)} km/h`;
  $('pressure').textContent  = `${d.main.pressure} hPa`;
  $('visibility').textContent = d.visibility
    ? `${(d.visibility / 1000).toFixed(1)} km`
    : 'N/A';
  $('sunrise').textContent   = fmtTime(d.sys.sunrise, d.timezone);
  $('sunset').textContent    = fmtTime(d.sys.sunset,  d.timezone);
  $('lastUpdated').textContent = `Last updated: ${fmtDateTime(d.dt)}`;
}

function updateTemps(d) {
  if (!d) return;
  $('tempValue').textContent  = fmtTemp(d.main.temp);
  $('feelsLike').textContent  = fmtTemp(d.main.feels_like);
}

// ── Render 5-day forecast ──────────────────────────────────────────────────
function renderForecast(forecastData) {
  // Group by day, pick noon reading
  const days = {};
  forecastData.list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    if (!days[key]) days[key] = [];
    days[key].push(item);
  });

  const forecastGrid = $('forecastGrid');
  forecastGrid.innerHTML = '';

  Object.values(days).slice(0, 5).forEach(entries => {
    // Prefer midday entry
    const entry = entries.reduce((best, e) => {
      const h = new Date(e.dt * 1000).getUTCHours();
      return Math.abs(h - 12) < Math.abs(new Date(best.dt * 1000).getUTCHours() - 12) ? e : best;
    });

    const date = new Date(entry.dt * 1000);
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const highs = entries.map(e => e.main.temp_max);
    const lows  = entries.map(e => e.main.temp_min);
    const high  = Math.max(...highs);
    const low   = Math.min(...lows);
    const icon  = entry.weather[0].icon;
    const desc  = entry.weather[0].description;

    const card = document.createElement('div');
    card.className = 'forecast-card glass-card';
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
      <div class="forecast-high">${fmtTemp(high)}</div>
      <div class="forecast-low">${fmtTemp(low)}</div>
      <div class="forecast-desc">${desc}</div>
    `;
    forecastGrid.appendChild(card);
  });
}

// ── Render hourly chart ────────────────────────────────────────────────────
function renderHourlyChart(forecastData) {
  const items = forecastData.list.slice(0, 8);
  const labels = items.map(e => {
    const d = new Date(e.dt * 1000);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });
  const temps = items.map(e => Math.round(e.main.temp));
  const rain  = items.map(e => ((e.rain && e.rain['3h']) || 0).toFixed(1));

  const isDark = document.documentElement.dataset.theme !== 'light';
  const textColor = isDark ? 'rgba(232,244,255,0.6)' : 'rgba(13,27,46,0.6)';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  if (state.hourlyChart) state.hourlyChart.destroy();

  const ctx = $('hourlyChart').getContext('2d');

  const tempGrad = ctx.createLinearGradient(0, 0, 0, 200);
  tempGrad.addColorStop(0, 'rgba(0,212,255,0.5)');
  tempGrad.addColorStop(1, 'rgba(0,212,255,0)');

  state.hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temp (°C)',
          data: temps,
          borderColor: '#00d4ff',
          backgroundColor: tempGrad,
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#00d4ff',
          fill: true,
          yAxisID: 'yTemp',
        },
        {
          label: 'Rain (mm)',
          data: rain,
          borderColor: '#ffb347',
          backgroundColor: 'rgba(255,179,71,0.15)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#ffb347',
          fill: true,
          yAxisID: 'yRain',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: textColor, font: { family: 'Inter', size: 12 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: 'rgba(6,10,20,0.85)',
          titleColor: '#e8f4ff',
          bodyColor: 'rgba(232,244,255,0.7)',
          borderColor: 'rgba(0,212,255,0.3)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, maxRotation: 0, font: { size: 11 } },
          grid:  { color: gridColor },
        },
        yTemp: {
          position: 'left',
          ticks: { color: '#00d4ff', font: { size: 11 } },
          grid:  { color: gridColor },
        },
        yRain: {
          position: 'right',
          ticks: { color: '#ffb347', font: { size: 11 } },
          grid:  { display: false },
        },
      },
    },
  });
}

// ── Render AQI ─────────────────────────────────────────────────────────────
function renderAQI(aqiData) {
  const aqi  = aqiData.list[0].main.aqi; // 1–5
  const info = AQI_LABELS[aqi - 1];
  const comp = aqiData.list[0].components;

  $('aqiNumber').textContent = aqi;
  $('aqiLabel').textContent  = info.label;
  $('aqiLabel').style.color  = info.color;
  $('aqiNeedle').style.transform = `translateX(-50%) rotate(${info.rotation}deg)`;

  const keys = ['pm2_5', 'pm10', 'no2', 'o3', 'co'];
  $('aqiComponents').innerHTML = keys.map(k =>
    `<span class="aqi-comp">${k.toUpperCase()}: ${comp[k]?.toFixed(1) ?? '—'}</span>`
  ).join('');
}

// ── Unit toggle ────────────────────────────────────────────────────────────
function initUnitToggle() {
  $('btnCelsius').addEventListener('click', () => {
    state.unit = 'C';
    $('btnCelsius').classList.add('active');
    $('btnFahrenheit').classList.remove('active');
    if (state.currentData) updateTemps(state.currentData.weather);
    if (state.currentData) renderForecast(state.currentData.forecast);
  });

  $('btnFahrenheit').addEventListener('click', () => {
    state.unit = 'F';
    $('btnFahrenheit').classList.add('active');
    $('btnCelsius').classList.remove('active');
    if (state.currentData) updateTemps(state.currentData.weather);
    if (state.currentData) renderForecast(state.currentData.forecast);
  });
}

// ── Theme toggle ───────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('nimbus_theme') || 'dark';
  applyTheme(saved);

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('nimbus_theme', next);
    // Redraw chart with new colors
    if (state.currentData) renderHourlyChart(state.currentData.forecast);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeIcon.textContent = theme === 'dark' ? '☀' : '🌙';
}

// ── Auto-refresh ───────────────────────────────────────────────────────────
function scheduleRefresh() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    if (state.lat && state.lon) fetchWeatherByCoords(state.lat, state.lon);
  }, CONFIG.REFRESH_INTERVAL_MS);
}

// ── Geolocation ───────────────────────────────────────────────────────────
function locateUser() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showLoader();
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    err => {
      hideLoader();
      const msgs = {
        1: 'Location access denied. Please search for a city manually.',
        2: 'Location unavailable. Try again or search manually.',
        3: 'Location request timed out. Try again.',
      };
      showError(msgs[err.code] || 'Could not detect location.');
    },
    { timeout: 10000 }
  );
}

// ── Favorites ──────────────────────────────────────────────────────────────
function initFavorites() {
  renderFavorites();
  addFavBtn.addEventListener('click', () => {
    const city = $('cityName').textContent;
    if (!city || city === '—') return;
    let arr = getFavorites();
    if (!arr.find(c => c.toLowerCase() === city.toLowerCase())) {
      arr.push(city);
      saveFavorites(arr);
      renderFavorites();
    }
  });
}

// ── Search bindings ────────────────────────────────────────────────────────
function initSearch() {
  searchBtn.addEventListener('click', () => fetchWeatherByCity(cityInput.value.trim()));
  cityInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchWeatherByCity(cityInput.value.trim());
  });
  locateBtn.addEventListener('click', locateUser);
}

// ── Refresh button ─────────────────────────────────────────────────────────
function initRefresh() {
  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    const done = () => refreshBtn.classList.remove('spinning');
    if (state.lat && state.lon) {
      fetchWeatherByCoords(state.lat, state.lon).then(done).catch(done);
    } else {
      done();
    }
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────
function init() {
  initTheme();
  initSearch();
  initUnitToggle();
  initRefresh();
  initFavorites();
  renderRecents();

  // Check for demo mode (no real API key yet)
  if (!CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
    hideLoader();
    loadDemoData();
    return;
  }

  // Try user's location on load
  locateUser();
  scheduleRefresh();
}

// ── Demo data (shown when no API key is configured) ───────────────────────
function loadDemoData() {
  showError('⚠ Demo mode — add your OpenWeatherMap API key in config.js to fetch live data.');

  const demo = {
    name: 'New York',
    sys: { country: 'US', sunrise: 1700000000, sunset: 1700040000 },
    weather: [{ description: 'broken clouds', icon: '04d', main: 'Clouds' }],
    main: { temp: 18.4, feels_like: 16.9, humidity: 67, pressure: 1013 },
    wind: { speed: 4.2 },
    visibility: 9800,
    dt: Date.now() / 1000,
    timezone: -18000,
  };

  const demoForecast = {
    list: Array.from({ length: 40 }, (_, i) => ({
      dt: Date.now() / 1000 + i * 10800,
      main: {
        temp: 18 + Math.sin(i * 0.8) * 5,
        temp_max: 22 + Math.sin(i * 0.5) * 3,
        temp_min: 14 + Math.sin(i * 0.5) * 3,
        humidity: 60 + i % 20,
      },
      weather: [{ description: 'few clouds', icon: '02d', main: 'Clouds' }],
      rain: { '3h': Math.max(0, Math.sin(i * 1.2) * 2) },
    })),
  };

  const demoAQI = {
    list: [{
      main: { aqi: 2 },
      components: { pm2_5: 8.3, pm10: 14.1, no2: 12.2, o3: 80.5, co: 245.3 },
    }],
  };

  state.currentData = { weather: demo, forecast: demoForecast, aqi: demoAQI };

  renderWeather(demo);
  renderForecast(demoForecast);
  renderHourlyChart(demoForecast);
  renderAQI(demoAQI);
  setVideo('Clouds');
  mainContent.style.display = 'flex';
}

// ── Go ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
