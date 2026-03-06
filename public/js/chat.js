import { db, auth } from "./firebaseInitialization.js";

import {
collection,
addDoc,
serverTimestamp,
query,
orderBy,
onSnapshot,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* CHAT STATE */
let currentConversationID = null;
let unsubscribeMessages = null;
let currentUser = null;

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

    if(!usersContainer) return;

    usersContainer.innerHTML = "";

    try{

        const snapshot = await getDocs(collection(db,"users"));

        snapshot.forEach(doc=>{

            const user = doc.data();

            /* skip yourself */
            if(doc.id === currentUser.uid) return;

            const userDiv = document.createElement("div");

            userDiv.classList.add("chatUser");

            userDiv.innerHTML = `
                <img class="profileImgMini" src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG">
                <span>${user.displayName || user.username || "User"}</span>
            `;

            userDiv.addEventListener("click",()=>{
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

    if(!currentUser) return;

    messagesContainer.innerHTML="";

    currentConversationID = getConversationID(currentUser.uid, otherUserID);


    /* STOP PREVIOUS LISTENER */
    if(unsubscribeMessages){
        unsubscribeMessages();
    }


    const q = query(
        collection(db,"conversations",currentConversationID,"messages"),
        orderBy("timestamp")
    );


    unsubscribeMessages = onSnapshot(q,(snapshot)=>{

        messagesContainer.innerHTML="";

        snapshot.forEach(doc=>{

            const message = doc.data();

            const messageDiv = document.createElement("div");

            messageDiv.classList.add("message");


            /* MESSAGE ALIGNMENT */
            if(message.senderID === currentUser.uid){
                messageDiv.classList.add("myMessage");
            }else{
                messageDiv.classList.add("otherMessage");
            }


            messageDiv.innerText = message.text;

            messagesContainer.appendChild(messageDiv);

        });

        /* AUTO SCROLL */
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    });

}

/* SEND MESSAGE */
async function sendMessage(){

    if(!currentConversationID) return;

    const text = messageInput.value.trim();

    if(text === "") return;

    try{

        await addDoc(
            collection(db,"conversations",currentConversationID,"messages"),
            {
                senderID: currentUser.uid,
                text: text,
                timestamp: serverTimestamp()
            }
        );

        messageInput.value="";

    }catch(error){
        console.error("Error sending message:", error);
    }
}


if(sendBtn){
    sendBtn.addEventListener("click", sendMessage);
}

/* SEND MESSAGE WITH ENTER */
if(messageInput){
    messageInput.addEventListener("keypress",(e)=>{
        if(e.key === "Enter"){
            sendMessage();
        }
    });
}

/* WAIT FOR USER AUTH */
auth.onAuthStateChanged((user)=>{

    if(!user) return;

    currentUser = user;

    loadUsers();

});