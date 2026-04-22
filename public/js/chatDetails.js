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
    setDoc,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ========================= */

const params = new URLSearchParams(window.location.search);
const conversationID = params.get("id") || params.get("conversation");

const messagesContainer = document.getElementById("messagesContainer");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const imageInput = document.getElementById("imageInput");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");

const chatTargetUser = document.getElementById("chatTargetUser");
const chatUsername = document.getElementById("chatUsername");

const storage = getStorage();

let selectedImages = [];
const MAX_IMAGES = 5;

/* ========================= */

function formatTime(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* ========================= */
/* IMAGE PREVIEW */

imageInput.addEventListener("change", () => {

    const newFiles = Array.from(imageInput.files);

    const remainingSlots = MAX_IMAGES - selectedImages.length;

    if (remainingSlots <= 0) {
        alert(`You can only upload up to ${MAX_IMAGES} images.`);
        imageInput.value = "";
        return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);

    selectedImages = [...selectedImages, ...filesToAdd];

    if (newFiles.length > remainingSlots) {
        alert(`Only ${remainingSlots} more image(s) allowed.`);
    }

    imageInput.value = "";
    renderImagePreview();
});

function renderImagePreview() {

    imagePreviewContainer.innerHTML = "";

    selectedImages.forEach((file, index) => {

        const wrapper = document.createElement("div");
        wrapper.classList.add("previewItem");

        const img = document.createElement("img");
        const url = URL.createObjectURL(file);
        img.src = url;

        img.onload = () => {
            URL.revokeObjectURL(url);
        };

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✕";
        removeBtn.classList.add("removePreview");

        removeBtn.onclick = () => {
            URL.revokeObjectURL(img.src);
            selectedImages.splice(index, 1);
            imageInput.value = "";
            renderImagePreview();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        imagePreviewContainer.appendChild(wrapper);
    });
}

/* ========================= */

async function loadRecipientInfo(currentUserId) {

    const convoSnap = await getDoc(doc(db, "conversations", conversationID));
    if (!convoSnap.exists()) return;

    const data = convoSnap.data();
    const members = data.participants || data.users || [];

    const otherUserId = members.find(id => id !== currentUserId);

    const userSnap = await getDoc(doc(db, "users", otherUserId));
    if (!userSnap.exists()) return;

    const userData = userSnap.data();

    chatTargetUser.textContent = userData.displayName || "User";
    chatUsername.textContent = userData.username ? `@${userData.username}` : "";
}

function loadMessages(currentUserId) {

    const q = query(
        collection(db, "conversations", conversationID, "messages"),
        orderBy("timestamp")
    );

    onSnapshot(q, snapshot => {

        const isNearBottom =
            messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 120;

        messagesContainer.innerHTML = "";

        snapshot.docs.forEach((docSnap, index) => {

            const msg = docSnap.data();
            const isMine = msg.senderID === currentUserId;
            const isLast = index === snapshot.docs.length - 1;

            /* ROW (LEFT / RIGHT) */
            const row = document.createElement("div");
            row.classList.add("messageRow", isMine ? "me" : "them");

            /* BUBBLE */
            const bubble = document.createElement("div");
            bubble.classList.add("messageBubble");

            /* IMAGES FIRST */
            if (msg.images && msg.images.length > 0) {
                const imgContainer = document.createElement("div");
                imgContainer.classList.add("msgImages");

                msg.images.forEach(url => {
                    const img = document.createElement("img");
                    img.src = url;
                    img.classList.add("chatImage");

                    img.onload = () => {
                        if (isNearBottom) {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    };
                    imgContainer.appendChild(img);
                });
                bubble.appendChild(imgContainer);
            }
            /* TEXT UNDER IMAGE */
            if (msg.text) {
                const text = document.createElement("div");
                text.classList.add("msgText");
                text.textContent = msg.text;
                bubble.appendChild(text);
            }

            /* TIME */
            if (msg.timestamp) {
                const time = document.createElement("div");
                time.classList.add("messageTime");
                time.textContent = formatTime(msg.timestamp.toDate());
                bubble.appendChild(time);
            }

            /* SEEN */
            if (isMine && isLast && msg.seen) {
                const seen = document.createElement("div");
                seen.classList.add("messageSeen");
                seen.textContent = "Seen";
                bubble.appendChild(seen);
            }

            row.appendChild(bubble);
            messagesContainer.appendChild(row);
        });

        if (isNearBottom) {
            setTimeout(() => {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: "smooth"
                });
            }, 50);
        }
    });
}

/* ========================= */

async function sendMessage(currentUserId) {

    const text = messageInput.value.trim();
    const files = selectedImages;

    if (!text && files.length === 0) return;

    let imageURLs = [];

    for (let file of files) {

        const fileRef = ref(
            storage,
            `chatImages/${conversationID}/${Date.now()}_${file.name}`
        );

        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        imageURLs.push(url);
    }

    await addDoc(
        collection(db, "conversations", conversationID, "messages"),
        {
            senderID: currentUserId,
            text: text,
            images: imageURLs,
            timestamp: serverTimestamp(),
            seen: false
        }
    );

    await setDoc(
        doc(db, "conversations", conversationID),
        {
            lastMessage: text || "📷 Image",
            lastTimestamp: serverTimestamp()
        },
        { merge: true }
    );

    messageInput.value = "";
    selectedImages = [];
    imagePreviewContainer.innerHTML = "";
}

/* ========================= */

async function markMessagesAsSeen(currentUserId) {

    const snapshot = await getDocs(
        collection(db, "conversations", conversationID, "messages")
    );

    snapshot.forEach(async (docSnap) => {
        const msg = docSnap.data();

        if (msg.senderID !== currentUserId && !msg.seen) {
            await updateDoc(docSnap.ref, { seen: true });
        }
    });
}

/* ========================= */

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "userlogin.html";
        return;
    }

    loadRecipientInfo(user.uid);
    loadMessages(user.uid);
    markMessagesAsSeen(user.uid);

    sendBtn.addEventListener("click", () => sendMessage(user.uid));

    messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage(user.uid);
    });
});