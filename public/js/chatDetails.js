// public/js/chatDetails.js
import { db, auth } from "./firebaseInitialization.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const params         = new URLSearchParams(window.location.search);
const conversationID = params.get("id") || params.get("conversation");

const messagesContainer = document.getElementById("messagesContainer");
const sendBtn           = document.getElementById("sendBtn");
const messageInput      = document.getElementById("messageInput");
const chatTargetUser    = document.getElementById("chatTargetUser");
const chatTargetSmall   = document.querySelector(".chatDetailsPage small.smallTxt");

// ── Load recipient name into header ──
async function loadRecipientInfo(currentUserId) {
    if (!conversationID) return;
    try {
        const convoSnap = await getDoc(doc(db, "conversations", conversationID));
        if (!convoSnap.exists()) return;

        const data = convoSnap.data();
        const members = data.users || data.participants || [];
        const otherUserId = members.find(id => id !== currentUserId);
        if (!otherUserId) return;

        const userSnap = await getDoc(doc(db, "users", otherUserId));
        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const displayName = userData.name || userData.displayName || "Display Name";
        const username = userData.username ? `@${userData.username}` : "@Username";

        if (chatTargetUser) {
            chatTargetUser.textContent = displayName;
            chatTargetUser.style.cursor = "pointer";
            chatTargetUser.onclick = () => {
                window.location.href = `profile.html?id=${otherUserId}`;
            };
        }
        if (chatTargetSmall) chatTargetSmall.textContent = username;

    } catch (err) {
        console.error("Failed to load recipient info:", err);
    }
}

// ── Load messages ──
function loadMessages(currentUserId) {
    const q = query(
        collection(db, "conversations", conversationID, "messages"),
        orderBy("timestamp")
    );

    onSnapshot(q, snapshot => {
        messagesContainer.innerHTML = "";
        snapshot.forEach(d => {
            const msg = d.data();
            const div = document.createElement("div");
            div.classList.add("message");
            if (msg.senderID === currentUserId) {
                div.classList.add("myMessage");
            } else {
                div.classList.add("otherMessage");
            }
            div.innerText = msg.text;
            messagesContainer.appendChild(div);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ── Send message ──
async function sendMessage(currentUserId) {
    const text = messageInput.value.trim();
    if (!text) return;

    await addDoc(
        collection(db, "conversations", conversationID, "messages"),
        {
            senderID: currentUserId,
            text: text,
            timestamp: serverTimestamp()
        }
    );

    const ids = conversationID.split("_");
    await setDoc(
        doc(db, "conversations", conversationID),
        {
            participants: ids,
            lastMessage: text,
            lastTimestamp: serverTimestamp()
        },
        { merge: true }
    );

    messageInput.value = "";
}

// ── Init ──
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "userlogin.html";
        return;
    }

    if (!conversationID) {
        messagesContainer.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px;">No conversation selected.</p>';
        return;
    }

    loadRecipientInfo(user.uid);
    loadMessages(user.uid);

    sendBtn.addEventListener("click", () => sendMessage(user.uid));
    messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage(user.uid);
    });
});