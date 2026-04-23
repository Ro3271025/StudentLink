import { db, auth } from "./firebaseInitialization.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const newsContainer = document.getElementById("newsContainer");
const searchInput = document.getElementById("newsSearchInput");
const createBtn = document.getElementById("createNewsBtnUI");

let allNews = [];

/* LOAD USER (SIDEBAR) */

onAuthStateChanged(auth, (user) => {
    if (!user) return;

    document.getElementById("displayName").textContent = user.displayName;
    document.getElementById("username").textContent = "@" + user.email.split("@")[0];
});

/* LOAD NEWS */

async function loadNews() {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    allNews = [];

    snapshot.forEach(docSnap => {
        allNews.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderNews(allNews);
}

/* RENDER */

function renderNews(newsList) {
    newsContainer.innerHTML = "";

    newsList.forEach(news => {

        const card = document.createElement("div");
        card.className = "newsCard";

        card.innerHTML = `
            <img src="${news.imageURL || 'styles/images/placeholder/placeholder.jpg'}" class="newsImage">

            <div class="newsInfo">
                <div class="newsTitle">${news.title}</div>
                <div class="newsDate">
                    ${news.createdAt?.toDate().toLocaleDateString() || ""}
                </div>
            </div>
        `;

        card.onclick = () => {
            window.location.href = `newsDetails.html?id=${news.id}`;
        };

        newsContainer.appendChild(card);
    });
}

/* SEARCH (RIGHT SIDEBAR) */

searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();

    const filtered = allNews.filter(n =>
        n.title.toLowerCase().includes(value)
    );

    renderNews(filtered);
});
/* CREATE BUTTON */

createBtn.onclick = () => {
    window.location.href = "createNews.html";
};


loadNews();