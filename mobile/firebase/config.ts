// firebase/config.ts - Firebase initialization for mobile app
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { createAsyncStorage } from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBQkva0qhNkgA18SdHUSVFPode5B-PlZ8g",
  authDomain: "mini-project-1fcab.firebaseapp.com",
  projectId: "mini-project-1fcab",
  storageBucket: "mini-project-1fcab.firebasestorage.app",
  messagingSenderId: "736986625313",
  appId: "1:736986625313:web:52b79248a6c51e31b53a60",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Use React Native persistence for Auth
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(createAsyncStorage("app")),
});

export default app;
