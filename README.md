<div align="center">

<img src="assets/banner.svg" alt="Banner" width="100%"/>

# 8 Ball Pool Predictor

### Premium trajectory predictor & mod menu — by LionX Engine.

</div>

---

## <img src="assets/icons/book.svg" width="24" height="24" alt=""/> Contents

- Features
- How It Works
- Building library.so
- Attaching to the Game
- Security
- Prediction System
- Menu Tabs
- Project Structure
- Tech Stack
- License Panel
- Support

---

## <img src="assets/icons/star.svg" width="24" height="24" alt=""/> Features

### <img src="assets/icons/crosshair.svg" width="20" height="20" alt=""/> Draw Settings (Prediction)

| Feature | Description |
|---|---|
| <img src="assets/icons/target.svg" width="18" height="18" alt=""/> **Draw Lines** | Trajectory prediction line — exact ball path before every shot |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **Draw Pockets** | Pocket indicators with visual highlight |
| <img src="assets/icons/tag.svg" width="18" height="18" alt=""/> **Show Ball Numbers** | Ball number displayed on every ball |
| <img src="assets/icons/zap.svg" width="18" height="18" alt=""/> **Bounce Sync** | Cushion bounce markers |
| <img src="assets/icons/trending-up.svg" width="18" height="18" alt=""/> **Line Extension** | Extended aim guideline for long shots |
| <img src="assets/icons/timer.svg" width="18" height="18" alt=""/> **After Shot** | Prediction line stays after the shot |

### <img src="assets/icons/play.svg" width="20" height="20" alt=""/> Auto Play System

| Feature | Description |
|---|---|
| <img src="assets/icons/play.svg" width="18" height="18" alt=""/> **Auto Play Mode** | Fully automatic gameplay |
| <img src="assets/icons/crosshair.svg" width="18" height="18" alt=""/> **Auto Aim** | Aim assist — sets cue to the best angle |
| <img src="assets/icons/target.svg" width="18" height="18" alt=""/> **Auto Pocket** | Automatic pocket targeting |
| <img src="assets/icons/sparkles.svg" width="18" height="18" alt=""/> **Auto Spin** | Automatic spin control |
| <img src="assets/icons/shield.svg" width="18" height="18" alt=""/> **Cushion Shot** | Bank shots off the cushion |
| <img src="assets/icons/star.svg" width="18" height="18" alt=""/> **Clean Table** | Systematic table clearing |

### <img src="assets/icons/users.svg" width="20" height="20" alt=""/> Auto Queue

| Feature | Description |
|---|---|
| <img src="assets/icons/users.svg" width="18" height="18" alt=""/> **Auto Queue** | Automatic matchmaking |

### <img src="assets/icons/wrench.svg" width="20" height="20" alt=""/> Extra Settings

| Feature | Description |
|---|---|
| <img src="assets/icons/sliders-horizontal.svg" width="18" height="18" alt=""/> **Power Slider** | Fine shot-power control |
| <img src="assets/icons/gauge.svg" width="18" height="18" alt=""/> **Button Clicker** | Automates repetitive taps |
| <img src="assets/icons/shield.svg" width="18" height="18" alt=""/> **Disable Ads** | Blocks in-game ads |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **Disable Flicker** | Smooth overlay rendering |
| <img src="assets/icons/gauge.svg" width="18" height="18" alt=""/> **FPS Counter** | Real-time FPS display |

---

## <img src="assets/icons/cpu.svg" width="24" height="24" alt=""/> How It Works

The project is a **native shared library** (`library.so`) that runs **inside the 8 Ball Pool game process**. Architecture overview:

```
┌─────────────────────────────────────────────────┐
│  8 Ball Pool APK (com.miniclip.eightballpool)   │
│                                                 │
│  ┌──────────────┐      ┌──────────────────────┐  │
│  │ Game Engine  │◄────►│    library.so        │  │
│  │ (libmain)    │ hooks│  ┌────────────────┐  │  │
│  └──────────────┘      │  │ Prediction     │  │  │
│                        │  │ engine         │  │  │
│                        │  ├────────────────┤  │  │
│                        │  │ ImGui menu     │  │  │
│                        │  │ (5 tabs)       │  │  │
│                        │  ├────────────────┤  │  │
│                        │  │ License check  │  │  │
│                        │  └────────────────┘  │  │
│                        └──────────────────────┘  │
└─────────────────────────────────────────────────┘
```

