// public/js/listingDetails.js
import { auth, db } from "./firebaseInitialization.js";
import {
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const imageEl       = document.getElementById("listingImage");
const titleEl       = document.getElementById("listingTitle");
const priceEl       = document.getElementById("listingPrice");
const userEl        = document.getElementById("listingUser");
const descriptionEl = document.getElementById("listingDescription");
const metaEl        = document.getElementById("listingMeta");
const messageBtn    = document.getElementById("messageSellerBtn");
const ownerControls = document.getElementById("ownerControls");
const gallery       = document.getElementById("imageGallery");

async function loadListing() {
    const ref  = doc(db, "listings", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        titleEl.textContent = "Listing not found.";
        return;
    }

    const listing = snap.data();

    // ── Populate fields ──
    titleEl.textContent       = listing.title || "Untitled";
    priceEl.textContent       = `$${listing.price}`;
    descriptionEl.textContent = listing.description || "";

    userEl.textContent = `@${listing.username || "Unknown User"}`;
    userEl.href        = `profile.html?id=${listing.userID}`;

    // ── IMAGE GALLERY LOGIC ──
    let currentIndex = 0;

    const images = listing.imageURLs || (listing.imageURL ? [listing.imageURL] : []);

    if (images.length > 0) {

        imageEl.src = images[currentIndex];
        imageEl.style.cursor = "pointer";

        // Click main image to cycle
        imageEl.onclick = () => {
            currentIndex = (currentIndex + 1) % images.length;
            imageEl.src = images[currentIndex];
        };

        // Thumbnails
        if (gallery) {
            gallery.innerHTML = "";

            images.forEach((imgURL, index) => {
                const thumb = document.createElement("img");
                thumb.src = imgURL;

                thumb.style.width = "60px";
                thumb.style.margin = "5px";
                thumb.style.cursor = "pointer";
                thumb.style.borderRadius = "6px";
                thumb.style.border = "2px solid transparent";

                thumb.onclick = () => {
                    currentIndex = index;
                    imageEl.src = images[currentIndex];
                };

                gallery.appendChild(thumb);
            });
        }

    } else {
        imageEl.style.display = "none";
    }

    // ── Meta ──
    let metaHTML = "";
    if (listing.category)    metaHTML += `<p><strong>Category:</strong> ${listing.category}</p>`;
    if (listing.condition)   metaHTML += `<p><strong>Condition:</strong> ${listing.condition}</p>`;
    if (listing.listingType) metaHTML += `<p><strong>Type:</strong> ${listing.listingType}</p>`;
    if (metaEl) metaEl.innerHTML = metaHTML;

    // ── Auth UI ──
    auth.onAuthStateChanged(user => {

        // Message button
        if (messageBtn) {
            if (user && user.uid === listing.userID) {
                messageBtn.style.display = "none";
            } else {
                messageBtn.style.display = "block";

                messageBtn.onclick = () => {
                    if (!user) {
                        alert("You must be logged in.");
                        return;
                    }

                    const conversationID = [user.uid, listing.userID].sort().join("_");
                    window.location.href = `chatDetails.html?id=${conversationID}`;
                };
            }
        }

        // Owner controls
        if (user && user.uid === listing.userID) {
            if (ownerControls) ownerControls.style.display = "flex";

            const editBtn = document.getElementById("editListingBtn");
            const deleteBtn = document.getElementById("deleteListingBtn");

            if (editBtn) {
                editBtn.onclick = () => {
                    window.location.href = `editListing.html?id=${id}`;
                };
            }

            if (deleteBtn) {
                deleteBtn.onclick = deleteListing;
            }
        }
    });
}

async function deleteListing() {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
        await deleteDoc(doc(db, "listings", id));
        alert("Listing deleted.");
        window.location.href = "listings.html";
    } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete listing.");
    }
}

loadListing();