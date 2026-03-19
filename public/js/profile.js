import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  doc, 
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// GET PROFILE ID FROM URL
const params = new URLSearchParams(window.location.search);
const profileId = params.get("id");


// CREATE OR FIND CONVERSATION
async function getOrCreateConversation(currentUserId, otherUserId) {

    const q = query(
        collection(db, "conversations"),
        where("users", "array-contains", currentUserId)
    );

    const snapshot = await getDocs(q);

    let existingConversation = null;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();

        if (data.users.includes(otherUserId)) {
            existingConversation = docSnap.id;
        }
    });

    if (existingConversation) {
        return existingConversation;
    }

    // CREATE NEW CONVERSATION
    const newDoc = await addDoc(collection(db, "conversations"), {
        users: [currentUserId, otherUserId],
        createdAt: new Date()
    });

    return newDoc.id;
}


export function setupProfile() {

    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            window.location.href = "login.php";
            return;
        }

        // USE profileId IF IT EXISTS, OTHERWISE FALL BACK TO OWN PROFILE
        const uidToLoad = profileId || user.uid;

        const userSnap = await getDoc(doc(db, "users", uidToLoad));

        if (!userSnap.exists()) {
            console.log("User not found");
            return;
        }

        const data = userSnap.data() || {};

        const displayName = data.name || "";
        const username = data.username ? "@" + data.username : "";

        // UPDATE UI
        document.querySelectorAll('[id="displayName"]').forEach(el => el.innerText = displayName);
        document.querySelectorAll('[id="username"]').forEach(el => el.innerText = username);

        // MESSAGE BUTTON
        const messageBtn = document.getElementById("messageStudentBtn");

        if (messageBtn) {

            if (user.uid === uidToLoad) {
                messageBtn.style.display = "none"; // own profile
            } else {
                messageBtn.style.display = "block"; // other profile

                // ✅ CLICK HANDLER
                messageBtn.onclick = async () => {

                    try {

                        const convoId = await getOrCreateConversation(
                            user.uid,
                            uidToLoad
                        );

                        // REDIRECT TO CHAT
                        window.location.href = `chatDetails.html?id=${convoId}`;

                    } catch (err) {

                        console.error("Conversation error:", err);
                        alert("Could not start chat.");

                    }

                };

            }

        }

    });

}