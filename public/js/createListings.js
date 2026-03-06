import { auth, db } from "./firebaseInitialization.js";

import { 
collection, 
addDoc, 
serverTimestamp,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { onAuthStateChanged } from 
"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
getStorage,
ref,
uploadBytes,
getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const storage = getStorage();

document.addEventListener("DOMContentLoaded", () => {

const form = document.getElementById("listingForm");
const categorySelect = document.getElementById("category");
const supplyOptions = document.getElementById("supplyOptions");

categorySelect.addEventListener("change", () => {

const value = categorySelect.value;

if (["Textbook","Calculator","Tech"].includes(value)) {
supplyOptions.style.display = "block";
}
else{
supplyOptions.style.display = "none";
}

});

onAuthStateChanged(auth,(user)=>{
if(!user){
window.location.href="login.php";
}
});

form.addEventListener("submit", async(e)=>{

e.preventDefault();

const user = auth.currentUser;

const title = document.getElementById("title").value.trim();
const description = document.getElementById("description").value.trim();
const category = categorySelect.value;
const price = Number(document.getElementById("price").value);

const imageFile = document.getElementById("listingImage").files[0];

let condition=null;
let listingType=null;

if(["Textbook","Calculator","Tech"].includes(category)){

condition=document.getElementById("condition").value;
listingType=document.getElementById("listingType").value;

if(!condition||!listingType){
alert("Please select condition and sell/rent option.");
return;
}

}

let imageURL=null;

if(imageFile){

const storageRef = ref(storage,
`listings/${user.uid}/${Date.now()}_${imageFile.name}`);

await uploadBytes(storageRef,imageFile);

imageURL = await getDownloadURL(storageRef);

}

const userRef = doc(db,"users",user.uid);
const userSnap = await getDoc(userRef);
const userData = userSnap.data() || {};

const username = userData.username || "User";

const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate()+30);

await addDoc(collection(db,"listings"),{

userID:user.uid,
username:username,

campusID:"farmingdale",

title,
description,
category,
price,

listingType,
condition,

imageURL,

status:"active",

created_at:serverTimestamp(),
expires_at:expiresAt

});

window.location.href="listings.html";

});

});