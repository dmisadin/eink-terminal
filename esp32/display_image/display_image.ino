#include "driver.h"
#include "secrets.h"
#include <SPI.h>
#include <TFT_eSPI.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_sleep.h"

#ifndef EPAPER_ENABLE
#error "EPAPER_ENABLE is NOT defined. You are not building the e-paper code path."
#endif

#ifdef EPAPER_ENABLE
EPaper epaper = EPaper();
#endif

// ---- CONFIG ----
static const char* IMAGE_URL = "http://192.168.100.38:3000/screen.bmp";
static const int W = 800;
static const int H = 480;
static const int ROW_BYTES  = (W + 7) / 8;          // 100
static const int ROW_STRIDE = (ROW_BYTES + 3) & ~3; // 4-byte aligned (=> 100)

static const bool INVERT_BITS = false;

// 10 minutes
static const uint64_t SLEEP_US = 10ULL * 60ULL * 1000000ULL;

// ---- helpers ----
static bool readExact(Stream& s, uint8_t* dst, size_t n, uint32_t timeoutMs = 15000) {
  uint32_t start = millis();
  size_t got = 0;
  while (got < n) {
    int c = s.read();
    if (c >= 0) {
      dst[got++] = (uint8_t)c;
      continue;
    }
    if (millis() - start > timeoutMs) return false;
    delay(1);
  }
  return true;
}

static uint16_t u16le(const uint8_t* p) { return (uint16_t)p[0] | ((uint16_t)p[1] << 8); }
static uint32_t u32le(const uint8_t* p) { return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24); }
static int32_t  s32le(const uint8_t* p) { return (int32_t)u32le(p); }

static bool fetchAndDrawBmp1bpp(const char* url) {
  HTTPClient http;
  http.begin(url);
  int code = http.GET();
  if (code != 200) {
    Serial.printf("HTTP %d\n", code);
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();

  // Read header + palette (we assume standard layout: 14+40+8 = 62 bytes)
  uint8_t hdr[62]; // 14 + 40 + 8 palette
  if (!readExact(*stream, hdr, sizeof(hdr))) {
    Serial.println("BMP header read failed");
    http.end();
    return false;
  }

  if (hdr[0] != 'B' || hdr[1] != 'M') {
    Serial.println("Not BMP");
    http.end();
    return false;
  }

  uint32_t pixelOffset = u32le(&hdr[10]);
  uint32_t dibSize     = u32le(&hdr[14]);
  int32_t  width       = s32le(&hdr[18]);
  int32_t  height      = s32le(&hdr[22]); // negative = top-down
  uint16_t planes      = u16le(&hdr[26]);
  uint16_t bpp         = u16le(&hdr[28]);
  uint32_t compression = u32le(&hdr[30]);

  if (dibSize < 40 || planes != 1 || bpp != 1 || compression != 0) {
    Serial.printf("Unsupported BMP: dib=%lu planes=%u bpp=%u comp=%lu\n",
                  (unsigned long)dibSize, planes, bpp, (unsigned long)compression);
    http.end();
    return false;
  }

  if (width != W || (height != H && height != -H)) {
    Serial.printf("Unexpected size: %ld x %ld\n", (long)width, (long)height);
    http.end();
    return false;
  }
  // Skip to pixel data if needed
  if (pixelOffset < sizeof(hdr)) {
    Serial.println("Bad pixel offset");
    http.end();
    return false;
  }

  // Skip to pixel data
  uint32_t skip = pixelOffset - sizeof(hdr);
  while (skip--) {
    int c = stream->read();
    if (c < 0) { delay(1); skip++; }
  }

  const bool topDown = (height < 0);

  epaper.fillScreen(TFT_WHITE);

  static uint8_t rowBuf[ROW_STRIDE];

  for (int y = 0; y < H; y++) {
    if (!readExact(*stream, rowBuf, ROW_STRIDE)) {
      Serial.printf("Row read failed: %d\n", y);
      http.end();
      return false;
    }

    int drawY = topDown ? y : (H - 1 - y);

    // draw pixels (packed 1-bit, MSB first; 1=white in our server)
    for (int x = 0; x < W; x++) {
      int byteIndex = x >> 3;
      int bit = 7 - (x & 7);
      bool bitVal = (rowBuf[byteIndex] >> bit) & 1;
      if (INVERT_BITS) bitVal = !bitVal;

      // bitVal == 1 => white, 0 => black
      if (!bitVal) epaper.drawPixel(x, drawY, TFT_BLACK);
    }
  }

  epaper.update();
  http.end();
  return true;
}

static bool connectWiFi(uint32_t timeoutMs = 15000) {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(true);          // modem-sleep while connected
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
    if (millis() - start > timeoutMs) {
      Serial.println("\nWiFi connect timeout");
      return false;
    }
  }
  Serial.printf("\nWiFi OK, IP=%s\n", WiFi.localIP().toString().c_str());
  return true;
}

static void goToSleep() {
  // cleanly shut down radios before sleeping
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  btStop(); // safe even if not used

  Serial.printf("Sleeping for %llu seconds...\n", (unsigned long long)(SLEEP_US / 1000000ULL));
  Serial.flush();

  esp_sleep_enable_timer_wakeup(SLEEP_US);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(300);

#ifdef EPAPER_ENABLE
  epaper.begin();
  epaper.setRotation(0);
#endif

  // Optional: see why we woke up
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  Serial.printf("Wake cause: %d\n", (int)cause);

  bool ok = connectWiFi();
  if (ok) {
    Serial.println("Fetching BMP...");
    ok = fetchAndDrawBmp1bpp(IMAGE_URL);
    Serial.println(ok ? "Displayed OK." : "Display failed.");
  }

  // Even if failed, sleep and try again next cycle
  goToSleep();
}

void loop() {
  // never reached
}
