import { getRecentPosts } from './postsService.js';

async function loadAndRenderFeed() {
    const posts = await getRecentPosts(); 
    renderPosts(posts);
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