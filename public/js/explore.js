import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ELEMENTS */
const displayNameEl    = document.getElementById("displayName");
const usernameEl       = document.getElementById("username");
const profilePic       = document.getElementById("profilePic");

const feed             = document.getElementById("exploreFeed");
const filter           = document.getElementById("filterSelection");
const searchBar        = document.getElementById("exploreSearchBar");
const latestListingsEl = document.getElementById("latestListingsSection");

const storage = getStorage();

/* STATE */
let allItems     = [];
let activeFilter = "all";
let searchQuery  = "";

/* AUTH & USER INFO */
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
            const data = snap.data();
            displayNameEl.textContent = data.displayName || "No Name";
            usernameEl.textContent    = "@" + (data.username || "username");
        }

        try {
            const imgRef = ref(storage, `userPhotos/${user.uid}/profile.jpg`);
            profilePic.src = await getDownloadURL(imgRef);
        } catch {
            // keep default image
        }

    } catch (err) {
        console.error("Error loading user:", err);
    }
});

/* LOAD ALL DATA */
async function loadExplore() {
    feed.innerHTML = "<p style='opacity:0.6;padding:10px;'>Loading...</p>";

    try {
        /* FETCH IN PARALLEL */
        const [postsSnap, listingsSnap, latestListingsSnap, newsSnap, eventsSnap] = await Promise.all([
            getDocs(query(collection(db, "posts"),    orderBy("timestamp",  "desc"))),
            getDocs(query(collection(db, "listings"), orderBy("created_at", "desc"))),
            getDocs(query(collection(db, "listings"), orderBy("created_at", "desc"), limit(6))),
            getDocs(query(collection(db, "news"),     orderBy("timestamp",  "desc"), limit(5))),
            getDocs(query(collection(db, "events"),   orderBy("timestamp",  "desc"), limit(5)))
        ]);

        allItems = [];

        postsSnap.forEach(d    => allItems.push({ id: d.id, type: "post",    ...d.data() }));
        listingsSnap.forEach(d => allItems.push({ id: d.id, type: "listing", ...d.data() }));

        /* SORT MERGED FEED */
        allItems.sort((a, b) => {
            const aTime = (a.timestamp?.seconds || a.created_at?.seconds || 0);
            const bTime = (b.timestamp?.seconds || b.created_at?.seconds || 0);
            return bTime - aTime;
        });

        /* SECTIONS */
        const latestListings = latestListingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const latestNews     = newsSnap.docs.map(d           => ({ id: d.id, ...d.data() }));
        const latestEvents   = eventsSnap.docs.map(d         => ({ id: d.id, ...d.data() }));

        renderLatestListings(latestListings);
        renderSideSections(latestNews, latestEvents);
        renderFeed(getFilteredItems());

    } catch (err) {
        console.error("Error loading explore:", err);
        feed.innerHTML = "<p style='opacity:0.6;padding:10px;'>Failed to load content.</p>";
    }
}

/* FILTER + SEARCH */
function getFilteredItems() {
    return allItems.filter(item => {

        /* FILTER */
        if (activeFilter === "posts"    && item.type !== "post")    return false;
        if (activeFilter === "listings" && item.type !== "listing") return false;

        /* SEARCH */
        if (searchQuery) {
            const haystack = [
                item.text        || "",
                item.title       || "",
                item.name        || "",
                item.description || "",
                item.content     || "",
                item.username    || ""
            ].join(" ").toLowerCase();

            if (!haystack.includes(searchQuery)) return false;
        }

        return true;
    });
}

