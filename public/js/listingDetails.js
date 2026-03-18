import { auth, db } from "./firebaseInitialization.js";

import {
doc,
getDoc,
deleteDoc,
setDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const params = new URLSearchParams(window.location.search);
const id = params.get("id");


/* HTML ELEMENTS */

const imageEl = document.getElementById("listingImage");
const titleEl = document.getElementById("listingTitle");
const priceEl = document.getElementById("listingPrice");
const userEl = document.getElementById("listingUser");
const descriptionEl = document.getElementById("listingDescription");
const messageBtn = document.getElementById("messageSellerBtn");


async function loadListing(){

const ref = doc(db,"listings",id);
const snap = await getDoc(ref);

if(!snap.exists()){
titleEl.textContent = "Listing not found.";
return;
}

const listing = snap.data();

/* Populate page */

titleEl.textContent = listing.title;
priceEl.textContent = `$${listing.price}`;
userEl.textContent = `@${listing.username}`;
descriptionEl.textContent = listing.description || "";

/* Image */

if(listing.imageURL){
imageEl.src = listing.imageURL;
}else{
imageEl.style.display = "none";
}


/* AUTH + BUTTONS */

auth.onAuthStateChanged(user=>{

/* ========================= */
/* MESSAGE SELLER (FIX HERE) */
/* ========================= */

messageBtn.onclick = async () => {

if(!user){
alert("You must be logged in to message sellers.");
return;
}

if(user.uid === listing.userID){
alert("You cannot message yourself.");
return;
}

const conversationID =
[user.uid, listing.userID]
.sort()
.join("_");

/* 🔥 CREATE CONVERSATION DOCUMENT */

try{

await setDoc(
doc(db,"conversations",conversationID),
{
participants:[user.uid, listing.userID],
lastMessage:"",
lastTimestamp:serverTimestamp()
},
{merge:true}
);

}catch(error){
console.error("Error creating conversation:", error);
}

/* REDIRECT TO CHAT */

window.location.href =
`chatDetails.html?conversation=${conversationID}`;

};


/* ========================= */
/* OWNER CONTROLS */
/* ========================= */

if(user && user.uid === listing.userID){

const controls = document.createElement("div");

controls.style.marginTop = "20px";

controls.innerHTML = `
<button id="editListingBtn">Edit Listing</button>
<button id="deleteListingBtn" class="delBtn" style="margin-left:10px;">
Delete Listing
</button>
`;

document
.querySelector(".listingInfoSection")
.appendChild(controls);


document
.getElementById("editListingBtn")
.onclick = () => {
window.location.href = `editListing.html?id=${id}`;
};

document
.getElementById("deleteListingBtn")
.onclick = deleteListing;

}

});

}


/* ========================= */
/* DELETE LISTING */
/* ========================= */

async function deleteListing(){

const confirmDelete =
confirm("Are you sure you want to delete this listing?");

if(!confirmDelete) return;

try{

await deleteDoc(doc(db,"listings",id));

alert("Listing deleted.");

window.location.href = "listings.html";

}catch(error){

console.error("Delete failed:",error);

alert("Failed to delete listing.");

}

}


loadListing();