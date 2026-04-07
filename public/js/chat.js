import { db, auth } from "./firebaseInitialization.js";

import {
collection,
query,
where,
orderBy,
onSnapshot,
doc,
getDoc,
getDocs,
updateDoc,
setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const container =
document.getElementById("conversationsContainer");

const searchInput =
document.getElementById("searchMessages");


auth.onAuthStateChanged(async user => {

if(!user) return;

const q = query(
collection(db,"conversations"),
where("users","array-contains",user.uid)
);

onSnapshot(q, async snapshot => {

container.innerHTML="";

for(const docSnap of snapshot.docs){

const convo = docSnap.data();
const conversationID = docSnap.id;


/* determine other user */

const otherUserID =
convo.users.find(
id => id !== user.uid
);


/* get username */

let username = "User";

try{

const userDoc =
await getDoc(doc(db,"users",otherUserID));

if(userDoc.exists()){

username =
userDoc.data().displayName || "User";

}

}catch(error){

console.log(error);

}


/* build UI */

const div =
document.createElement("div");

div.classList.add("conversationItem");

div.innerHTML = `
<div class="conversationName">
${username}
</div>

<div class="lastMessage">
${convo.lastMessage || ""}
</div>
`;


/* open chat */

div.addEventListener("click",()=>{

window.location.href =
`chatDetails.html?id=${conversationID}`;

});

container.appendChild(div);

}

});

});


/* SEARCH */

searchInput.addEventListener("input", e => {

const value =
e.target.value.toLowerCase();

document
.querySelectorAll(".conversationItem")
.forEach(item => {

const text =
item.innerText.toLowerCase();

item.style.display =
text.includes(value)
? "block"
: "none";

});

});
// ───────── START CHAT SYSTEM ─────────

const startBtn = document.getElementById("startChatBtn");
const modal = document.getElementById("chatModal");
const closeBtn = document.getElementById("closeModal");
const userSearchInput = document.getElementById("userSearchInput");
const resultsContainer = document.getElementById("userResults");

// OPEN MODAL
if (startBtn) {
    startBtn.onclick = () => {
        modal.style.display = "flex";
    };
}

// CLOSE MODAL
if (closeBtn) {
    closeBtn.onclick = () => {
        modal.style.display = "none";
        resultsContainer.innerHTML = "";
        userSearchInput.value = "";
    };
}

// SEARCH USERS
if (userSearchInput) {
    userSearchInput.addEventListener("input", async () => {

        const searchValue = userSearchInput.value.toLowerCase();

        if (!searchValue) {
            resultsContainer.innerHTML = "";
            return;
        }

        const snap = await getDocs(collection(db, "users"));

        resultsContainer.innerHTML = "";

        snap.forEach(docSnap => {

            const userData = docSnap.data();
            const uid = docSnap.id;

            const username = (userData.username || "").toLowerCase();
            const displayName = (userData.name || userData.displayName || "").toLowerCase();

            if (
                username.includes(searchValue) ||
                displayName.includes(searchValue)
            ) {

                const div = document.createElement("div");
                div.className = "userResult";

                div.innerHTML = `
                    <strong>${userData.name || "User"}</strong><br>
                    <small>@${userData.username || ""}</small>
                `;

                div.onclick = async () => {

                    const currentUser = auth.currentUser;

                    const conversationID =
                        [currentUser.uid, uid]
                        .sort()
                        .join("_");

                    const convoRef = doc(db, "conversations", conversationID);
                    const convoSnap = await getDoc(convoRef);

                    if (!convoSnap.exists()) {
                        await setDoc(convoRef, {
                            users: [currentUser.uid, uid],
                            createdAt: new Date(),
                            lastMessage: "",
                            lastTimestamp: new Date()
                        });
                    }

                    window.location.href = `chatDetails.html?id=${conversationID}`;
                };

                resultsContainer.appendChild(div);
            }
        });
    });
}