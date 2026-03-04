import { db } from './firebaseInitialization.js';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

async function initPage() {
    if (!postId) return;
    await getPostById(postId);
    await getComments(postId); 
}

async function getPostById(id) {
    const postRef = doc(db, "listings", id); 
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
        const postData = postSnap.data(); 
        document.getElementById('postTitle').innerText = postData.title || "Untitled";
        document.getElementById('postBody').innerText = postData.description || "No description.";
    }
}

async function getComments(id) {
    const commentsRef = collection(db, "listings", id, "comments");
    const q = query(commentsRef, orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);

    const container = document.getElementById('commentsContainer');
    container.innerHTML = ''; 

    querySnapshot.forEach((doc) => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-entry';
        commentDiv.innerText = doc.data().text;
        container.appendChild(commentDiv);
    });
}

async function addComment(id) {
    const input = document.getElementById('commentInput'); // 
    const text = input.value.trim();

    if (!text) return;

    const commentsRef = collection(db, "listings", id, "comments");
    await addDoc(commentsRef, {
        text: text,
        timestamp: serverTimestamp()
    });

    input.value = ''; 
    await getComments(id);
}

document.getElementById('addCommentBtn').onclick = () => addComment(postId);

initPage();