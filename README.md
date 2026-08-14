# Smart Home Monitoring & Control System
### SCS 3311 — Mini Project

> A full-stack IoT Smart Home system: **Expo React Native mobile app** + **Next.js Hardware Simulator** + **Firebase backend**.

---

## 📁 Project Structure

```
mini-project/
├── mobile/          # Expo React Native app (Android APK)
├── simulator/       # Next.js Hardware Simulator dashboard (web)
├── functions/       # Firebase Cloud Functions (safety cutoff worker)
├── firestore.rules  # Firestore security rules
├── firebase.json    # Firebase project config
└── .firebaserc      # Firebase project ID
```

---

## 🔧 Setup (Required Before Running)

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Firestore Database** (start in test mode)
4. Enable **Authentication** → Email/Password
5. Register an **Android app** → download `google-services.json` → place in `mobile/`
6. Register a **Web app** → copy the config snippet

### 2. Update Firebase Config

Paste your Firebase config into **all three** locations:
- `mobile/firebase/config.ts`
- `simulator/lib/firebase.ts`
- `.firebaserc` (your project ID)

### 3. Mobile App

```bash
cd mobile
npm install
npm run android     # Run on Android device/emulator
# OR
npx expo start      # Run with Expo Go
```

### 4. Hardware Simulator

```bash
cd simulator
npm install
npm run dev         # Opens at http://localhost:3000
```

### 5. Cloud Functions (Optional for demo, required for safety cutoff)

```bash
npm install -g firebase-tools
firebase login
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

## 📱 Mobile App Features

| Feature | Description |
|---|---|
| 🔐 Auth | Email/password login & registration |
| 🏠 Dashboard | Multi-floor home overview |
| 🗺️ Floor Editor | Add & remove rooms in the floor creation wizard |
| 🔌 Outlets | Simple ON/OFF power outlets |
| 🎛️ Multi-Switch | Gang box with individual switch control |
| 🪣 Scheduled (Iron) | Safety timer with countdown & auto-cutoff |
| 💡 Smart Lights | Auto-schedule ON/OFF at preset times |
| 📷 Cameras | Snapshot preview + stream modal |
| 📊 Reports | Usage analytics by device + event timeline |
| 🔔 Notifications | FCM push alerts on safety cutoffs |

---

## 🖥️ Hardware Simulator Features
- Real-time Firestore sync (updates within ~1 second)
- All 5 device types visually represented
- Live countdown timer for safety-critical devices
- Camera snapshot preview with LIVE badge
- Connection status indicator
- Deployable to Vercel for sharing

---

## ☁️ Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `safetyCutoffWorker` | Every 1 min | Auto-OFF irons exceeding `maxOnDuration` + FCM alert |
| `lightScheduleWorker` | Every 1 min | Auto ON/OFF lights by scheduled time |
| `onDeviceStatusChange` | Firestore write | Log every state change |

---

## 👥 Team Members

| Member | Module |
|---|---|
| Member 1 | Mobile UI: Dashboard, Floor Plan, Login |
| Member 2 | Device Components, Firebase Services, Real-time Sync |
| Member 3 | Hardware Simulator, Cloud Functions, Reports |

---

## 📦 APK Build

```bash
cd mobile
npx expo build:android
# OR with EAS:
npm install -g eas-cli
eas build -p android --profile preview
```
