// public/js/profile.js
import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const storage = getStorage();

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
            orderBy("created_at", "desc")
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


function updateCounter(counterId, count) {
    const el = document.getElementById(counterId);
    if (el) el.textContent = String(count);
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
        document.getElementById("username").innerText = username;   
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

        // ── Bio + photo only for own profile ──
        
            const bioText = document.getElementById("bioText");
            const editBtn = document.getElementById("edit");
            const profileImg = document.getElementById("profileImage");

            // Populate bio
            if (bioText) bioText.value = data.bio || "";

            // Load profile photo
            if (data.photoURL && profileImg) profileImg.src = data.photoURL;
            if (user.uid === uidToLoad) {
            

            // Bio edit logic
            let isEditing = false;
            if (editBtn && bioText) {
                editBtn.addEventListener("click", async () => {
                    if (!isEditing) {
                        isEditing = true;
                        editBtn.innerText = "Save Bio";
                        bioText.disabled = false;
                        bioText.focus();
                    } else {
                        try {
                            const userRef = doc(db, "users", user.uid);
                            await updateDoc(userRef, { bio: bioText.value });
                            isEditing = false;
                            editBtn.innerText = "Edit Profile";
                            bioText.disabled = true;
                        } catch (err) {
                            console.error("Save failed", err);
                            alert("Failed to save bio.");
                        }
                    }
                });
            }

            // Profile picture upload — click image to upload
            if (profileImg) {
                // Create hidden file input if not already in HTML
                let fileInput = document.getElementById("fileInput");
                if (!fileInput) {
                    fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.id = "fileInput";
                    fileInput.accept = "image/*";
                    fileInput.style.display = "none";
                    document.body.appendChild(fileInput);
                }

                profileImg.style.cursor = "pointer";
                profileImg.title = "Click to change profile picture";

                profileImg.onclick = () => fileInput.click();

                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                        const storageRef = ref(storage, "userPhotos/" + user.uid);
                        await uploadBytes(storageRef, file);
                        const url = await getDownloadURL(storageRef);
                        const userRef = doc(db, "users", user.uid);
                        await updateDoc(userRef, { photoURL: url });
                        profileImg.src = url;
                    } catch (err) {
                        console.error("Upload failed", err);
                        alert("Failed to upload photo.");
                    }
                };
            }
        } else {

        // VISITOR LOGIC: Hide the button and disable click-to-upload
        if (editBtn) editBtn.style.display = "none";
        if (profileImg) {
        profileImg.style.cursor = "default";
        profileImg.onclick = null;
        profileImg.title = "";
    }
}
        

        // Setup tabs and load posts by default
        setupTabs(uidToLoad);
        await loadPosts(uidToLoad);
    });
}