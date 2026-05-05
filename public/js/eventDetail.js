import { db, auth } from "./firebaseInitialization.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    setDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* GET EVENT ID */
const params  = new URLSearchParams(window.location.search);
const eventId = params.get("id");

/* ELEMENTS */
const titleEl    = document.getElementById("eventTitle");
const dateEl     = document.getElementById("eventDate");
const locEl      = document.getElementById("eventLocation");
const descEl     = document.getElementById("eventDescription");
const imgEl      = document.getElementById("eventImage");
const orgCard    = document.getElementById("hostOrgCard");
const relatedEl  = document.getElementById("relatedEvents");
const rsvpBtn    = document.getElementById("rsvpBtn");
const rsvpCountEl = document.getElementById("rsvpCount");
const editBtn    = document.getElementById("editEventBtn");

/* STATE */
let currentUser = null;
let isGoing     = false;
let orgId       = null;

/* LOAD EVENT */
async function loadEvent() {
    try {
        const snap = await getDoc(doc(db, "events", eventId));
        if (!snap.exists()) {
            titleEl.textContent = "Event not found.";
            return;
        }

        const data = snap.data();

        /* TEXT */
        titleEl.textContent = data.title    || "Untitled Event";
        dateEl.textContent  = data.date     || "";
        locEl.textContent   = data.location || "";
        descEl.textContent  = data.description || "";

        /* IMAGE */
        imgEl.src = data.imageURL || "styles/images/placeholder/DEFAULT_BANNER.svg";

        /* EDIT BUTTON */
        if (editBtn) {
            editBtn.onclick = () => window.location.href = `editEvent.html?id=${eventId}`;
        }

        /* ORG */
        orgId = data.orgId;

        if (orgId) {
            loadHostOrg();
            loadRelatedEvents();
        }

    } catch (err) {
        console.error("Failed to load event:", err);
        if (titleEl) titleEl.textContent = "Failed to load event.";
    }
}

/* HOST ORG */
async function loadHostOrg() {
    try {
        const snap = await getDoc(doc(db, "organizations", orgId));
        if (!snap.exists()) return;

        const data = snap.data();

        orgCard.innerHTML = `
            <img src="${data.mainImageURL || data.imageURL || ''}" class="orgImage">
            <div>
                <strong>${data.name || "Unknown Org"}</strong>
            </div>
        `;

        orgCard.style.cursor = "pointer";
        orgCard.onclick = () => window.location.href = `organizationDetails.html?id=${orgId}`;

    } catch (err) {
        console.error("Failed to load host org:", err);
    }
}

/* RELATED EVENTS */
async function loadRelatedEvents() {
    try {
        const snap = await getDocs(query(
            collection(db, "events"),
            where("orgId", "==", orgId)
        ));

        relatedEl.innerHTML = "";

        snap.forEach(docSnap => {
            if (docSnap.id === eventId) return;

            const data = docSnap.data();
            const div  = document.createElement("div");
            div.className = "eventCard";
            div.innerHTML = `
                <img src="${data.imageURL || ''}">
                <div class="eventInfo">
                    <div class="eventTitle">${data.title || "Untitled"}</div>
                    <div class="eventMeta">${data.date  || ""}</div>
                </div>
            `;
            div.onclick = () => window.location.href = `eventDetail.html?id=${docSnap.id}`;
            relatedEl.appendChild(div);
        });

        if (!relatedEl.children.length) {
            relatedEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No other events from this org.</p>";
        }

    } catch (err) {
        console.error("Failed to load related events:", err);
    }
}

/* RSVP SYSTEM */
function setupRSVP() {
    const attendeeRef = doc(db, "events", eventId, "attendees", currentUser.uid);
    const attendeeCol = collection(db, "events", eventId, "attendees");

    /* SYNC BUTTON STATE IN REAL TIME */
    onSnapshot(attendeeRef, (snap) => {
        isGoing = snap.exists();
        updateRsvpBtn();
    });

    /* SYNC COUNT IN REAL TIME */
    onSnapshot(attendeeCol, (snap) => {
        rsvpCountEl.textContent = snap.size === 1 ? "1 going" : `${snap.size} going`;
    });

    /* CLICK HANDLER */
    rsvpBtn.onclick = async () => {
        rsvpBtn.disabled = true;
        rsvpBtn.style.opacity = "0.6";

        try {
            if (!isGoing) {
                await setDoc(attendeeRef, { joinedAt: new Date() });
            } else {
                await deleteDoc(attendeeRef);
            }
        } catch (err) {
            console.error("RSVP error:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            rsvpBtn.disabled = false;
            rsvpBtn.style.opacity = "";
        }
    };
}

/* RSVP BUTTON VISUAL STATE */
function updateRsvpBtn() {
    if (!rsvpBtn) return;

    if (isGoing) {
        rsvpBtn.textContent         = "Cancel RSVP";
        rsvpBtn.style.background    = "transparent";
        rsvpBtn.style.border        = "1px solid var(--border-color)";
        rsvpBtn.style.color         = "var(--text-fill)";
    } else {
        rsvpBtn.textContent         = "RSVP";
        rsvpBtn.style.background    = "var(--theme-accent)";
        rsvpBtn.style.border        = "none";
        rsvpBtn.style.color         = "white";
    }
}

/* AUTH + EDIT CONTROL */
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
        if (rsvpBtn) rsvpBtn.style.display = "none";
        if (editBtn) editBtn.style.display = "none";
        return;
    }

    setupRSVP();

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data();
        const role     = userData?.role;
        const userOrg  = userData?.orgId;

        if (editBtn) {
            // Admin can edit any event; orgLeader can only edit their own org's events
            const canEdit = role === "admin" || (role === "orgLeader" && userOrg === orgId);
            editBtn.style.display = canEdit ? "block" : "none";
        }

    } catch (err) {
        console.error("Auth error:", err);
        if (editBtn) editBtn.style.display = "none";
    }
});

/* INIT */
loadEvent();