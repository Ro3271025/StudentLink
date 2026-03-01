import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function setupDashboard() {

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.php";
            return;
        }

        // make sure user has picked a username
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const data = userSnap.data() || {};
        if (!data.username) {
            window.location.href = "chooseUsername.php";
            return;
        }

        const infoEl = document.getElementById("userInfo");
        if (infoEl) {
            // show both displayName and @username
            infoEl.innerText = `Logged in as: ${user.displayName || ""} (@${data.username})`;
        }
    });

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "login.php";
        });
    }

}
