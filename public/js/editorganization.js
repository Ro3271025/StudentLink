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

/* ========================= */
/* ELEMENTS */
/* ========================= */

const nameInput = document.getElementById("nameInput");
const descInput = document.getElementById("descInput");
const categoryInput = document.getElementById("categoryInput");
const emailInput = document.getElementById("emailInput");
const saveBtn = document.getElementById("saveBtn");

const imageInput = document.getElementById("imageInput");
const previewImage = document.getElementById("previewImage");

/* ========================= */

const params = new URLSearchParams(window.location.search);
const orgId = params.get("id");

let currentUser = null;
let orgData = null;
let newImageFile = null;

const storage = getStorage();

/* ========================= */
/* LOAD DATA */
/* ========================= */

async function loadOrg() {
    const orgRef = doc(db, "organizations", orgId);
    const snap = await getDoc(orgRef);

    if (!snap.exists()) {
        alert("Organization not found.");
        return;
    }

    orgData = snap.data();

    /* PREFILL */
    nameInput.value = orgData.name || "";
    descInput.value = orgData.description || "";
    categoryInput.value = orgData.category || "";
    emailInput.value = orgData.email || "";

    previewImage.src = orgData.imageURL || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.svg";
}

/* ========================= */
/* IMAGE PREVIEW */
/* ========================= */

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    newImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

/* ========================= */
/* SAVE */
/* ========================= */

saveBtn.onclick = async () => {
    if (!nameInput.value.trim()) {
        alert("Name is required.");
        return;
    }

    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    try {
        const orgRef = doc(db, "organizations", orgId);

        let imageURL = orgData.imageURL || "";

        /* UPLOAD NEW IMAGE */
        if (newImageFile) {
            const imageRef = ref(storage, `organizationImages/${orgId}/${Date.now()}`);
            await uploadBytes(imageRef, newImageFile);
            imageURL = await getDownloadURL(imageRef);
        }

        /* UPDATE */
        await updateDoc(orgRef, {
            name: nameInput.value,
            description: descInput.value,
            category: categoryInput.value,
            email: emailInput.value,
            imageURL,
            updatedAt: serverTimestamp()
        });

        alert("Organization updated successfully!");

        window.location.href = `organizationDetails.html?id=${orgId}`;

    } catch (err) {
        console.error(err);
        alert("Error updating organization.");
    }

    saveBtn.innerText = "Save Changes";
    saveBtn.disabled = false;
};

/* ========================= */
/* AUTH + PERMISSION */
/* ========================= */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("Not authorized.");
        window.location.href = "organizations.html";
        return;
    }

    currentUser = user;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const role = userSnap.data()?.role;

    await loadOrg();

    /* PERMISSION CHECK */
    if (
        role !== "admin" &&
        role !== "orgLeader" &&
        currentUser.uid !== orgData.createdBy
    ) {
        alert("You do not have permission to edit this organization.");
        window.location.href = "organizationDetails.html?id=" + orgId;
    }
});