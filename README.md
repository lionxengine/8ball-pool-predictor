<div align="center">

<img src="assets/banner.svg" alt="8 Ball Pool Predictor Banner" width="100%"/>

</div>

<div align="center">

# 8 Ball Pool Predictor

### LionX Engine ka premium trajectory predictor and mod menu.

[![Android](https://img.shields.io/badge/Android-7.0%2B-3DDC84?style=for-the-badge&logo=android)](https://www.android.com/)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)](LICENSE)

</div>

---

## <img src="assets/icons/star.svg" width="24" height="24" alt=""/> Features

### <img src="assets/icons/crosshair.svg" width="20" height="20" alt=""/> Draw Settings (Prediction)

| Feature | Description |
|---|---|
| <img src="assets/icons/target.svg" width="18" height="18" alt=""/> **Draw Lines** | Trajectory prediction line — har shot se pehle exact path |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **Draw Pockets** | Pocket indicators — target pocket visual highlight |
| <img src="assets/icons/tag.svg" width="18" height="18" alt=""/> **Show Ball Numbers** | Har ball pe uska number display |
| <img src="assets/icons/zap.svg" width="18" height="18" alt=""/> **Bounce Sync** | Cushion bounce markers |
| <img src="assets/icons/trending-up.svg" width="18" height="18" alt=""/> **Line Extension** | Aim guideline lambi — long shots ke liye |
| <img src="assets/icons/timer.svg" width="18" height="18" alt=""/> **After Shot** | Shot ke baad bhi line — next shot plan karo |

### <img src="assets/icons/play.svg" width="20" height="20" alt=""/> Auto Play System

| Feature | Description |
|---|---|
| <img src="assets/icons/play.svg" width="18" height="18" alt=""/> **Auto Play Mode** | Full automatic gameplay — AI khud shots lagata hai |
| <img src="assets/icons/crosshair.svg" width="18" height="18" alt=""/> **Auto Aim** | Aim assist — best angle pe cue set |
| <img src="assets/icons/target.svg" width="18" height="18" alt=""/> **Auto Pocket** | Automatic pocket targeting |
| <img src="assets/icons/sparkles.svg" width="18" height="18" alt=""/> **Auto Spin** | Automatic spin control |
| <img src="assets/icons/shield.svg" width="18" height="18" alt=""/> **Cushion Shot** | Bank shots — deewar se laga ke |
| <img src="assets/icons/star.svg" width="18" height="18" alt=""/> **Clean Table** | Table clear mode |

### <img src="assets/icons/layers.svg" width="20" height="20" alt=""/> Auto Queue

| Feature | Description |
|---|---|
| <img src="assets/icons/users.svg" width="18" height="18" alt=""/> **Auto Queue** | Automatic matchmaking |

### <img src="assets/icons/wrench.svg" width="20" height="20" alt=""/> Extra Settings

| Feature | Description |
|---|---|
| <img src="assets/icons/sliders-horizontal.svg" width="18" height="18" alt=""/> **Power Slider** | Shot power fine control |
| <img src="assets/icons/gauge.svg" width="18" height="18" alt=""/> **Button Clicker** | Auto clicker |
| <img src="assets/icons/shield.svg" width="18" height="18" alt=""/> **Disable Ads** | Game ads block |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **Disable Flicker** | Smooth overlay rendering |
| <img src="assets/icons/gauge.svg" width="18" height="18" alt=""/> **FPS Counter** | Real-time FPS display |

---

## <img src="assets/icons/target.svg" width="24" height="24" alt=""/> Prediction System

1. **Ball Tracking** — Cue ball aur object balls ki position track
2. **Trajectory Calculation** — Shot angle se path calculate
3. **Collision Detection** — Pehli collision aur bounce predict
4. **Pocket Analysis** — Target pocket highlight
5. **Visual Overlay** — ImGui se smooth lines aur markers

---

## <img src="assets/icons/cpu.svg" width="24" height="24" alt=""/> Menu Tabs

| Tab | Content |
|---|---|
| **Draw Settings** | Prediction lines, pockets, ball numbers, bounce markers |
| **Auto Play** | Auto play, auto aim, auto pocket, spin, cushion shots |
| **Auto Queue** | Matchmaking automation |
| **Extra Settings** | Power slider, clicker, ads off, FPS counter |
| **Info** | License status, expiry time, version info |

Menu me **VIP header** hai jo license expiry countdown dikhata hai.

---

## <img src="assets/icons/folder.svg" width="24" height="24" alt=""/> Project Structure

```
8ball-pool-predictor/
├── app/src/main/
│   ├── java/com/eightballpool/bp/   # App shell, floating button
│   ├── jni/                         # Native C++ (hooks, menu, prediction)
│   │   ├── main.cpp / menu.h / game.h
│   │   ├── mod/                     # PowerSlider, Clicker, keylogin
│   │   ├── game/inc/                # Prediction.fast.h, AutoPlay.impl.h
│   │   └── include/external/        # xhook, Substrate, imgui
│   └── res/
├── index.html / app.js / style.css  # License panel (web)
├── license_panel/                   # Firebase hosting panel
├── build.bat / patch_apk.ps1        # Build scripts
└── LICENSE
```

---

## <img src="assets/icons/layers.svg" width="24" height="24" alt=""/> Tech Stack

| Technology | Purpose |
|---|---|
| <img src="assets/icons/smartphone.svg" width="18" height="18" alt=""/> **Android (Java)** | App shell, floating overlay |
| <img src="assets/icons/code.svg" width="18" height="18" alt=""/> **C++ (NDK)** | Hooks, prediction engine |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **ImGui** | In-game menu UI |
| <img src="assets/icons/cpu.svg" width="18" height="18" alt=""/> **And64InlineHook / Substrate / xhook** | Function hooking |
| <img src="assets/icons/globe.svg" width="18" height="18" alt=""/> **HTML / CSS / JS** | License panel |
| <img src="assets/icons/cloud.svg" width="18" height="18" alt=""/> **Firebase** | License backend |

---

## <img src="assets/icons/rocket.svg" width="24" height="24" alt=""/> Build

**Requirements:** Android Studio, NDK r25+, JDK 17

```bash
git clone https://github.com/lionxengine/8ball-pool-predictor.git
# Android Studio me kholo, ya:
./gradlew assembleDebug
```

> Signing ke liye apni keystore use karo — `final_key.jks` repo me nahi hai.

---

## <img src="assets/icons/key.svg" width="24" height="24" alt=""/> License Panel

| Feature | Description |
|---|---|
| <img src="assets/icons/key.svg" width="18" height="18" alt=""/> **Key Generation** | Time-based license keys |
| <img src="assets/icons/users.svg" width="18" height="18" alt=""/> **User Management** | Users aur keys track karo |
| <img src="assets/icons/shield.svg" width="18" height="18" alt=""/> **Admin Dashboard** | Keys, expiry, logs ek jagah |
| <img src="assets/icons/cloud.svg" width="18" height="18" alt=""/> **Firebase Backend** | Real-time sync |

```bash
python3 -m http.server 8000
# http://localhost:8000 kholo
```

---

## <img src="assets/icons/messages-square.svg" width="24" height="24" alt=""/> Support

- **Channel:** [LionX Engine](https://t.me/LionX_Engine)
- **Support:** [LionX Support](https://t.me/LionXsupport_bot)

---

<div align="center">

<img src="assets/icons/heart.svg" width="18" height="18" alt=""/> Built with passion by **LionX Engine**

</div>
