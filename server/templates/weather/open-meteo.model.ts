export interface OpenMeteo {
    latitude: number
    longitude: number
    generationtime_ms: number
    utc_offset_seconds: number
    timezone: string
    timezone_abbreviation: string
    elevation: number
    hourly_units: PeriodicWeatherUnits;
    hourly: PeriodicWeatherData;

    current_units: CurrentWeatherUnits;
    current: CurrentWeatherData;
}

export interface PeriodicWeatherUnits {
    time: string
    weather_code: string
    precipitation: string
    temperature_2m: string
}

export interface PeriodicWeatherData {
    time: string[]
    weather_code: number[] // WMO
    precipitation: number[]
    temperature_2m: number[]
}

export interface CurrentWeatherUnits {
    time: string
    interval: string
    temperature_2m: string
    apparent_temperature: string
    weather_code: string
    precipitation: string
    is_day: string
    wind_speed_10m: string
    wind_direction_10m: string
}

export interface CurrentWeatherData {
    time: string
    interval: number
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
    precipitation: number
    is_day: number
    wind_speed_10m: number
    wind_direction_10m: number
}