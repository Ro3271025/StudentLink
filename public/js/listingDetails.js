import { auth, db } from "./firebaseInitialization.js";

import {
doc,
getDoc,
deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const container =
document.getElementById("listingDetails");

const params =
new URLSearchParams(window.location.search);

const id =
params.get("id");


async function loadListing(){

const ref =
doc(db,"listings",id);

const snap =
await getDoc(ref);

if(!snap.exists()){

container.innerHTML =
"Listing not found.";

return;

}

const listing =
snap.data();

container.innerHTML = `

<h1>${listing.title}</h1>

${listing.imageURL ?
`<img class="listing-image" src="${listing.imageURL}">`
: ""}

<p>${listing.description}</p>

<p><strong>Price:</strong> $${listing.price}</p>

<p><strong>Category:</strong> ${listing.category}</p>

<p><strong>Posted by:</strong> @${listing.username}</p>

${listing.condition ?
`<p><strong>Condition:</strong> ${listing.condition}</p>`
: ""}

${listing.listingType ?
`<p><strong>Type:</strong> ${listing.listingType}</p>`
: ""}

<div style="margin-top:20px">

<button id="messageSellerBtn">
Message Seller
</button>

</div>

`;


/* OWNER CONTROLS */

auth.onAuthStateChanged(user=>{

if(user && user.uid === listing.userID){

container.innerHTML += `

<div style="margin-top:20px">

<button id="editListingBtn">
Edit Listing
</button>

<button id="deleteListingBtn"
style="background:#cc0000;color:white;margin-left:10px;">
Delete Listing
</button>

</div>

`;

document
.getElementById("editListingBtn")
.onclick = () => {

window.location.href =
`editListing.html?id=${id}`;

};

document
.getElementById("deleteListingBtn")
.onclick = deleteListing;

}


/* MESSAGE SELLER BUTTON */

const messageBtn =
document.getElementById("messageSellerBtn");

if(messageBtn){

messageBtn.onclick = () => {

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

window.location.href =
`chatDetails.html?conversation=${conversationID}`;

};

}

});

}


async function deleteListing(){

const confirmDelete =
confirm("Are you sure you want to delete this listing?");

if(!confirmDelete) return;

try{

await deleteDoc(
doc(db,"listings",id)
);

alert("Listing deleted.");

window.location.href =
"listings.html";

}catch(error){

console.error(
"Delete failed:",
error
);

alert("Failed to delete listing.");

}

}


loadListing();