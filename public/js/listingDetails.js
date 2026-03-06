import { db } from "./firebaseInitialization.js";

import {
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const container = document.getElementById("listingDetails");

const params = new URLSearchParams(window.location.search);

const id = params.get("id");

import { auth } from "./firebaseInitialization.js";

if(auth.currentUser && auth.currentUser.uid === listing.userID){
    container.innerHTML += `
        <button onclick="editListing()">Edit Listing</button>
    `;
}

async function loadListing(){

    const ref = doc(db,"listings",id);

    const snap = await getDoc(ref);

    if(!snap.exists()){
        container.innerHTML = "Listing not found.";
        return;
    }

    const listing = snap.data();

    container.innerHTML = `
    
        <h1>${listing.title}</h1>

        ${listing.imageURL ? `<img class="listing-image" src="${listing.imageURL}">` : ""}

        <p>${listing.description}</p>

        <p><strong>Price:</strong> $${listing.price}</p>

        <p><strong>Category:</strong> ${listing.category}</p>

        <p><strong>Posted by:</strong> ${listing.username}</p>

    `;
}

loadListing();