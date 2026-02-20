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
        }

        window.location.href = "dashboard.php";
            window.location.href = "../application/home.html";
    });
}
