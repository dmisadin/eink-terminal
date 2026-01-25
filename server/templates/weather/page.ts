import Chart, { FontSpec } from "chart.js/auto";
import { OpenMeteoModel } from "./open-meteo.model";
import annotationPlugin from "chartjs-plugin-annotation";

const OPEN_METEO_API_URL = "https://api.open-meteo.com/v1/forecast?latitude=43.5432&longitude=16.4931&hourly=weather_code,precipitation,temperature_2m&current=temperature_2m,apparent_temperature,weather_code,precipitation,is_day,wind_speed_10m,wind_direction_10m&timezone=Europe%2FBerlin&forecast_days=3";

function hourLabel(iso: string): string {
    // iso like "2026-01-20T13:00"
    return iso.slice(11, 13);
}

async function fetchWeather(): Promise<OpenMeteoModel> {
    const res = await fetch(OPEN_METEO_API_URL);
    if (!res.ok) throw new Error(`Open-Meteo failed: ${res.status}`);
    return (await res.json()) as OpenMeteoModel;
}


async function main() {
    // timestamp
    const currentHour = new Date().getHours();
    const data = await fetchWeather();

    updateDOMWithWeatherData(data);

    // Use next 24 hours
    const labels = data.hourly.time.slice(currentHour, currentHour + 24).map(hourLabel);
    const precip = data.hourly.precipitation.slice(currentHour, currentHour + 24);
    const temp = data.hourly.temperature_2m.slice(currentHour, currentHour + 24);

    const canvas = document.getElementById("wxChart") as HTMLCanvasElement | null;
    if (!canvas) throw new Error("Missing #wxChart canvas");

    // If Playwright renders multiple times in dev, avoid duplicate charts
    (Chart as any).getChart?.(canvas)?.destroy?.();
    Chart.register(annotationPlugin);

    const fontSpec: Partial<FontSpec> = { size: 16, weight: 400 };
    const fontTitleSpec: Partial<FontSpec> = { size: 20, weight: 600 };

    new Chart(canvas, {
        data: {
            labels,
            datasets: [
                {
                    type: "line",
                    label: "Temp (°C)",
                    data: temp,
                    yAxisID: "yTemp",
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 3,
                    borderColor: "black"
                },
                {
                    type: "bar",
                    label: "Precip (mm)",
                    data: precip,
                    yAxisID: "yPrcp",
                    barPercentage: 0.9,
                    categoryPercentage: 0.9,
                    backgroundColor: "#777"
                }
            ]
        },
        options: {
            responsive: false,
            animation: false,
            normalized: true,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }, // better for e-ink screenshots
                annotation: {
                    annotations: {
                        midnightLine: {
                            type: "line",
                            scaleID: "x",
                            value: "00",
                            borderColor: "black",
                            borderWidth: 2
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        font: fontSpec,
                        color: "black"
                    },
                    grid: { color: "#9a9a9a" }
                },
                yTemp: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: "TEMPERATURA °C", font: fontTitleSpec, color: "black" },
                    ticks: { font: fontSpec, color: "black", precision: 0 },
                    grid: { color: "#9a9a9a" }
                },
                yPrcp: {
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "PADALINE mm", font: fontTitleSpec, color: "black" },
                    grid: { drawOnChartArea: false }, // prevents messy double grid :contentReference[oaicite:1]{index=1}
                    ticks: { font: fontSpec, color: "black", precision: 0 },
                    suggestedMax: 4
                }
            }
        }
    });

    // Signal Playwright that the page is ready to screenshot
    (window as any).__RENDER_DONE__ = true;
}

function setText(selector: string, value: string) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) el.textContent = value;
}

function updateDOMWithWeatherData(data: OpenMeteoModel) {
    setText("#timestamp", formattedTimestamp(data.current.time));
    setText("#temperature", `${Math.round(data.current.temperature_2m)}°C`);
    setText("#apparent-temperature", `${Math.round(data.current.apparent_temperature)}°C`);
    setText("#precipitation .amount", Math.round(data.current.precipitation).toString());
    setText("#wind-speed .amount", Math.round(data.current.wind_speed_10m).toString());
    setText("#wind-direction .amount", getWindDirectionHr(data.current.wind_direction_10m));
}

function getWindDirectionHr(deg: number): string {
    const directions = [
        "sjever",
        "sjeveroistok",
        "istok",
        "jugoistok",
        "jug",
        "jugozapad",
        "zapad",
        "sjeverozapad"
    ];

    const index = Math.round(deg / 45) % 8;
    return directions[index];
}

function formattedTimestamp(isoString: string) {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }

    return date.toLocaleString("hr-HR", options);
}

main().then(() => {
    (window as any).__RENDER_DONE__ = true;
}).catch((e) => {
    console.error(e);
    (window as any).__RENDER_ERROR__ = String(e?.stack ?? e);
    // DO NOT set __RENDER_DONE__ here during debugging
});