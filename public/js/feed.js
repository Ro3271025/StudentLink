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

function setupNewPostComposer() {
    const createBtn = document.getElementById("createPostBtn");
    const textArea = document.querySelector("#newPostTXT textarea");
    if (!createBtn || !textArea) return;

    createBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to post.");
            return;
        }

        const body = textArea.value.trim();
        if (!body) {
            alert("Please write something before posting.");
            return;
        }

        const compactText = body.replace(/\s+/g, " ").trim();
        const title = (compactText.slice(0, 60) || "Post").trim();

        createBtn.disabled = true;
        createBtn.textContent = "Posting...";

        try {
            const authorUsername = await getCurrentUserUsername(user);

            await createPost({
                authorId: user.uid,
                authorName: getCurrentUserName(),
                authorUsername,
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

    loadMoreBtn.addEventListener('click', async () => {
        await loadMorePosts();
    });

    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMore');
    if (!loadMoreBtn) return;

    if (!hasMorePosts) {
        loadMoreBtn.style.display = 'none';
        return;
    }

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
        if (posts.length > 0) {
            lastVisibleDoc = nextLastVisibleDoc;
        }
        hasMorePosts = hasNextPage;

        renderPosts(loadedPosts);
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
            const snap = await getDocs(
                collection(db, "posts", post.id, "comments")
            );
            post.commentCount = snap.size;
        } catch (err) {
            // keep stored count if fetch fails
        }
    }));
}









async function getRecentPostsPage(lastDoc = null) {
    const postsCol = collection(db, "posts");
    const q = lastDoc
        ? query(postsCol, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(FEED_PAGE_SIZE))
        : query(postsCol, orderBy("createdAt", "desc"), limit(FEED_PAGE_SIZE));

    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(snap => ({
        id: snap.id,
        ...snap.data()
    }));

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

function renderPosts(posts) {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    container.innerHTML = '';

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'content';
        card.dataset.postId = post.id;
        card.style.cursor = 'pointer';

        const displayName = post.authorName || 'Display Name';
        const username = post.authorUsername ? `@${post.authorUsername}` : '@Username';
        const profileImg = post.authorPhotoURL || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';
        const postText = post.body || post.description || '';
        const likeCount = post.likes || 0;
        const commentCount = post.commentCount || 0;
        const imageUrl = post.imageUrl || '';

        const userId = getCurrentUserId();
        const likedBy = post.likedBy || [];
        const hasLiked = userId && likedBy.includes(userId);

        let imageSection = '';
        if (imageUrl) {
            imageSection = `<div class="imageContainer"><img src="${imageUrl}"></div>`;
        }

        // Format timestamp
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

        card.innerHTML = `
            <img class="profileImgMini" src="${profileImg}">
            <span class="postHeader">
                <a class="postLink postDisplayName" href="profile.html?id=${post.authorId}">${displayName}</a>
                <small class="postUsername" style="margin-left: 6px; color: #aaa;">${username}</small>
                <span class="postTimestamp" style="color:#888;font-size:10pt; margin-left:10px;">${dateString}</span>
            </span><br>
            <p class="postContentText">${postText}</p>
            ${imageSection}
            <br>
            <footer style="padding-bottom:5px;">
                <a class="postLink postMetrics likeBtn${hasLiked ? ' liked' : ''}"
                   href="#"
                   data-post-id="${post.id}"
                   data-like-count="${likeCount}"
                   style="${hasLiked ? 'color: var(--theme-color, #E6557C); font-weight: 600;' : ''}">
                   ${likeCount} Like${likeCount !== 1 ? 's' : ''}
                </a>
                <a class="postLink postMetrics commentToggleBtn"
                   href="#"
                   data-post-id="${post.id}">
                   ${commentCount} Comment${commentCount !== 1 ? 's' : ''}
                </a>
                <a href="reportform.html" class="postLink postMetrics" style="text-align: right;">Report</a>
            </footer>

            <div class="commentSection" id="comments-${post.id}" style="display:none; margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
                <div class="commentsList" id="commentsList-${post.id}">
                    <p style="color:#aaa; font-size:13px;">Loading comments...</p>
                </div>
                <div class="commentInputRow" style="display:flex; gap:8px; margin-top:10px; align-items:center; padding: 5px;">
                    <input
                        class="commentInput themeObject"
                        id="commentInput-${post.id}"
                        type="text"
                        placeholder="Write a comment..."
                        style="flex:1; padding:7px 12px; border-radius:20px; border:1px solid #444; background:var(--bg-secondary); color:var(--text-fill); font-size:14px;"
                        maxlength="300"
                    />
                    <button
                        class="themeObject submitCommentBtn"
                        data-post-id="${post.id}"
                        style="padding: 7px 16px; border-radius:20px; font-size:14px; cursor:pointer;">
                        Post
                    </button>
                </div>
            </div>
        `;

        // Navigate to post page on card click (but not on interactive elements)
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('postMetrics') &&
                !e.target.classList.contains('likeBtn') &&
                !e.target.classList.contains('commentToggleBtn') &&
                !e.target.classList.contains('submitCommentBtn') &&
                !e.target.classList.contains('postDisplayName') &&
                !e.target.closest('.commentSection') &&
                !e.target.closest('footer')) {
            window.location.href = `post.html?id=${post.id}`;            }
        });

        container.appendChild(card);
    });

    attachEventListeners();
}