/* RENDER MAIN FEED */
function renderFeed(items) {
    feed.innerHTML = "";

    if (!items.length) {
        feed.innerHTML = "<p style='opacity:0.6;padding:10px;'>No results found.</p>";
        return;
    }

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
                <div class="feedMeta">${formatTime(item.timestamp)}</div>
            `;
            div.onclick = () => window.location.href = `home.html#post-${item.id}`;
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
                ${(item.imageURL || item.image)
                    ? `<img class="feedImage" src="${item.imageURL || item.image}">`
                    : ""}
                <div class="feedMeta">${formatTime(item.created_at || item.timestamp)}</div>
            `;
            div.onclick = () => window.location.href = `listingDetail.html?id=${item.id}`;
        }

        feed.appendChild(div);
    });
}

/* RENDER LATEST LISTINGS */
function renderLatestListings(listings) {
    if (!latestListingsEl) return;

    if (!listings.length) {
        latestListingsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No listings yet.</p>";
        return;
    }

    latestListingsEl.innerHTML = listings.map(item => `
        <div class="listingCard" onclick="window.location.href='listingDetail.html?id=${item.id}'">
            ${item.imageURL
                ? `<img class="listingThumb" src="${item.imageURL}">`
                : `<img class="listingThumb" src="styles/images/placeholder/textbooks.png">`
            }
            <h3 class="listingTitle">${item.title || item.name || ""}</h3>
            <p class="listingPrice">$${item.price || ""}</p>
            <p class="listingUser">@${item.username || "user"}</p>
        </div>
    `).join("");
}

/* RENDER NEWS & EVENTS */
function renderSideSections(news, events) {

    /* NEWS */
    const newsEl = document.getElementById("latestNewsSection");
    if (newsEl) {
        newsEl.innerHTML = "";

        if (!news.length) {
            newsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No recent news.</p>";
        } else {
            news.forEach(item => {
                const div = document.createElement("div");
                div.className = "feedItem";
                div.innerHTML = `
                    <div class="feedHeader">
                        <span class="feedUser">${item.authorName || "Staff"}</span>
                        <span class="feedType">News</span>
                    </div>
                    <div class="feedContent">
                        <strong>${item.title || ""}</strong>
                    </div>
                    <div class="feedMeta">${formatTime(item.timestamp)}</div>
                `;
                div.onclick = () => window.location.href = `newsDetails.html?id=${item.id}`;
                newsEl.appendChild(div);
            });
        }
    }

    /* EVENTS */
    const eventsEl = document.getElementById("latestEventsSection");
    if (eventsEl) {
        eventsEl.innerHTML = "";

        if (!events.length) {
            eventsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No upcoming events.</p>";
        } else {
            events.forEach(item => {
                const div = document.createElement("div");
                div.className = "feedItem";
                div.innerHTML = `
                    <div class="feedHeader">
                        <span class="feedUser">${item.orgName || "Event"}</span>
                        <span class="feedType">Event</span>
                    </div>
                    <div class="feedContent">
                        <strong>${item.title || item.name || ""}</strong>
                        <p style="font-size:12px;opacity:0.7;">${item.date || ""} ${item.location ? "· " + item.location : ""}</p>
                    </div>
                `;
                div.onclick = () => window.location.href = `eventDetail.html?id=${item.id}`;
                eventsEl.appendChild(div);
            });
        }
    }
}

/* HELPERS */
function formatTime(timestamp) {
    if (!timestamp?.seconds) return "";

    const date = new Date(timestamp.seconds * 1000);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    return date.toLocaleDateString();
}

/* FILTER DROPDOWN */
filter?.addEventListener("change", () => {
    activeFilter = filter.value;
    renderFeed(getFilteredItems());
});

/* SEARCH BAR */
searchBar?.addEventListener("input", () => {
    searchQuery = searchBar.value.toLowerCase().trim();
    renderFeed(getFilteredItems());
});

/* NAV CARDS */
document.addEventListener("DOMContentLoaded", () => {
    const orgCard   = document.getElementById("orgCard");
    const eventCard = document.getElementById("eventCard");
    const newsCard  = document.getElementById("newsCard");

    if (orgCard)   orgCard.onclick   = () => window.location.href = "organizations.html";
    if (eventCard) eventCard.onclick = () => window.location.href = "events.html";
    if (newsCard)  newsCard.onclick  = () => window.location.href = "news.html";
});

/* INIT */
loadExplore();