import { db } from "./firebaseInitialization.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ELEMENTS */

const container = document.getElementById("eventsContainer");
const searchInput = document.getElementById("eventSearch");

let allEvents = [];

/* LOAD EVENTS */

async function loadEvents() {

    const snap = await getDocs(query(
        collection(db, "events"),
        orderBy("timestamp", "desc")
    ));

    allEvents = [];

    for (const docSnap of snap.docs) {
        const data = docSnap.data();

        // 🔥 get org name
        let orgName = "Unknown Org";

        if (data.orgId) {
            const orgSnap = await getDoc(doc(db, "organizations", data.orgId));
            if (orgSnap.exists()) {
                orgName = orgSnap.data().name;
            }
        }

        allEvents.push({
            id: docSnap.id,
            title: data.title,
            description: data.description,
            date: data.date,
            location: data.location,
            image: data.imageURL || "styles/images/placeholder/DEFAULT_BANNER.svg",
            orgName
        });
    }

    renderEvents(allEvents);
}

/* RENDER */

function renderEvents(events) {
    container.innerHTML = "";

    if (events.length === 0) {
        container.innerHTML = "<p>No events found.</p>";
        return;
    }

    events.forEach(ev => {
        const div = document.createElement("div");
        div.className = "eventCard";

        div.innerHTML = `
            <img src="${ev.image}">

            <div class="eventInfo">
                <div class="eventTitle">${ev.title}</div>
                <div class="eventMeta">${ev.date}</div>
                <div class="eventMeta">${ev.location || ""}</div>
                <div class="eventMeta">${ev.orgName}</div>
            </div>
        `;

        div.onclick = () => {
            window.location.href = `eventDetail.html?id=${ev.id}`;
        };

        container.appendChild(div);
    });
}

/* SEARCH */

function filterEvents() {
    const value = searchInput.value.toLowerCase();

    const filtered = allEvents.filter(ev =>
        ev.title.toLowerCase().includes(value) ||
        ev.description.toLowerCase().includes(value)
    );

    renderEvents(filtered);
}

searchInput.addEventListener("input", filterEvents);

/* INIT */

loadEvents();