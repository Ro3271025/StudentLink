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

/* CREATE BUTTON LOGIC */
const createBtn = document.getElementById("createNewsBtnUI");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        createBtn.style.display = "none";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role === "admin" || role === "orgLeader") {
        createBtn.style.display = "block";
        createBtn.onclick = () => {
            window.location.href = "createNews.html";
        };
    } else {
        createBtn.style.display = "none";
    }
});

/* NEWS LOGIC */
const newsContainer = document.getElementById("newsContainer");
const searchInput = document.getElementById("newsSearchInput");

let allNews = [];

/* LOAD NEWS */
async function loadNews() {
    const snap = await getDocs(query(
        collection(db, "news"),
        orderBy("timestamp", "desc")
    ));

    allNews = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();
        allNews.push({
            id: docSnap.id,
            title: data.title || "",
            authorName: data.authorName || "Staff",
            timestamp: data.timestamp
        });
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
                <span class="feedUser">${news.authorName}</span>
                <span class="feedType">News</span>
            </div>
            <div class="feedContent">
                <strong>${news.title}</strong>
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
function filterNews() {
    const value = searchInput.value.toLowerCase();
    const filtered = allNews.filter(n =>
        n.title.toLowerCase().includes(value)
    );
    renderNews(filtered);
}

searchInput.addEventListener("input", filterNews);

/* INIT */
loadNews();