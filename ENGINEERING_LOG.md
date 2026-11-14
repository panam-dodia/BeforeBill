# Before Bill — Engineering Log

A running record of what broke while building Before Bill, how I found the cause, and how I fixed it. Also notes key decisions and why they were made.

Each entry: **What happened → How I knew → Root cause → Fix → Lesson.**

---

## 1. Project scaffold failed: "Cannot create an app named 'Before Bill'"

**Date:** 2026-11-13

**What happened:** Running `npx create-expo-app@latest . --template blank-typescript@sdk-57` inside the `d:\Before Bill` folder failed immediately:

```
Cannot create an app named "Before Bill". The project name can only contain URL-friendly characters.
```

**How I knew:** The error message said it directly. When you pass `.` (current folder), create-expo-app uses the folder name as the app/package name.

**Root cause:** npm package names must be URL-friendly (lowercase, no spaces). The folder name `Before Bill` has a space and capitals. `create-expo-app --help` showed there is no flag to set the name separately from the path.

**Fix:** Scaffolded into a temporary folder named `before-bill`, then copied the files into `d:\Before Bill` (excluding the template's `.git` folder and Expo's `LICENSE`). Then set the user-facing display name to `"Before Bill"` in `app.json` — the display name *can* have spaces; only the package name/slug can't.

**Lesson:** There are two different names in an Expo app: the **package name / slug** (`before-bill`, technical, must be URL-safe) and the **display name** (`Before Bill`, what users see under the icon).

---

## 2. App wouldn't open on the phone: "Project is incompatible with this version of Expo Go"

**Date:** 2026-11-13

**What happened:** `npm start` worked, but scanning the QR code in Expo Go showed:

```
ERROR  Project is incompatible with this version of Expo Go
• The installed version of Expo Go is for SDK 58.
• The project you opened uses SDK 57.
```

**How I knew:** The error named both versions: phone app = SDK 58, project = SDK 57.

**Root cause:** Expo Go (the app on the phone) only runs projects built for one specific Expo SDK version. I had chosen SDK 57 because the Expo docs and the SDK 58 release notes both said "Expo Go for SDK 58 isn't in the app stores yet — use SDK 57 for Expo Go." By the time I tested, the Play Store had already shipped Expo Go for SDK 58, so the docs were out of date.

**Options considered:**
- A) Upgrade the project to SDK 58 — matches the store version, which keeps auto-updating.
- B) Sideload an older SDK 57 Expo Go — the store would likely update it again and break it.

**Fix (A):** Followed the official upgrade steps:

```
npx expo install expo@^58.0.0 --fix
npx expo-doctor@latest
npx tsc --noEmit
```

This moved Expo 57 → 58.0.25, React Native 0.86 → 0.88.1, React 19.2 → 19.3. I then pinned `expo` to `~58.0.25` (Expo's recommended `~` style — the CLI had warned about `^`). `expo-doctor` passed 20/20 checks and TypeScript compiled with no errors. Restarted the dev server with `npx expo start -c` to clear the cached SDK 57 bundle.

**Lesson:** The real device is the source of truth. Docs can lag behind store releases — when they disagree, check what's actually installed. Also: check the SDK version *before* adding native libraries, because Expo Go only includes the native modules bundled for its SDK.

---

## 3. Jest was installed as an app dependency instead of a dev dependency

**Date:** 2026-11-13

**What happened:** I installed Jest with the command from Expo's unit-testing docs:

```
npx expo install jest-expo jest @types/jest "--" --dev
```

It "succeeded", but `package.json` showed `jest`, `jest-expo` and `@types/jest` under `dependencies` (packages the app needs to run) instead of `devDependencies` (tools only used while developing).

**How I knew:** Two clues: (1) reading `package.json` after the install, and (2) a warning in the install output: `npm warn config dev Please use --include=dev instead.` — npm was treating `--dev` as an unrelated, deprecated setting, not as "save as dev dependency".

**Root cause:** `expo install` passes everything after `--` straight to npm. Old npm versions accepted `--dev` as "save to devDependencies"; npm 10 (what I have) does not — the correct flag is `--save-dev`. The Expo docs' command is out of date for npm 10.

**Fix:** Moved the three packages into `devDependencies` in `package.json` by hand, then ran `npm install` to sync the lock file. For the future the correct command is:

```
npx expo install <packages> -- --save-dev
```

**Lesson:** "It didn't error" isn't the same as "it worked" — check the result (here, `package.json`) and read warnings, not just errors.

---

## 4. A time-zone test that passed but wasn't actually testing anything

**Date:** 2026-11-13

**What happened:** The app will be published worldwide, so reminders must fire at 9:00 AM *local* time in every time zone. To prove the date logic works everywhere, I ran the test suite with the `TZ` environment variable set to different zones (New York, India, Sydney, Kiritimati, ...). Every run passed.

**How I knew something was wrong:** Before trusting it, I printed what time zone Node actually saw. Every run printed `GMT-0600 (Central Standard Time)` — my own machine's zone. So the "6 time zones" were really the same zone 6 times. A second attempt (setting the zone inside Jest's setup file) also passed, but a probe test printed an offset of `360` minutes — still Central. Two false passes.

