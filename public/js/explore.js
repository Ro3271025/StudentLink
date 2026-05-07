import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    doc,
    getDoc,
    updateDoc
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
const latestListingsEl = document.getElementById("latestListingsSection");

const storage = getStorage();

/* STATE */
let currentUserId   = null;
let currentUserName = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    currentUserId   = user.uid;
    currentUserName = user.displayName || user.email || "Anonymous";

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
        } catch { /* keep default */ }
    } catch (err) {
        console.error("Error loading user:", err);
    }
});

/* LOAD ALL DATA */
async function loadExplore() {
    try {
        const [latestListingsSnap, newsSnap, eventsSnap] = await Promise.all([
            getDocs(query(collection(db, "listings"), orderBy("created_at", "desc"), limit(6))),
            getDocs(query(collection(db, "news"),     orderBy("timestamp",  "desc"), limit(5))),
            getDocs(query(collection(db, "events"),   orderBy("timestamp",  "desc"), limit(10)))
        ]);

        const latestListings = latestListingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const latestNews     = newsSnap.docs.map(d       => ({ id: d.id, ...d.data() }));
        const latestEvents   = eventsSnap.docs.map(d     => ({ id: d.id, ...d.data() }));

        // Fetch current usernames for all unique listing owners in parallel
        const uniqueUserIDs = [...new Set(latestListings.map(l => l.userID).filter(Boolean))];
        const userSnaps     = await Promise.all(
            uniqueUserIDs.map(uid => getDoc(doc(db, "users", uid)))
        );
        const usernameMap = {};
        userSnaps.forEach(snap => {
            if (snap.exists()) {
                usernameMap[snap.id] = snap.data().username || "user";
            }
        });

        // Inject current username before rendering
        const enrichedListings = latestListings.map(l => ({
            ...l,
            username: usernameMap[l.userID] || l.username || "user"
        }));

        renderLatestListings(enrichedListings);
        renderSideSections(latestNews, latestEvents);
        loadPeopleToFollow();

    } catch (err) {
        console.error("Error loading explore:", err);
    }
}

/* PEOPLE TO FOLLOW */
async function loadPeopleToFollow() {
    const el = document.getElementById("peopleToFollowSection");
    if (!el) return;

    el.innerHTML = "<p style='opacity:0.6;font-size:13px;padding:4px 0;'>Loading...</p>";

    try {
        const usersSnap = await getDocs(collection(db, "users"));

        let users = usersSnap.docs
            .map(d => ({ uid: d.id, ...d.data() }))
            .filter(u => u.uid !== currentUserId);

        for (let i = users.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [users[i], users[j]] = [users[j], users[i]];
        }

        users = users.slice(0, 10);

        if (!users.length) {
            el.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No users found.</p>";
            return;
        }

        let following = [];
        if (currentUserId) {
            try {
                const snap = await getDoc(doc(db, "users", currentUserId));
                following  = snap.exists() ? (snap.data().following || []) : [];
            } catch { /* ignore */ }
        }

        el.innerHTML = "";
        const grid = document.createElement("div");
        grid.className = "peopleGrid";
        el.appendChild(grid);

        users.forEach(user => {
            const displayName = user.displayName || user.username || "Student";
            const username    = user.username ? `@${user.username}` : "";
            const photo       = user.photoURL  || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG";
            const college     = user.college   || user.school || "";
            const isFollowing = following.includes(user.uid);

            const card = document.createElement("div");
            card.className = "personCard";
            card.innerHTML = `
                <img class="personAvatar"
                     src="${photo}"
                     onerror="this.src='styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'">
                <div class="personInfo">
                    <span class="personName">${escapeHtml(displayName)}</span>
                    ${username ? `<span class="personUsername">${escapeHtml(username)}</span>` : ""}
                    ${college  ? `<span class="personCollege">${escapeHtml(college)}</span>`   : ""}
                </div>
                <button class="followBtn themeObject"
                        data-uid="${user.uid}"
                        data-following="${isFollowing}"
                        style="${isFollowing ? "background:var(--button-hover);" : ""}">
                    ${isFollowing ? "Following" : "Follow"}
                </button>
            `;

            card.addEventListener("click", (e) => {
                if (!e.target.classList.contains("followBtn")) {
                    window.location.href = `profile.html?id=${user.uid}`;
                }
            });
            card.style.cursor = "pointer";

            grid.appendChild(card);
        });

        attachFollowListeners();

    } catch (err) {
        console.error("Failed to load people:", err);
        el.innerHTML = "<p style='opacity:0.5;font-size:13px;'>Failed to load users.</p>";
    }
}

