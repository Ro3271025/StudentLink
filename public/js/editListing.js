import { auth, db } from "./firebaseInitialization.js";

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

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ================= SETUP ================= */

const storage = getStorage();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const form = document.getElementById("editListingForm");
const submitBtn = form.querySelector("button");

const gallery = document.getElementById("imageGallery");
const imageInput = document.getElementById("listingImage");

let listing = null;
let currentUser = null;

/* ================= TOAST ================= */

function showToast(msg){
    const toast = document.createElement("div");
    toast.innerText = msg;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "6px";
    toast.style.zIndex = "9999";

    document.body.appendChild(toast);

    setTimeout(()=>toast.remove(),2000);
}

/* ================= AUTH ================= */

onAuthStateChanged(auth, async(user)=>{
    if(!user){
        window.location.href = "login.php";
        return;
    }

    currentUser = user;

    if(!id){
        window.location.href = "listings.html";
        return;
    }

    await loadListing();
});

/* ================= LOAD ================= */

async function loadListing(){

    const snap = await getDoc(doc(db,"listings",id));

    if(!snap.exists()){
        alert("Listing not found.");
        return;
    }

    listing = snap.data();

    if(currentUser.uid !== listing.userID){
        alert("Unauthorized.");
        window.location.href="listings.html";
        return;
    }

    /* FILL FORM */
    document.getElementById("title").value = listing.title || "";
    document.getElementById("description").value = listing.description || "";
    document.getElementById("price").value = listing.price || "";
    document.getElementById("category").value = listing.category || "";

    /* LOAD IMAGES */
    if(!listing.imageURLs && listing.imageURL){
        listing.imageURLs = [listing.imageURL];
    }

    renderImages();
}

/* ================= RENDER IMAGES ================= */

function renderImages(){

    gallery.innerHTML = "";

    listing.imageURLs = listing.imageURLs || [];

    listing.imageURLs.forEach((url, index)=>{

        const div = document.createElement("div");
        div.className = "imageItem";

        div.innerHTML = `
            <img src="${url}">
            <button class="removeImgBtn"data-index="${index}">X</button>
        `;

        gallery.appendChild(div);
    });

    /* REMOVE IMAGE */
    document.querySelectorAll(".removeImgBtn").forEach(btn=>{
        btn.addEventListener("click",(e)=>{
            const index = e.target.dataset.index;
            listing.imageURLs.splice(index,1);
            renderImages();
        });
    });
}

/* ================= ADD NEW IMAGES ================= */

imageInput.addEventListener("change", ()=>{

    const files = Array.from(imageInput.files);

    files.forEach(file=>{
        const url = URL.createObjectURL(file);

        listing.imageURLs.push(url); // temp preview
    });

    renderImages();
});

/* ================= SUBMIT ================= */

form.addEventListener("submit", async(e)=>{

    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try{

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const price = Number(document.getElementById("price").value);
        const category = document.getElementById("category").value;

        if(!title || !description || !price || !category){
            showToast("Fill all fields");
            throw new Error("Validation failed");
        }

        /* UPLOAD ONLY NEW FILES */
        const files = Array.from(imageInput.files);
        let uploadedURLs = [];

        for(const file of files){
            const storageRef = ref(storage,
                `listings/${currentUser.uid}/${Date.now()}_${file.name}`);

            await uploadBytes(storageRef,file);
            const url = await getDownloadURL(storageRef);
            uploadedURLs.push(url);
        }

        /* KEEP OLD + ADD NEW */
        let finalImages = listing.imageURLs.filter(url => url.startsWith("http"));
        finalImages = [...finalImages, ...uploadedURLs];

        /* UPDATE */
        await updateDoc(doc(db,"listings",id),{
            title,
            description,
            price,
            category,
            imageURLs: finalImages,
            updatedAt: serverTimestamp()
        });

        showToast("Saved!");

        setTimeout(()=>{
            window.location.href = `listingDetail.html?id=${id}`;
        },1000);

    } catch(err){
        console.error(err);
        showToast("Error saving");
    }

    submitBtn.disabled = false;
    submitBtn.innerText = "Save Changes";
});