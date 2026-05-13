// public/js/feed.js
import { db, auth } from './firebaseInitialization.js';
import { toggleLike, createPost } from './postsService.js';
import { addComment, getComments, deleteComment, editComment } from './commentsService.js';
import { collection, query, orderBy, getDocs, doc, getDoc, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const FEED_PAGE_SIZE = 10;

let loadedPosts = [];
let lastVisibleDoc = null;
let hasMorePosts = true;
let isLoadingPosts = false;

loadAndRenderFeed();
setupLoadMoreButton();
setupNewPostComposer();

async function getCurrentUserUsername(user) {
    if (!user) return "";
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            const data = snap.data() || {};
            if (data.username && String(data.username).trim()) {
                return String(data.username).trim();
            }
        }
    } catch (err) {
        console.error("Failed to load username:", err);
    }
    const email = user.email || "";
    return email.includes("@") ? email.split("@")[0] : "user";
}

// FIX: fetch display name from Firestore instead of relying on Firebase Auth
async function getCurrentUserDisplayName(userId) {
    try {
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) {
            const data = snap.data() || {};
            return data.displayName || auth.currentUser?.displayName || auth.currentUser?.email || "Anonymous";
        }
    } catch (err) {
        console.error("Failed to fetch display name:", err);
    }
    return auth.currentUser?.displayName || auth.currentUser?.email || "Anonymous";
}

function setupNewPostComposer() {
    const createBtn = document.getElementById("createPostBtn");
    const textArea = document.querySelector("#newPostTXT textarea");
    if (!createBtn || !textArea) return;

    createBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) { alert("Please log in to post."); return; }

        const body = textArea.value.trim();
        if (!body) { alert("Please write something before posting."); return; }

        const compactText = body.replace(/\s+/g, " ").trim();
        const title = (compactText.slice(0, 60) || "Post").trim();

        createBtn.disabled = true;
        createBtn.style.marginLeft = "56%";
        createBtn.textContent = "Posting...";

        try {
            const authorUsername = await getCurrentUserUsername(user);
            const userSnap = await getDoc(doc(db, "users", user.uid));
            const userData = userSnap.exists() ? userSnap.data() : {};

            await createPost({
                authorId: user.uid,
                authorName: userData.displayName || getCurrentUserName(),
                authorUsername,
                authorPhotoURL: userData.photoURL || "",
                title,
                body
            });

            textArea.value = "";
            if (typeof window.toggleOverlay === "function") {
                window.toggleOverlay("newPostContainer");
            }
            await loadAndRenderFeed();
        } catch (err) {
            console.error("Failed to create post:", err);
            alert("Failed to create post. Please try again.");
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = "Post";
            createBtn.style.marginLeft = "63%";
        }
    });
}

async function loadAndRenderFeed() {
    loadedPosts = [];
    lastVisibleDoc = null;
    hasMorePosts = true;
    await loadMorePosts({ reset: true });
}

function setupLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMore');
    if (!loadMoreBtn) return;
    loadMoreBtn.addEventListener('click', async () => { await loadMorePosts(); });
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMore');
    if (!loadMoreBtn) return;
    if (!hasMorePosts) { loadMoreBtn.style.display = 'none'; return; }
    loadMoreBtn.style.display = 'inline-block';
    loadMoreBtn.disabled = isLoadingPosts;
    loadMoreBtn.textContent = isLoadingPosts ? 'Loading...' : 'Load More Posts';
}

async function loadMorePosts(options = {}) {
    const reset = Boolean(options.reset);
    if (isLoadingPosts) return;
    if (!reset && !hasMorePosts) return;

    isLoadingPosts = true;
    updateLoadMoreButton();

    try {
        const { posts, nextLastVisibleDoc, hasNextPage } = await getRecentPostsPage(lastVisibleDoc);
        await syncCommentCounts(posts);
        loadedPosts = reset ? posts : [...loadedPosts, ...posts];
        if (posts.length > 0) lastVisibleDoc = nextLastVisibleDoc;
        hasMorePosts = hasNextPage;
        await renderPosts(loadedPosts);
    } catch (err) {
        console.error('Failed to load posts:', err);
        alert('Failed to load posts. Please try again.');
    } finally {
        isLoadingPosts = false;
        updateLoadMoreButton();
    }
}

