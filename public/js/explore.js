import { db } from "./firebaseInitialization.js";
import {
    collection,
    getDocs,
    query,
    orderBy, 
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const profilePic = document.getElementById("profilePic");

const storage = getStorage();

try {
    const imgRef = ref(storage, `userPhotos/${user.uid}/profile.jpg`);
    const url = await getDownloadURL(imgRef);
    profilePic.src = url;
} catch {
    // fallback stays default
}

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
const displayNameEl = document.getElementById("displayName");
const usernameEl = document.getElementById("username");

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            const data = snap.data();

            displayNameEl.textContent = data.displayName || "No Name";
            usernameEl.textContent = "@" + (data.username || "username");
        }
    } catch (err) {
        console.error("Error loading user:", err);
    }
});

const feed = document.getElementById("exploreFeed");
const filter = document.getElementById("filterSelection");
const searchBar = document.getElementById("exploreSearchBar");

let allItems = [];

/* LOAD DATA */
async function loadExplore() {
    feed.innerHTML = "Loading...";

    const postsSnap = await getDocs(query(
        collection(db, "posts"),
        orderBy("timestamp", "desc")
    ));

    const listingsSnap = await getDocs(query(
        collection(db, "listings"),
        orderBy("timestamp", "desc")
    ));

    allItems = [];

    postsSnap.forEach(doc => {
        allItems.push({ id: doc.id, type: "post", ...doc.data() });
    });

    listingsSnap.forEach(doc => {
        allItems.push({ id: doc.id, type: "listing", ...doc.data() });
    });

    renderFeed(allItems);
}

/* RENDER */
function renderFeed(items) {
    feed.innerHTML = "";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "feedItem";

        if (item.type === "post") {
            div.innerHTML = `
                <div class="feedHeader">
                    <span class="feedUser">@${item.username || "user"}</span>
                    <span class="feedType">Post</span>
                </div>

                <div class="feedContent">
                    ${item.text || item.content || item.description || ""}
                </div>
            `;

            div.onclick = () => {
                window.location.href = `home.html#post-${item.id}`;
            };
        }

        if (item.type === "listing") {
            div.innerHTML = `
                <div class="feedHeader">
                    <span class="feedUser">@${item.username || "user"}</span>
                    <span class="feedType">Listing</span>
                </div>

                <div class="feedContent">
                    <strong>${item.title || item.name || ""}</strong>
                    <p class="price">$${item.price || ""}</p>
                </div>

                ${(item.imageURL || item.image) ? 
                    `<img class="feedImage" src="${item.imageURL || item.image}">` : ""}
            `;

            div.onclick = () => {
                window.location.href = `listingDetail.html?id=${item.id}`;
            };
        }

        feed.appendChild(div);
    });
}

/* FILTER */
filter.addEventListener("change", () => {
    const val = filter.value;

    if (val === "all") {
        renderFeed(allItems);
        return;
    }

    const filtered = allItems.filter(i =>
        val === "posts" ? i.type === "post" :
        val === "listings" ? i.type === "listing" :
        true
    );

    renderFeed(filtered);
});

/* SEARCH */
searchBar.addEventListener("input", () => {
    const val = searchBar.value.toLowerCase();

    const filtered = allItems.filter(i =>
        (i.text || i.title || "").toLowerCase().includes(val)
    );

    renderFeed(filtered);
});

loadExplore();