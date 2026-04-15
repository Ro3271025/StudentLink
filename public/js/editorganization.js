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

const imageInput = document.getElementById("imageInput");
const imageGallery = document.getElementById("imageGallery");

const officersContainer = document.getElementById("officersContainer");
const addOfficerBtn = document.getElementById("addOfficerBtn");


const params = new URLSearchParams(window.location.search);
const orgId = params.get("id");

let currentUser = null;
let currentUserRole = null;
let orgData = null;

let imageFiles = [];
let existingImages = [];

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

    /* IMAGES */
    existingImages = orgData.imageURLs || 
        (orgData.imageURL ? [orgData.imageURL] : []);

    renderGallery();

    /* OFFICERS */
    officers = orgData.officers || [];
    renderOfficers();
}
/* IMAGE GALLERY */

function renderGallery() {
    imageGallery.innerHTML = "";

    /* EXISTING */
    existingImages.forEach((url, index) => {
        const div = document.createElement("div");
        div.className = "imageWrapper";

        div.innerHTML = `
            <img src="${url}">
            <button class="removeImgBtn">✕</button>
        `;

        div.querySelector("button").onclick = () => {
            existingImages.splice(index, 1);
            renderGallery();
        };

        imageGallery.appendChild(div);
    });

    /* NEW */
    imageFiles.forEach((file, index) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const div = document.createElement("div");
            div.className = "imageWrapper";

            div.innerHTML = `
                <img src="${e.target.result}">
                <button class="removeImgBtn">✕</button>
            `;

            div.querySelector("button").onclick = () => {
                imageFiles.splice(index, 1);
                renderGallery();
            };

            imageGallery.appendChild(div);
        };

        reader.readAsDataURL(file);
    });
}

/* IMAGE INPUT */

imageInput.addEventListener("change", () => {
    const files = Array.from(imageInput.files);
    imageFiles.push(...files);
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

/* ADD OFFICER */

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

        let finalImages = [...existingImages];

        for (const file of imageFiles) {
            const imageRef = ref(storage, `organizationImages/${orgId}/${Date.now()}_${file.name}`);
            await uploadBytes(imageRef, file);
            const url = await getDownloadURL(imageRef);
            finalImages.push(url);
        }

        await updateDoc(orgRef, {
            name: nameInput.value,
            description: descInput.value,
            category: categoryInput.value,
            email: emailInput.value,
            imageURLs: finalImages,
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