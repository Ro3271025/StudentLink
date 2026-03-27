import { auth, db } from "./firebaseInitialization.js";

import {
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log(" AUTH.JS LOADED");

// PROVIDERS

// GOOGLE
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// MICROSOFT
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
    prompt: "select_account"
});


//SETUP LOGIN BUTTONS

export function setupLogin() {

    // GOOGLE BUTTON
    const googleBtn = document.getElementById("gLoginBtn");

    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            console.log(" Google login clicked");

            try {
                await signInWithPopup(auth, googleProvider);
            } catch (error) {
                console.error("Google login error:", error);
            }
        });
    }

    // MICROSOFT BUTTON
    const msBtn = document.getElementById("msLoginBtn");

    if (msBtn) {
        msBtn.addEventListener("click", async () => {
            console.log(" Microsoft login clicked");

            try {
                await signInWithPopup(auth, microsoftProvider);
            } catch (error) {
                console.error("Microsoft login error:", error);
            }
        });
    }

//AUTH STATE LISTENER

    onAuthStateChanged(auth, async (user) => {

        console.log(" Auth state changed:", user);

        if (!user) return;

        // 🔒 Restrict to .edu emails
        if (!user.email || !user.email.endsWith(".edu")) {
            alert("Only .edu emails allowed.");
            await signOut(auth);
            return;
        }

        // detect provider (optional)
        const provider = user.providerData[0]?.providerId;
        console.log(" Provider:", provider);

        const userRef = doc(db, "users", user.uid);
        let userSnap = await getDoc(userRef);

        // CREATE USER IF NOT EXISTS
        if (!userSnap.exists()) {

            console.log(" Creating new user...");

            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName || "",
                email: user.email,
                campus: "",
                major: "",
                gradYear: "",
                bio: "",
                courses: [],
                profilePicURL: "",
                role: "student",
                provider: provider,
                profileCompleted: false,
                createdAt: new Date()
            });

            userSnap = await getDoc(userRef);
        }

        const data = userSnap.data() || {};

        // REDIRECT LOGIC
        if (!data.username) {
            window.location.replace("./chooseUsername.php");
        } else {
            window.location.replace("home.html");
        }
    });
}