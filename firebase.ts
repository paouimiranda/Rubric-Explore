// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCONDSrcw_pHqXzWDjSTvucv7zFxGuavaQ",
  authDomain: "rubric-app-8f65c.firebaseapp.com",
  projectId: "rubric-app-8f65c",
  storageBucket: "rubric-app-8f65c.firebasestorage.app",
  messagingSenderId: "383859518826",
  appId: "1:383859518826:web:de8fce781ecd0a887c0913",
  measurementId: "G-SJQ5HCRDX3"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);