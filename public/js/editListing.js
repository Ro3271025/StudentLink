import { auth, db } from "./firebaseInitialization.js";

import {
doc,
getDoc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

}

form.addEventListener("submit", async(e)=>{

e.preventDefault();

await updateDoc(doc(db,"listings",id),{

title: document.getElementById("title").value,
description: document.getElementById("description").value,
price: Number(document.getElementById("price").value)

});

window.location.href = `listingDetail.html?id=${id}`;

});

loadListing();