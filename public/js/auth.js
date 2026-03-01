import { auth, db } from "./firebaseInitialization.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log(" AUTH.JS LOADED");

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export function setupLogin() {

    console.log(" setupLogin() running");

    const googleBtn = document.getElementById("loginBtn");
    console.log(" Google button element:", googleBtn);

    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            console.log(" Google button clicked");

            try {
                await signInWithPopup(auth, googleProvider);
                console.log(" signInWithPopup triggered");
            } catch (error) {
                console.error("Google login error:", error);
            }
        });
    } else {
        console.log(" loginBtn NOT FOUND in DOM");
    }
    // Central auth listener
    onAuthStateChanged(auth, async (user) => {
        console.log(" onAuthStateChanged fired. User:", user);

        if (!user) return;

        if (!user.email.endsWith(".edu")) {
            alert("Only .edu emails allowed.");
            return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        console.log(" Checking if user exists:", userSnap.exists());

        if (!userSnap.exists()) {
            console.log(" Creating new user document");

            await setDoc(userRef, {
                name: user.displayName || "",
                email: user.email,
                campus: "",
                major: "",
                gradYear: "",
                bio: "",
                courses: [],
                profilePicURL: "",
                role: "student",
                provider: "google",
                profileCompleted: false,
                createdAt: new Date()
            });
        }

        console.log(" Redirecting to home.html");

        window.location.href = "home.html"; 
        // ⚠️ IMPORTANT: see note below
    });
}