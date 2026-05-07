import { auth, db } from "./firebaseInitialization.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const container = document.getElementById("listingsContainer");

function renderListing(listing) {

    const isSold        = listing.status === "sold";
    const isRented      = listing.status === "rented";
    const isUnavailable = isSold || isRented;

    const badgeHTML = isSold
        ? `<div class="listingStatusBadge sold">Sold</div>`
        : isRented
        ? `<div class="listingStatusBadge rented">Rented</div>`
        : "";

    return `
        <div class="listingCard ${isUnavailable ? "listingUnavailable" : ""}" onclick="openListing('${listing.id}')">
            ${badgeHTML}
            ${listing.imageURL
                ? `<img class="listingThumb" src="${listing.imageURL}">`
                : `<img class="listingThumb" src="styles/images/placeholder/textbooks.png">`
            }
            <h3 class="listingTitle">${listing.title}</h3>
            <p class="listingPrice">$${listing.price}</p>
            <p class="listingUser">@${listing.username || "user"}</p>
        </div>
    `;
}

window.openListing = function(id) {
    window.location.href = `listingDetail.html?id=${id}`;
};

async function loadListings() {
    try {
        const snapshot = await getDocs(collection(db, "listings"));

        if (snapshot.empty) {
            container.innerHTML = "<p style='opacity:0.5;font-size:13px;text-align:center;padding:20px;'>No listings available.</p>";
            return;
        }

        const listings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Deduplicate userIDs and fetch current usernames in parallel
        const uniqueUserIDs = [...new Set(listings.map(l => l.userID).filter(Boolean))];

        const userSnaps = await Promise.all(
            uniqueUserIDs.map(uid => getDoc(doc(db, "users", uid)))
        );

        const usernameMap = {};
        userSnaps.forEach(snap => {
            if (snap.exists()) {
                usernameMap[snap.id] = snap.data().username || "user";
            }
        });

        // Inject current username before rendering
        const enriched = listings.map(l => ({
            ...l,
            username: usernameMap[l.userID] || l.username || "user"
        }));

        container.innerHTML = enriched.map(renderListing).join("");

    } catch (err) {
        console.error("Failed to load listings:", err);
        container.innerHTML = "<p style='opacity:0.5;font-size:13px;text-align:center;padding:20px;'>Failed to load listings.</p>";
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.php";
        return;
    }

    loadListings();
});