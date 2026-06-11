# Nimbus — Weather Dashboard

A professional, modern weather dashboard with glassmorphism design and live video backgrounds.

## Setup

1. **Get a free API key** at [openweathermap.org](https://openweathermap.org/api)
   - Sign up → go to *My API Keys* → copy your key

2. **Open `config.js`** and replace the placeholder:
   ```js
   API_KEY: "YOUR_OPENWEATHERMAP_API_KEY",
   ```

3. **Open `index.html`** in a browser (or serve with any static server).

> **Note:** The app runs in demo mode with sample New York data when no valid API key is configured.

## Features

- 📍 Auto-detect location via browser Geolocation API
- 🔍 Search any city worldwide
- 🌡 Temperature in °C / °F (toggle)
- 💨 Humidity, Wind Speed, Pressure, Visibility
- 🌅 Sunrise & Sunset times
- 🌫 Air Quality Index (AQI) with component breakdown
- 📊 Hourly forecast chart (Chart.js, temp + rain)
- 📅 5-day forecast
- ⭐ Favorite cities (localStorage)
- 🕐 Recent searches (localStorage)
- 🌙 Light / Dark mode
- 🔄 Auto-refresh every 10 minutes
- 🎬 Live weather-matched video backgrounds

## Structure

```
weather-app/
├── index.html     Main markup
├── style.css      Glassmorphism styles + responsive layout
├── script.js      App logic, API calls, rendering
├── config.js      API key + constants  ← edit this
└── assets/icons/  (reserved for custom icons)
```

## APIs Used

- **OpenWeatherMap Current Weather** — `/data/2.5/weather`
- **OWM Forecast** — `/data/2.5/forecast`
- **OWM Air Pollution** — `/data/2.5/air_pollution`
- **OWM Geocoding** — `/geo/1.0/direct`
- **Chart.js** (CDN) — hourly chart
- **Mixkit** (CDN) — royalty-free background videos
