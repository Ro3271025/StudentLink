import { auth, db } from "./firebaseInitialization.js";

import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
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

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];

      if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
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
    console.log("Submit triggered");

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


    // IMAGE UPLOAD
    const imageFile = document.getElementById("listingImage")?.files[0];
    let imageURL = null;

    if (imageFile) {

      try {

        const storageRef = ref(
          storage,
          `listings/${user.uid}/${Date.now()}_${imageFile.name}`
        );

        await uploadBytes(storageRef, imageFile);
        imageURL = await getDownloadURL(storageRef);

        console.log("Image uploaded:", imageURL);

      } catch (error) {

        console.error("Image upload failed:", error);
        alert("Image upload failed. Check console.");

      }

    }


    // EXPIRATION DATE
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);


    let username = "user";

    try {

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        username = userSnap.data().username;
      }

    } catch (err) {

      console.error("Failed to fetch username:", err);

    }


    // CREATE LISTING
    try {

      await addDoc(collection(db, "listings"), {

        userID: user.uid,
        username: username,

        campusID: "farmingdale",

        title,
        description,
        category,
        price,
        listingType,
        condition,

        imageURL,

        status: "active",

        created_at: serverTimestamp(),
        expires_at: expiresAt

      });

      console.log("Listing created successfully");

      window.location.href = "listings.html";

    } catch (error) {

      console.error("Error creating listing:", error);
      alert("Failed to create listing.");

    }

  });

});