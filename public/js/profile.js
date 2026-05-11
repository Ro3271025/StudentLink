// public/js/profile.js
import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    setDoc,
    getDocs,
    query,
    where,
    orderBy,
    collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { app } from "./firebaseInitialization.js";

const storage = getStorage(app);

const params = new URLSearchParams(window.location.search);
const profileId = params.get("id");

async function getOrCreateConversation(currentUserId, otherUserId) {

    // Search for existing conversation the same way chat.js does
    const q = query(
        collection(db, "conversations"),
        where("users", "array-contains", currentUserId)
    );

    const snap = await getDocs(q);

    const existing = snap.docs.find(d =>
        d.data().users.includes(otherUserId)
    );

    if (existing) return existing.id;

    // No existing chat found — create one with deterministic ID
    const conversationID = [currentUserId, otherUserId].sort().join("_");
    const convoRef = doc(db, "conversations", conversationID);

    await setDoc(convoRef, {
        users: [currentUserId, otherUserId],
        createdAt: new Date(),
        lastMessage: "",
        lastTimestamp: new Date()
    });

    return conversationID;
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
        const userSnap = await getDoc(doc(db, "users", uidToLoad));
        const currentUserPhoto = userSnap.exists() ? userSnap.data().photoURL : null;
        const snap = await getDocs(q);
        updateCounter('postCountLink', snap.size);

        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">No posts yet.</p>';
            return;
        }

        container.innerHTML = '';
        snap.docs.forEach(async d => {
            const post = { id: d.id, ...d.data() };
            const likes = post.likes || 0;
            const comments = post.commentCount || 0;
            const authorImg = currentUserPhoto || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';
            const imageSection = post.imageUrl
                ? `<div class="imageContainer"><img src="${post.imageUrl}"></div>`
                : '';

            let dateString = 'Unknown date';
            if (post.createdAt) {
                let dateObj = post.createdAt;
                if (typeof dateObj.toDate === 'function') {
                    dateObj = dateObj.toDate();
                }
                if (dateObj instanceof Date) {
                    dateString = dateObj.toLocaleString();
                }
            }

            const userRef = doc(db, "users", post.authorId);
            const userSnap = await getDoc(userRef);

            const card = document.createElement('div');
            card.className = 'content profileContentCard';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <img class="profileImgMini" src="${authorImg}" onerror="this.src='styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'">
                <a class="postLink postDisplayName" href="#">${escapeHtml(userSnap.get('displayName') || 'Display Name')}</a>
                <small class="postUsername" style="margin-left:6px;color:var(--username-color);">@${escapeHtml(userSnap.get('username') || 'username')}</small><br>
                <p class="postContentText">${escapeHtml(post.body || '')}</p>
                <p class="postTimestamp" style="color:#888;font-size:10pt;margin-left:3.5%">${dateString}</p>
                ${imageSection}
                <br>
                <footer>
                    <a class="postLink postMetrics" href="#">${likes} Like${likes !== 1 ? 's' : ''}</a>
                    <a class="postLink postMetrics" href="#">${comments} Comment${comments !== 1 ? 's' : ''}</a>
                </footer><br>
            `;
            card.addEventListener('click', () => {
                window.location.href = `post.html?id=${post.id}`;
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
            const commenterImg = comment.authorPhotoURL || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';

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
            card.className = 'content';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <img class="profileImgMini" src="${commenterImg}"
                    style="object-fit:cover; border-radius:4px; vertical-align:middle; margin-right:8px;"
                    onerror="this.src='styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'">
                <p class="postTitle" style="display:inline-block;margin-left:3.5%">In reply to: <span style="color:var(--theme-accent);">${escapeHtml(postTitle)}</span></p>
                <p class="commentText" style="margin-top:8px;margin-left:3.5%">${escapeHtml(comment.text || '')}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `post.html?id=${postId}`;
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

    container.innerHTML = `
        <div class="profileContentWrapper">
            <div class="listingsGrid"></div>
        </div>
    `;

    try {
        const q = query(
            collection(db, "listings"),
            where("userID", "==", uidToLoad),
            orderBy("created_at", "desc")
        );

        const snap = await getDocs(q);
        updateCounter('listingCountLink', snap.size);

        const grid = container.querySelector('.listingsGrid');

        if (snap.empty) {
            grid.innerHTML = `<p style="text-align:center;color:#aaa;padding:20px;width:100%;">No listings yet.</p>`;
            return;
        }

        grid.innerHTML = '';

        snap.docs.forEach(d => {
            const listing = { id: d.id, ...d.data() };

            const imgSrc    = listing.imageURL  || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';
            const price     = listing.price != null ? `$${listing.price}` : 'N/A';
            const condition = listing.condition || '';
            const title     = listing.title || listing.itemCategory || 'Listing';

            const isSold        = listing.status === "sold";
            const isRented      = listing.status === "rented";
            const isUnavailable = isSold || isRented;

            const badgeHTML = isSold
                ? `<div class="listingStatusBadge sold">Sold</div>`
                : isRented
                ? `<div class="listingStatusBadge rented">Rented</div>`
                : "";

            const card = document.createElement('div');
            card.className = `listingCard${isUnavailable ? " listingUnavailable" : ""}`;

            card.innerHTML = `
                ${badgeHTML}
                <img class="listingThumb" src="${imgSrc}"
                     onerror="this.src='styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'">
                <div class="listingInfo">
                    <p class="listingTitle">${escapeHtml(title)}</p>
                    <p class="listingPrice">${price}</p>
                    <p class="listingCondition">${escapeHtml(condition)}</p>
                </div>
            `;

            card.onclick = () => {
                window.location.href = `listingDetail.html?id=${listing.id}`;
            };

            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Failed to load listings:", err);
        container.innerHTML = `<p style="text-align:center;color:#e55;padding:20px;">Failed to load listings.</p>`;
    }
}

// ── Render following list ──
async function loadFollowing(uidToLoad) {
    const container = document.getElementById('tab-following');
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">Loading...</p>';

    try {
        const userSnap = await getDoc(doc(db, "users", uidToLoad));
        const following = userSnap.exists() ? (userSnap.data().following || []) : [];

        if (!following.length) {
            container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">Not following anyone yet.</p>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'followingGrid';

        for (const uid of following) {
            try {
                const snap = await getDoc(doc(db, "users", uid));
                if (!snap.exists()) continue;

                const data        = snap.data();
                const displayName = data.displayName || data.name || "Student";
                const username    = data.username ? `@${data.username}` : "";
                const photo       = data.photoURL  || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG";

                const card = document.createElement('div');
                card.className = 'followingCard';
                card.innerHTML = `
                    <img src="${photo}" onerror="this.src='styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'">
                    <div>
                        <div class="followingName">${escapeHtml(displayName)}</div>
                        <div class="followingUsername">${escapeHtml(username)}</div>
                    </div>
                `;
                card.onclick = () => {
                    window.location.href = `profile.html?id=${uid}`;
                };

                grid.appendChild(card);
            } catch (e) { /* skip users that fail */ }
        }

        container.innerHTML = '';
        container.appendChild(grid);

    } catch (err) {
        console.error("Failed to load following:", err);
        container.innerHTML = '<p style="text-align:center;color:#e55;padding:20px;">Failed to load following.</p>';
    }
}

// ── Tab switching ──
function setupTabs(uidToLoad) {
    document.querySelectorAll('.profileTab').forEach(tab => {
        tab.addEventListener('click', async (e) => {
            e.preventDefault();

            document.querySelectorAll('.profileTab').forEach(t => t.classList.remove('activeTab'));
            tab.classList.add('activeTab');

            document.getElementById('tab-posts').style.display     = 'none';
            document.getElementById('tab-comments').style.display  = 'none';
            document.getElementById('tab-listings').style.display  = 'none';
            document.getElementById('tab-following').style.display = 'none';

            const tabName = tab.dataset.tab;
            document.getElementById(`tab-${tabName}`).style.display = 'block';

            if (tabName === 'posts')     await loadPosts(uidToLoad);
            if (tabName === 'comments')  await loadComments(uidToLoad);
            if (tabName === 'listings')  await loadListings(uidToLoad);
            if (tabName === 'following') await loadFollowing(uidToLoad);
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

        const loggedInSnap = await getDoc(doc(db, "users", user.uid));
        const loggedInData = loggedInSnap.data() || {};

        if (data.blockedUsers && data.blockedUsers.includes(user.uid)) {
            document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:50px;'>You do not have permission to view this content.</h1>";
            return;
        }

        if (data.visibility === 'private' && user.uid !== uidToLoad) {
            const postsContainer = document.getElementById('postsContainer');
            const statusMsg = document.getElementById('profileStatusMsg');
            if (postsContainer) postsContainer.style.display = 'none';
            if (statusMsg) statusMsg.textContent = "This account is private.";
        }

        const displayName = data.name || data.displayName || "";
        const username    = data.username ? "@" + data.username : "";

        document.getElementById("profileDisplayName").innerText = displayName;
        document.getElementById("profileUsername").innerText    = username;

        const sideDisplay       = document.getElementById("sideDisplayName");
        const sideUser          = document.getElementById("sideUsername");
        const sidebarProfileImg = document.getElementById("sidebarProfileImg");

        if (user.uid !== uidToLoad) {
            const mySnap = await getDoc(doc(db, "users", user.uid));
            if (mySnap.exists()) {
                const myData = mySnap.data();
                if (sideDisplay) sideDisplay.innerText = myData.displayName || myData.name || "";
                if (sideUser)    sideUser.innerText    = myData.username ? "@" + myData.username : "";
                if (sidebarProfileImg && myData.photoURL) sidebarProfileImg.src = myData.photoURL;
            }
        } else {
            if (sideDisplay) sideDisplay.innerText = displayName;
            if (sideUser)    sideUser.innerText    = username;
        }

        // ── Message button ──
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

        // ── Follow button ──
        const followBtn = document.getElementById("followBtn");
        if (followBtn) {
            if (user.uid === uidToLoad) {
                followBtn.style.display = "none";
            } else {
                followBtn.style.display = "block";

                const currentUserSnap = await getDoc(doc(db, "users", user.uid));
                const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
                let following = currentUserData.following || [];
                const isFollowing = following.includes(uidToLoad);

                followBtn.textContent = isFollowing ? "Following" : "Follow";

                followBtn.onclick = async () => {
                    try {
                        const userRef     = doc(db, "users", user.uid);
                        const snap        = await getDoc(userRef);
                        let followingList = snap.exists() ? (snap.data().following || []) : [];
                        const nowFollowing = !followingList.includes(uidToLoad);

                        if (nowFollowing) {
                            if (!followingList.includes(uidToLoad)) followingList.push(uidToLoad);
                        } else {
                            followingList = followingList.filter(uid => uid !== uidToLoad);
                        }

                        await updateDoc(userRef, { following: followingList });
                        followBtn.textContent = nowFollowing ? "Following" : "Follow";

                    } catch (err) {
                        console.error("Follow failed:", err);
                        alert("Failed to update follow.");
                    }
                };
            }
        }

        // ── Bio + Photo Logic ──
        const bioText    = document.getElementById("bioText");
        const editBtn    = document.getElementById("edit");
        const profileImg = document.getElementById("profileImage");

        if (bioText) bioText.value = data.bio || "";

        if (data.photoURL) {
            if (profileImg) profileImg.src = data.photoURL;
        }

        if (loggedInData.photoURL && sidebarProfileImg) {
            sidebarProfileImg.src = loggedInData.photoURL;
        }

        if (user.uid === uidToLoad) {
            if (editBtn) editBtn.style.display = "block";
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

            if (profileImg) {
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
                profileImg.title = "Click to change profile picture (400 x 400px)";
                profileImg.onclick = () => fileInput.click();

                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                        await user.getIdToken(true);
                        const storageRef = ref(storage, "userPhotos/" + user.uid + "/profile.jpg");
                        await uploadBytes(storageRef, file);
                        const url = await getDownloadURL(storageRef);
                        const userRef = doc(db, "users", user.uid);
                        await updateDoc(userRef, { photoURL: url });
                        profileImg.src = url;
                        if (sidebarProfileImg) sidebarProfileImg.src = url;
                    } catch (err) {
                        console.error("Upload failed", err);
                        alert("Failed to upload photo.");
                    }
                };
            }
        } else {
            if (editBtn) editBtn.style.display = "none";
            if (profileImg) {
                profileImg.style.cursor = "default";
                profileImg.onclick = null;
                profileImg.title   = "";
            }
        }

        if (!(data.visibility === 'private' && user.uid !== uidToLoad)) {
            setupTabs(uidToLoad);
            await loadPosts(uidToLoad);
        }
    });
}