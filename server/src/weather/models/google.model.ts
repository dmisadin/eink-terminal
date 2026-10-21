export interface GoogleQuantity {
    quantity?: number;
    unit?: string;
}

export interface GoogleTemperature {
    degrees: number;
}

export interface GoogleCurrentResponse {
    currentTime: string;
    temperature: GoogleTemperature;
    feelsLikeTemperature?: GoogleTemperature;
    precipitation?: {
        qpf?: GoogleQuantity;
    };
    wind?: {
        speed?: { value: number };
        direction?: { degrees: number };
    };
}

export interface GoogleHourlyResponse {
    forecastHours?: Array<{
        interval: {
            startTime: string;
        };
        temperature: GoogleTemperature;
        precipitation?: {
            qpf?: GoogleQuantity;
        };
    }>;
}