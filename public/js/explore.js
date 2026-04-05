import { db } from "./firebaseInitialization.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const feed = document.getElementById("exploreFeed");
const filter = document.getElementById("filterSelection");
const searchBar = document.getElementById("exploreSearchBar");

let allItems = [];

/* LOAD DATA */
async function loadExplore() {
    feed.innerHTML = "Loading...";

    const postsSnap = await getDocs(query(
        collection(db, "posts"),
        orderBy("timestamp", "desc")
    ));

    const listingsSnap = await getDocs(query(
        collection(db, "listings"),
        orderBy("timestamp", "desc")
    ));

    allItems = [];

    postsSnap.forEach(doc => {
        allItems.push({ id: doc.id, type: "post", ...doc.data() });
    });

    listingsSnap.forEach(doc => {
        allItems.push({ id: doc.id, type: "listing", ...doc.data() });
    });

    renderFeed(allItems);
}

/* RENDER */
function renderFeed(items) {
    feed.innerHTML = "";
    console.log(item);

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "feedItem";

        if (item.type === "post") {
            div.innerHTML = `
                <strong>@${item.username || "user"}</strong>
                <p>${item.text || ""}</p>
            `;
        }

        if (item.type === "listing") {
            div.innerHTML = `
                <strong>@${item.username || "user"}</strong>
                <p>${item.title || ""}</p>
                <p>$${item.price || ""}</p>
                ${item.imageURL ? `<img src="${item.imageURL}">` : ""}
            `;
        }

        feed.appendChild(div);
    });
}

/* FILTER */
filter.addEventListener("change", () => {
    const val = filter.value;

    if (val === "all") {
        renderFeed(allItems);
        return;
    }

    const filtered = allItems.filter(i =>
        val === "posts" ? i.type === "post" :
        val === "listings" ? i.type === "listing" :
        true
    );

    renderFeed(filtered);
});

/* SEARCH */
searchBar.addEventListener("input", () => {
    const val = searchBar.value.toLowerCase();

    const filtered = allItems.filter(i =>
        (i.text || i.title || "").toLowerCase().includes(val)
    );

    renderFeed(filtered);
});

loadExplore();