async function syncCommentCounts(posts) {
    await Promise.all(posts.map(async (post) => {
        try {
            const snap = await getDocs(collection(db, "posts", post.id, "comments"));
            post.commentCount = snap.size;
        } catch (err) { /* keep stored count if fetch fails */ }
    }));
}

async function getRecentPostsPage(lastDoc = null) {
    const postsCol = collection(db, "posts");
    const q = lastDoc
        ? query(postsCol, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(FEED_PAGE_SIZE))
        : query(postsCol, orderBy("createdAt", "desc"), limit(FEED_PAGE_SIZE));

    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(snap => ({ id: snap.id, ...snap.data() }));

    return {
        posts,
        nextLastVisibleDoc: querySnapshot.docs.length ? querySnapshot.docs[querySnapshot.docs.length - 1] : lastDoc,
        hasNextPage: querySnapshot.docs.length === FEED_PAGE_SIZE
    };
}

function getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.uid : null;
}

function getCurrentUserName() {
    const user = auth.currentUser;
    if (!user) return "Anonymous";
    return user.displayName || user.email || "Anonymous";
}

async function renderPosts(posts) {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    container.innerHTML = '';

    await Promise.all(posts.map(async post => {
        const card = document.createElement('div');
        card.className = 'content feedCard';
        card.dataset.postId = post.id;

        const userSnap = await getDoc(doc(db, "users", post.authorId));
        const displayName = userSnap.exists() ? (userSnap.get('displayName') || 'Display Name') : 'Display Name';
        const username = userSnap.exists() ? (userSnap.get('username') ? `@${userSnap.get('username')}` : '@Username') : '@Username';
        const profileImg = (userSnap.exists() && userSnap.get('photoURL'))
            ? userSnap.get('photoURL')
            : (post.authorPhotoURL || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG');

        const postText = post.body || post.description || '';
        const likeCount = post.likes || 0;
        const commentCount = post.commentCount || 0;
        const imageUrl = post.imageUrl || '';
        const userId = getCurrentUserId();
        const hasLiked = userId && (post.likedBy || []).includes(userId);

        let imageSection = '';
        if (imageUrl) imageSection = `<div class="imageContainer"><img src="${imageUrl}"></div>`;

        let dateString = 'Unknown date';
        if (post.createdAt) {
            let dateObj = post.createdAt;
            if (typeof dateObj.toDate === 'function') dateObj = dateObj.toDate();
            if (dateObj instanceof Date) dateString = dateObj.toLocaleString();
        }

        card.innerHTML = `
            <img class="profileImgMini" src="${profileImg}">
            <span class="postHeader">
                <a class="postLink postDisplayName" href="profile.html?id=${post.authorId}">${displayName}</a>
                <small class="smallTxt postUsernameInline">${username}</small>
                <span class="smallTxt postTimestamp">${dateString}</span>
            </span><br>
            <p class="postContentText">${postText}</p>
            ${imageSection}
            <br>
            <footer class="postFooter">
                <a class="postLink postMetrics likeBtn${hasLiked ? ' likedBtn' : ''}"
                   href="#"
                   data-post-id="${post.id}"
                   data-like-count="${likeCount}">
                   ${likeCount} Like${likeCount !== 1 ? 's' : ''}
                </a>
                <a class="postLink postMetrics commentToggleBtn" href="#" data-post-id="${post.id}">
                   ${commentCount} Comment${commentCount !== 1 ? 's' : ''}
                </a>
                <a href="reportform.html?postId=${post.id}"
                   class="postLink postMetrics reportBtn"
                   data-post-id="${post.id}">Report</a>
            </footer>

            <div class="commentSection" id="comments-${post.id}">
                <div class="commentsList" id="commentsList-${post.id}">
                    <p class="smallTxt" style="font-size:13px;">Loading comments...</p>
                </div>
                <div class="commentInputRow">
                    <input
                        class="commentInput themeObject"
                        id="commentInput-${post.id}"
                        type="text"
                        placeholder="Write a comment..."
                        maxlength="300"
                    />
                    <button class="themeObject submitCommentBtn" data-post-id="${post.id}">
                        Post
                    </button>
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('postMetrics') &&
                !e.target.classList.contains('likeBtn') &&
                !e.target.classList.contains('commentToggleBtn') &&
                !e.target.classList.contains('submitCommentBtn') &&
                !e.target.classList.contains('reportBtn') &&
                !e.target.classList.contains('postDisplayName') &&
                !e.target.closest('.commentSection') &&
                !e.target.closest('footer')) {
                window.location.href = `post.html?id=${post.id}`;
            }
        });

        container.appendChild(card);
    }));

    attachEventListeners();
}

function attachEventListeners() {
    // ── Like buttons ──
    document.querySelectorAll('.likeBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const userId = getCurrentUserId();
            if (!userId) { alert("Please log in to like posts."); return; }

            const postId = btn.dataset.postId;
            btn.style.pointerEvents = 'none';
            try {
                const { liked, newCount } = await toggleLike(postId, userId, getCurrentUserName());
                btn.dataset.likeCount = newCount;
                btn.textContent = `${newCount} Like${newCount !== 1 ? 's' : ''}`;
                if (liked) {
                    btn.classList.add('likedBtn');
                } else {
                    btn.classList.remove('likedBtn');
                }
            } catch (err) {
                console.error("Like failed:", err);
            } finally {
                btn.style.pointerEvents = '';
            }
        });
    });

    // ── Comment toggle buttons ──
    document.querySelectorAll('.commentToggleBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const postId = btn.dataset.postId;
            const section = document.getElementById(`comments-${postId}`);
            if (!section) return;

            const isOpen = section.classList.contains('open');
            if (isOpen) {
                section.classList.remove('open');
                section.style.display = 'none';
            } else {
                section.classList.add('open');
                section.style.display = 'block';
                await loadComments(postId);
            }
        });
    });

    // ── Submit comment buttons ──
    document.querySelectorAll('.submitCommentBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const userId = getCurrentUserId();
            if (!userId) { alert("Please log in to comment."); return; }

            const postId = btn.dataset.postId;
            const input = document.getElementById(`commentInput-${postId}`);
            const text = input ? input.value.trim() : '';
            if (!text) return;

            btn.disabled = true;
            btn.textContent = 'Posting...';
            try {
                // FIX: fetch display name from Firestore so it's always current
                const authorName = await getCurrentUserDisplayName(userId);
                await addComment(postId, { authorId: userId, authorName, text });
                input.value = '';
                await loadComments(postId);
            } catch (err) {
                console.error("Comment failed:", err);
                alert("Failed to post comment. Please try again.");
            } finally {
                btn.disabled = false;
                btn.textContent = 'Post';
            }
        });
    });

    // ── Report buttons ──
    document.querySelectorAll('.reportBtn').forEach(btn => {
        btn.addEventListener('click', (e) => e.stopPropagation());
    });

    // ── Enter key to submit comment ──
    document.querySelectorAll('.commentInput').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const postId = input.id.replace('commentInput-', '');
                const btn = document.querySelector(`.submitCommentBtn[data-post-id="${postId}"]`);
                if (btn) btn.click();
            }
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    });
}

async function loadComments(postId) {
    const list = document.getElementById(`commentsList-${postId}`);
    if (!list) return;

    const userId = getCurrentUserId();

    try {
        const comments = await getComments(postId, { pageSize: 50 });

        const card = document.querySelector(`.content[data-post-id="${postId}"]`);
        if (card) {
            const toggleBtn = card.querySelector('.commentToggleBtn');
            if (toggleBtn) toggleBtn.textContent = `${comments.length} Comment${comments.length !== 1 ? 's' : ''}`;
        }

        if (comments.length === 0) {
            list.innerHTML = `<p class="smallTxt" style="text-align:center; font-size:13px; margin:4px 0;">No comments yet. Be the first!</p>`;
            return;
        }

        const commentTexts = new Map();
        list.innerHTML = '';

        // FIX: fetch current display name from Firestore for each commenter
        await Promise.all(comments.map(async c => {
            commentTexts.set(c.id, c.text);
            const isOwner = userId && c.authorId === userId;
            // Fetch current display name and photo from Firestore
            let authorDisplayName = c.authorName || 'Anonymous';
            let commentPhoto = 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';
            try {
                const authorSnap = await getDoc(doc(db, "users", c.authorId));
                if (authorSnap.exists()) {
                    authorDisplayName = authorSnap.get('displayName') || authorSnap.get('username') || c.authorName || 'Anonymous';
                    commentPhoto = authorSnap.get('photoURL') || commentPhoto;
                }
            } catch (err) { /* fall back to defaults */ }

            const item = document.createElement('div');
            item.id = `comment-${c.id}`;
            item.className = 'commentItem';

            const img = document.createElement('img');
            img.src = commentPhoto;
            img.className = 'commentItemImg';

            const body = document.createElement('div');
            body.className = 'commentBody';

            const author = document.createElement('span');
            author.className = 'commentAuthor';
            author.textContent = authorDisplayName;

            const text = document.createElement('p');
            text.className = `commentBodyText commentText-${c.id}`;
            text.textContent = c.text;

            body.appendChild(author);
            body.appendChild(text);

            if (isOwner) {
                const actions = document.createElement('div');
                actions.className = 'commentActions';

                const editBtn = document.createElement('button');
                editBtn.className = 'editCommentBtn themeObject';
                editBtn.dataset.postId = postId;
                editBtn.dataset.commentId = c.id;
                editBtn.textContent = 'Edit';

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'deleteCommentBtn';
                deleteBtn.dataset.postId = postId;
                deleteBtn.dataset.commentId = c.id;
                deleteBtn.textContent = 'Delete';

                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);
                body.appendChild(actions);
            }

            item.appendChild(img);
            item.appendChild(body);
            list.appendChild(item);
        }));

        // ── Delete comment ──
        list.querySelectorAll('.deleteCommentBtn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm("Delete this comment?")) return;
                const { postId, commentId } = btn.dataset;
                try {
                    await deleteComment(postId, commentId);
                    await loadComments(postId);
                } catch (err) {
                    console.error("Delete failed:", err);
                    alert("Failed to delete comment.");
                }
            });
        });

        // ── Edit comment ──
        list.querySelectorAll('.editCommentBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const { postId, commentId } = btn.dataset;
                const textEl = list.querySelector(`.commentText-${commentId}`);
                if (!textEl) return;

                const originalText = commentTexts.get(commentId) || textEl.textContent.trim();
                textEl.style.display = 'none';
                btn.style.display = 'none';

                const editRow = document.createElement('div');
                editRow.className = 'editRow';

                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.value = originalText;
                editInput.maxLength = 300;
                editInput.className = 'editInput';

                const saveBtn = document.createElement('button');
                saveBtn.textContent = 'Save';
                saveBtn.className = 'saveCommentBtn';

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                cancelBtn.className = 'cancelCommentBtn';

                editRow.appendChild(editInput);
                editRow.appendChild(saveBtn);
                editRow.appendChild(cancelBtn);
                textEl.parentNode.insertBefore(editRow, textEl.nextSibling);
                editInput.focus();
                editInput.setSelectionRange(editInput.value.length, editInput.value.length);

                cancelBtn.addEventListener('click', () => {
                    editRow.remove();
                    textEl.style.display = '';
                    btn.style.display = '';
                });

                saveBtn.addEventListener('click', async () => {
                    const newText = editInput.value.trim();
                    if (!newText) return;
                    saveBtn.disabled = true;
                    saveBtn.textContent = 'Saving...';
                    try {
                        await editComment(postId, commentId, newText);
                        await loadComments(postId);
                    } catch (err) {
                        console.error("Edit failed:", err);
                        alert("Failed to edit comment.");
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Save';
                    }
                });

                editInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveBtn.click();
                    if (e.key === 'Escape') cancelBtn.click();
                });
            });
        });

    } catch (err) {
        console.error("Failed to load comments:", err);
        list.innerHTML = `<p style="color:#e55; font-size:13px;">Failed to load comments.</p>`;
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}