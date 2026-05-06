import { db, auth } from "./firebaseInitialization.js";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* GET ORG ID */
const params = new URLSearchParams(window.location.search);
const orgId  = params.get("id");

if (!orgId) {
    window.location.href = "explore.html";
}

/* ELEMENTS */
const nameEl        = document.getElementById("orgName");
const descEl        = document.getElementById("orgDescription");
const profileImgEl  = document.getElementById("orgProfileImg");
const emailEl       = document.getElementById("orgEmail");
const galleryEl     = document.getElementById("orgGallery");
const eventsEl      = document.getElementById("orgEvents");
const officersEl    = document.getElementById("orgOfficers");
const joinBtn       = document.getElementById("joinBtn");
const memberCountEl = document.getElementById("memberCount");
const editBtn       = document.getElementById("editOrgBtn");

/* STATE */
let currentUser = null;
let isMember    = false;

/* LOAD ORG */
async function loadOrg() {
    try {
        const snap = await getDoc(doc(db, "organizations", orgId));

        if (!snap.exists()) {
            if (nameEl) nameEl.textContent = "Organization not found.";
            return;
        }

        const data = snap.data();

        /* TEXT */
        nameEl.textContent  = data.name        || "No Name";
        descEl.textContent  = data.description || "No description available.";
        emailEl.textContent = data.email       || "N/A";

        /* IMAGE */
        profileImgEl.src = data.mainImageURL || data.imageURL || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.svg";

        loadGallery(data.galleryImages || []);
        loadEvents();
        loadOfficers(data);

    } catch (err) {
        console.error("Error loading org:", err);
        if (nameEl) nameEl.textContent = "Failed to load organization.";
    }
}

/* GALLERY */
function loadGallery(images) {
    if (!galleryEl) return;
    galleryEl.innerHTML = "";

    if (!images.length) {
        galleryEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No images available.</p>";
        return;
    }

    images.forEach(img => {
        const el    = document.createElement("img");
        el.src      = img;
        el.loading  = "lazy";
        galleryEl.appendChild(el);
    });
}

/* HELPERS */
function isPast(dateStr) {
    if (!dateStr) return false;
    const eventDate = new Date(dateStr);
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
}

function emptyMessage(text) {
    const p = document.createElement("p");
    p.style.cssText  = "opacity:0.5;font-size:13px;";
    p.textContent    = text;
    return p;
}

/* EVENTS — split upcoming vs past */
async function loadEvents() {
    if (!eventsEl) return;

    try {
        const snap = await getDocs(query(
            collection(db, "events"),
            where("orgId", "==", orgId)
        ));

        eventsEl.innerHTML = "";

        if (snap.empty) {
            eventsEl.appendChild(emptyMessage("No events yet."));
            return;
        }

        const upcoming = [];
        const past     = [];

        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (isPast(data.date)) {
                past.push({ id: docSnap.id, ...data });
            } else {
                upcoming.push({ id: docSnap.id, ...data });
            }
        });

        const renderEvent = (data, isPastEvent) => {
            const div       = document.createElement("div");
            div.className   = `eventCard${isPastEvent ? " eventPast" : ""}`;
            div.style.position = "relative";
            div.innerHTML   = `
                ${isPastEvent ? `<div class="eventStatusBadge">Past Event</div>` : ""}
                <img src="${data.imageURL || 'styles/images/placeholder/DEFAULT_EVENT.jpg'}">
                <div class="eventInfo">
                    <h4>${data.title    || "Untitled Event"}</h4>
                    <p>${data.date      || ""}</p>
                    <p>${data.location  || ""}</p>
                </div>
            `;
            div.onclick = () => window.location.href = `eventDetail.html?id=${data.id}`;
            return div;
        };

        // Upcoming first
        if (upcoming.length) {
            upcoming.forEach(data => eventsEl.appendChild(renderEvent(data, false)));
        } else {
            eventsEl.appendChild(emptyMessage("No upcoming events."));
        }

        // Divider + past
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
            past.forEach(data => eventsEl.appendChild(renderEvent(data, true)));
        }

    } catch (err) {
        console.error("Error loading events:", err);
        if (eventsEl) eventsEl.appendChild(emptyMessage("Failed to load events."));
    }
}

/* OFFICERS */
function loadOfficers(data) {
    if (!officersEl) return;
    officersEl.innerHTML = "";

    if (!data.officers || !data.officers.length) {
        officersEl.appendChild(emptyMessage("No officers listed."));
        return;
    }

    data.officers.forEach(officer => {
        const div       = document.createElement("div");
        div.className   = "orgOfficerCard";
        div.innerHTML   = `
            <div class="officerAvatar">
                ${officer.name ? officer.name[0].toUpperCase() : "?"}
            </div>
            <div>
                <strong>${officer.role || ""}</strong>
                <p>${officer.name || ""}</p>
            </div>
        `;
        officersEl.appendChild(div);
    });
}

/* JOIN SYSTEM */
function setupJoinSystem() {
    const memberRef = doc(db, "organizations", orgId, "members", currentUser.uid);

    /* SYNC BUTTON STATE IN REAL TIME */
    onSnapshot(memberRef, (snap) => {
        isMember = snap.exists();
        updateJoinBtn();
    });

    /* CLICK HANDLER */
    joinBtn.onclick = async () => {
        joinBtn.disabled     = true;
        joinBtn.style.opacity = "0.6";

        try {
            if (!isMember) {
                await setDoc(memberRef, { joinedAt: new Date() });
            } else {
                await deleteDoc(memberRef);
            }
        } catch (err) {
            console.error("Join error:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            joinBtn.disabled      = false;
            joinBtn.style.opacity = "";
        }
    };

    loadMemberCountRealtime();
}

/* JOIN BUTTON VISUAL STATE */
function updateJoinBtn() {
    if (!joinBtn) return;

    if (isMember) {
        joinBtn.textContent      = "Leave Organization";
        joinBtn.style.background = "transparent";
        joinBtn.style.border     = "1px solid var(--border-color)";
        joinBtn.style.color      = "var(--text-fill)";
    } else {
        joinBtn.textContent      = "Join Organization";
        joinBtn.style.background = "var(--theme-accent)";
        joinBtn.style.border     = "none";
        joinBtn.style.color      = "white";
    }
}

/* MEMBER COUNT */
function loadMemberCountRealtime() {
    const membersRef = collection(db, "organizations", orgId, "members");

    onSnapshot(membersRef, (snap) => {
        if (memberCountEl) {
            memberCountEl.textContent = snap.size === 1 ? "1 member" : `${snap.size} members`;
        }
    });
}

/* AUTH + EDIT BUTTON */
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
        if (joinBtn) joinBtn.style.display = "none";
        if (editBtn) editBtn.style.display = "none";
        return;
    }

    setupJoinSystem();

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data();
        const role     = userData?.role;
        const userOrg  = userData?.orgId;

        if (editBtn) {
            // Admin can edit any org; orgLeader can only edit their own
            const canEdit = role === "admin" || (role === "orgLeader" && userOrg === orgId);
            editBtn.style.display = canEdit ? "block" : "none";

            if (canEdit) {
                editBtn.onclick = () => window.location.href = `editOrganization.html?id=${orgId}`;
            }
        }

    } catch (err) {
        console.error("Auth error:", err);
        if (editBtn) editBtn.style.display = "none";
    }
});

/* INIT */
loadOrg();