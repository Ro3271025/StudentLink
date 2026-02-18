import { auth, db } from "./firebaseInitialization.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

export function setupLogin() {

    const btn = document.getElementById("loginBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {

        try {

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

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
                    createdAt: new Date()
                });
            }

            window.location.href = "dashboard.php";

        } catch (error) {
            console.error(error);
        }

    });
}
