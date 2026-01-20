export interface OpenMeteo {
    latitude: number
    longitude: number
    generationtime_ms: number
    utc_offset_seconds: number
    timezone: string
    timezone_abbreviation: string
    elevation: number
    hourly_units: Units;
    hourly: PeriodicWeatherData
}

export interface Units {
    time: string
    weather_code: string
    precipitation: string
    temperature_2m: string
}

export interface PeriodicWeatherData {
    time: string[]
    weather_code: number[]
    precipitation: number[]
    temperature_2m: number[]
}
