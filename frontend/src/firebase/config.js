// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);