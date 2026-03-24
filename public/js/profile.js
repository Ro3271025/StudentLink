// public/js/profile.js
import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const profileId = params.get("id");

async function getOrCreateConversation(currentUserId, otherUserId) {
    const q = query(
        collection(db, "conversations"),
        where("users", "array-contains", currentUserId)
    );
    const snapshot = await getDocs(q);
    let existingConversation = null;
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.users.includes(otherUserId)) {
            existingConversation = docSnap.id;
        }
    });
    if (existingConversation) return existingConversation;
    const newDoc = await addDoc(collection(db, "conversations"), {
        users: [currentUserId, otherUserId],
        createdAt: new Date()
    });
    return newDoc.id;
}

// ── Render user's posts ──
async function loadPosts(uidToLoad) {
    const container = document.getElementById('tab-posts');
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">Loading posts...</p>';

    try {
        const q = query(
            collection(db, "posts"),
            where("authorId", "==", uidToLoad),
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        updateCounter('postCountLink', snap.size);

        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">No posts yet.</p>';
            return;
        }

        container.innerHTML = '';
        snap.docs.forEach(d => {
            const post = { id: d.id, ...d.data() };
            const likes = post.likes || 0;
            const comments = post.commentCount || 0;
            const imageSection = post.imageUrl
                ? `<div class="imageContainer"><img src="${post.imageUrl}"></div>`
                : '';

            const card = document.createElement('div');
            card.className = 'content';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <img class="profileImgMini" src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG">
                <a class="postLink postDisplayName" href="#">${escapeHtml(post.authorName || 'Display Name')}</a>
                <small class="postUsername" style="margin-left:6px;color:#aaa;">@${escapeHtml(post.authorUsername || 'username')}</small><br>
                <p class="postContentText">${escapeHtml(post.body || '')}</p>
                ${imageSection}
                <br>
                <footer>
                    <a class="postLink postMetrics" href="#">${likes} Like${likes !== 1 ? 's' : ''}</a>
                    <a class="postLink postMetrics" href="#">${comments} Comment${comments !== 1 ? 's' : ''}</a>
                </footer><br>
            `;
            card.addEventListener('click', () => {
                window.location.href = `post.php?id=${post.id}`;
            });
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Failed to load posts:", err);
        container.innerHTML = '<p style="text-align:center;color:#e55;padding:20px;">Failed to load posts.</p>';
    }
}

// ── Render user's comments ──
async function loadComments(uidToLoad) {
    const container = document.getElementById('tab-comments');
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">Loading comments...</p>';

    try {
        const q = query(
            collectionGroup(db, "comments"),
            where("authorId", "==", uidToLoad),
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">No comments yet.</p>';
            return;
        }

        container.innerHTML = '';
        for (const d of snap.docs) {
            const comment = { id: d.id, ...d.data() };

            // Get the parent post title
            const postId = d.ref.parent.parent.id;
            let postTitle = 'a post';
            try {
                const postSnap = await getDoc(doc(db, "posts", postId));
                if (postSnap.exists()) {
                    const postData = postSnap.data();
                    postTitle = postData.title || postData.body?.substring(0, 60) || 'a post';
                }
            } catch (e) {}

            const card = document.createElement('div');
            card.className = 'commentCard';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <p class="postTitle">In reply to: <span style="color:var(--theme-accent);">${escapeHtml(postTitle)}</span></p>
                <p class="commentText">${escapeHtml(comment.text || '')}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `post.php?id=${postId}`;
            });
            container.appendChild(card);
        }
    } catch (err) {
        console.error("Failed to load comments:", err);
        container.innerHTML = '<p style="text-align:center;color:#e55;padding:20px;">Failed to load comments.<br><small>You may need a Firestore composite index for collectionGroup comments + authorId.</small></p>';
    }
}

// ── Render user's listings ──
async function loadListings(uidToLoad) {
    const container = document.getElementById('tab-listings');
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">Loading listings...</p>';

    try {
        const q = query(
            collection(db, "listings"),
            where("userID", "==", uidToLoad),
           orderBy("created_at", "desc")
        );
        const snap = await getDocs(q);
        updateCounter('listingCountLink', snap.size);

        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">No listings yet.</p>';
            return;
        }

        container.innerHTML = '<div class="listingsGrid" style="width:55%;margin:0 auto;padding:16px 0;"></div>';
        const grid = container.querySelector('.listingsGrid');

        snap.docs.forEach(d => {
            const listing = { id: d.id, ...d.data() };
            const card = document.createElement('div');
            card.className = 'listingCard';

            const imgSrc = listing.imageUrl || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';
            const price = listing.price != null ? `$${listing.price}` : 'N/A';
            const condition = listing.condition || '';

            card.innerHTML = `
                <img class="listingThumb" src="${imgSrc}" onerror="this.src='styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'">
                <p class="listingTitle">${escapeHtml(listing.title || listing.itemCategory || 'Listing')}</p>
                <p class="listingPrice">${price}</p>
                <p class="listingUser">${escapeHtml(condition)}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `listingDetail.html?id=${listing.id}`;
            });
            grid.appendChild(card);
        });
    } catch (err) {
        console.error("Failed to load listings:", err);
        container.innerHTML = '<p style="text-align:center;color:#e55;padding:20px;">Failed to load listings.</p>';
    }
}

