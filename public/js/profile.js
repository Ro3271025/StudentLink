import { auth, db } from "./firebaseInitialization.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

console.log("Profile JS loaded");

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("profileForm");
    console.log("Form:", form);

    if (!form) {
        console.log("Form not found!");
        return;
    }

    onAuthStateChanged(auth, (user) => {

        console.log("Auth user:", user);

        if (!user) {
            window.location.href = "login.php";
            return;
        }

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Form submitted");

            const campus = document.getElementById("campus").value.trim();
            const major = document.getElementById("major").value.trim();
            const graduationYear = document.getElementById("graduationYear").value.trim();

            if (parseInt(graduationYear) < 2026) {
                alert("Graduation year must be 2026 or later.");
                return;
            }

            try {
                const userRef = doc(db, "users", user.uid);

                await updateDoc(userRef, {
                    campus,
                    major,
                    graduationYear,
                    profileCompleted: true
                });

                console.log("Profile updated successfully");

                window.location.href = "dashboard.php";

            } catch (error) {
                console.error("Update error:", error);
            }
        });
    });
});