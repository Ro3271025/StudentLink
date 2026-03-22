import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const storage = getStorage();

export function setupProfile() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.php";
            return;
        }

        // 1. Reference the current logged-in user's data
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const data = userSnap.data() || {};

        // 2. Identify UI Elements
        const bioText = document.getElementById("bioText");
        const editBtn = document.getElementById("edit");
        const profileImg = document.getElementById("profileImage");
        const fileInput = document.getElementById("fileInput");

        // 3. Populate Data (Works for any user on the team)
        // This ensures names show up in both the sidebar and the main profile
        const nameDisplay = data.name || user.displayName || "User";
        const userDisplay = data.username ? "@" + data.username : "@username";

        document.querySelectorAll('[id="displayName"]').forEach(el => el.innerText = nameDisplay);
        document.querySelectorAll('[id="username"]').forEach(el => el.innerText = userDisplay);
        
        if (bioText) bioText.value = data.bio || "";
        if (data.photoURL && profileImg) profileImg.src = data.photoURL;

        // 4. Bio Edit Logic
        let isEditing = false;
        if (editBtn && bioText) {
            editBtn.addEventListener("click", async () => {
                if (!isEditing) {
                    isEditing = true;
                    editBtn.innerText = "Save Bio";
                    bioText.disabled = false;
                    bioText.focus();
                } else {
                    try {
                        await updateDoc(userRef, { bio: bioText.value });
                        isEditing = false;
                        editBtn.innerText = "Edit Profile";
                        bioText.disabled = true;
                    } catch (err) {
                        console.error("Save failed", err);
                    }
                }
            });
        }

        // 5. Profile Picture Upload Logic
        if (profileImg && fileInput) {
            profileImg.onclick = () => fileInput.click();
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const storageRef = ref(storage, 'userPhotos/' + user.uid);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    await updateDoc(userRef, { photoURL: url });
                    profileImg.src = url;
                } catch (err) {
                    console.error("Upload failed", err);
                }
            };
        }
    });
}