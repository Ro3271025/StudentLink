import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ELEMENTS */

const btn = document.getElementById("createEventBtn");
const orgSelect = document.getElementById("eventOrg");

const imageInput = document.getElementById("eventImage");
const preview = document.getElementById("eventPreview");

const storage = getStorage();

let currentUser = null;
let userRole = null;
let allowedOrgIds = [];

/* IMAGE PREVIEW */

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    if (!file) {
        preview.style.display = "none";
        preview.src = "";
        return;
    }

    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
});

/* AUTH */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("Not logged in");
        return;
    }

    currentUser = user;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    userRole = userSnap.data()?.role;

    await loadUserOrganizations();
});
/* LOAD ORGS USER CAN POST TO */

async function loadUserOrganizations() {

    const orgSnap = await getDocs(collection(db, "organizations"));

    orgSelect.innerHTML = "";
    allowedOrgIds = []; // reset

    for (const docSnap of orgSnap.docs) {
        const data = docSnap.data();

        let isAllowed = false;

        /* ADMIN CAN POST ANYWHERE */
        if (userRole === "admin") {
            isAllowed = true;
        }

        /* OFFICER CHECK (NAME-BASED) */
        if (data.officers) {
            if (data.officers.some(o => o.name === currentUser.displayName)) {
                isAllowed = true;
            }
        }

        if (isAllowed) {
            allowedOrgIds.push(docSnap.id);

            const option = document.createElement("option");
            option.value = docSnap.id;
            option.textContent = data.name;

            orgSelect.appendChild(option);
        }
    }

    if (allowedOrgIds.length === 0) {
        alert("You are not allowed to create events for any organization.");
    }
}
/* CREATE EVENT */

btn.addEventListener("click", async () => {

    const title = document.getElementById("eventTitle").value.trim();
    const desc = document.getElementById("eventDesc").value.trim();
    const date = document.getElementById("eventDate").value;
    const location = document.getElementById("eventLocation").value.trim();
    const file = imageInput.files[0];
    const orgId = orgSelect.value;

    if (!title || !date || !orgId) {
        return alert("Missing required fields");
    }

    try {

        let imageURL = "";

        /* IMAGE UPLOAD */

        if (file) {
            const storageRef = ref(
                storage,
                `eventImages/${currentUser.uid}_${Date.now()}`
            );

            await uploadBytes(storageRef, file);
            imageURL = await getDownloadURL(storageRef);
        }
        /* GET ORG DATA */

        const orgSnap = await getDoc(doc(db, "organizations", orgId));

        if (!orgSnap.exists()) {
            return alert("Organization not found");
        }

        const orgData = orgSnap.data();
        /* SAVE EVENT */

        await addDoc(collection(db, "events"), {
            title,
            description: desc,
            date,
            location,
            imageURL,

            orgId,
            orgName: orgData.name,
            orgImage: orgData.imageURL || "",

            createdBy: currentUser.uid,
            timestamp: serverTimestamp()
        });

        alert("Event created!");
        window.location.href = "events.html";

    } catch (err) {
        console.error(err);
        alert("Error creating event");
    }
});