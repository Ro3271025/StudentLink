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

const container = document.getElementById("newsContainer");
const btn = document.getElementById("createNewsBtnUI");

/* LOAD NEWS */
async function loadNews() {
    const snap = await getDocs(query(
        collection(db, "news"),
        orderBy("timestamp", "desc")
    ));

    container.innerHTML = "";

    snap.forEach(docSnap => {
        const data = docSnap.data();

        const div = document.createElement("div");
        div.className = "feedItem";

        div.innerHTML = `
            <strong>${data.title}</strong>
            <p>${data.content}</p>
            ${data.imageURL ? `<img src="${data.imageURL}">` : ""}
        `;

        container.appendChild(div);
    });
}

/* SHOW CREATE BUTTON (ADMIN ONLY) */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        btn.style.display = "none";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role === "admin") {
        btn.style.display = "block";
        btn.onclick = () => window.location.href = "createNews.html";
    } else {
        btn.style.display = "none";
    }
});

loadNews();