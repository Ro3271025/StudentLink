// public/js/feed.js
import { db, auth } from './firebaseInitialization.js';
import { toggleLike } from './postsService.js';
import { addComment, getComments, deleteComment, editComment } from './commentsService.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

loadAndRenderFeed();

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

        const displayName = post.authorName || 'Display Name';
        const username = post.authorUsername ? `@${post.authorUsername}` : '@Username';
        const profileImg = 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';
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

        card.innerHTML = `
            <img class="profileImgMini" src="${profileImg}">
            <span class="postHeader">
                <a class="postLink postDisplayName" href="#">${displayName}</a>
                <small class="postUsername" style="margin-left: 6px; color: #aaa;">${username}</small>
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
                <a href="#" class="postLink postMetrics" style="text-align: right;">Report</a>
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
                const { liked, newCount } = await toggleLike(postId, userId);
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

                const card = document.querySelector(`.content[data-post-id="${postId}"]`);
                if (card) {
                    const toggleBtn = card.querySelector('.commentToggleBtn');
                    if (toggleBtn) {
                        const currentCount = parseInt(toggleBtn.textContent) || 0;
                        const newCount = currentCount + 1;
                        toggleBtn.textContent = `${newCount} Comment${newCount !== 1 ? 's' : ''}`;
                    }
                }
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

                    // Update comment count in footer
                    const card = document.querySelector(`.content[data-post-id="${postId}"]`);
                    if (card) {
                        const toggleBtn = card.querySelector('.commentToggleBtn');
                        if (toggleBtn) {
                            const currentCount = parseInt(toggleBtn.textContent) || 0;
                            const newCount = Math.max(0, currentCount - 1);
                            toggleBtn.textContent = `${newCount} Comment${newCount !== 1 ? 's' : ''}`;
                        }
                    }
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
                const { postId, commentId, commentText } = btn.dataset;
                const textEl = list.querySelector(`.commentText-${commentId}`);
                if (!textEl) return;

                // Replace text with an input field
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

                // Insert edit row after the text
                textEl.parentNode.insertBefore(editRow, textEl.nextSibling);
                editInput.focus();
                editInput.setSelectionRange(editInput.value.length, editInput.value.length);

                // Cancel
                cancelBtn.addEventListener('click', () => {
                    editRow.remove();
                    textEl.style.display = '';
                    btn.style.display = '';
                });

                // Save
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

                // Enter key to save
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