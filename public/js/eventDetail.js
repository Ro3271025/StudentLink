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

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

/* ELEMENTS */

const titleEl = document.getElementById("eventTitle");
const dateEl = document.getElementById("eventDate");
const locEl = document.getElementById("eventLocation");
const descEl = document.getElementById("eventDescription");
const imgEl = document.getElementById("eventImage");

const orgCard = document.getElementById("hostOrgCard");
const relatedEl = document.getElementById("relatedEvents");

const rsvpBtn = document.getElementById("rsvpBtn");
const rsvpCountEl = document.getElementById("rsvpCount");

let currentUser = null;
let isGoing = false;
let orgId = null;

/* LOAD EVENT */

async function loadEvent() {

    const snap = await getDoc(doc(db, "events", eventId));
    if (!snap.exists()) return;

    const data = snap.data();

    titleEl.textContent = data.title;
    dateEl.textContent = data.date;
    locEl.textContent = data.location;
    descEl.textContent = data.description;

    imgEl.src = data.imageURL || "styles/images/placeholder/DEFAULT_BANNER.svg";

    orgId = data.orgId;

    loadHostOrg();
    loadRelatedEvents();
}

/* HOST ORG */

async function loadHostOrg() {
    const snap = await getDoc(doc(db, "organizations", orgId));
    if (!snap.exists()) return;

    const data = snap.data();

    orgCard.innerHTML = `
        <img src="${data.imageURL || ''}" class="orgImage">
        <div>
            <strong>${data.name}</strong>
        </div>
    `;

    orgCard.onclick = () => {
        window.location.href = `organizationDetails.html?id=${orgId}`;
    };
}

/* RELATED EVENTS */

async function loadRelatedEvents() {

    const snap = await getDocs(query(
        collection(db, "events"),
        where("orgId", "==", orgId)
    ));

    relatedEl.innerHTML = "";

    snap.forEach(docSnap => {

        if (docSnap.id === eventId) return;

        const data = docSnap.data();

        const div = document.createElement("div");
        div.className = "eventCard";

        div.innerHTML = `
            <img src="${data.imageURL}">
            <div class="eventInfo">
                <div class="eventTitle">${data.title}</div>
                <div class="eventMeta">${data.date}</div>
            </div>
        `;

        div.onclick = () => {
            window.location.href = `eventDetail.html?id=${docSnap.id}`;
        };

        relatedEl.appendChild(div);
    });
}
/* RSVP SYSTEM */

onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (!user) {
        rsvpBtn.style.display = "none";
        return;
    }

    setupRSVP();
});

function setupRSVP() {

    const ref = doc(db, "events", eventId, "attendees", currentUser.uid);

    /* REAL-TIME STATUS */
    onSnapshot(ref, (snap) => {
        isGoing = snap.exists();
        rsvpBtn.textContent = isGoing ? "Cancel RSVP" : "RSVP";
    });

    /* CLICK */
    rsvpBtn.onclick = async () => {
        if (!isGoing) {
            await setDoc(ref, { joinedAt: new Date() });
        } else {
            await deleteDoc(ref);
        }
    };

    /* COUNT */
    const colRef = collection(db, "events", eventId, "attendees");

    onSnapshot(colRef, (snap) => {
        rsvpCountEl.textContent =
            snap.size === 1 ? "1 going" : `${snap.size} going`;
    });
}

/* INIT */

loadEvent();