// public/js/createListings.js
import { auth, db } from "./firebaseInitialization.js";

import { 
collection, 
addDoc, 
serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { 
getStorage,
ref,
uploadBytes,
getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { 
onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const storage = getStorage();

document.addEventListener("DOMContentLoaded", () => {

const imageInput = document.getElementById("listingImage");
const preview = document.getElementById("imagePreview");

if(imageInput && preview){

imageInput.addEventListener("change", () => {

preview.innerHTML = "";

const files = imageInput.files;

for (let file of files) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "120px";
    img.style.margin = "5px";
    img.style.borderRadius = "8px";
    preview.appendChild(img);
}

});

}

console.log("CreateListing JS Loaded");

const form = document.getElementById("listingForm");
const categorySelect = document.getElementById("category");
const supplyOptions = document.getElementById("supplyOptions");

if (!form || !categorySelect || !supplyOptions) {
    console.error("One or more required elements not found.");
    return;
}

// SHOW CONDITION + SELL/RENT ONLY FOR SUPPLY CATEGORIES
categorySelect.addEventListener("change", () => {

const value = categorySelect.value;

if (["Textbook", "Calculator", "Tech"].includes(value)) {
    supplyOptions.style.display = "block";
} else {
    supplyOptions.style.display = "none";
}

});

// PROTECT ROUTE
onAuthStateChanged(auth, (user) => {
if (!user) {
    window.location.href = "login.php";
}
});

// SUBMIT LISTING
form.addEventListener("submit", async (e) => {

e.preventDefault();

const user = auth.currentUser;

if (!user) {
    alert("Not logged in.");
    return;
}

// FORM VALUES
const title = document.getElementById("title").value.trim();
const description = document.getElementById("description").value.trim();
const category = categorySelect.value;
const price = Number(document.getElementById("price").value);

let condition = null;
let listingType = null;

// CONDITIONAL FIELDS
if (["Textbook", "Calculator", "Tech"].includes(category)) {

condition = document.getElementById("condition").value;
listingType = document.getElementById("listingType").value;

if (!condition || !listingType) {
    alert("Please select condition and sell/rent option.");
    return;
}
}

// MULTIPLE IMAGE UPLOAD
const imageFiles = document.getElementById("listingImage")?.files;

let imageURLs = [];

if (imageFiles && imageFiles.length > 0) {

try {
    for (let file of imageFiles) {

        const storageRef = ref(
            storage,
            `listings/${user.uid}/${Date.now()}_${file.name}`
        );

        await uploadBytes(storageRef, file);

        const url = await getDownloadURL(storageRef);
        imageURLs.push(url);
    }

} catch (error) {
    console.error("Image upload failed:", error);
    alert("Image upload failed.");
}
}

// EXPIRATION DATE
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30);

// CREATE LISTING
try {

await addDoc(collection(db, "listings"), {

userID: user.uid,
username: user.displayName || "user",

campusID: "farmingdale",

title,
description,
category,
price,
listingType,
condition,

imageURLs,
imageURL: imageURLs[0] || null, // first image

status: "active",

created_at: serverTimestamp(),
expires_at: expiresAt

});

window.location.href = "listings.html";

} catch (error) {

console.error("Error creating listing:", error);
alert("Failed to create listing.");

}

});

});