function updateCounter(counterId, count) {
    const counterEl = document.getElementById(counterId);
    if (counterEl) counterEl.textContent = String(count);
}

async function loadProfileCounters(uidToLoad) {
    try {
        const postsQuery = query(
            collection(db, "posts"),
            where("authorId", "==", uidToLoad)
        );
        const listingsQuery = query(
            collection(db, "listings"),
            where("userID", "==", uidToLoad)
        );

        const [postsSnap, listingsSnap] = await Promise.all([
            getDocs(postsQuery),
            getDocs(listingsQuery)
        ]);

        updateCounter('postCountLink', postsSnap.size);
        updateCounter('listingCountLink', listingsSnap.size);
    } catch (err) {
        console.error("Failed to load profile counters:", err);
    }
}

function activateProfileTab(tabName) {
    const tab = document.querySelector(`.profileTab[data-tab="${tabName}"]`);
    if (tab) tab.click();
}

function setupCounterLinks() {
    const postCountLink = document.getElementById('postCountLink');
    const listingCountLink = document.getElementById('listingCountLink');

    if (postCountLink) {
        postCountLink.addEventListener('click', (e) => {
            e.preventDefault();
            activateProfileTab('posts');
        });
    }

    if (listingCountLink) {
        listingCountLink.addEventListener('click', (e) => {
            e.preventDefault();
            activateProfileTab('listings');
        });
    }
}

// ── Tab switching ──
function setupTabs(uidToLoad) {
    document.querySelectorAll('.profileTab').forEach(tab => {
        tab.addEventListener('click', async (e) => {
            e.preventDefault();

            // Update active tab style
            document.querySelectorAll('.profileTab').forEach(t => t.classList.remove('activeTab'));
            tab.classList.add('activeTab');

            // Hide all tab content
            document.getElementById('tab-posts').style.display = 'none';
            document.getElementById('tab-comments').style.display = 'none';
            document.getElementById('tab-listings').style.display = 'none';

            const tabName = tab.dataset.tab;
            const tabEl = document.getElementById(`tab-${tabName}`);
            tabEl.style.display = 'block';

            // Load data for the tab
            if (tabName === 'posts') await loadPosts(uidToLoad);
            if (tabName === 'comments') await loadComments(uidToLoad);
            if (tabName === 'listings') await loadListings(uidToLoad);
        });
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function setupProfile() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.php";
            return;
        }

        const uidToLoad = profileId || user.uid;

        const userSnap = await getDoc(doc(db, "users", uidToLoad));
        if (!userSnap.exists()) {
            console.log("User not found");
            return;
        }

        const data = userSnap.data() || {};
        const displayName = data.name || data.displayName || "";
        const username = data.username ? "@" + data.username : "";

        // Update profile header
        document.getElementById("displayName").innerText = displayName;
        document.getElementById("username").innerHTML = `${username} <button id="userCollege" class="themeObject">SUNY Farmingdale</button>`;

        // Update sidebar
        const sideDisplay = document.getElementById("sideDisplayName");
        const sideUser = document.getElementById("sideUsername");
        if (sideDisplay) sideDisplay.innerText = displayName;
        if (sideUser) sideUser.innerText = username;

        // Message button
        const messageBtn = document.getElementById("messageStudentBtn");
        if (messageBtn) {
            if (user.uid === uidToLoad) {
                messageBtn.style.display = "none";
            } else {
                messageBtn.style.display = "block";
                messageBtn.onclick = async () => {
                    try {
                        const convoId = await getOrCreateConversation(user.uid, uidToLoad);
                        window.location.href = `chatDetails.html?id=${convoId}`;
                    } catch (err) {
                        console.error("Conversation error:", err);
                        alert("Could not start chat.");
                    }
                };
            }
        }

        // Setup tabs and load posts by default
        setupTabs(uidToLoad);
        setupCounterLinks();
        await loadProfileCounters(uidToLoad);
        await loadPosts(uidToLoad);
    });
}