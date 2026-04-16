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

const btn = document.getElementById("createNewsBtn");
const storage = getStorage();

btn.addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    /* CHECK ROLE */
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role !== "admin") {
        return alert("Only admins can post news");
    }

    const title = document.getElementById("newsTitle").value;
    const content = document.getElementById("newsContent").value;
    const file = document.getElementById("newsImage").files[0];

    if (!title || !content) return alert("Missing fields");

    try {

        let imageURL = "";

        /* UPLOAD IMAGE */
        if (file) {
            const storageRef = ref(
                storage,
                `newsImages/${user.uid}_${Date.now()}`
            );

            await uploadBytes(storageRef, file);
            imageURL = await getDownloadURL(storageRef);
        }

        /* SAVE TO FIRESTORE */
        await addDoc(collection(db, "news"), {
            title,
            content,
            imageURL,
            createdBy: user.uid,
            timestamp: serverTimestamp()
        });

        alert("News posted!");
        window.location.href = "news.html";

    } catch (err) {
        console.error(err);
        alert("Error posting news");
    }
});