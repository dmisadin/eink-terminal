import type { WeatherData } from "./weather.model.js";
import { GoogleWeatherProvider } from "./providers/google-weather.provider.js";
import { OpenMeteoProvider } from "./providers/open-meteo.provider.js";

type WeatherSource = "google" | "open-meteo";

const WEATHER_SOURCE: WeatherSource = "google";

export class WeatherService {
    private readonly provider =
        WEATHER_SOURCE === "google"
            ? new GoogleWeatherProvider()
            : new OpenMeteoProvider();

    getWeather(): Promise<WeatherData> {
        return this.provider.fetch();
    }
}