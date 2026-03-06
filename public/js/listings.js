import { auth, db } from "./firebaseInitialization.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const container = document.getElementById("listingsContainer");

function renderListing(listing) {
    return `
        <div class="listing-card" onclick="openListing('${listing.id}')">

            ${listing.imageURL ? `<img class="listing-thumb" src="${listing.imageURL}">` : ""}

            <h3>${listing.title}</h3>

            <p>${listing.description}</p>

            <p><strong>Price:</strong> $${listing.price}</p>

            <p><strong>Category:</strong> ${listing.category}</p>

            <p class="listing-user">Posted by: ${listing.username || "User"}</p>

            ${listing.condition ? `<p><strong>Condition:</strong> ${listing.condition}</p>` : ""}

            ${listing.listingType ? `<p><strong>Type:</strong> ${listing.listingType}</p>` : ""}

        </div>
    `;
}
window.openListing = function(id){
    window.location.href = `listing.html?id=${id}`;
}

async function loadListings() {
    try {
        const snapshot = await getDocs(collection(db, "listings"));

        if (snapshot.empty) {
            container.innerHTML = "No listings available.";
            return;
        }

        const listings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        container.innerHTML = listings.map(renderListing).join("");

    } catch (error) {
        console.error("Error loading listings:", error);
        container.innerHTML = "Error loading listings.";
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.php";
        return;
    }

    loadListings();
});