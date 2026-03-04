import { db } from './firebaseInitialization.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function loadAndRenderFeed() {
    const posts = await getRecentPosts(); 
    renderPosts(posts);
}

async function getRecentPosts() {
    const postsCol = collection(db, "listings"); 
    const q = query(postsCol, orderBy("created_at", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

function renderPosts(posts) {
    const container = document.getElementById('feedContainer');
    if (!container) return; 
    container.innerHTML = ''; 

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        
        card.innerHTML = `
            <h3>${post.title || 'No Title'}</h3>
            <p>${post.description ? post.description.substring(0, 100) + '...' : 'No content available.'}</p>
        `;

        card.onclick = () => {
            window.location.href = `post.php?id=${post.id}`;
        };

        container.appendChild(card);
    });
}

loadAndRenderFeed();