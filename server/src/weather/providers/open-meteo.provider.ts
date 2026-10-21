import { OpenMeteoModel } from "../models/open-meteo.model";
import { WeatherProvider, WeatherData } from "../weather.model";

const API_URL =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=43.5432&longitude=16.4931" +
    "&hourly=weather_code,precipitation,temperature_2m" +
    "&current=temperature_2m,apparent_temperature,weather_code," +
    "precipitation,is_day,wind_speed_10m,wind_direction_10m" +
    "&timezone=Europe%2FBerlin&forecast_days=3";

export class OpenMeteoProvider implements WeatherProvider {
    async fetch(): Promise<WeatherData> {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Open-Meteo failed: ${response.status}`);
        }

        const data = (await response.json()) as OpenMeteoModel;

        // Open-Meteo returns local timestamps without a UTC offset.
        const currentHour = data.current.time.slice(0, 13);
        const start = data.hourly.time.findIndex(
            time => time.slice(0, 13) === currentHour
        );

        if (start < 0) {
            throw new Error("Current hour not found in Open-Meteo forecast");
        }

        return {
            current: {
                time: data.current.time,
                temperature: data.current.temperature_2m,
                apparentTemperature: data.current.apparent_temperature,
                precipitation: data.current.precipitation,
                windSpeed: data.current.wind_speed_10m,
                windDirection: data.current.wind_direction_10m
            },
            hourly: {
                time: data.hourly.time.slice(start, start + 24),
                temperature: data.hourly.temperature_2m.slice(start, start + 24),
                precipitation: data.hourly.precipitation.slice(start, start + 24)
            }
        };
    }
}
