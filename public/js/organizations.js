import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const container = document.getElementById("orgContainer");
const btn = document.getElementById("createOrgBtnUI");

/* LOAD ORGS */
async function loadOrgs() {
    const snap = await getDocs(query(
        collection(db, "organizations"),
        orderBy("timestamp", "desc")
    ));

    container.innerHTML = "";

    snap.forEach(docSnap => {
        const data = docSnap.data();

        const div = document.createElement("div");
        div.className = "feedItem";

        div.innerHTML = `
            <strong>${data.name}</strong>
            <p>${data.description}</p>
            ${data.imageURL ? `<img src="${data.imageURL}">` : ""}
        `;

        container.appendChild(div);
    });
}

/* SHOW CREATE BUTTON */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        btn.style.display = "none";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role === "orgLeader" || role === "admin") {
        btn.style.display = "block";
        btn.onclick = () => window.location.href = "createOrganization.html";
    } else {
        btn.style.display = "none";
    }
});

loadOrgs();