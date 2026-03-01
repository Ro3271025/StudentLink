import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function setupProfile() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "../public/login.php";
            return;
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const data = userSnap.data() || {};

        const displayName = data.name || user.displayName || "";
        const username = data.username ? "@" + data.username : "";

        // update every element that should show the name/username (duplicate ids exist in html)
        document.querySelectorAll('[id="displayName"]').forEach(el => el.innerText = displayName);
        document.querySelectorAll('[id="username"]').forEach(el => el.innerText = username);
    });
}
