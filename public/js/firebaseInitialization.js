// firebase-configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
        apiKey: "AIzaSyBDmFHPBsEUUtrsLCRrY9c1qcZE_kNx9l0",
        authDomain: "student-platform-a5328.firebaseapp.com",
        projectId: "student-platform-a5328",
        storageBucket: "student-platform-a5328.firebasestorage.app",
        messagingSenderId: "470217676616",
        appId: "1:470217676616:web:991de9edd7e85acab4857d"
        };
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);