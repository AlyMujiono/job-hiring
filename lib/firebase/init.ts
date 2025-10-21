// init.ts
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBHTZkZ3Naom44VPgIf_1_vyrV9MoMUIbY",
    authDomain: "job-hiring-7ad88.firebaseapp.com",
    // Catatan: Jika Anda fokus pada Firestore, databaseURL ini (untuk Realtime DB) tidak diperlukan.
    databaseURL: "https://job-hiring-7ad88-default-rtdb.firebaseio.com", 
    projectId: "job-hiring-7ad88",
    storageBucket: "job-hiring-7ad88.firebasestorage.app",
    messagingSenderId: "414679465503",
    appId: "1:414679465503:web:39889b421aab4041c0df2a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export default app; // Ekspor instance app