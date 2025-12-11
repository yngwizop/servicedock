import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * WeatherWidget Component
 * Displays current weather and temperature for a specified city using Open-Meteo API
 * 
 * Features:
 * - Geocoding: Converts city name to coordinates (cached in localStorage)
 * - Weather data: Fetches current weather from Open-Meteo (cached for 3 hours)
 * - Smart refresh: Only updates if cache is older than 3 hours
 * - Manual refresh: Click to force update
 * - Error handling: Displays fallback message on failures
 * - Accessibility: ARIA labels for screen readers
 * - Progressive Enhancement: Shows cache indicator
 * 
 * Optimizations:
 * - Geocoding results cached in localStorage
 * - Weather data cached with timestamp
 * - Configurable cache duration (default: 3 hours)
 * - Reduces API calls by ~95%
 */

const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const GEOCODE_CACHE_KEY = 'weather_geocode_cache';
const WEATHER_CACHE_KEY = 'weather_data_cache';
const DEBUG_MODE = false; // Set to false in production

// Debug logger (only logs when DEBUG_MODE is true)
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log('[WeatherWidget]', ...args);
  }
};

export default function WeatherWidget({ city = 'Berlin', textColor = '#1f2937', weatherFields = ['temperature', 'humidity'], onLocationChange }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);
  const fetchTimeoutRef = useRef(null);
  const lastCityRef = useRef(null);

  // Get geocoding cache from localStorage
  const getGeocodeCache = (cityName) => {
    try {
      const cache = localStorage.getItem(GEOCODE_CACHE_KEY);
      if (!cache) return null;
      
      const parsed = JSON.parse(cache);
      return parsed[cityName.toLowerCase()] || null;
    } catch (err) {
      console.error('Error reading geocode cache:', err);
      return null;
    }
  };

  // Save geocoding result to localStorage
  const setGeocodeCache = (cityName, location) => {
    try {
      const cache = localStorage.getItem(GEOCODE_CACHE_KEY);
      const parsed = cache ? JSON.parse(cache) : {};
      
      parsed[cityName.toLowerCase()] = location;
      localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(parsed));
    } catch (err) {
      console.error('Error writing geocode cache:', err);
    }
  };

  // Get weather cache from localStorage
  const getWeatherCache = (cityName) => {
    try {
      const cache = localStorage.getItem(WEATHER_CACHE_KEY);
      if (!cache) return null;
      
      const parsed = JSON.parse(cache);
      const cityCache = parsed[cityName.toLowerCase()];
      
      if (!cityCache) return null;
      
      // Check if cache is still valid
      const now = Date.now();
      const age = now - cityCache.timestamp;
      
      if (age > CACHE_DURATION_MS) {
        return null; // Cache expired
      }
      
      return {
        data: cityCache.data,
        age: age // Return age in milliseconds
      };
    } catch (err) {
      console.error('Error reading weather cache:', err);
      return null;
    }
  };

  // Save weather data to localStorage with timestamp
  const setWeatherCache = (cityName, weatherData) => {
    try {
      const cache = localStorage.getItem(WEATHER_CACHE_KEY);
      const parsed = cache ? JSON.parse(cache) : {};
      
      parsed[cityName.toLowerCase()] = {
        data: weatherData,
        timestamp: Date.now()
      };
      
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(parsed));
    } catch (err) {
      console.error('Error writing weather cache:', err);
    }
  };

  // Geocoding: Convert city name to coordinates (with caching)
  const geocodeCity = async (cityName) => {
    try {
      // Check cache first
      const cached = getGeocodeCache(cityName);
      if (cached) {
        debugLog(`Using cached geocode for ${cityName}`);
        if (onLocationChange) onLocationChange(cached);
        return cached;
      }

      // Cache miss - fetch from API
      debugLog(`Fetching geocode for ${cityName}`);
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=de&format=json`
      );

      if (!response.ok) {
        throw new Error('Geocoding fehlgeschlagen');
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error(`Stadt "${cityName}" nicht gefunden`);
      }

      const { latitude, longitude, name, country, postal_code } = data.results[0];
      const location = { latitude, longitude, name, country, postal_code };

      // Save to cache
      setGeocodeCache(cityName, location);
      if (onLocationChange) onLocationChange(location);

      return location;
    } catch (err) {
      console.error('Geocoding error:', err);
      throw err;
    }
  };

  // 1. Dynamisch API-Parameter bauen
  const apiFields = [];
  if (weatherFields.includes('temperature')) apiFields.push('temperature_2m');
  if (weatherFields.includes('humidity')) apiFields.push('relative_humidity_2m');
  if (weatherFields.includes('wind')) apiFields.push('wind_speed_10m');
  if (weatherFields.includes('precipitation')) apiFields.push('precipitation');
  if (weatherFields.includes('cloudCover')) apiFields.push('cloud_cover');
  if (weatherFields.includes('pressure')) apiFields.push('surface_pressure');
  apiFields.push('weather_code'); // immer für Icon

  // FetchWeather dynamisch
  const fetchWeather = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${apiFields.join(',')}&timezone=auto`
      );
      if (!response.ok) {
        throw new Error('Wetter-API fehlgeschlagen');
      }
      const data = await response.json();
      return data.current;
    } catch (err) {
      console.error('Weather API error:', err);
      throw err;
    }
  };

  // Map WMO weather codes to emoji icons
  const getWeatherIcon = (weatherCode) => {
    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs
    if (weatherCode === 0) return '☀️'; // Clear sky
    if (weatherCode <= 3) return '⛅'; // Partly cloudy
    if (weatherCode <= 49) return '🌫️'; // Fog
    if (weatherCode <= 59) return '🌦️'; // Drizzle
    if (weatherCode <= 69) return '🌧️'; // Rain
    if (weatherCode <= 79) return '🌨️'; // Snow
    if (weatherCode <= 84) return '🌧️'; // Rain showers
    if (weatherCode <= 99) return '⛈️'; // Thunderstorm
    return '🌡️'; // Default
  };

  // Fetch weather data on mount and when city changes
  useEffect(() => {
    let isMounted = true;

  const loadWeather = async (skipCache = false) => {
      if (!city || city.trim() === '') {
        setError('Keine Stadt angegeben');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check weather cache first (unless skipCache is true)
        if (!skipCache) {
          const cachedResult = getWeatherCache(city);
          if (cachedResult) {
            debugLog(`Using cached weather data for ${city} (age: ${Math.round(cachedResult.age / 60000)} min)`);
            if (isMounted) {
              setWeather(cachedResult.data);
              setIsFromCache(true);
              setCacheAge(cachedResult.age);
              setLoading(false);
            }
            return;
          }
        }

        // Cache miss or skipCache - fetch from API
        debugLog(`Fetching fresh weather data for ${city}`);
        
        // Step 1: Geocode city name (uses cache internally)
  const location = await geocodeCity(city);
  // Callback wird im geocodeCity aufgerufen

        // Step 2: Fetch weather data
        const weatherData = await fetchWeather(location.latitude, location.longitude);

        if (isMounted) {
          const weatherObj = {
            cityName: location.name,
            country: location.country,
            latitude: location.latitude,
            longitude: location.longitude,
            postalCode: location.postal_code,
            weatherCode: weatherData.weather_code,
            temperature: weatherData.temperature_2m,
            humidity: weatherData.relative_humidity_2m,
            windSpeed: weatherData.wind_speed_10m,
            precipitation: weatherData.precipitation,
            cloudCover: weatherData.cloud_cover,
            pressure: weatherData.surface_pressure,
          };

          // Save to cache
          setWeatherCache(city, weatherObj);

          setWeather(weatherObj);
          setIsFromCache(false);
          setCacheAge(0);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    // Initial load
    loadWeather();

    // Check cache age and refresh every 3 hours (instead of 30 minutes)
    // This interval just checks if cache expired, doesn't always fetch
    fetchTimeoutRef.current = setInterval(() => {
      const cachedResult = getWeatherCache(city);
      if (!cachedResult) {
        // Cache expired or missing - fetch new data
        debugLog('Cache expired, fetching new data');
        loadWeather(true);
      }
    }, CACHE_DURATION_MS);

    return () => {
      isMounted = false;
      if (fetchTimeoutRef.current) {
        clearInterval(fetchTimeoutRef.current);
      }
    };
  }, [city]);

  // Manual refresh function (exposed via click)
  const handleManualRefresh = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    debugLog('Manual refresh triggered');
    setLoading(true);
    
    // Force fetch by clearing current weather and skipping cache
    const loadWeather = async () => {
      if (!city || city.trim() === '') return;

      try {
        setError(null);
        
  const location = await geocodeCity(city);
  // Callback wird im geocodeCity aufgerufen
        const weatherData = await fetchWeather(location.latitude, location.longitude);

        const weatherObj = {
          cityName: location.name,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
          postalCode: location.postal_code,
          weatherCode: weatherData.weather_code,
          temperature: weatherData.temperature_2m,
          humidity: weatherData.relative_humidity_2m,
          windSpeed: weatherData.wind_speed_10m,
          precipitation: weatherData.precipitation,
          cloudCover: weatherData.cloud_cover,
          pressure: weatherData.surface_pressure,
        };

        setWeatherCache(city, weatherObj);
        setWeather(weatherObj);
        setIsFromCache(false);
        setCacheAge(0);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadWeather();
  };

    // Loading state
  if (loading) {
    return (
      <div 
        className="flex items-center gap-2 text-base md:text-lg animate-pulse" 
        style={{ 
          color: textColor,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
        }}
        aria-label="Wetter wird geladen"
        aria-busy="true"
      >
        <span>�️</span>
        <span>Lädt...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="flex items-center gap-2 text-base md:text-lg cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={handleManualRefresh}
        style={{ 
          color: textColor,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
        }}
        aria-label="Wetter-Fehler - Klicken zum erneuten Laden"
        title={`Fehler: ${error}\n\nKlicken zum erneuten Versuch`}
      >
        <span>⚠️</span>
        <span>Wetter nicht verfügbar</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 opacity-50" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
      </div>
    );
  }

  // Success state
  if (weather) {
    const icon = getWeatherIcon(weather.weatherCode);
    const temp = Math.round(weather.temperature);
    const wind = Math.round(weather.windSpeed);
    const humidity = Math.round(weather.humidity);
    const precipitation = typeof weather.precipitation === 'number' ? weather.precipitation.toFixed(1) : '-';
    const cloudCover = typeof weather.cloudCover === 'number' ? Math.round(weather.cloudCover) : '-';
    const pressure = typeof weather.pressure === 'number' ? Math.round(weather.pressure) : '-';

    // Calculate cache age in minutes
    const cacheAgeMinutes = cacheAge ? Math.round(cacheAge / 60000) : 0;
    const cacheAgeHours = cacheAge ? Math.round(cacheAge / 3600000) : 0;
    const cacheAgeText = cacheAgeHours > 0 
      ? `vor ${cacheAgeHours}h` 
      : cacheAgeMinutes > 0 
        ? `vor ${cacheAgeMinutes} Min.` 
        : 'gerade eben';


    return (
      <div 
        className="flex flex-row items-center gap-3 text-base md:text-lg font-medium group flex-wrap"
        style={{ 
          color: textColor,
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)'
        }}
        aria-label={`Wetter in ${weather.cityName}: ${weatherFields.map(f => {
          if (f === 'temperature') return `${temp} Grad Celsius`;
          if (f === 'humidity') return `Luftfeuchtigkeit ${humidity} Prozent`;
          if (f === 'wind') return `Wind ${wind} km/h`;
          if (f === 'precipitation') return `Niederschlag ${precipitation} mm`;
          if (f === 'cloudCover') return `Bewölkung ${cloudCover} Prozent`;
          if (f === 'pressure') return `Luftdruck ${pressure} hPa`;
          return '';
        }).filter(Boolean).join(', ')}`}
      >
        {/* Manual refresh button with cache indicator */}
        <button
          onClick={handleManualRefresh}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 hover:opacity-100"
          style={{ color: textColor }}
          title={isFromCache ? `Aktualisiert ${cacheAgeText}\nKlicken zum Neuladen` : 'Gerade aktualisiert\nKlicken zum Neuladen'}
          aria-label="Wetter manuell aktualisieren"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {isFromCache && cacheAgeMinutes > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </button>
        <span className="text-3xl md:text-4xl" aria-hidden="true">{icon}</span>
        <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
        {(() => {
          const activeFields = [];
          if (weatherFields.includes('temperature')) activeFields.push(<span className="whitespace-nowrap flex items-center gap-1" style={{ color: textColor }}><span className="text-xl md:text-2xl" aria-hidden="true">🌡️</span>{temp}°C</span>);
          if (weatherFields.includes('humidity')) activeFields.push(<span className="whitespace-nowrap flex items-center gap-1" style={{ color: textColor }}><span className="text-xl md:text-2xl" aria-hidden="true">💧</span>{humidity}%</span>);
          if (weatherFields.includes('wind')) activeFields.push(<span className="whitespace-nowrap flex items-center gap-1" style={{ color: textColor }}><span className="text-xl md:text-2xl" aria-hidden="true">🌀</span>{wind} km/h</span>);
          if (weatherFields.includes('precipitation')) activeFields.push(<span className="whitespace-nowrap flex items-center gap-1" style={{ color: textColor }}><span className="text-xl md:text-2xl" aria-hidden="true">🌧️</span>{precipitation} mm</span>);
          if (weatherFields.includes('cloudCover')) activeFields.push(<span className="whitespace-nowrap flex items-center gap-1" style={{ color: textColor }}><span className="text-xl md:text-2xl" aria-hidden="true">☁️</span>{cloudCover}%</span>);
          if (weatherFields.includes('pressure')) activeFields.push(<span className="whitespace-nowrap flex items-center gap-1" style={{ color: textColor }}><span className="text-xl md:text-2xl" aria-hidden="true">🔽</span>{pressure} hPa</span>);
          return activeFields.map((field, index) => (
            <>{field}{index < activeFields.length - 1 && <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>}</>
          ));
        })()}
        {/* Cache indicator (subtle dot) */}
        {isFromCache && (
          <div 
            className="hidden md:flex items-center gap-1 text-xs opacity-50"
            title={`Cache: ${cacheAgeText}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

WeatherWidget.propTypes = {
  city: PropTypes.string,
  textColor: PropTypes.string,
};
