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
assets/              Icons and splash images
src/
  app/               Screens (Expo Router: every file here is a screen)
    _layout.tsx      App root: opens the database, sets up navigation
    index.tsx        Home: list of subscriptions
    edit.tsx         Add / edit a subscription
  components/        Reusable UI pieces
  logic/             Plain TypeScript business logic (dates, reminder rules, list, form checks) — no React/Expo imports, unit-tested
  storage/           On-device SQLite database
  notifications/     Local reminder notifications — not set up yet
  types/             Shared TypeScript types
```

The app's entry point is `expo-router/entry` (set in `package.json`).
