# Before Bill

A mobile app that tracks app and service subscriptions and free trials, shows what's renewing soon, and reminds you before auto-pay so you can cancel what you don't use.

Expo (SDK 58, managed workflow) + React Native + TypeScript (strict). Runs on Android and iOS.

## Prerequisites

- Node.js 22.13 or newer (check with `node --version`)
- The **Expo Go** app on your phone (Google Play / App Store), version for SDK 58
- Phone and computer on the same Wi-Fi network

> The project's Expo SDK must match the SDK of the Expo Go app on your phone.

## Setup

Run in Windows cmd.exe:

```
cd /d "d:\Before Bill"
npm install
```

## Run

```
npm start
```

This starts the Expo dev server and shows a QR code.

- **Android:** open Expo Go and scan the QR code.
- **iOS:** scan the QR code with the Camera app, then open it in Expo Go.

If the phone can't connect (e.g. different network or firewall), try:

```
npx expo start --tunnel
```

## Check types

```
npx tsc --noEmit
```

## Run tests

```
npm test
```

To run the tests as if the computer were in another time zone (use PowerShell — Git Bash does not pass `TZ` to Node on Windows):

```
$env:TZ='Asia/Kolkata'; npm test
```

## Folder layout

```
App.tsx              App root
index.ts             Entry point (registers App)
assets/              Icons and splash images
src/
  screens/           One file per screen (HomeScreen.tsx)
  components/        Reusable UI pieces
  logic/             Plain TypeScript business logic (dates, totals, reminder rules) — no React/Expo imports, unit-testable
  storage/           On-device storage (SQLite) — not set up yet
  notifications/     Local reminder notifications — not set up yet
  types/             Shared TypeScript types
```
