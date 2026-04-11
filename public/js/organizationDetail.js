import { db, auth } from "./firebaseInitialization.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

/* ELEMENTS */
const nameEl = document.getElementById("orgName");
const descEl = document.getElementById("orgDescription");
const imgEl = document.getElementById("orgProfileImg");
const emailEl = document.getElementById("orgEmail");

const galleryEl = document.getElementById("orgGallery");
const eventsEl = document.getElementById("orgEvents");
const officersEl = document.getElementById("orgOfficers");

/* LOAD ORG */
async function loadOrg() {
    const snap = await getDoc(doc(db, "organizations", orgId));

    if (!snap.exists()) return;

    const data = snap.data();

    nameEl.textContent = data.name;
    descEl.textContent = data.description;
    emailEl.textContent = data.email || "N/A";

    imgEl.src = data.imageURL || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.svg";

    loadGallery(data);
    loadEvents();
    loadOfficers(data);
}

/* GALLERY */
function loadGallery(data) {
    galleryEl.innerHTML = "";

    if (!data.gallery) return;

    data.gallery.forEach(img => {
        const el = document.createElement("img");
        el.src = img;
        galleryEl.appendChild(el);
    });
}

/* EVENTS */
async function loadEvents() {
    const snap = await getDocs(query(
        collection(db, "events"),
        where("orgId", "==", orgId)
    ));

    eventsEl.innerHTML = "";

    snap.forEach(docSnap => {
        const data = docSnap.data();

        const div = document.createElement("div");
        div.className = "eventCard";

        div.innerHTML = `
            <img src="${data.imageURL}">
            <h4>${data.title}</h4>
            <p>${data.date}</p>
            <p>${data.location}</p>
        `;

        eventsEl.appendChild(div);
    });
}

/* OFFICERS */
function loadOfficers(data) {
    officersEl.innerHTML = "";

    if (!data.officers) return;

    data.officers.forEach(officer => {
        const div = document.createElement("div");
        div.className = "officerCard";

        div.innerHTML = `
            <div class="officerAvatar"></div>
            <strong>${officer.role}</strong>
            <p>${officer.name}</p>
        `;

        officersEl.appendChild(div);
    });
}
let currentUser = null;
let isMember = false;

const joinBtn = document.getElementById("joinBtn");
const memberCountEl = document.getElementById("memberCount");

onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (user) {
        setupJoinSystem();
    } else {
        joinBtn.style.display = "none";
    }
});
/* Join Organization*/
function setupJoinSystem() {

    const memberRef = doc(
        db,
        "organizations",
        orgId,
        "members",
        currentUser.uid
    );

    /* REAL-TIME MEMBER STATUS */
    onSnapshot(memberRef, (snap) => {
        isMember = snap.exists();
        joinBtn.textContent = isMember ? "Leave Organization" : "Join Organization";
    });

    /* BUTTON ACTION */
    joinBtn.onclick = async () => {
        if (!isMember) {
            await setDoc(memberRef, {
                joinedAt: new Date()
            });
        } else {
            await deleteDoc(memberRef);
        }
    };

    /* REAL-TIME COUNT */
    loadMemberCountRealtime();
}
/* Member Count */
function loadMemberCountRealtime() {
    const membersRef = collection(db, "organizations", orgId, "members");

    onSnapshot(membersRef, (snap) => {
        memberCountEl.textContent =
        snap.size === 1 ? "1 member" : `${snap.size} members`;
    });
}

loadOrg();