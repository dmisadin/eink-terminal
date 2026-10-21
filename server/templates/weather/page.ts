import Chart, { FontSpec } from "chart.js/auto";
import annotationPlugin from "chartjs-plugin-annotation";
import type { WeatherData } from "../../src/weather/weather.model.js";

function hourLabel(iso: string): string {
    // Open-Meteo returns local timestamps without an offset.
    // Google returns RFC 3339 timestamps, normally in UTC.
    if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(iso)) {
        return iso.slice(11, 13);
    }

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Zagreb",
        hour: "2-digit",
        hourCycle: "h23"
    }).format(new Date(iso));
}

async function loadWeather(): Promise<WeatherData> {
    const response = await fetch("/api/weather");

    if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
    }

    return response.json() as Promise<WeatherData>;
}

async function main() {
    const data = await loadWeather();

    updateDOMWithWeatherData(data);

    const labels = data.hourly.time.map(hourLabel);
    const precip = data.hourly.precipitation;
    const temp = data.hourly.temperature;

    const canvas = document.getElementById("wxChart") as HTMLCanvasElement | null;
    if (!canvas) throw new Error("Missing #wxChart canvas");

    // Avoid duplicate charts during repeated Playwright renders.
    Chart.getChart(canvas)?.destroy();
    Chart.register(annotationPlugin);

    const fontValueSpec: Partial<FontSpec> = {
        size: 16,
        weight: 600
    };

    const fontTitleSpec: Partial<FontSpec> = {
        size: 20,
        weight: 600
    };

    const gradient = canvas
        .getContext("2d")
        ?.createLinearGradient(0, 0, 0, 400);

    gradient?.addColorStop(0, "rgba(0,0,0,0.4)");
    gradient?.addColorStop(0.6, "rgba(0,0,0,0)");

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
                    borderColor: "black",
                    backgroundColor: gradient,
                    fill: true
                },
                {
                    type: "bar",
                    label: "Precip (mm)",
                    data: precip,
                    yAxisID: "yPrcp",
                    barPercentage: 0.9,
                    categoryPercentage: 0.9,
                    backgroundColor: "#555"
                }
            ]
        },
        options: {
            responsive: false,
            animation: false,
            normalized: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                },
                annotation: {
                    annotations: {
                        midnightLine: {
                            type: "line",
                            scaleID: "x",
                            value: "00",
                            borderColor: "black",
                            borderWidth: 2,
                            borderDash: [4]
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        font: fontValueSpec,
                        color: "black"
                    },
                    grid: {
                        color: "#9a9a9a"
                    }
                },
                yTemp: {
                    type: "linear",
                    position: "left",
                    title: {
                        display: true,
                        text: "TEMPERATURA °C",
                        font: fontTitleSpec,
                        color: "black"
                    },
                    ticks: {
                        font: fontValueSpec,
                        color: "black",
                        precision: 0
                    },
                    grid: {
                        color: "#9a9a9a"
                    },
                    suggestedMin: 0
                },
                yPrcp: {
                    type: "linear",
                    position: "right",
                    title: {
                        display: true,
                        text: "PADALINE mm",
                        font: fontTitleSpec,
                        color: "black"
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        font: fontValueSpec,
                        color: "black",
                        precision: 1,
                        stepSize: 0.5
                    },
                    suggestedMax: 2
                }
            }
        }
    });

    // Signal Playwright that rendering has finished.
    (window as any).__RENDER_DONE__ = true;
}

function setText(selector: string, value: string) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) el.textContent = value;
}

function updateDOMWithWeatherData(data: WeatherData) {
    setText("#timestamp", formattedTimestamp(data.current.time));
    setText("#temperature", `${Math.round(data.current.temperature)}°C`);

    setText(
        "#apparent-temperature",
        `${Math.round(data.current.apparentTemperature)}°C`
    );

    setText(
        "#precipitation .amount",
        Math.round(data.current.precipitation).toString()
    );

    setText(
        "#wind-speed .amount",
        Math.round(data.current.windSpeed).toString()
    );

    setText(
        "#wind-direction .amount",
        getWindDirectionHr(data.current.windDirection)
    );
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

    return directions[Math.round(deg / 45) % 8];
}

function formattedTimestamp(isoString: string): string {
    const date = new Date(isoString);

    return date.toLocaleString("hr-HR", {
        timeZone: "Europe/Zagreb",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

main()
    .then(() => {
        (window as any).__RENDER_DONE__ = true;
    })
    .catch((error) => {
        console.error(error);
        (window as any).__RENDER_ERROR__ =
            String(error?.stack ?? error);
        // Leave __RENDER_DONE__ unset when rendering fails.
    });