function attachFollowListeners() {
    document.querySelectorAll(".followBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!currentUserId) { alert("Please log in to follow users."); return; }

            const targetUid   = btn.dataset.uid;
            const isFollowing = btn.dataset.following === "true";

            btn.disabled    = true;
            btn.textContent = "...";

            try {
                const userRef = doc(db, "users", currentUserId);
                const snap    = await getDoc(userRef);
                let following = snap.exists() ? (snap.data().following || []) : [];

                if (isFollowing) {
                    following = following.filter(uid => uid !== targetUid);
                } else {
                    if (!following.includes(targetUid)) following.push(targetUid);
                }

                await updateDoc(userRef, { following });

                const nowFollowing      = !isFollowing;
                btn.dataset.following   = String(nowFollowing);
                btn.textContent         = nowFollowing ? "Following" : "Follow";
                btn.style.background    = nowFollowing ? "var(--button-hover)" : "";
            } catch (err) {
                console.error("Follow failed:", err);
                btn.textContent = isFollowing ? "Following" : "Follow";
            } finally {
                btn.disabled = false;
            }
        });
    });
}

/* HELPERS */
function isPast(dateStr) {
    if (!dateStr) return false;
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
}

function formatTime(timestamp) {
    if (!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

function escapeHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* RENDER LATEST LISTINGS */
function renderLatestListings(listings) {
    if (!latestListingsEl) return;
    if (!listings.length) {
        latestListingsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No listings yet.</p>";
        return;
    }

    latestListingsEl.innerHTML = listings.map(item => {
        const isSold        = item.status === "sold";
        const isRented      = item.status === "rented";
        const isUnavailable = isSold || isRented;

        const badgeHTML = isSold
            ? `<div class="listingStatusBadge sold">Sold</div>`
            : isRented
            ? `<div class="listingStatusBadge rented">Rented</div>`
            : "";

        return `
            <div class="listingCard${isUnavailable ? " listingUnavailable" : ""}"
                 onclick="window.location.href='listingDetail.html?id=${item.id}'">
                ${badgeHTML}
                <img class="listingThumb" src="${item.imageURL || "styles/images/placeholder/textbooks.png"}">
                <h3 class="listingTitle">${item.title || item.name || ""}</h3>
                <p class="listingPrice">$${item.price || ""}</p>
                <p class="listingUser">@${item.username || "user"}</p>
            </div>`;
    }).join("");
}

/* RENDER NEWS & EVENTS */
function renderSideSections(news, events) {
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
                    <div class="feedContent"><strong>${item.title || ""}</strong></div>
                    <div class="feedMeta">${formatTime(item.timestamp)}</div>`;
                div.onclick = () => window.location.href = `newsDetails.html?id=${item.id}`;
                newsEl.appendChild(div);
            });
        }
    }

    const eventsEl = document.getElementById("latestEventsSection");
    if (!eventsEl) return;

    eventsEl.innerHTML = "";

    const upcoming = events.filter(e => !isPast(e.date));
    const past     = events.filter(e =>  isPast(e.date));

    if (!upcoming.length && !past.length) {
        eventsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No events yet.</p>";
        return;
    }

    const renderEvent = (item, isPastEvent) => {
        const div = document.createElement("div");
        div.className      = `feedItem${isPastEvent ? " eventPast" : ""}`;
        div.style.position = "relative";
        div.innerHTML = `
            ${isPastEvent ? `<div class="eventStatusBadge">Past Event</div>` : ""}
            <div class="feedHeader">
                <span class="feedUser">${item.orgName || "Event"}</span>
                <span class="feedType">Event</span>
            </div>
            <div class="feedContent">
                <strong>${item.title || item.name || ""}</strong>
                <p style="font-size:12px;opacity:0.7;margin:4px 0 0;">
                    ${item.date || ""} ${item.location ? "· " + item.location : ""}
                </p>
            </div>`;
        div.onclick = () => window.location.href = `eventDetail.html?id=${item.id}`;
        return div;
    };

    // Upcoming events first
    if (upcoming.length) {
        upcoming.forEach(item => eventsEl.appendChild(renderEvent(item, false)));
    } else {
        const none = document.createElement("p");
        none.style.cssText = "opacity:0.5;font-size:13px;margin-bottom:10px;";
        none.textContent   = "No upcoming events.";
        eventsEl.appendChild(none);
    }

    // Divider + past events — only shown if both groups exist
    if (past.length) {
        if (upcoming.length) {
            const divider = document.createElement("div");
            divider.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 16px 0 12px;
                opacity: 0.45;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--text-fill);
            `;
            divider.innerHTML = `
                <span style="flex:1;height:1px;background:var(--border-color);display:block;"></span>
                <span>Past Events</span>
                <span style="flex:1;height:1px;background:var(--border-color);display:block;"></span>`;
            eventsEl.appendChild(divider);
        }
        past.forEach(item => eventsEl.appendChild(renderEvent(item, true)));
    }
}

/* CAMPUS CENTRAL CARDS */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("orgCard")?.addEventListener("click",   () => window.location.href = "organizations.html");
    document.getElementById("eventCard")?.addEventListener("click", () => window.location.href = "events.html");
    document.getElementById("newsCard")?.addEventListener("click",  () => window.location.href = "news.html");
});

/* INIT */
loadExplore();