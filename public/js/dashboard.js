import { auth } from "./firebaseInitialization.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export function setupDashboard() {

    onAuthStateChanged(auth, (user) => {

        if (user) {
            document.getElementById("userInfo").innerText =
                "Logged in as: " + user.displayName;
        } else {
            window.location.href = "login.php";
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
