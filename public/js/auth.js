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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export function setupLogin() {

    const googleBtn = document.getElementById("loginBtn");

    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            try {
                await signInWithPopup(auth, googleProvider);
            } catch (error) {
                console.error("Google login error:", error);
            }
        });
    }

    // Central auth listener
    onAuthStateChanged(auth, async (user) => {

        if (!user) return;

        if (!user.email.endsWith(".edu")) {
            alert("Only .edu emails allowed.");
            return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName,
                email: user.email,
                role: "student",
                provider: "google",
                createdAt: new Date()
            });
            // re‑read the document so we have a data object below
            userSnap = await getDoc(userRef);
        }

        // at this point we have a document (new or existing)
        const data = userSnap.data() || {};
        if (!data.username) {
            // new user or hasn't picked a username yet
            window.location.href = "./chooseUsername.php";
        } else {
            // already has a username; send to the main application
            window.location.href = "../application/home.html";
        }
    });
}

