import { db } from './firebaseInitialization.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function loadAndRenderFeed() {
    const posts = await getRecentPosts(); 
    renderPosts(posts);
}

async function getRecentPosts() {
    const postsCol = collection(db, "posts");
    const q = query(postsCol, orderBy("createdAt", "desc"));
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
        card.className = 'content';

        // Fallbacks for missing data
        const displayName = post.authorName || 'Display Name';
        const username = post.authorUsername ? `@${post.authorUsername}` : '@Username';
        const profileImg = 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';
        const postText = post.body || post.description || '';
        const likes = post.likes || 0;
        const comments = post.commentCount || 0;
        const imageUrl = post.imageUrl || '';

        let imageSection = '';
        if (imageUrl) {
            imageSection = `<div class="imageContainer"><img src="${imageUrl}"></div>`;
        }

        card.innerHTML = `
            <button class="openBtn">
            <img class="profileImgMini" src="${profileImg}">
            <span class="postHeader">
                <a class="postLink postDisplayName" href="#">${displayName}</a>
                <small class="postUsername" style="margin-left: 6px; color: #aaa;">@${post.authorUsername || 'Username'}</small>
            </span><br>
            <p class="postContentText" maxlength="200">${postText}</p>
            ${imageSection}
            <br>
            <footer>
                <a class="postLink postMetrics" href="#">${likes} Likes</a>
                <a class="postLink postMetrics" href="post.php?id=${post.id}">${comments} Comments</a>
                <a href="#" class="postLink postMetrics" style="text-align: right;">Report</a>
            </footer><br></button>
        `;

        card.onclick = (e) => {
            // Only navigate if not clicking a metrics link
            if (!e.target.classList.contains('postMetrics')) {
                window.location.href = `post.php?id=${post.id}`;
            }
        };

        container.appendChild(card);
    });
}

loadAndRenderFeed();