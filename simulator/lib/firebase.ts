// simulator/lib/firebase.ts
// Firebase configuration for the Hardware Simulator web dashboard

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ⚠️ Replace with your actual Firebase project config (same project as mobile)
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
export const auth = getAuth(app);
export default app;
