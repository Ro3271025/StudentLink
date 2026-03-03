import { auth, db } from "./firebaseInitialization.js";
import { 
    collection, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { onAuthStateChanged } from 
"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

    console.log("CreateListing JS Loaded");

    const form = document.getElementById("listingForm");
    const categorySelect = document.getElementById("category");
    const supplyOptions = document.getElementById("supplyOptions");

    if (!form || !categorySelect || !supplyOptions) {
        console.error("One or more required elements not found.");
        return;
    }

    // Show condition + sell/rent only for supply categories
    categorySelect.addEventListener("change", () => {
        const value = categorySelect.value;

        if (["Textbook", "Calculator", "Tech"].includes(value)) {
            supplyOptions.style.display = "block";
        } else {
            supplyOptions.style.display = "none";
        }
    });

    // Protect route
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "login.php";
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        console.log("Submit triggered");

        const user = auth.currentUser;
        if (!user) {
            alert("Not logged in.");
            return;
        }

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const category = categorySelect.value;
        const price = Number(document.getElementById("price").value);

        let condition = null;
        let listingType = null;

        if (["Textbook", "Calculator", "Tech"].includes(category)) {

            condition = document.getElementById("condition").value;
            listingType = document.getElementById("listingType").value;

            if (!condition || !listingType) {
                alert("Please select condition and sell/rent option.");
                return;
            }
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        try {
            await addDoc(collection(db, "listings"), {
                userID: user.uid,
                campusID: "farmingdale",
                title,
                description,
                category,
                price,
                listingType,
                condition,
                status: "active",
                created_at: serverTimestamp(),
                expires_at: expiresAt
            });

            console.log("Listing created successfully");
            window.location.href = "listings.html";

        } catch (error) {
            console.error("Error creating listing:", error);
            alert("Failed to create listing.");
        }
    });

});