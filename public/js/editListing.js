import { auth, db } from "./firebaseInitialization.js";

import {
doc,
getDoc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
getStorage,
ref,
uploadBytes,
getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const storage = getStorage();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const form = document.getElementById("editListingForm");

async function loadListing(){

const ref = doc(db,"listings",id);
const snap = await getDoc(ref);

if(!snap.exists()){
alert("Listing not found.");
return;
}

const listing = snap.data();

/* SECURITY CHECK */

if(auth.currentUser.uid !== listing.userID){
alert("You cannot edit this listing.");
window.location.href="listings.html";
return;
}

/* FILL FORM */

document.getElementById("title").value = listing.title;
document.getElementById("description").value = listing.description;
document.getElementById("price").value = listing.price;

/* SHOW IMAGE */

if(listing.imageURL){
const img = document.getElementById("currentImage");
img.src = listing.imageURL;
img.style.display = "block";
}

}

form.addEventListener("submit", async(e)=>{

e.preventDefault();

const title = document.getElementById("title").value;
const description = document.getElementById("description").value;
const price = Number(document.getElementById("price").value);

const imageFile = document.getElementById("listingImage").files[0];

let imageURL = null;

/* upload new image if selected */

if(imageFile){

const storageRef = ref(storage,
`listings/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);

await uploadBytes(storageRef,imageFile);

imageURL = await getDownloadURL(storageRef);

}
// SHOW CURRENT IMAGE
const currentImg = document.getElementById("currentImage");
if(listing.imageURL){
    currentImg.src = listing.imageURL;
    currentImg.style.display = "block";
}

// PREVIEW NEW IMAGE
const imageInput = document.getElementById("listingImage");
const preview = document.getElementById("imagePreview");

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if(file){
        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
    }
});

/* build update object */

const updateData = {
title,
description,
price
};

if(imageURL){
updateData.imageURL = imageURL;
}

/* update listing */

await updateDoc(doc(db,"listings",id),updateData);

window.location.href = `listingDetail.html?id=${id}`;

});


loadListing();