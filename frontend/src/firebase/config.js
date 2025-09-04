// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUBruvh2JzAt3V6ezzpLDPTsuBOS-O9sY",
  authDomain: "product-training-ai-v1.firebaseapp.com",
  projectId: "product-training-ai-v1",
  storageBucket: "product-training-ai-v1.firebasestorage.app",
  messagingSenderId: "843114867792",
  appId: "1:843114867792:web:bfa898cd71a334dd397555",
  measurementId: "G-2JC7P50R77"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;