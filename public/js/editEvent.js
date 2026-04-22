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

const form = document.getElementById("editEventForm");

const titleInput = document.getElementById("titleInput");
const descInput = document.getElementById("descInput");
const locationInput = document.getElementById("locationInput");
const dateInput = document.getElementById("dateInput");

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");

/* STATE */

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

let currentUser = null;
let eventData = null;

let newImageFile = null;
let existingImage = "";

const storage = getStorage();

/* LOAD */

async function loadEvent() {
    const snap = await getDoc(doc(db, "events", eventId));

    if (!snap.exists()) {
        alert("Event not found");
        return;
    }

    eventData = snap.data();

    titleInput.value = eventData.title || "";
    descInput.value = eventData.description || "";
    locationInput.value = eventData.location || "";
    dateInput.value = eventData.date || "";

    existingImage = eventData.imageURL || "";

    renderImage();
}

/* IMAGE */

function renderImage() {
    imagePreview.innerHTML = "";

    if (!existingImage) return;

    const img = document.createElement("img");
    img.src = existingImage;
    imagePreview.appendChild(img);
}

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    newImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        existingImage = e.target.result;
        renderImage();
    };
    reader.readAsDataURL(file);
});

/* SAVE */

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector("button");
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const refDoc = doc(db, "events", eventId);

        let imageURL = eventData.imageURL || "";

        if (newImageFile) {
            const imageRef = ref(storage, `eventImages/${eventId}/${Date.now()}`);
            await uploadBytes(imageRef, newImageFile);
            imageURL = await getDownloadURL(imageRef);
        }

        await updateDoc(refDoc, {
            title: titleInput.value,
            description: descInput.value,
            location: locationInput.value,
            date: dateInput.value,
            imageURL,
            updatedAt: serverTimestamp()
        });

        alert("Event updated!");
        window.location.href = `eventDetail.html?id=${eventId}`;

    } catch (err) {
        console.error(err);
        alert("Error updating event");
    }

    btn.innerText = "Save Changes";
    btn.disabled = false;
});

/* AUTH */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "explore.html";
        return;
    }

    currentUser = user;

    await loadEvent();
});