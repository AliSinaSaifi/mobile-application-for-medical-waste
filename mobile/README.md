# MedWaste Mobile (Exact Website as Phone App)

This mobile app uses `react-native-webview` to open your existing MedWaste web UI, so the phone app looks exactly like your website.

## 1) Quick run on your phone (Expo Go)

### A. Start backend

From project root:

```bash
cd backend
npm install
npm run dev
```

Backend should run on `http://YOUR_PC_IP:5000`.

### B. Start frontend for LAN

Open a second terminal from project root:

```bash
npm install
npm run dev -- --host
```

Frontend should be available on `http://YOUR_PC_IP:5173`.

### C. Point mobile app to your frontend URL

Open `mobile/App.js` and set environment value when starting Expo:

```powershell
$env:EXPO_PUBLIC_WEB_APP_URL="http://YOUR_PC_IP:5173"; npm start
```

Or on macOS/Linux:

```bash
EXPO_PUBLIC_WEB_APP_URL=http://YOUR_PC_IP:5173 npm start
```

### D. Open on phone

1. Install **Expo Go** on Android/iOS.
2. Make sure phone and laptop are on the same Wi-Fi.
3. Scan the QR from Expo terminal.

---

## 2) Build real installable APK (for teacher/demo)

From `mobile` folder:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

When build finishes, Expo gives an `.apk` download link.

---

## Notes

- If app shows blank/error page, usually `EXPO_PUBLIC_WEB_APP_URL` is wrong or frontend/backend is not running.
- On Android emulator, fallback host in app is `10.0.2.2`; on iOS simulator, `localhost`.
