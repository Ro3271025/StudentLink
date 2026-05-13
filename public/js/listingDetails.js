// public/js/listingDetails.js
import { auth, db } from "./firebaseInitialization.js";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    where
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

async function getOrCreateConversation(currentUserId, otherUserId) {

    // Search for existing conversation the same way chat.js does
    const q = query(
        collection(db, "conversations"),
        where("users", "array-contains", currentUserId)
    );

    const snap = await getDocs(q);

    const existing = snap.docs.find(d =>
        d.data().users.includes(otherUserId)
    );

    if (existing) return existing.id;

    // No existing chat found — create one with deterministic ID
    const conversationID = [currentUserId, otherUserId].sort().join("_");
    const convoRef = doc(db, "conversations", conversationID);

    await setDoc(convoRef, {
        users: [currentUserId, otherUserId],
        createdAt: new Date(),
        lastMessage: "",
        lastTimestamp: new Date()
    });

    return conversationID;
}

async function loadListing() {

    const ref  = doc(db, "listings", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        titleEl.textContent = "Listing not found.";
        return;
    }

    const listing = snap.data();

    const userRef  = doc(db, "users", listing.userID);
    const userSnap = await getDoc(userRef);

    titleEl.textContent       = listing.title || "Untitled";
    priceEl.textContent       = `$${listing.price}`;
    descriptionEl.textContent = listing.description || "";

    userEl.textContent = `@${userSnap.get('username') || "Unknown User"}`;
    userEl.href        = `profile.html?id=${listing.userID}`;

    // ── IMAGE GALLERY ──
    let currentIndex = 0;
    const images = listing.imageURLs || (listing.imageURL ? [listing.imageURL] : []);

    if (images.length > 0) {
        imageEl.src = images[currentIndex];
        imageEl.style.cursor = "pointer";

        imageEl.onclick = () => {
            currentIndex = (currentIndex + 1) % images.length;
            imageEl.src = images[currentIndex];
        };

        if (gallery) {
            gallery.innerHTML = "";
            images.forEach((imgURL, index) => {
                const thumb = document.createElement("img");
                thumb.src = imgURL;
                thumb.style.width = "60px";
                thumb.style.margin = "5px";
                thumb.style.cursor = "pointer";
                thumb.style.borderRadius = "6px";
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
    auth.onAuthStateChanged(async (user) => {

        if (messageBtn) {
            if (user && user.uid === listing.userID) {
                messageBtn.style.display = "none";
            } else {
                messageBtn.style.display = "block";

                messageBtn.onclick = async () => {
                    const currentUser = auth.currentUser;
                    if (!currentUser) {
                        alert("You must be logged in.");
                        return;
                    }

                    try {
                        const convoId = await getOrCreateConversation(currentUser.uid, listing.userID);
                        window.location.href = `chatDetails.html?id=${convoId}`;
                    } catch (err) {
                        console.error("Chat error:", err);
                        alert("Could not start chat.");
                    }
                };
            }
        }

        // ── Owner controls ──
        if (user && user.uid === listing.userID) {
            if (ownerControls) ownerControls.style.display = "flex";

            const editBtn       = document.getElementById("editListingBtn");
            const deleteBtn     = document.getElementById("deleteListingBtn");
            const markStatusBtn = document.getElementById("markStatusBtn");

            if (editBtn) editBtn.onclick = () => { window.location.href = `editListing.html?id=${id}`; };
            if (deleteBtn) deleteBtn.onclick = deleteListing;

            if (markStatusBtn) {
                const currentStatus = listing.status || "active";
                if (currentStatus === "sold")        markStatusBtn.textContent = "✓ Sold";
                else if (currentStatus === "rented") markStatusBtn.textContent = "✓ Rented";
                else markStatusBtn.textContent = listing.listingType === "rent" ? "Mark as Rented" : "Mark as Sold";

                markStatusBtn.onclick = async () => {
                    const newStatus = listing.listingType === "rent" ? "rented" : "sold";
                    if (!confirm(`Mark this listing as ${newStatus}?`)) return;
                    try {
                        await updateDoc(doc(db, "listings", id), { status: newStatus });
                        markStatusBtn.textContent = newStatus === "sold" ? "✓ Sold" : "✓ Rented";
                        alert(`Listing marked as ${newStatus}.`);
                    } catch (err) {
                        console.error("Status update failed:", err);
                        alert("Failed to update listing status.");
                    }
                };
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