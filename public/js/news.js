import { db } from "./firebaseInitialization.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const newsContainer = document.getElementById("newsContainer");
const searchInput = document.getElementById("newsSearchInput");
const createBtn = document.getElementById("createNewsBtnUI");

let allNews = [];

/* LOAD NEWS */
async function loadNews() {
    const q = query(collection(db, "news"), orderBy("timestamp", "desc"));
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

    if (!newsList.length) {
        newsContainer.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No news yet.</p>";
        return;
    }

    newsList.forEach(news => {
        const div = document.createElement("div");
        div.className = "feedItem";

        div.innerHTML = `
            <div class="feedHeader">
                <span class="feedUser">${news.authorName || "Staff"}</span>
                <span class="feedType">News</span>
            </div>
            <div class="feedContent">
                <strong>${news.title || ""}</strong>
            </div>
            <div class="feedMeta">${news.timestamp?.toDate().toLocaleDateString() || ""}</div>
        `;

        div.onclick = () => {
            window.location.href = `newsDetails.html?id=${news.id}`;
        };

        newsContainer.appendChild(div);
    });
}

/* SEARCH */
searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();
    const filtered = allNews.filter(n =>
        (n.title || "").toLowerCase().includes(value)
    );
    renderNews(filtered);
});

/* CREATE BUTTON */
createBtn.onclick = () => {
    window.location.href = "createNews.html";
};

loadNews();