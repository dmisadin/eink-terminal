import { GoogleCurrentResponse, GoogleHourlyResponse } from "../models/google.model";
import { WeatherData, WeatherProvider } from "../weather.model";

const LATITUDE = 43.5432;
const LONGITUDE = 16.4931;

const GOOGLE_WEATHER_API_KEY = process.env.GOOGLE_WEATHER_API_KEY;

if (!GOOGLE_WEATHER_API_KEY) {
    throw new Error("Missing GOOGLE_WEATHER_API_KEY environment variable");
}

export class GoogleWeatherProvider implements WeatherProvider {
    private async get<T>(
        path: string,
        extraParams: Record<string, string> = {}
    ): Promise<T> {
        const url = new URL(`https://weather.googleapis.com/v1/${path}`);

        if (!GOOGLE_WEATHER_API_KEY) {
            throw new Error("Missing GOOGLE_WEATHER_API_KEY environment variable");
        }
        url.searchParams.set("key", GOOGLE_WEATHER_API_KEY!);
        url.searchParams.set("location.latitude", String(LATITUDE));
        url.searchParams.set("location.longitude", String(LONGITUDE));
        url.searchParams.set("unitsSystem", "METRIC");
        url.searchParams.set("languageCode", "hr");

        for (const [key, value] of Object.entries(extraParams)) {
            url.searchParams.set(key, value);
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Google Weather failed (${response.status}): ${await response.text()}`
            );
        }

        return response.json() as Promise<T>;
    }

    async fetch(): Promise<WeatherData> {
        if (
            !GOOGLE_WEATHER_API_KEY ||
            GOOGLE_WEATHER_API_KEY === "YOUR_GOOGLE_WEATHER_API_KEY"
        ) {
            throw new Error("Configure GOOGLE_WEATHER_API_KEY first");
        }

        const [current, forecast] = await Promise.all([
            this.get<GoogleCurrentResponse>("currentConditions:lookup"),
            this.get<GoogleHourlyResponse>("forecast/hours:lookup", {
                hours: "24"
            })
        ]);

        const hours = forecast.forecastHours ?? [];

        if (hours.length === 0) {
            throw new Error("Google Weather returned no hourly forecast");
        }

        const precipitation = current.precipitation?.qpf;

        if (precipitation?.unit && precipitation.unit !== "MILLIMETERS") {
            throw new Error(
                `Unexpected precipitation unit: ${precipitation.unit}`
            );
        }

        return {
            current: {
                time: current.currentTime,
                temperature: current.temperature.degrees,
                apparentTemperature:
                    current.feelsLikeTemperature?.degrees ??
                    current.temperature.degrees,
                precipitation: precipitation?.quantity ?? 0,
                windSpeed: current.wind?.speed?.value ?? 0,
                windDirection: current.wind?.direction?.degrees ?? 0
            },
            hourly: {
                time: hours.map(hour => hour.interval.startTime),
                temperature: hours.map(hour => hour.temperature.degrees),
                precipitation: hours.map(hour => {
                    const qpf = hour.precipitation?.qpf;

                    if (qpf?.unit && qpf.unit !== "MILLIMETERS") {
                        throw new Error(
                            `Unexpected forecast precipitation unit: ${qpf.unit}`
                        );
                    }

                    return qpf?.quantity ?? 0;
                })
            }
        };
    }
}
