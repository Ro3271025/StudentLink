import { db, auth } from "./firebaseInitialization.js";

import {
collection,
addDoc,
serverTimestamp,
query,
orderBy,
onSnapshot,
doc,
setDoc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const params =
new URLSearchParams(window.location.search);

const conversationID =
params.get("conversation");


const messagesContainer =
document.getElementById("messagesContainer");

const sendBtn =
document.getElementById("sendBtn");

const messageInput =
document.getElementById("messageInput");


const q = query(
collection(db,"conversations",conversationID,"messages"),
orderBy("timestamp")
);


onSnapshot(q,snapshot => {

messagesContainer.innerHTML="";

snapshot.forEach(doc => {

const msg = doc.data();

const div =
document.createElement("div");

div.classList.add("message");

if(msg.senderID === auth.currentUser.uid){

div.classList.add("myMessage");

}else{

div.classList.add("otherMessage");

}

div.innerText = msg.text;

messagesContainer.appendChild(div);

});

messagesContainer.scrollTop =
messagesContainer.scrollHeight;

});


sendBtn.addEventListener("click",sendMessage);


async function sendMessage(){

const text =
messageInput.value.trim();

if(!text) return;


await addDoc(
collection(db,"conversations",conversationID,"messages"),
{
senderID:auth.currentUser.uid,
text:text,
timestamp:serverTimestamp()
}
);


/* update conversation metadata */

await updateDoc(
doc(db,"conversations",conversationID),
{
lastMessage:text,
lastTimestamp:serverTimestamp()
}
);


messageInput.value="";

}