import { auth, db } from "./firebaseInitialization.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const container = document.getElementById("listingsContainer");

function renderListing(listing){

return`

<div class="listing-card"
onclick="openListing('${listing.id}')">

<h3>${listing.title}</h3>

<p class="listing-price">$${listing.price}</p>

<p class="listing-user">
Posted by: @${listing.username || "user"}
</p>

</div>

`;

}

window.openListing=function(id){

window.location.href=`listingDetail.html?id=${id}`;

};

async function loadListings(){

const snapshot = await getDocs(collection(db,"listings"));

if(snapshot.empty){

container.innerHTML="No listings available.";
return;

}

const listings = snapshot.docs.map(doc=>({
id:doc.id,
...doc.data()
}));

container.innerHTML=listings.map(renderListing).join("");

}

onAuthStateChanged(auth,(user)=>{

if(!user){
window.location.href="login.php";
return;
}

loadListings();

});