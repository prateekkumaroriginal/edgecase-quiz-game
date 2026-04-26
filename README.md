# Edgecase

Edgecase is a desktop MCQ platformer MVP built with Electron and Phaser. It targets a PC release path, with Windows packaging included through Electron Builder.

## Play Locally

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
npm run package:win
```

Packaging scripts clean the previous `release/` output first, so the folder only contains the latest generated build.

```powershell
npm run package:win
npm run package:linux
npm run package:mac
npm run package:all
npm run package:dir
```

Platform notes:

- `package:win` creates a Windows installer.
- `package:linux` creates AppImage and `.deb` outputs.
- `package:mac` creates DMG and ZIP outputs, but should be run on macOS for reliable signing/notarization later.
- `package:all` asks Electron Builder for Windows, Linux, and macOS outputs; cross-building may require platform-specific tooling.

## Controls

- Move: `A/D` or arrow keys
- Jump: `W`, `Up`, or `Space`
- Dash: `Shift` after buying Dash Boots
- Interact: `E`
- Answer MCQs: stand inside an answer door, then press `E`
- Menu navigation: `W/S`, arrow keys, `Space`, or `Enter`
- Merchant: `W/S` or arrows select, hold `Space` for 1 second to buy
- Pause/resume: `Esc`
- Restart from pause: `R`
- Main menu from pause: `M`
- Close merchant: `Esc`

## MVP Content

- Field: Tech
- One playable level
- Three MCQ challenge zones
- Sixteen short questions tagged by difficulty
- One merchant safe zone
- Four upgrades
- Voluntary exit gate to end the run

## Steam Publishing Notes

This project can produce a desktop build, but a real Steam release also needs store capsule art, legal metadata, Steamworks SDK integration if you want achievements/cloud saves, QA on clean Windows machines, and SteamPipe depot setup.
