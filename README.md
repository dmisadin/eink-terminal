# E-Ink Terminal (TRMNL DIY Kit + XIAO ESP32S3)

This project runs a **locally hosted e-ink dashboard** using the  
**Seeed Studio TRMNL 7.5" (OG) DIY Kit** and **XIAO ESP32S3**.

The ESP32:
- connects to Wi-Fi
- fetches a **1-bit BMP image** from a local server
- renders it on the e-ink display using **Seeed_GFX / EPaper**

---

## Hardware
- Seeed Studio **TRMNL 7.5" (OG) DIY Kit**
- **XIAO ESP32S3**
- 2.4 GHz Wi-Fi (ESP32 does not support 5 GHz)

**Important hardware notes**
- The **FPC ribbon cable metal contacts must face UP**
- Required **24Pin ↔ GND jumper** must be installed
- Use a good USB data cable (not charge-only)

---

## Software Stack
### ESP32 firmware
- Arduino IDE 2.x
- ESP32 core by Espressif
- **Seeed_GFX** (required for EPaper)

### Server
- Node.js
- Express
- Canvas

---

## Arduino IDE Setup

### 1. Install ESP32 board support

Tools → Boards → **Boards Manager**  
Install **"esp32 by Espressif Systems"**

Connect your microcontroller.

Select board:
Tools → Boards → esp32 → `XIAO ESP32S3`

Select port: i.e. `COM3`

---

### 2. Install the correct graphics library
Download repository as ZIP: https://github.com/Seeed-Studio/Seeed_GFX

Install via: `Sketch → Include Library → Add .ZIP Library…`

After installing:
- Remove or rename any of these if present:
  - `Seeed_Arduino_LCD`
  - `TFT_eSPI` (stock version)

Arduino must resolve: `TFT_eSPI.h → Seeed_GFX`

Once installed, **add this flag to files** `User_Setup.h` and `User_Setup_Select.h` located in `C:\Users\your_username\Documents\Arduino\libraries\Seeed_GFX`
```cpp
#define EPAPER_ENABLE
```
---

## driver.h (MANDATORY)

`driver.h` defines the display + driver board combination and enables EPaper.

Create **driver.h** in the same directory as your `.ino` file.

### Minimal working driver.h for TRMNL 7.5" (OG)
```cpp
#define BOARD_SCREEN_COMBO 502 // 7.5" monochrome ePaper (UC8179)
#define USE_XIAO_EPAPER_DISPLAY_BOARD_EE04 // XIAO ePaper driver board
```

## secrets.h (MANDATORY)

`secrets.h` defines the WiFi network credentials that will be used to connect to network.

Create **secrets.h** in the same directory as your `.ino` file. You can use the template [`secrets_example.h`](./esp32/secrets_example.h).

```cpp
#define WIFI_SSID     "YOUR_WIFI_NAME";
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD";
```