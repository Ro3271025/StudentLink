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
    const googleBtn = document.getElementById("gLoginBtn");

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
        console.log(" gLoginBtn NOT FOUND in DOM");
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
        let userSnap = await getDoc(userRef);

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
            window.location.href = "home.html";
        }
    });
}
