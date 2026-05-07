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

/* ELEMENTS */

const container = document.getElementById("orgContainer");
const btn = document.getElementById("createOrgBtnUI");
const searchInput = document.getElementById("orgSearchInput");
const categoryFilter = document.getElementById("categoryFilter");

let allOrgs = [];
let currentUser = null;
let currentUserRole = null;

/* LOAD ORGS */

async function loadOrgs() {
    const snap = await getDocs(query(
        collection(db, "organizations"),
        orderBy("timestamp", "desc")
    ));

    allOrgs = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();

        allOrgs.push({
            id: docSnap.id,
            name: data.name || "No Name",
            description: data.description || "",
            category: data.category || "",
            image: data.imageURL || data.mainImageURL || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.svg",
            createdBy: data.createdBy || null // important for edit permission
        });
    });

    renderOrgs(allOrgs);
}

/* RENDER */

function renderOrgs(orgs) {
    container.innerHTML = "";

    if (orgs.length === 0) {
        container.innerHTML = "<p>No organizations found.</p>";
        return;
    }

    orgs.forEach(org => {
        const div = document.createElement("div");
        div.className = "orgCard";

        div.innerHTML = `
            <div class="orgCardTop">
                ${canEdit(org) ? `<button class="editBtn" data-id="${org.id}">Edit</button>` : ""}
            </div>

            <img src="${org.image}" class="orgImage">

            <div class="orgInfo">
                <span class="orgName">${org.name}</span>
                <span class="orgDesc">${org.description}</span>
                <span class="orgCategory">${org.category}</span>
            </div>
        `;

        /* CLICK CARD (GO TO DETAILS) */
        div.onclick = () => {
            window.location.href = `organizationDetails.html?id=${org.id}`;
        };

        /* EDIT BUTTON CLICK */
        const editBtn = div.querySelector(".editBtn");

        if (editBtn) {
            editBtn.onclick = (e) => {
                e.stopPropagation(); // prevents card click
                window.location.href = `editOrganization.html?id=${org.id}`;
            };
        }

        container.appendChild(div);
    });
}
/* PERMISSION CHECK */

function canEdit(org) {
    if (!currentUser) return false;

    return (
        currentUserRole === "admin" ||
        currentUserRole === "orgLeader" ||
        currentUser.uid === org.createdBy
    );
}
/* SEARCH + FILTER */

function filterOrgs() {
    const searchValue = searchInput?.value.toLowerCase() || "";
    const categoryValue = categoryFilter?.value || "";

    const filtered = allOrgs.filter(org => {
        const matchesSearch =
            org.name.toLowerCase().includes(searchValue) ||
            org.description.toLowerCase().includes(searchValue);

        const matchesCategory =
            categoryValue === "" || org.category === categoryValue;

        return matchesSearch && matchesCategory;
    });

    renderOrgs(filtered);
}
/* EVENT LISTENERS */

if (searchInput) {
    searchInput.addEventListener("input", filterOrgs);
}

if (categoryFilter) {
    categoryFilter.addEventListener("change", filterOrgs);
}
/* AUTH + ROLE */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        btn.style.display = "none";
        currentUser = null;
        currentUserRole = null;
        return;
    }

    currentUser = user;

    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserRole = snap.data()?.role;

    /* CREATE BUTTON */
    if (currentUserRole === "orgLeader" || currentUserRole === "admin") {
        btn.style.display = "block";
        btn.onclick = () => {
            window.location.href = "createOrganization.html";
        };
    } else {
        btn.style.display = "none";
    }

    /* RE-RENDER to show edit buttons */
    renderOrgs(allOrgs);
});

/* INIT */
loadOrgs();