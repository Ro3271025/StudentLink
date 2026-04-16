import { db, auth } from "./firebaseInitialization.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ELEMENTS */

const form = document.getElementById("editOrgForm");

const nameInput = document.getElementById("nameInput");
const descInput = document.getElementById("descInput");
const categoryInput = document.getElementById("categoryInput");
const emailInput = document.getElementById("emailInput");

/* NEW IMAGE SYSTEM */
const mainImageContainer = document.getElementById("mainImageContainer");
const mainImageInput = document.getElementById("mainImageInput");

const galleryContainer = document.getElementById("galleryContainer");
const galleryInput = document.getElementById("galleryInput");

/* OFFICERS */
const officersContainer = document.getElementById("officersContainer");
const addOfficerBtn = document.getElementById("addOfficerBtn");



const params = new URLSearchParams(window.location.search);
const orgId = params.get("id");

let currentUser = null;
let currentUserRole = null;
let orgData = null;

/* IMAGE STATE */
let mainImageFile = null;
let existingMainImage = "";

let galleryFiles = [];
let existingGallery = [];

/* OFFICERS */
let officers = [];

const storage = getStorage();

/* LOAD DATA */

async function loadOrg() {
    const orgRef = doc(db, "organizations", orgId);
    const snap = await getDoc(orgRef);

    if (!snap.exists()) {
        alert("Organization not found.");
        window.location.href = "organizations.html";
        return;
    }

    orgData = snap.data();

    nameInput.value = orgData.name || "";
    descInput.value = orgData.description || "";
    categoryInput.value = orgData.category || "";
    emailInput.value = orgData.email || "";

    /* MAIN IMAGE */
    existingMainImage =
        orgData.mainImageURL ||
        orgData.imageURL ||
        "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.svg";

    /* GALLERY */
    existingGallery = orgData.galleryImages || [];

    renderMainImage();
    renderGallery();

    /* OFFICERS */
    officers = orgData.officers || [];
    renderOfficers();
}

/* MAIN IMAGE */

function renderMainImage() {
    mainImageContainer.innerHTML = `<img src="${existingMainImage}">`;
}

mainImageInput.addEventListener("change", () => {
    const file = mainImageInput.files[0];
    if (!file) return;

    mainImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        existingMainImage = e.target.result;
        renderMainImage();
    };
    reader.readAsDataURL(file);
});

/* GALLERY */

function renderGallery() {
    galleryContainer.innerHTML = "";

    /* EXISTING */
    existingGallery.forEach((url, index) => {
        const div = document.createElement("div");
        div.className = "imageWrapper";

        div.innerHTML = `
            <img src="${url}">
            <button class="removeImgBtn">✕</button>
        `;

        div.querySelector("button").onclick = () => {
            existingGallery.splice(index, 1);
            renderGallery();
        };

        galleryContainer.appendChild(div);
    });

    /* NEW */
    galleryFiles.forEach((file, index) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const div = document.createElement("div");
            div.className = "imageWrapper";

            div.innerHTML = `
                <img src="${e.target.result}">
                <button class="removeImgBtn">✕</button>
            `;

            div.querySelector("button").onclick = () => {
                galleryFiles.splice(index, 1);
                renderGallery();
            };

            galleryContainer.appendChild(div);
        };

        reader.readAsDataURL(file);
    });
}

galleryInput.addEventListener("change", () => {
    const files = Array.from(galleryInput.files);
    galleryFiles.push(...files);
    renderGallery();
});

/* OFFICERS */

function renderOfficers() {
    officersContainer.innerHTML = "";

    officers.forEach((officer, index) => {
        const div = document.createElement("div");
        div.className = "officerRow";

        div.innerHTML = `
            <input class="listingInput" value="${officer.name}" placeholder="Name">
            <input class="listingInput" value="${officer.role}" placeholder="Role">
            <button class="removeOfficerBtn">✕</button>
        `;

        const inputs = div.querySelectorAll("input");

        inputs[0].oninput = (e) => officers[index].name = e.target.value;
        inputs[1].oninput = (e) => officers[index].role = e.target.value;

        div.querySelector("button").onclick = () => {
            officers.splice(index, 1);
            renderOfficers();
        };

        officersContainer.appendChild(div);
    });
}

addOfficerBtn.onclick = () => {
    officers.push({ name: "", role: "" });
    renderOfficers();
};

/* SAVE */

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector("button");
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    try {
        const orgRef = doc(db, "organizations", orgId);

        let mainImageURL = existingMainImage;
        let galleryURLs = [...existingGallery];

        /* MAIN IMAGE UPLOAD */
        if (mainImageFile) {
            const refPath = ref(storage, `organizationMain/${orgId}/${Date.now()}`);
            await uploadBytes(refPath, mainImageFile);
            mainImageURL = await getDownloadURL(refPath);
        }

        /* GALLERY UPLOAD */
        for (const file of galleryFiles) {
            const refPath = ref(storage, `organizationGallery/${orgId}/${Date.now()}_${file.name}`);
            await uploadBytes(refPath, file);
            const url = await getDownloadURL(refPath);
            galleryURLs.push(url);
        }

        await updateDoc(orgRef, {
            name: nameInput.value,
            description: descInput.value,
            category: categoryInput.value,
            email: emailInput.value,
            mainImageURL,
            galleryImages: galleryURLs,
            officers: officers.filter(o => o.name && o.role),
            updatedAt: serverTimestamp()
        });

        alert("Organization updated!");
        window.location.href = `organizationDetails.html?id=${orgId}`;

    } catch (err) {
        console.error(err);
        alert("Error updating organization.");
    }

    submitBtn.innerText = "Save Changes";
    submitBtn.disabled = false;
});

/* AUTH */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "organizations.html";
        return;
    }

    currentUser = user;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    currentUserRole = userSnap.data()?.role;

    await loadOrg();

    if (
        currentUserRole !== "admin" &&
        currentUserRole !== "orgLeader" &&
        currentUser.uid !== orgData.createdBy
    ) {
        alert("No permission.");
        window.location.href = `organizationDetails.html?id=${orgId}`;
    }
});