import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const btn = document.getElementById("createOrgBtn");
const storage = getStorage();

btn.addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    /* CHECK ROLE */
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role !== "orgLeader" && role !== "admin") {
        return alert("Not allowed");
    }

    const name = document.getElementById("orgName").value;
    const desc = document.getElementById("orgDesc").value;
    const file = document.getElementById("orgImage").files[0];

    if (!name) return alert("Name required");

    try {

        let imageURL = "";

        /* UPLOAD IMAGE */
        if (file) {
            const storageRef = ref(
                storage,
                `orgImages/${user.uid}_${Date.now()}`
            );

            await uploadBytes(storageRef, file);
            imageURL = await getDownloadURL(storageRef);
        }

        /* SAVE TO FIRESTORE */
        await addDoc(collection(db, "organizations"), {
            name,
            description: desc,
            imageURL,
            createdBy: user.uid,
            timestamp: serverTimestamp()
        });

        alert("Organization created!");
        window.location.href = "organizations.html";

    } catch (err) {
        console.error(err);
        alert("Error creating organization");
    }
});