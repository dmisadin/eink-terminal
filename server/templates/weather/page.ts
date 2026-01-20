import Chart, { FontSpec } from "chart.js/auto";

const OPEN_METEO_API_URL = "https://api.open-meteo.com/v1/forecast?latitude=40.4165&longitude=-3.7026&hourly=weather_code,precipitation,temperature_2m&timezone=Europe%2FBerlin&forecast_days=3";

type OpenMeteoResponse = {
    hourly: {
        time: string[];
        precipitation: number[];
        temperature_2m: number[];
        weather_code: number[];
    };
};

function hourLabel(iso: string): string {
    // iso like "2026-01-20T13:00"
    return iso.slice(11, 13);
}

async function fetchWeather(): Promise<OpenMeteoResponse> {
    const res = await fetch(OPEN_METEO_API_URL);
    if (!res.ok) throw new Error(`Open-Meteo failed: ${res.status}`);
    return (await res.json()) as OpenMeteoResponse;
}


async function main() {
    // timestamp
    const currentHour = new Date().getHours();
    const data = await fetchWeather();

    // Use next 24 hours
    const labels = data.hourly.time.slice(currentHour, currentHour + 24).map(hourLabel);
    const precip = data.hourly.precipitation.slice(currentHour, currentHour + 24);
    const temp = data.hourly.temperature_2m.slice(currentHour, currentHour + 24);

    const canvas = document.getElementById("wxChart") as HTMLCanvasElement | null;
    if (!canvas) throw new Error("Missing #wxChart canvas");

    // If Playwright renders multiple times in dev, avoid duplicate charts
    (Chart as any).getChart?.(canvas)?.destroy?.();

    const fontSpec: Partial<FontSpec> = { size: 16, weight: 600 };

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
                tooltip: { enabled: false } // better for e-ink screenshots
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0, 
                        autoSkip: true, 
                        font: fontSpec
                    }
                },
                yTemp: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: "°C", font: fontSpec },
                    ticks: { font: fontSpec }
                },
                yPrcp: {
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "mm", font: fontSpec },
                    grid: { drawOnChartArea: false }, // prevents messy double grid :contentReference[oaicite:1]{index=1}
                    ticks: { font: fontSpec }
                }
            }
        }
    });

    // Signal Playwright that the page is ready to screenshot
    (window as any).__RENDER_DONE__ = true;
}


main().then(() => {
    (window as any).__RENDER_DONE__ = true;
}).catch((e) => {
    console.error(e);
    (window as any).__RENDER_ERROR__ = String(e?.stack ?? e);
    // DO NOT set __RENDER_DONE__ here during debugging
});