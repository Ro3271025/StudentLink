import { db } from "./firebaseInitialization.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function loadNews() {
    if (!id) {
        document.getElementById("newsTitle").textContent = "News not found.";
        return;
    }

    try {
        const snap = await getDoc(doc(db, "news", id));

        if (!snap.exists()) {
            document.getElementById("newsTitle").textContent = "News not found.";
            return;
        }

        const news = snap.data();

        document.getElementById("newsTitle").textContent = news.title || "";
        document.getElementById("authorName").textContent = news.authorName || "Staff";

        // Try timestamp first, fall back to createdAt
        const date = news.timestamp || news.createdAt;
        document.getElementById("newsDate").textContent =
            date?.toDate().toLocaleDateString() || "";

        document.getElementById("orgName").textContent =
            news.organizationName || "";

        document.getElementById("authorPhoto").src =
            news.authorPhoto || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG";

        if (news.imageURL) {
            document.getElementById("newsImage").src = news.imageURL;
        } else {
            document.getElementById("newsImage").style.display = "none";
        }

        document.getElementById("newsContent").textContent = news.content || "";

    } catch (err) {
        console.error("Failed to load news:", err);
        document.getElementById("newsTitle").textContent = "Failed to load news.";
    }
}

loadNews();