import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function setupHome() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // not logged in, send back to login page
            window.location.href = "../public/login.php";
            return;
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const data = userSnap.data() || {};

        const displayEl = document.getElementById("displayName");
        const usernameEl = document.getElementById("username");

        if (displayEl) {
            displayEl.innerText = data.name || user.displayName || "";
        }
        if (usernameEl) {
            usernameEl.innerText = data.username ? "@" + data.username : "";
        }
    });
}