1. **Injection** — `library.so` is loaded into the game process at startup (see [Attaching to the Game](#attaching-to-the-game)).
2. **Hooks** — On load, `JNI_OnLoad` fires: it verifies the package name, then hooks key game functions (`setActiveVisualCue`, `StartMatch`) using And64InlineHook/Substrate.
3. **Prediction** — Every frame, the engine reads ball positions from game memory, calculates trajectories, collisions and bounces, then draws prediction lines through an ImGui overlay.
4. **Menu** — A floating ImGui menu (5 tabs) lets the user toggle every feature in real time.
5. **License** — A key-based license system validates the user before features unlock.

---

## <img src="assets/icons/wrench.svg" width="24" height="24" alt=""/> Building library.so

`library.so` is compiled from the C++ sources in `app/src/main/jni/` using the **Android NDK** (`ndk-build`).

### Requirements

- Android NDK r25 or newer (tested: r28, r29)
- Windows (`build.bat`) or any OS with `ndk-build` on PATH
- Target: `arm64-v8a`, platform `android-29`, C++20, release build

### Build configuration

| Setting | Value |
|---|---|
| Module name | `rary` → outputs `library.so` |
| ABI | `arm64-v8a` |
| STL | `c++_static` |
| Optimization | Release (`-O2`, stripped) |
| Visibility | Hidden (`-fvisibility=hidden`) |
| Static libs linked | libcurl, libssl, libcrypto |

Defined in `app/src/main/jni/Android.mk` and `Application.mk`.

### Build steps

**Option A — using build.bat (Windows):**

```bat
build.bat
```

This runs `ndk-build -C app\src\main -j8 -B`, then copies the output:

```
app\src\main\libs\arm64-v8a\library.so  →  .\library.so
```

**Option B — manual ndk-build:**

```bash
ndk-build -C app/src/main -j8 -B
# output: app/src/main/libs/arm64-v8a/library.so
```

**Option C — Android Studio:**

Open the project, sync Gradle, then `Build → Make Project`.
The APK build also compiles the native library via externalNativeBuild.

### Output

The compiled `library.so` (~6 MB, ARM64, stripped) is the injectable module.
It exports `JNI_OnLoad` as its entry point.

---

## <img src="assets/icons/zap.svg" width="24" height="24" alt=""/> Attaching to the Game

`library.so` must be loaded **inside the 8 Ball Pool process** (`com.miniclip.eightballpool`).
The standard method is APK patching:

### Step 1 — Get the game APK

Download the 8 Ball Pool APK (matching the version the offsets were built for)
or pull it from a device:

```bash
adb pull /data/app/com.miniclip.eightballpool-*/base.apk
```

### Step 2 — Decompile

```bash
apktool d base.apk -o patched
```

### Step 3 — Add the library

Copy the built `library.so` into the APK's native lib folder:

```
patched/lib/arm64-v8a/library.so
```

### Step 4 — Add the loader

Patch the main activity's `onCreate` (smali) to load the library at startup:

```smali
const-string v0, "rary"
invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V
```

(`rary` is the module name — Android resolves it to `library.so`.)

### Step 5 — Rebuild and sign

```bash
apktool b patched -o modded.apk
# sign with your own keystore:
apksigner sign --ks my-release-key.jks modded.apk
```

### Step 6 — Install

```bash
adb install modded.apk
```

### What happens at runtime

1. Game starts → `System.loadLibrary("rary")` loads `library.so`.
2. `JNI_OnLoad` runs: verifies the package is `com.miniclip.eightballpool`,
   checks for Xposed/root frameworks, and starts code-integrity protection.
3. Hooks are installed on game functions; the ImGui menu appears as a floating overlay.
4. The license screen prompts for a key before features activate.

> **Note:** The library refuses to run if injected into any other app —
> the package-name check is a built-in safety measure.

---

## <img src="assets/icons/shield.svg" width="24" height="24" alt=""/> Security

Built-in protections in `library.so`:

| Protection | Description |
|---|---|
| <img src="assets/icons/shield-check.svg" width="18" height="18" alt=""/> **Package verification** | `JNI_OnLoad` checks the host package is `com.miniclip.eightballpool`; refuses to run elsewhere |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **Xposed detection** | Detects Xposed/EdXposed frameworks at startup |
| <img src="assets/icons/lock.svg" width="18" height="18" alt=""/> **Code integrity** | Checksums the executable code segment via `/proc/self/maps` to detect tampering |
| <img src="assets/icons/code.svg" width="18" height="18" alt=""/> **String obfuscation** | Sensitive strings encrypted with XOR (`oxorany`) |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **Symbol hiding** | `-fvisibility=hidden` and `--strip-all` remove symbols from the binary |
| <img src="assets/icons/key.svg" width="18" height="18" alt=""/> **License keys** | Time-based keys validated through the license panel backend |

---

## <img src="assets/icons/target.svg" width="24" height="24" alt=""/> Prediction System

1. **Ball Tracking** — cue ball and object ball positions read from game memory
2. **Trajectory Calculation** — path computed from the shot angle
3. **Collision Detection** — first contact point and post-bounce path predicted
4. **Pocket Analysis** — target pocket highlighted
5. **Visual Overlay** — smooth lines and markers drawn with ImGui

---

## <img src="assets/icons/layers.svg" width="24" height="24" alt=""/> Menu Tabs

| Tab | Content |
|---|---|
| <img src="assets/icons/crosshair.svg" width="18" height="18" alt=""/> **Draw Settings** | Prediction lines, pockets, ball numbers, bounce markers |
| <img src="assets/icons/play.svg" width="18" height="18" alt=""/> **Auto Play** | Auto play, auto aim, auto pocket, spin, cushion shots |
| <img src="assets/icons/users.svg" width="18" height="18" alt=""/> **Auto Queue** | Matchmaking automation |
| <img src="assets/icons/wrench.svg" width="18" height="18" alt=""/> **Extra Settings** | Power slider, clicker, ads off, FPS counter |
| <img src="assets/icons/book.svg" width="18" height="18" alt=""/> **Info** | License status, expiry countdown, version |

The menu header shows a VIP license expiry countdown.

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
├── build.bat                        # NDK build script
└── LICENSE
```

---

## <img src="assets/icons/smartphone.svg" width="24" height="24" alt=""/> Tech Stack

| Technology | Purpose |
|---|---|
| <img src="assets/icons/smartphone.svg" width="18" height="18" alt=""/> **Android (Java)** | App shell, floating overlay |
| <img src="assets/icons/code.svg" width="18" height="18" alt=""/> **C++ (NDK)** | Hooks, prediction engine |
| <img src="assets/icons/eye.svg" width="18" height="18" alt=""/> **ImGui** | In-game menu UI |
| <img src="assets/icons/cpu.svg" width="18" height="18" alt=""/> **And64InlineHook / Substrate / xhook** | Function hooking |
| <img src="assets/icons/globe.svg" width="18" height="18" alt=""/> **HTML / CSS / JS** | License panel |
| <img src="assets/icons/cloud.svg" width="18" height="18" alt=""/> **Firebase** | License backend |

---

## <img src="assets/icons/key.svg" width="24" height="24" alt=""/> License Panel

| Feature | Description |
|---|---|
| <img src="assets/icons/key.svg" width="18" height="18" alt=""/> **Key Generation** | Time-based license keys |
| <img src="assets/icons/users.svg" width="18" height="18" alt=""/> **User Management** | Track users and keys |
| <img src="assets/icons/shield.svg" width="18" height="18" alt=""/> **Admin Dashboard** | Keys, expiry, logs in one place |
| <img src="assets/icons/cloud.svg" width="18" height="18" alt=""/> **Firebase Backend** | Real-time sync |

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

---

## <img src="assets/icons/messages-square.svg" width="24" height="24" alt=""/> Support

- **Channel:** [LionX Engine](https://t.me/LionX_Engine)
- **Support:** [LionX Support](https://t.me/LionXsupport_bot)

---

<div align="center">

Built with passion by **LionX Engine**

</div>
