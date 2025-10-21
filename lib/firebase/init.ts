import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBHTZkZ3Naom44VPgIf_1_vyrV9MoMUIbY",
    authDomain: "job-hiring-7ad88.firebaseapp.com",
    databaseURL: "https://job-hiring-7ad88-default-rtdb.firebaseio.com",
    projectId: "job-hiring-7ad88",
    storageBucket: "job-hiring-7ad88.firebasestorage.app",
    messagingSenderId: "414679465503",
    appId: "1:414679465503:web:39889b421aab4041c0df2a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
