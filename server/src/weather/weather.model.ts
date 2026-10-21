
export interface WeatherData {
    current: {
        time: string;
        temperature: number;
        apparentTemperature: number;
        precipitation: number;
        windSpeed: number;
        windDirection: number;
    };
    hourly: {
        time: string[];
        temperature: number[];
        precipitation: number[];
    };
}

export interface WeatherProvider {
    fetch(): Promise<WeatherData>;
}
