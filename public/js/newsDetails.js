import { db } from "./firebaseInitialization.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function loadNews() {

    const snap = await getDoc(doc(db, "news", id));
    const news = snap.data();

    document.getElementById("newsTitle").textContent = news.title;

    document.getElementById("authorName").textContent = news.authorName;
    document.getElementById("newsDate").textContent =
        news.createdAt?.toDate().toLocaleDateString();

    document.getElementById("orgName").textContent =
        news.organizationName || "";

    document.getElementById("authorPhoto").src =
        news.authorPhoto || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG";

    if (news.imageURL) {
        document.getElementById("newsImage").src = news.imageURL;
    }

    document.getElementById("newsContent").textContent = news.content;
}

loadNews();