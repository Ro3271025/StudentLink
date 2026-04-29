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
const orgId = params.get("id");

if (!orgId) {
    alert("Organization not found");
    window.location.href = "explore.html";
}

/* ELEMENTS */

const nameEl = document.getElementById("orgName");
const descEl = document.getElementById("orgDescription");
const profileImgEl = document.getElementById("orgProfileImg");
const emailEl = document.getElementById("orgEmail");

const galleryEl = document.getElementById("orgGallery");
const eventsEl = document.getElementById("orgEvents");
const officersEl = document.getElementById("orgOfficers");

const joinBtn = document.getElementById("joinBtn");
const memberCountEl = document.getElementById("memberCount");

const editBtn = document.getElementById("editOrgBtn");

/* LOAD ORG */

async function loadOrg() {
    try {
        const snap = await getDoc(doc(db, "organizations", orgId));

        if (!snap.exists()) {
            alert("Organization does not exist");
            return;
        }

        const data = snap.data();

        /* TEXT */
        nameEl.textContent = data.name || "No Name";
        descEl.textContent = data.description || "No description";
        emailEl.textContent = data.email || "N/A";

        /* IMAGE SYSTEM */
        const mainImage =
            data.mainImageURL ||
            data.imageURL ||
            "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.svg";

        const galleryImages = data.galleryImages || [];

        profileImgEl.src = mainImage;

        loadGallery(galleryImages);
        loadEvents();
        loadOfficers(data);

    } catch (err) {
        console.error("Error loading org:", err);
    }
}

/* GALLERY */

function loadGallery(images) {
    galleryEl.innerHTML = "";

    if (!images || images.length === 0) {
        galleryEl.innerHTML = "<p>No images available</p>";
        return;
    }

    images.forEach(img => {
        const el = document.createElement("img");
        el.src = img;
        el.loading = "lazy";

        galleryEl.appendChild(el);
    });
}

/* CHECK IF EVENT IS IN THE PAST */

function isPast(dateStr) {
    if (!dateStr) return false;
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
}

/* EVENTS */

async function loadEvents() {
    try {
        const snap = await getDocs(query(
            collection(db, "events"),
            where("orgId", "==", orgId)
        ));

        eventsEl.innerHTML = "";

        if (snap.empty) {
            eventsEl.innerHTML = "<p>No events yet</p>";
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const past = isPast(data.date);

            const div = document.createElement("div");
            div.className = `eventCard${past ? " eventPast" : ""}`;

            div.innerHTML = `
                ${past ? `<div class="eventStatusBadge">Past Event</div>` : ""}
                <img src="${data.imageURL || 'styles/images/placeholder/DEFAULT_EVENT.jpg'}">
                <div class="eventInfo">
                    <h4>${data.title || "Untitled Event"}</h4>
                    <p>${data.date || ""}</p>
                    <p>${data.location || ""}</p>
                </div>
            `;

            div.onclick = () => {
                window.location.href = `eventDetail.html?id=${docSnap.id}`;
            };

            eventsEl.appendChild(div);
        });

    } catch (err) {
        console.error("Error loading events:", err);
    }
}

/* OFFICERS */

function loadOfficers(data) {
    officersEl.innerHTML = "";

    if (!data.officers || data.officers.length === 0) {
        officersEl.innerHTML = "<p>No officers listed</p>";
        return;
    }

    data.officers.forEach(officer => {
        const div = document.createElement("div");
        div.className = "orgOfficerCard";

        div.innerHTML = `
            <div class="officerAvatar">
                ${officer.name ? officer.name[0] : "?"}
            </div>
            <div>
                <strong>${officer.role}</strong>
                <p>${officer.name}</p>
            </div>
        `;

        officersEl.appendChild(div);
    });
}

/* JOIN SYSTEM */

let currentUser = null;
let isMember = false;

function setupJoinSystem() {
    const memberRef = doc(
        db,
        "organizations",
        orgId,
        "members",
        currentUser.uid
    );

    onSnapshot(memberRef, (snap) => {
        isMember = snap.exists();
        joinBtn.textContent = isMember
            ? "Leave Organization"
            : "Join Organization";
    });

    joinBtn.onclick = async () => {
        try {
            if (!isMember) {
                await setDoc(memberRef, {
                    joinedAt: new Date()
                });
            } else {
                await deleteDoc(memberRef);
            }
        } catch (err) {
            console.error("Join error:", err);
        }
    };

    loadMemberCountRealtime();
}

/* MEMBER COUNT */

function loadMemberCountRealtime() {
    const membersRef = collection(db, "organizations", orgId, "members");

    onSnapshot(membersRef, (snap) => {
        memberCountEl.textContent =
            snap.size === 1
                ? "1 member"
                : `${snap.size} members`;
    });
}

/* AUTH + EDIT BUTTON */

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
        joinBtn.style.display = "none";
        if (editBtn) editBtn.style.display = "none";
        return;
    }

    setupJoinSystem();

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const role = userSnap.data()?.role;

        if (editBtn) {
            if (role === "admin" || role === "orgLeader") {
                editBtn.style.display = "block";

                editBtn.onclick = () => {
                    window.location.href = `editOrganization.html?id=${orgId}`;
                };
            } else {
                editBtn.style.display = "none";
            }
        }

    } catch (err) {
        console.error("Auth error:", err);
    }
});

/* INIT */

loadOrg();