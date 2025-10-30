import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * WeatherWidget Component
 * Displays current weather and temperature for a specified city using Open-Meteo API
 * 
 * Features:
 * - Geocoding: Converts city name to coordinates
 * - Weather data: Fetches current weather from Open-Meteo
 * - Auto-refresh: Updates every 30 minutes
 * - Error handling: Displays fallback message on failures
 * - Accessibility: ARIA labels for screen readers
 */
export default function WeatherWidget({ city = 'Berlin', textColor = '#1f2937' }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchTimeoutRef = useRef(null);

  // Geocoding: Convert city name to coordinates
  const geocodeCity = async (cityName) => {
    try {
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
      
      const { latitude, longitude, name, country } = data.results[0];
      return { latitude, longitude, name, country };
    } catch (err) {
      console.error('Geocoding error:', err);
      throw err;
    }
  };

  // Fetch weather data from Open-Meteo
  const fetchWeather = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`
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

    const loadWeather = async () => {
      if (!city || city.trim() === '') {
        setError('Keine Stadt angegeben');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Step 1: Geocode city name
        const location = await geocodeCity(city);
        
        // Step 2: Fetch weather data
        const weatherData = await fetchWeather(location.latitude, location.longitude);
        
        if (isMounted) {
          setWeather({
            temperature: weatherData.temperature_2m,
            weatherCode: weatherData.weather_code,
            windSpeed: weatherData.wind_speed_10m,
            humidity: weatherData.relative_humidity_2m,
            cityName: location.name,
            country: location.country
          });
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadWeather();

    // Refresh weather every 30 minutes
    fetchTimeoutRef.current = setInterval(loadWeather, 30 * 60 * 1000);

    return () => {
      isMounted = false;
      if (fetchTimeoutRef.current) {
        clearInterval(fetchTimeoutRef.current);
      }
    };
  }, [city]);

  // Loading state
  if (loading) {
    return (
      <div 
        className="flex items-center gap-2 text-sm"
        style={{ color: textColor }}
        aria-label="Wetter wird geladen"
      >
        <span className="animate-pulse">🌡️</span>
        <span>Lädt...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="flex items-center gap-2 text-sm"
        style={{ color: textColor }}
        aria-label="Wetter-Fehler"
        title={error}
      >
        <span>⚠️</span>
        <span>Wetter nicht verfügbar</span>
      </div>
    );
  }

  // Success state
  if (weather) {
    const icon = getWeatherIcon(weather.weatherCode);
    const temp = Math.round(weather.temperature);
    const wind = Math.round(weather.windSpeed);
    const humidity = Math.round(weather.humidity);
    
    return (
      <div 
        className="flex items-center gap-3 text-base md:text-lg font-medium"
        style={{ color: textColor }}
        aria-label={`Wetter in ${weather.cityName}: ${temp} Grad Celsius, Wind ${wind} km/h, Luftfeuchtigkeit ${humidity} Prozent`}
        title={`${weather.cityName}, ${weather.country}`}
      >
        <span className="text-3xl md:text-4xl" aria-hidden="true">{icon}</span>
        <span className="whitespace-nowrap">
          {temp}°C
        </span>
        <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
        <span className="whitespace-nowrap flex items-center gap-1">
          <span className="text-xl md:text-2xl" aria-hidden="true">💨</span>
          {wind} km/h
        </span>
        <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
        <span className="whitespace-nowrap flex items-center gap-1">
          <span className="text-xl md:text-2xl" aria-hidden="true">💧</span>
          {humidity}%
        </span>
      </div>
    );
  }

  return null;
}

WeatherWidget.propTypes = {
  city: PropTypes.string,
  textColor: PropTypes.string,
};
