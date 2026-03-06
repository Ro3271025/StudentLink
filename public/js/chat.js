import { db, auth } from "./firebaseInitialization.js";

import {
collection,
addDoc,
serverTimestamp,
query,
orderBy,
onSnapshot,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* CURRENT CHAT STATE */

let currentConversationID = null;
let unsubscribeMessages = null;


/* ELEMENTS */

const usersContainer = document.getElementById("usersContainer");
const sendBtn = document.getElementById("sendMessageBtn");
const messageInput = document.getElementById("messageInput");
const messagesContainer = document.getElementById("messagesContainer");


/* CREATE SHARED CONVERSATION ID */

function getConversationID(user1, user2){
return [user1, user2].sort().join("_");
}


/* LOAD USERS FROM FIREBASE */

async function loadUsers(){

try{

usersContainer.innerHTML = "";

const snapshot = await getDocs(collection(db,"users"));

snapshot.forEach(doc=>{

const user = doc.data();

/* skip yourself */

if(doc.id === auth.currentUser.uid) return;

const userDiv = document.createElement("div");

userDiv.classList.add("chatUser");

userDiv.innerHTML = `
<img class="profileImgMini" src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG">
<span>${user.displayName || "User"}</span>
`;


/* CLICK USER TO OPEN CHAT */

userDiv.addEventListener("click",()=>{

console.log("Opening chat with:", doc.id);

/* highlight selected user */

document.querySelectorAll(".chatUser").forEach(el=>{
el.classList.remove("activeChat");
});

userDiv.classList.add("activeChat");

openConversation(doc.id);

});

usersContainer.appendChild(userDiv);

});

}catch(error){

console.error("Error loading users:", error);

}

}


/* OPEN CONVERSATION */

function openConversation(otherUserID){

console.log("Starting conversation with:", otherUserID);

messagesContainer.innerHTML = "";

messageInput.value = "";

/* generate shared conversation id */

currentConversationID = getConversationID(auth.currentUser.uid, otherUserID);

console.log("Conversation ID:", currentConversationID);


/* stop previous message listener */

if(unsubscribeMessages){
unsubscribeMessages();
}


/* FIRESTORE MESSAGE QUERY */

const q = query(
collection(db,"conversations",currentConversationID,"messages"),
orderBy("timestamp")
);


/* REALTIME MESSAGE LISTENER */

unsubscribeMessages = onSnapshot(
q,
(snapshot)=>{

messagesContainer.innerHTML="";

snapshot.forEach(doc=>{

const message = doc.data();

const messageDiv = document.createElement("div");

messageDiv.classList.add("message");

/* message alignment */

if(message.senderID === auth.currentUser.uid){
messageDiv.classList.add("myMessage");
}else{
messageDiv.classList.add("otherMessage");
}

messageDiv.innerText = message.text;

messagesContainer.appendChild(messageDiv);

});

/* auto scroll */

messagesContainer.scrollTop = messagesContainer.scrollHeight;

},
(error)=>{
console.error("Error loading messages:", error);
}
);

}


/* SEND MESSAGE */

sendBtn.addEventListener("click", sendMessage);

async function sendMessage(){

if(!currentConversationID){
alert("Select a user to start chatting.");
return;
}

const text = messageInput.value.trim();

if(text === "") return;

try{

await addDoc(
collection(db,"conversations",currentConversationID,"messages"),
{
senderID: auth.currentUser.uid,
text: text,
timestamp: serverTimestamp()
}
);

messageInput.value="";

}catch(error){

console.error("Error sending message:", error);

}

}


/* SEND MESSAGE WITH ENTER KEY */

messageInput.addEventListener("keypress",(e)=>{

if(e.key === "Enter"){
sendMessage();
}

});


/* WAIT FOR AUTH */

auth.onAuthStateChanged((user)=>{

if(user){
loadUsers();
}else{
console.log("User not logged in");
}

});