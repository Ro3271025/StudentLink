// public/js/postDetail.js
import { db, auth } from './firebaseInitialization.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc, getDoc, collection, addDoc, getDocs, deleteDoc, updateDoc,
    query, orderBy, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "userlogin.html"; return; }
    currentUser = user;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const data = userSnap.exists() ? userSnap.data() : {};

    const displayEl = document.getElementById("displayName");
    const usernameEl = document.getElementById("username");
    if (displayEl) displayEl.innerText = data.displayName || user.displayName || "";
    if (usernameEl) usernameEl.innerText = data.username ? "@" + data.username : "";

    const sideProfileIcon = document.querySelector('.sideProfileIcon');
    if (sideProfileIcon && data.photoURL) sideProfileIcon.src = data.photoURL;

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
            ? `<div class="imageContainer"><img src="${post.imageUrl}"></div>` : '';

        const deleteBtn = isOwner
            ? `<button id="deletePostBtn" class="deletePostBtn">Delete Post</button>`
            : '';

        const commentsSnap = await getDocs(collection(db, "posts", postId, "comments"));
        const actualCount = commentsSnap.size;
        if ((post.commentCount || 0) !== actualCount && currentUser) {
            await updateDoc(doc(db, "posts", postId), { commentCount: actualCount });
        }

        const userSnap = await getDoc(doc(db, "users", post.authorId));
        const authorPhoto = (userSnap.exists() && userSnap.get('photoURL'))
            ? userSnap.get('photoURL')
            : (post.authorPhotoURL || 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG');

        container.innerHTML = `
            <div class="postAuthorHeader">
                <img class="profileImgMini postAuthorHeaderImg" src="${authorPhoto}">
                <div>
                    <a class="postLink postDisplayName" href="profile.html?id=${post.authorId}">
                        ${escapeHtml(userSnap.get('displayName') || 'Display Name')}
                    </a>
                    <small class="smallTxt postAuthorUsername">@${escapeHtml(userSnap.get('username') || 'username')}</small>
                </div>
                ${deleteBtn}
            </div>
            <p class="postContentText">${escapeHtml(post.body || '')}</p>
            ${imageSection}
            <br>
            <footer id="postFooter">
                <a class="postLink postMetrics likeBtn${hasLiked ? ' likedBtn' : ''}"
                   href="#"
                   data-post-id="${post.id}">
                   ${likes} Like${likes !== 1 ? 's' : ''}
                </a>
                <a class="postLink postMetrics commentCountLink" id="commentCountDisplay" href="#">
                    ${actualCount} Comment${actualCount !== 1 ? 's' : ''}
                </a>
            </footer>
        `;

        const postTitle = document.getElementById("postTitle");
        postTitle.innerHTML = `${post.title}`.substring(0, 15) + ` - ${post.authorName} | StudentLink`;

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
                        likeBtn.classList.add('likedBtn');
                    } else {
                        likeBtn.classList.remove('likedBtn');
                    }
                } catch (err) {
                    console.error("Like failed:", err);
                } finally {
                    likeBtn.style.pointerEvents = '';
                }
            });
        }

        if (isOwner) {
            document.getElementById('deletePostBtn').addEventListener('click', async () => {
                if (!confirm("Are you sure you want to delete this post?")) return;
                try {
                    await deleteDoc(doc(db, "posts", postId));
                    window.location.href = "home.html";
                } catch (err) { console.error("Delete failed:", err); }
            });
        }

    } catch (err) {
        console.error("Failed to load post:", err);
        container.innerHTML = '<p style="color:#e55; text-align:center; padding:20px;">Failed to load post.</p>';
    }
}

async function loadComments() {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '<p id="loading">Loading comments...</p>';

    try {
        const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);

        const realCount = snap.size;
        if (currentUser) await updateDoc(doc(db, "posts", postId), { commentCount: realCount });

        const countDisplay = document.getElementById('commentCountDisplay');
        if (countDisplay) countDisplay.textContent = `${realCount} Comment${realCount !== 1 ? 's' : ''}`;

        if (snap.empty) {
            container.innerHTML = '<p id="loading">No comments yet. Be the first!</p>';
            return;
        }

        container.innerHTML = '';
        const commentTexts = new Map();

        await Promise.all(snap.docs.map(async d => {
            const c = { id: d.id, ...d.data() };
            const userSnap = await getDoc(doc(db, "users", c.authorId));
            const isOwner = currentUser && c.authorId === currentUser.uid;

            commentTexts.set(c.id, c.text);

            const commentPhoto = (userSnap.exists() && userSnap.get('photoURL'))
                ? userSnap.get('photoURL')
                : 'styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG';

            // FIX: always show displayName, fall back to username then stored authorName
            const authorDisplayName = (userSnap.exists() && userSnap.get('displayName'))
                ? userSnap.get('displayName')
                : (userSnap.exists() && userSnap.get('username'))
                    ? userSnap.get('username')
                    : c.authorName || 'Anonymous';

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
                editBtn.dataset.commentId = c.id;
                editBtn.textContent = 'Edit';

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'deleteCommentBtn';
                deleteBtn.dataset.commentId = c.id;
                deleteBtn.textContent = 'Delete';

                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);
                body.appendChild(actions);
            }

            item.appendChild(img);
            item.appendChild(body);
            container.appendChild(item);
        }));

        // ── Delete comment ──
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

        // ── Edit comment ──
        container.querySelectorAll('.editCommentBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const commentId = btn.dataset.commentId;
                const textEl = container.querySelector(`.commentText-${commentId}`);
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
    if (!currentUser) { alert("Please log in to comment."); return; }

    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const btn = document.getElementById('addCommentBtn');
    btn.disabled = true;
    btn.textContent = 'Posting...';

    try {
        // FIX: fetch display name from Firestore so it's always current
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const authorName = userData.displayName || currentUser.displayName || currentUser.email || "Anonymous";

        await addDoc(collection(db, "posts", postId, "comments"), {
            authorId: currentUser.uid,
            authorName,
            text,
            createdAt: serverTimestamp()
        });

        try {
            const { createNotification } = await import('./NotificationsService.js');
            const postSnap = await getDoc(doc(db, "posts", postId));
            if (postSnap.exists()) {
                const postData = postSnap.data();
                await createNotification({
                    toUserId: postData.authorId,
                    fromUserId: currentUser.uid,
                    fromUserName: authorName,
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