function attachEventListeners() {
    // ── Like buttons ──
    document.querySelectorAll('.likeBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const userId = getCurrentUserId();
            if (!userId) {
                alert("Please log in to like posts.");
                return;
            }

            const postId = btn.dataset.postId;
            btn.style.pointerEvents = 'none';

            try {
                const { liked, newCount } = await toggleLike(postId, userId, getCurrentUserName());
                btn.dataset.likeCount = newCount;
                btn.textContent = `${newCount} Like${newCount !== 1 ? 's' : ''}`;

                if (liked) {
                    btn.classList.add('liked');
                    btn.style.color = 'var(--theme-color, #0f73ff)';
                    btn.style.fontWeight = '600';
                } else {
                    btn.classList.remove('liked');
                    btn.style.color = '';
                    btn.style.fontWeight = '';
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

            const isOpen = section.style.display !== 'none';
            if (isOpen) {
                section.style.display = 'none';
            } else {
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
            if (!userId) {
                alert("Please log in to comment.");
                return;
            }

            const postId = btn.dataset.postId;
            const input = document.getElementById(`commentInput-${postId}`);
            const text = input ? input.value.trim() : '';
            if (!text) return;

            btn.disabled = true;
            btn.textContent = 'Posting...';

            try {
                await addComment(postId, {
                    authorId: userId,
                    authorName: getCurrentUserName(),
                    text
                });

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

        // Sync comment count display to real count
        const card = document.querySelector(`.content[data-post-id="${postId}"]`);
        if (card) {
            const toggleBtn = card.querySelector('.commentToggleBtn');
            if (toggleBtn) {
                const realCount = comments.length;
                toggleBtn.textContent = `${realCount} Comment${realCount !== 1 ? 's' : ''}`;
            }
        }

        if (comments.length === 0) {
            list.innerHTML = `<p style="color:#aaa; text-align:center; font-size:13px; margin:4px 0;">No comments yet. Be the first!</p>`;
            return;
        }

        list.innerHTML = comments.map(c => {
            const isOwner = userId && c.authorId === userId;

            const ownerActions = isOwner ? `
                <div style="display:flex; gap:8px; margin-top:4px;">
                    <button
                        class="editCommentBtn themeObject"
                        data-post-id="${postId}"
                        data-comment-id="${c.id}"
                        data-comment-text="${escapeAttr(c.text)}"
                        style="font-size:12px; padding:2px 10px; border-radius:12px; cursor:pointer;">
                        Edit
                    </button>
                    <button
                        class="deleteCommentBtn"
                        data-post-id="${postId}"
                        data-comment-id="${c.id}"
                        style="font-size:12px; padding:2px 10px; border-radius:12px; cursor:pointer; background:none; border:1px solid #e55; color:#e55;">
                        Delete
                    </button>
                </div>
            ` : '';

            return `
                <div id="comment-${c.id}" style="display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; padding:5px">
                    <img src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG"
                         style="width:28px; height:28px; border-radius:50%; flex-shrink:0;">
                    <div style="flex:1;">
                        <span style="font-size:13px; font-weight:600; color:var(--text-fill);">
                            ${escapeHtml(c.authorName || 'Anonymous')}
                        </span>
                        <p class="commentText-${c.id}" style="font-size:14px; color:var(--text-fill); margin:2px 0 0;">
                            ${escapeHtml(c.text)}
                        </p>
                        ${ownerActions}
                    </div>
                </div>
            `;
        }).join('');

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

                const originalText = textEl.textContent.trim();
                textEl.style.display = 'none';
                btn.style.display = 'none';

                const editRow = document.createElement('div');
                editRow.style = 'display:flex; gap:6px; margin-top:4px; align-items:center;';
                editRow.innerHTML = `
                    <input
                        type="text"
                        value="${escapeAttr(originalText)}"
                        maxlength="300"
                        style="flex:1; padding:5px 10px; border-radius:14px; border:1px solid #444; background:#222; color:#fff; font-size:13px;"
                    />
                    <button style="font-size:12px; padding:3px 10px; border-radius:12px; cursor:pointer; background:#0f73ff; border:none; color:#fff;">Save</button>
                    <button style="font-size:12px; padding:3px 10px; border-radius:12px; cursor:pointer; background:none; border:1px solid #666; color:#aaa;">Cancel</button>
                `;

                const editInput = editRow.querySelector('input');
                const saveBtn = editRow.querySelectorAll('button')[0];
                const cancelBtn = editRow.querySelectorAll('button')[1];

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

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}