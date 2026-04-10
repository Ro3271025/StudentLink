import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const btn = document.getElementById("createEventBtn");

btn.addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    /* CHECK ROLE */
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role !== "orgLeader" && role !== "admin") {
        return alert("Not allowed");
    }

    const title = document.getElementById("eventTitle").value;
    const date = document.getElementById("eventDate").value;
    const location = document.getElementById("eventLocation").value;
    const desc = document.getElementById("eventDesc").value;

    if (!title || !date) return alert("Missing fields");

    try {
        await addDoc(collection(db, "events"), {
            title,
            date,
            location,
            description: desc,
            createdBy: user.uid,
            timestamp: serverTimestamp()
        });

        alert("Event created!");
        window.location.href = "events.html";

    } catch (err) {
        console.error(err);
        alert("Error creating event");
    }
});