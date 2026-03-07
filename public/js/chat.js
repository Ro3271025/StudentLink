import { db, auth } from "./firebaseInitialization.js";

import {
collection,
query,
where,
orderBy,
onSnapshot,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const container =
document.getElementById("conversationsContainer");

const searchInput =
document.getElementById("searchMessages");


auth.onAuthStateChanged(async user => {

if(!user) return;


const q = query(
collection(db,"conversations"),
where("participants","array-contains",user.uid),
orderBy("lastTimestamp","desc")
);


onSnapshot(q, async snapshot => {

container.innerHTML="";


for(const document of snapshot.docs){

const convo = document.data();

const conversationID = document.id;


/* determine other user */

const otherUserID =
convo.participants.find(
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
`chatDetails.html?conversation=${conversationID}`;

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