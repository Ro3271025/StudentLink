// public/js/postDetail.js
import { db, auth } from './firebaseInitialization.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "userlogin.html";
        return;
    }
    currentUser = user;

    // Update sidebar
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const data = userSnap.exists() ? userSnap.data() : {};
    const displayEl = document.getElementById("displayName");
    const usernameEl = document.getElementById("username");
    if (displayEl) displayEl.innerText = data.displayName || user.displayName || "";
    if (usernameEl) usernameEl.innerText = data.username ? "@" + data.username : "";

    if (!postId) {
        document.getElementById('postDetailContainer').innerHTML =
            '<p style="color:#e55; text-align:center; padding:20px;">No post ID provided.</p>';
        return;
    }

    await loadPost();
    await loadComments();

    document.getElementById('commentsSection').style.display = 'block';

    document.getElementById('addCommentBtn').addEventListener('click', submitComment);
    document.getElementById('commentInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitComment();
    });
});

async function loadPost() {
    const container = document.getElementById('postDetailContainer');

    try {
        const postSnap = await getDoc(doc(db, "posts", postId));
        if (!postSnap.exists()) {
            container.innerHTML = '<p style="color:#e55; text-align:center; padding:20px;">Post not found.</p>';
            return;
        }

        const post = { id: postSnap.id, ...postSnap.data() };
        const likes = post.likes || 0;
        const isOwner = currentUser && post.authorId === currentUser.uid;
        const likedBy = post.likedBy || [];
        const hasLiked = currentUser && likedBy.includes(currentUser.uid);
        const imageSection = post.imageUrl
            ? `<div class="imageContainer"><img src="${post.imageUrl}"></div>`
            : '';

        const deleteBtn = isOwner
            ? `<button id="deletePostBtn" style="font-size:12pt; padding:4px 14px; border-radius:12px; background:none; border:1px solid #e55; color:#e55; cursor:pointer; margin-left:12px;">Delete Post</button>`
            : '';

        // Get actual comment count from subcollection
        const commentsSnap = await getDocs(collection(db, "posts", postId, "comments"));
        const actualCount = commentsSnap.size;

        // Fix stored count if it's wrong
        if ((post.commentCount || 0) !== actualCount && currentUser) {
            await updateDoc(doc(db, "posts", postId), { commentCount: actualCount });
        }

        const authorPhoto = post.authorPhotoURL || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'; 

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                <img class="profileImgMini" src="${authorPhoto}" style="margin:0;">
                <div>
                    <a class="postLink postDisplayName" href="profile.html?id=${post.authorId}">
                        ${escapeHtml(post.authorName || 'Display Name')}
                    </a>
                    <small class="postUsername" style="margin-left:6px; color:#aaa;">@${escapeHtml(post.authorUsername || 'username')}</small>
                </div>
                ${deleteBtn}
            </div>
            <p class="postContentText">${escapeHtml(post.body || '')}</p>
            ${imageSection}
            <br>
            <footer id="postFooter">
                <a class="postLink postMetrics likeBtn${hasLiked ? ' liked' : ''}"
                   href="#"
                   data-post-id="${post.id}"
                   style="${hasLiked ? 'color: #E6557C; font-weight:600;' : ''}">
                   ${likes} Like${likes !== 1 ? 's' : ''}
                </a>
                <a class="postLink postMetrics" id="commentCountDisplay" href="#" style="margin-left:12px;">
                    ${actualCount} Comment${actualCount !== 1 ? 's' : ''}
                </a>
            </footer>
        `; // The post title in here is not supposed to be there, but I won't remove it yet to avoid conflicts

        const postTitle = document.getElementById("postTitle");
        const titleSubStr = `${post.title}`.substring(0, 15);
        postTitle.innerHTML = titleSubStr + ` - ` + `${post.authorName}` + ` | StudentLink`;

        // Like button
        const likeBtn = container.querySelector('.likeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!currentUser) return;

                likeBtn.style.pointerEvents = 'none';
                try {
                    const { toggleLike } = await import('./postsService.js');
                    const { liked, newCount } = await toggleLike(post.id, currentUser.uid);
                    likeBtn.textContent = `${newCount} Like${newCount !== 1 ? 's' : ''}`;
                    if (liked) {
                        likeBtn.style.color = 'var(--theme-accent)';
                        likeBtn.style.fontWeight = '600';
                    } else {
                        likeBtn.style.color = '';
                        likeBtn.style.fontWeight = '';
                    }
                } catch (err) {
                    console.error("Like failed:", err);
                } finally {
                    likeBtn.style.pointerEvents = '';
                }
            });
        }

        // Delete post button
        if (isOwner) {
            document.getElementById('deletePostBtn').addEventListener('click', async () => {
                if (!confirm("Are you sure you want to delete this post?")) return;
                try {
                    await deleteDoc(doc(db, "posts", postId));
                    alert("Post deleted.");
                    window.location.href = "home.html";
                } catch (err) {
                    console.error("Delete failed:", err);
                    alert("Failed to delete post.");
                }
            });
        }

    } catch (err) {
        console.error("Failed to load post:", err);
        container.innerHTML = '<p style="color:#e55; text-align:center; padding:20px;">Failed to load post.</p>';
    }
}

async function loadComments() {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '<p id="loading" style="color:#aaa; font-size:13px;">Loading comments...</p>';

    try {
        const q = query(
            collection(db, "posts", postId, "comments"),
            orderBy("createdAt", "asc")
        );
        const snap = await getDocs(q);

        // Always sync the stored commentCount to the real count
        const realCount = snap.size;
        if (currentUser) {
            await updateDoc(doc(db, "posts", postId), { commentCount: realCount });
        }

        // Update the count display on the page
        const countDisplay = document.getElementById('commentCountDisplay');
        if (countDisplay) {
            countDisplay.textContent = `${realCount} Comment${realCount !== 1 ? 's' : ''}`;
        }

        if (snap.empty) {
            container.innerHTML = '<p id="loading" style="color:#aaa; text-align:center; font-size:13px; margin:8px 0;">No comments yet. Be the first!</p>';
            return;
        }

        container.innerHTML = '';
        snap.docs.forEach(d => {
            const c = { id: d.id, ...d.data() };
            const isOwner = currentUser && c.authorId === currentUser.uid;

            const ownerActions = isOwner ? `
                <div style="display:flex; gap:8px; margin-top:4px;">
                    <button class="editCommentBtn themeObject"
                        data-comment-id="${c.id}"
                        data-comment-text="${escapeAttr(c.text)}"
                        style="font-size:12px; padding:2px 10px; border-radius:12px; cursor:pointer;">
                        Edit
                    </button>
                    <button class="deleteCommentBtn"
                        data-comment-id="${c.id}"
                        style="font-size:12px; padding:2px 10px; border-radius:12px; cursor:pointer; background:none; border:1px solid #e55; color:#e55;">
                        Delete
                    </button>
                </div>
            ` : '';

            const el = document.createElement('div');
            el.id = `comment-${c.id}`;
            el.style = 'display:flex; gap:8px; margin-bottom:12px; align-items:flex-start; border-bottom:1px solid #333; padding-bottom:10px;padding-left:8px';
            el.innerHTML = `
                <img src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG"
                     style="width:32px; height:32px; border-radius:4px; flex-shrink:0;">
                <div style="flex:1;">
                    <span style="font-size:13px; font-weight:600; color:#fff;">${escapeHtml(c.authorName || 'Anonymous')}</span>
                    <p class="commentText-${c.id}" style="font-size:14px; color:#ccc; margin:3px 0 0;">${escapeHtml(c.text)}</p>
                    ${ownerActions}
                </div>
            `;
            container.appendChild(el);
        });

        // Delete comment
        container.querySelectorAll('.deleteCommentBtn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm("Delete this comment?")) return;
                const commentId = btn.dataset.commentId;
                try {
                    await deleteDoc(doc(db, "posts", postId, "comments", commentId));
                    await loadComments();
                } catch (err) {
                    console.error("Delete comment failed:", err);
                    alert("Failed to delete comment.");
                }
            });
        });

        // Edit comment
        container.querySelectorAll('.editCommentBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const commentId = btn.dataset.commentId;
                const textEl = container.querySelector(`.commentText-${commentId}`);
                if (!textEl) return;

                const originalText = textEl.textContent.trim();
                textEl.style.display = 'none';
                btn.style.display = 'none';

                const editRow = document.createElement('div');
                editRow.style = 'display:flex; gap:6px; margin-top:4px; align-items:center;';
                editRow.innerHTML = `
                    <input type="text" value="${escapeAttr(originalText)}" maxlength="300"
                        style="flex:1; padding:5px 10px; border-radius:14px; border:1px solid #444; background:#222; color:#fff; font-size:13px;" />
                    <button style="font-size:12px; padding:3px 10px; border-radius:12px; cursor:pointer; background:#0f73ff; border:none; color:#fff;">Save</button>
                    <button style="font-size:12px; padding:3px 10px; border-radius:12px; cursor:pointer; background:none; border:1px solid #666; color:#aaa;">Cancel</button>
                `;

                const editInput = editRow.querySelector('input');
                const saveBtn = editRow.querySelectorAll('button')[0];
                const cancelBtn = editRow.querySelectorAll('button')[1];

                textEl.parentNode.insertBefore(editRow, textEl.nextSibling);
                editInput.focus();

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
                        await updateDoc(doc(db, "posts", postId, "comments", commentId), {
                            text: newText,
                            editedAt: serverTimestamp()
                        });
                        await loadComments();
                    } catch (err) {
                        console.error("Edit failed:", err);
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
        container.innerHTML = '<p style="color:#e55; font-size:13px;">Failed to load comments.</p>';
    }
}

async function submitComment() {
    if (!currentUser) {
        alert("Please log in to comment.");
        return;
    }

    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const btn = document.getElementById('addCommentBtn');
    btn.disabled = true;
    btn.textContent = 'Posting...';

    try {
        await addDoc(collection(db, "posts", postId, "comments"), {
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email || "Anonymous",
            text,
            createdAt: serverTimestamp()
        });

        // Send notification to post author
        try {
            const { createNotification } = await import('./NotificationsService.js');
            const postSnap = await getDoc(doc(db, "posts", postId));
            if (postSnap.exists()) {
                const postData = postSnap.data();
                await createNotification({
                    toUserId: postData.authorId,
                    fromUserId: currentUser.uid,
                    fromUserName: currentUser.displayName || currentUser.email || "Anonymous",
                    type: "comment",
                    postId,
                    postBody: postData.body || postData.title || "",
                    commentText: text
                });
            }
        } catch (notifErr) {
            console.error("Notification failed:", notifErr);
        }

        input.value = '';
        await loadComments();
    } catch (err) {
        console.error("Comment failed:", err);
        alert("Failed to post comment.");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Post';
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