**Root cause:** I was running the commands from **Git Bash**. Git Bash (MSYS) does not pass the `TZ` variable through to Windows programs like `node.exe`, so Node silently fell back to the system time zone. (Setting `process.env.TZ` inside Jest's sandbox didn't work either, because Jest gives each test file its own copy of `process.env`.) Running `node` from **PowerShell** with `$env:TZ='Asia/Kolkata'` correctly printed `GMT+0530 (India Standard Time)`.

**Fix:** Ran the tests from PowerShell with `$env:TZ` set, plus a temporary "probe" test that deliberately failed with the current time zone in its error message, so each run proved which zone it used:

| Zone | What the probe printed | Tests |
|---|---|---|
| America/New_York | GMT-0500 (Eastern Standard Time) | 31/31 passed |
| Asia/Kolkata | GMT+0530 (India Standard Time) | 31/31 passed |
| Australia/Sydney | GMT+1100 (Australian Eastern Daylight Time) | 31/31 passed |
| Pacific/Kiritimati | GMT+1400 (Line Islands Time) | 31/31 passed |
| Pacific/Pago_Pago | GMT-1100 (American Samoa Standard Time) | 31/31 passed |
| Europe/London | GMT+0000 (Greenwich Mean Time) | 31/31 passed |

That covers UTC−11 to UTC+14 and both hemispheres' daylight saving. The probe file was deleted afterwards.

**Lesson:** A green test only means something if you've confirmed the test is exercising what you think it is. When a test passes suspiciously easily, check the setup actually took effect.

---

## Decisions

### Stack: Expo managed workflow + Expo Go
Lets me test on my phone without Android Studio/Xcode. Tradeoff: only libraries already bundled in Expo Go can be used until I switch to a "development build".

### Template: `blank-typescript` instead of `default`
The `default` template includes Expo Router and example screens I'd have to delete. Started minimal; navigation is added when a second screen is needed.

### No automatic subscription detection
Android (Google Play Billing) and iOS (StoreKit) only let an app see **its own** purchases — not the user's subscriptions to other apps. So subscriptions are entered manually once, and the app handles dates and reminders from there.

### Reminders are date-based, not price-based
The goal is "don't get auto-charged by surprise", so the app only needs the renewal date. No price/currency in v1. Reminders fire **7 days** and **1 day** before renewal.

### Renewal dates are stored as plain calendar dates ("2026-11-22"), not timestamps
A renewal happens on a *day*, not at an instant. A timestamp like "22 Nov 00:00 UTC" is 21 Nov in New York, which would shift reminders by a day. Storing "2026-11-22" means 22 Nov everywhere. Date math converts dates to whole UTC days internally, because a UTC day is always 24 hours (no daylight-saving jumps).

### Reminders fire at 9:00 AM in the phone's own time zone
Computed with JavaScript's local-time `Date` constructor (`new Date(year, month, day - 7, 9, 0)`), which handles month/year rollover and daylight saving. Verified across 6 time zones (see entry 4). Known gap: reminders are booked as absolute moments, so if the user travels to another zone, already-booked reminders keep the old 9 AM — planned fix is to re-book when the app sees the time zone changed.

### Future renewals are computed from the original date, not the previous renewal
Month-end problem: Jan 31 + 1 month has no Jan-31 equivalent in February, so it becomes Feb 28. If each renewal were computed from the *previous* one, it would then stay on the 28th forever (Mar 28, Apr 28 ...). Computing the n-th renewal from the original anchor gives Jan 31 → Feb 28 → Mar 31. Same idea makes a Feb 29 yearly renewal go to Feb 28 in normal years and back to Feb 29 in leap years.

### Late additions skip reminders that are already in the past
If a subscription renews in 3 days, the 7-day reminder time has passed, so only the 1-day reminder is booked.

### Background rescheduling: book ahead + background task, no framework switch
Reminders for future cycles have to be booked by the app. I first said apps in Expo Go can't run in the background — **that was wrong**; on checking the SDK 58 docs, `expo-background-task` is included in Expo Go (it uses Android WorkManager and iOS BGTaskScheduler — the same system tools a Kotlin or Flutter app would use). Switching to Kotlin/Flutter wouldn't remove the real limit: iOS decides when background tasks run and doesn't guarantee they will. Plan: (1) book reminders for several renewals ahead, which the OS delivers even when the app is closed; (2) a background task re-books periodically as a backup; (3) opening the app also re-books.
