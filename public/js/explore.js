import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { toggleLike } from "./postsService.js";
import { addComment, getComments, deleteComment, editComment } from "./commentsService.js";

/* ELEMENTS */
const displayNameEl    = document.getElementById("displayName");
const usernameEl       = document.getElementById("username");
const profilePic       = document.getElementById("profilePic");

const feed             = document.getElementById("exploreFeed");
const filter           = document.getElementById("filterSelection");
const searchBar        = document.getElementById("exploreSearchBar");
const latestListingsEl = document.getElementById("latestListingsSection");

const storage = getStorage();

/* STATE */
let allItems     = [];
let activeFilter = "all";
let searchQuery  = "";
let currentUserId   = null;
let currentUserName = null;

/* AUTH & USER INFO */
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    currentUserId   = user.uid;
    currentUserName = user.displayName || user.email || "Anonymous";

    try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
            const data = snap.data();
            displayNameEl.textContent = data.displayName || "No Name";
            usernameEl.textContent    = "@" + (data.username || "username");
        }

        try {
            const imgRef = ref(storage, `userPhotos/${user.uid}/profile.jpg`);
            profilePic.src = await getDownloadURL(imgRef);
        } catch {
            // keep default image
        }

    } catch (err) {
        console.error("Error loading user:", err);
    }
});

/* LOAD ALL DATA */
async function loadExplore() {
    feed.innerHTML = "<p style='opacity:0.6;padding:10px;'>Loading...</p>";

    try {
        const [postsSnap, listingsSnap, latestListingsSnap, newsSnap, eventsSnap] = await Promise.all([
            getDocs(query(collection(db, "posts"),    orderBy("createdAt",  "desc"))),
            getDocs(query(collection(db, "listings"), orderBy("created_at", "desc"))),
            getDocs(query(collection(db, "listings"), orderBy("created_at", "desc"), limit(6))),
            getDocs(query(collection(db, "news"),     orderBy("timestamp",  "desc"), limit(5))),
            getDocs(query(collection(db, "events"),   orderBy("timestamp",  "desc"), limit(5)))
        ]);

        allItems = [];

        postsSnap.forEach(d    => allItems.push({ id: d.id, type: "post",    ...d.data() }));
        listingsSnap.forEach(d => allItems.push({ id: d.id, type: "listing", ...d.data() }));

        allItems.sort((a, b) => {
            const aTime = (a.createdAt?.seconds || a.timestamp?.seconds || a.created_at?.seconds || 0);
            const bTime = (b.createdAt?.seconds || b.timestamp?.seconds || b.created_at?.seconds || 0);
            return bTime - aTime;
        });

        const latestListings = latestListingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const latestNews     = newsSnap.docs.map(d           => ({ id: d.id, ...d.data() }));
        const latestEvents   = eventsSnap.docs.map(d         => ({ id: d.id, ...d.data() }));

        renderLatestListings(latestListings);
        loadPeopleToFollow();
        renderSideSections(latestNews, latestEvents);
        renderFeed(getFilteredItems());

    } catch (err) {
        console.error("Error loading explore:", err);
        feed.innerHTML = "<p style='opacity:0.6;padding:10px;'>Failed to load content.</p>";
    }
}

/* FILTER + SEARCH */
function getFilteredItems() {
    return allItems.filter(item => {
        if (activeFilter === "posts"    && item.type !== "post")    return false;
        if (activeFilter === "listings" && item.type !== "listing") return false;

        if (searchQuery) {
            const haystack = [
                item.text        || "",
                item.title       || "",
                item.name        || "",
                item.description || "",
                item.content     || "",
                item.body        || "",
                item.username    || "",
                item.authorUsername || ""
            ].join(" ").toLowerCase();

            if (!haystack.includes(searchQuery)) return false;
        }

        return true;
    });
}

/* RENDER MAIN FEED — posts use feed.js style, listings use card style */
function renderFeed(items) {
    feed.innerHTML = "";

    if (!items.length) {
        feed.innerHTML = "<p style='opacity:0.6;padding:10px;'>No results found.</p>";
        return;
    }

    items.forEach(item => {
        if (item.type === "post") {
            feed.appendChild(buildPostCard(item));
        } else if (item.type === "listing") {
            feed.appendChild(buildListingFeedItem(item));
        }
    });

    attachPostEventListeners();
}

/* BUILD POST CARD — mirrors feed.js renderPosts() */
function buildPostCard(post) {
    const card = document.createElement("div");
    card.className = "content";
    card.dataset.postId = post.id;
    card.style.cursor = "pointer";

    const displayName  = post.authorName     || "Display Name";
    const username     = post.authorUsername ? `@${post.authorUsername}` : "@Username";
    const profileImg   = post.authorPhotoURL || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG";
    const postText     = post.body || post.description || post.text || "";
    const likeCount    = post.likes || 0;
    const commentCount = post.commentCount || 0;
    const imageUrl     = post.imageUrl || "";

    const likedBy  = post.likedBy || [];
    const hasLiked = currentUserId && likedBy.includes(currentUserId);

    let imageSection = "";
    if (imageUrl) {
        imageSection = `<div class="imageContainer"><img src="${imageUrl}"></div>`;
    }

    let dateString = "Unknown date";
    if (post.createdAt) {
        let dateObj = post.createdAt;
        if (typeof dateObj.toDate === "function") dateObj = dateObj.toDate();
        if (dateObj instanceof Date) dateString = dateObj.toLocaleString();
    }

    card.innerHTML = `
        <img class="profileImgMini" src="${profileImg}">
        <span class="postHeader">
            <a class="postLink postDisplayName" href="profile.html?id=${post.authorId}">${displayName}</a>
            <small class="postUsername" style="margin-left:6px;color:#aaa;">${username}</small>
            <span class="postTimestamp" style="color:#888;font-size:10pt;margin-left:10px;">${dateString}</span>
        </span><br>
        <p class="postContentText">${postText}</p>
        ${imageSection}
        <br>
        <footer style="padding-bottom:5px;">
            <a class="postLink postMetrics likeBtn${hasLiked ? " liked" : ""}"
               href="#"
               data-post-id="${post.id}"
               data-like-count="${likeCount}"
               style="${hasLiked ? "color:var(--theme-color,#E6557C);font-weight:600;" : ""}">
               ${likeCount} Like${likeCount !== 1 ? "s" : ""}
            </a>
            <a class="postLink postMetrics commentToggleBtn"
               href="#"
               data-post-id="${post.id}">
               ${commentCount} Comment${commentCount !== 1 ? "s" : ""}
            </a>
            <a href="reportform.html?postId=${post.id}"
               class="postLink postMetrics reportBtn"
               data-post-id="${post.id}"
               style="text-align:right;">Report</a>
        </footer>

        <div class="commentSection" id="comments-${post.id}" style="display:none;margin-top:10px;border-top:1px solid #333;padding-top:10px;">
            <div class="commentsList" id="commentsList-${post.id}">
                <p style="color:#aaa;font-size:13px;">Loading comments...</p>
            </div>
            <div class="commentInputRow" style="display:flex;gap:8px;margin-top:10px;align-items:center;padding:5px;">
                <input
                    class="commentInput themeObject"
                    id="commentInput-${post.id}"
                    type="text"
                    placeholder="Write a comment..."
                    style="flex:1;padding:7px 12px;border-radius:20px;border:1px solid #444;background:var(--bg-secondary);color:var(--text-fill);font-size:14px;"
                    maxlength="300"
                />
                <button
                    class="themeObject submitCommentBtn"
                    data-post-id="${post.id}"
                    style="padding:7px 16px;border-radius:20px;font-size:14px;cursor:pointer;">
                    Post
                </button>
            </div>
        </div>
    `;

    card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("postMetrics") &&
            !e.target.classList.contains("likeBtn") &&
            !e.target.classList.contains("commentToggleBtn") &&
            !e.target.classList.contains("submitCommentBtn") &&
            !e.target.classList.contains("reportBtn") &&
            !e.target.classList.contains("postDisplayName") &&
            !e.target.closest(".commentSection") &&
            !e.target.closest("footer")) {
            window.location.href = `post.html?id=${post.id}`;
        }
    });

    return card;
}

/* BUILD LISTING FEED ITEM */
function buildListingFeedItem(item) {
    const div = document.createElement("div");
    div.className = "content";
    div.style.cursor = "pointer";
    div.innerHTML = `
        <div class="feedHeader" style="display:flex;justify-content:space-between;padding:8px 8px 4px;">
            <span class="feedUser" style="font-size:13px;opacity:0.7;">@${item.username || item.authorUsername || "user"}</span>
            <span class="feedType" style="font-size:12px;opacity:0.5;background:var(--bg-secondary);padding:2px 8px;border-radius:8px;">Listing</span>
        </div>
        ${(item.imageURL || item.image)
            ? `<div class="imageContainer"><img src="${item.imageURL || item.image}" style="max-height:300px;width:100%;object-fit:cover;"></div>`
            : ""}
        <div style="padding:8px;">
            <strong style="font-size:15px;">${item.title || item.name || ""}</strong>
            <p style="color:var(--theme-accent);font-weight:bold;margin:4px 0;">$${item.price || ""}</p>
        </div>
    `;
    div.onclick = () => window.location.href = `listingDetail.html?id=${item.id}`;
    return div;
}

/* ATTACH EVENT LISTENERS — mirrors feed.js attachEventListeners() */
function attachPostEventListeners() {

    // Like buttons
    document.querySelectorAll(".likeBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentUserId) { alert("Please log in to like posts."); return; }

            const postId = btn.dataset.postId;
            btn.style.pointerEvents = "none";
            try {
                const { liked, newCount } = await toggleLike(postId, currentUserId, currentUserName);
                btn.dataset.likeCount = newCount;
                btn.textContent = `${newCount} Like${newCount !== 1 ? "s" : ""}`;
                if (liked) {
                    btn.classList.add("liked");
                    btn.style.color = "var(--theme-color,#E6557C)";
                    btn.style.fontWeight = "600";
                } else {
                    btn.classList.remove("liked");
                    btn.style.color = "";
                    btn.style.fontWeight = "";
                }
            } catch (err) {
                console.error("Like failed:", err);
            } finally {
                btn.style.pointerEvents = "";
            }
        });
    });

    // Comment toggle buttons
    document.querySelectorAll(".commentToggleBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const postId  = btn.dataset.postId;
            const section = document.getElementById(`comments-${postId}`);
            if (!section) return;
            const isOpen = section.style.display !== "none";
            section.style.display = isOpen ? "none" : "block";
            if (!isOpen) await loadComments(postId);
        });
    });

    // Submit comment buttons
    document.querySelectorAll(".submitCommentBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentUserId) { alert("Please log in to comment."); return; }

            const postId = btn.dataset.postId;
            const input  = document.getElementById(`commentInput-${postId}`);
            const text   = input ? input.value.trim() : "";
            if (!text) return;

            btn.disabled = true;
            btn.textContent = "Posting...";
            try {
                await addComment(postId, { authorId: currentUserId, authorName: currentUserName, text });
                input.value = "";
                await loadComments(postId);
            } catch (err) {
                console.error("Comment failed:", err);
                alert("Failed to post comment.");
            } finally {
                btn.disabled = false;
                btn.textContent = "Post";
            }
        });
    });

    // Report buttons
    document.querySelectorAll(".reportBtn").forEach(btn => {
        btn.addEventListener("click", (e) => e.stopPropagation());
    });

    // Enter key to submit comment
    document.querySelectorAll(".commentInput").forEach(input => {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const postId = input.id.replace("commentInput-", "");
                document.querySelector(`.submitCommentBtn[data-post-id="${postId}"]`)?.click();
            }
        });
        input.addEventListener("click", (e) => e.stopPropagation());
    });
}

/* LOAD COMMENTS — mirrors feed.js loadComments() */
async function loadComments(postId) {
    const list = document.getElementById(`commentsList-${postId}`);
    if (!list) return;

    try {
        const comments = await getComments(postId, { pageSize: 50 });

        const card = document.querySelector(`.content[data-post-id="${postId}"]`);
        if (card) {
            const toggleBtn = card.querySelector(".commentToggleBtn");
            if (toggleBtn) {
                toggleBtn.textContent = `${comments.length} Comment${comments.length !== 1 ? "s" : ""}`;
            }
        }

        if (!comments.length) {
            list.innerHTML = `<p style="color:#aaa;text-align:center;font-size:13px;margin:4px 0;">No comments yet. Be the first!</p>`;
            return;
        }

        list.innerHTML = comments.map(c => {
            const isOwner = currentUserId && c.authorId === currentUserId;
            const ownerActions = isOwner ? `
                <div style="display:flex;gap:8px;margin-top:4px;">
                    <button class="editCommentBtn themeObject"
                        data-post-id="${postId}" data-comment-id="${c.id}"
                        style="font-size:12px;padding:2px 10px;border-radius:12px;cursor:pointer;">Edit</button>
                    <button class="deleteCommentBtn"
                        data-post-id="${postId}" data-comment-id="${c.id}"
                        style="font-size:12px;padding:2px 10px;border-radius:12px;cursor:pointer;background:none;border:1px solid #e55;color:#e55;">Delete</button>
                </div>` : "";

            return `
                <div id="comment-${c.id}" style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;padding:5px;">
                    <img src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG"
                         style="width:28px;height:28px;border-radius:4px;flex-shrink:0;">
                    <div style="flex:1;">
                        <span style="font-size:13px;font-weight:600;color:var(--text-fill);">${escapeHtml(c.authorName || "Anonymous")}</span>
                        <p class="commentText-${c.id}" style="font-size:14px;color:var(--text-fill);margin:2px 0 0;">${escapeHtml(c.text)}</p>
                        ${ownerActions}
                    </div>
                </div>`;
        }).join("");

        // Delete
        list.querySelectorAll(".deleteCommentBtn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!confirm("Delete this comment?")) return;
                try {
                    await deleteComment(btn.dataset.postId, btn.dataset.commentId);
                    await loadComments(postId);
                } catch (err) {
                    console.error("Delete failed:", err);
                    alert("Failed to delete comment.");
                }
            });
        });

        // Edit
        list.querySelectorAll(".editCommentBtn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const { postId, commentId } = btn.dataset;
                const textEl = list.querySelector(`.commentText-${commentId}`);
                if (!textEl) return;

                const originalText = textEl.textContent.trim();
                textEl.style.display = "none";
                btn.style.display = "none";

                const editRow = document.createElement("div");
                editRow.style = "display:flex;gap:6px;margin-top:4px;align-items:center;";
                editRow.innerHTML = `
                    <input type="text" value="${escapeAttr(originalText)}" maxlength="300"
                        style="flex:1;padding:5px 10px;border-radius:14px;border:1px solid #444;background:#222;color:#fff;font-size:13px;">
                    <button style="font-size:12px;padding:3px 10px;border-radius:12px;cursor:pointer;background:#0f73ff;border:none;color:#fff;">Save</button>
                    <button style="font-size:12px;padding:3px 10px;border-radius:12px;cursor:pointer;background:none;border:1px solid #666;color:#aaa;">Cancel</button>`;

                const editInput = editRow.querySelector("input");
                const [saveBtn, cancelBtn] = editRow.querySelectorAll("button");
                textEl.parentNode.insertBefore(editRow, textEl.nextSibling);
                editInput.focus();

                cancelBtn.addEventListener("click", () => {
                    editRow.remove();
                    textEl.style.display = "";
                    btn.style.display = "";
                });

                saveBtn.addEventListener("click", async () => {
                    const newText = editInput.value.trim();
                    if (!newText) return;
                    saveBtn.disabled = true;
                    saveBtn.textContent = "Saving...";
                    try {
                        await editComment(postId, commentId, newText);
                        await loadComments(postId);
                    } catch (err) {
                        console.error("Edit failed:", err);
                        saveBtn.disabled = false;
                        saveBtn.textContent = "Save";
                    }
                });

                editInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") saveBtn.click();
                    if (e.key === "Escape") cancelBtn.click();
                });
            });
        });

    } catch (err) {
        console.error("Failed to load comments:", err);
        list.innerHTML = `<p style="color:#e55;font-size:13px;">Failed to load comments.</p>`;
    }
}

/* RENDER LATEST LISTINGS */
function renderLatestListings(listings) {
    if (!latestListingsEl) return;
    if (!listings.length) {
        latestListingsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No listings yet.</p>";
        return;
    }
    latestListingsEl.innerHTML = listings.map(item => `
        <div class="listingCard" onclick="window.location.href='listingDetail.html?id=${item.id}'">
            ${item.imageURL
                ? `<img class="listingThumb" src="${item.imageURL}">`
                : `<img class="listingThumb" src="styles/images/placeholder/textbooks.png">`}
            <h3 class="listingTitle">${item.title || item.name || ""}</h3>
            <p class="listingPrice">$${item.price || ""}</p>
            <p class="listingUser">@${item.username || "user"}</p>
        </div>
    `).join("");
}

/* RENDER NEWS & EVENTS */
function renderSideSections(news, events) {
    const newsEl = document.getElementById("latestNewsSection");
    if (newsEl) {
        newsEl.innerHTML = "";
        if (!news.length) {
            newsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No recent news.</p>";
        } else {
            news.forEach(item => {
                const div = document.createElement("div");
                div.className = "feedItem";
                div.innerHTML = `
                    <div class="feedHeader">
                        <span class="feedUser">${item.authorName || "Staff"}</span>
                        <span class="feedType">News</span>
                    </div>
                    <div class="feedContent"><strong>${item.title || ""}</strong></div>
                    <div class="feedMeta">${formatTime(item.timestamp)}</div>`;
                div.onclick = () => window.location.href = `newsDetails.html?id=${item.id}`;
                newsEl.appendChild(div);
            });
        }
    }

    const eventsEl = document.getElementById("latestEventsSection");
    if (eventsEl) {
        eventsEl.innerHTML = "";
        if (!events.length) {
            eventsEl.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No upcoming events.</p>";
        } else {
            events.forEach(item => {
                const div = document.createElement("div");
                div.className = "feedItem";
                div.innerHTML = `
                    <div class="feedHeader">
                        <span class="feedUser">${item.orgName || "Event"}</span>
                        <span class="feedType">Event</span>
                    </div>
                    <div class="feedContent">
                        <strong>${item.title || item.name || ""}</strong>
                        <p style="font-size:12px;opacity:0.7;">${item.date || ""} ${item.location ? "· " + item.location : ""}</p>
                    </div>`;
                div.onclick = () => window.location.href = `eventDetail.html?id=${item.id}`;
                eventsEl.appendChild(div);
            });
        }
    }
}

/* HELPERS */
function formatTime(timestamp) {
    if (!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* FILTER DROPDOWN */
filter?.addEventListener("change", () => {
    activeFilter = filter.value;
    renderFeed(getFilteredItems());
});

/* SEARCH BAR */
searchBar?.addEventListener("input", () => {
    searchQuery = searchBar.value.toLowerCase().trim();
    renderFeed(getFilteredItems());
});

/* NAV CARDS */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("orgCard")?.addEventListener("click",   () => window.location.href = "organizations.html");
    document.getElementById("eventCard")?.addEventListener("click", () => window.location.href = "events.html");
    document.getElementById("newsCard")?.addEventListener("click",  () => window.location.href = "news.html");
});

/* INIT */
loadExplore();
loadPeopleToFollow();


/* PEOPLE TO FOLLOW */

async function loadPeopleToFollow() {
    const container = document.getElementById("peopleToFollowSection");
    if (!container) return;

    container.innerHTML = "<p style='opacity:0.6;font-size:13px;'>Loading...</p>";

    try {
        // Fetch users, posts count, listings count in parallel
        const [usersSnap, postsSnap, listingsSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "posts")),
            getDocs(collection(db, "listings"))
        ]);

        // Count posts per user
        const postCounts    = {};
        const listingCounts = {};

        postsSnap.forEach(d => {
            const uid = d.data().authorId;
            if (uid) postCounts[uid] = (postCounts[uid] || 0) + 1;
        });

        listingsSnap.forEach(d => {
            const uid = d.data().authorId || d.data().userId;
            if (uid) listingCounts[uid] = (listingCounts[uid] || 0) + 1;
        });

        // Build user list with activity score, exclude self
        let users = [];
        usersSnap.forEach(d => {
            if (d.id === currentUserId) return; // skip self
            const data  = d.data();
            const score = (postCounts[d.id] || 0) + (listingCounts[d.id] || 0);
            users.push({ uid: d.id, score, ...data });
        });

        // Sort by most active, take top 10
        users = users.sort((a, b) => b.score - a.score).slice(0, 10);

        if (!users.length) {
            container.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No users found.</p>";
            return;
        }

        // Load current user's following list
        let following = [];
        if (currentUserId) {
            try {
                const snap = await getDoc(doc(db, "users", currentUserId));
                following  = snap.exists() ? (snap.data().following || []) : [];
            } catch { /* ignore */ }
        }

        container.innerHTML = "";
        users.forEach(user => {
            const isFollowing = following.includes(user.uid);
            const card = document.createElement("div");
            card.className = "peopleCard";
            card.innerHTML = `
                <a href="profile.html?id=${user.uid}" class="peopleCardLink" onclick="event.stopPropagation()">
                    <img class="peopleAvatar" src="${user.photoURL || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG"}">
                    <div class="peopleInfo">
                        <span class="peopleName">${user.displayName || "User"}</span>
                        <span class="peopleUsername">@${user.username || ""}</span>
                        <span class="peopleActivity">${user.score} post${user.score !== 1 ? "s" : ""}</span>
                    </div>
                </a>
                <button
                    class="followBtn themeObject"
                    data-uid="${user.uid}"
                    data-following="${isFollowing}"
                    style="${isFollowing ? "background:var(--button-hover);" : ""}">
                    ${isFollowing ? "Following" : "Follow"}
                </button>
            `;
            container.appendChild(card);
        });

        attachFollowListeners();

    } catch (err) {
        console.error("Failed to load people:", err);
        container.innerHTML = "<p style='opacity:0.5;font-size:13px;'>Failed to load users.</p>";
    }
}

function attachFollowListeners() {
    document.querySelectorAll(".followBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!currentUserId) { alert("Please log in to follow users."); return; }

            const targetUid  = btn.dataset.uid;
            const isFollowing = btn.dataset.following === "true";

            btn.disabled = true;
            btn.textContent = "...";

            try {
                const userRef = doc(db, "users", currentUserId);
                const snap    = await getDoc(userRef);
                let following = snap.exists() ? (snap.data().following || []) : [];

                if (isFollowing) {
                    following = following.filter(uid => uid !== targetUid);
                } else {
                    if (!following.includes(targetUid)) following.push(targetUid);
                }

                const { updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                await updateDoc(userRef, { following });

                btn.dataset.following = String(!isFollowing);
                btn.textContent       = !isFollowing ? "Following" : "Follow";
                btn.style.background  = !isFollowing ? "var(--button-hover)" : "";
            } catch (err) {
                console.error("Follow failed:", err);
                btn.textContent = isFollowing ? "Following" : "Follow";
            } finally {
                btn.disabled = false;
            }
        });
    });
}

/* =========================
   PEOPLE TO FOLLOW
   Fetches all users from Firestore, excludes the
   current user, shuffles, shows up to 10.
   Clicking a card navigates to their profile.
   ========================= */
async function loadPeopleToFollow() {
    const el = document.getElementById("peopleToFollowSection");
    if (!el) return;

    el.innerHTML = "<p style='opacity:0.6;font-size:13px;padding:4px 0;'>Loading...</p>";

    try {
        const snap = await getDocs(collection(db, "users"));

        let users = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.id !== currentUserId); // exclude self

        // Shuffle
        for (let i = users.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [users[i], users[j]] = [users[j], users[i]];
        }

        // Show up to 10
        users = users.slice(0, 10);

        if (!users.length) {
            el.innerHTML = "<p style='opacity:0.5;font-size:13px;'>No users found.</p>";
            return;
        }

        el.innerHTML = "";

        const grid = document.createElement("div");
        grid.className = "peopleGrid";
        el.appendChild(grid);

        users.forEach(user => {
            const displayName = user.displayName || user.username || "Student";
            const username    = user.username ? `@${user.username}` : "";
            const photo       = user.photoURL  || "styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG";
            const college     = user.college   || user.school || "";

            const card = document.createElement("div");
            card.className = "personCard";
            card.title = `View ${displayName}'s profile`;
            card.innerHTML = `
                <img class="personAvatar" src="${photo}"
                     onerror="this.src='styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG'">
                <div class="personInfo">
                    <span class="personName">${escapeHtml(displayName)}</span>
                    ${username ? `<span class="personUsername">${escapeHtml(username)}</span>` : ""}
                    ${college  ? `<span class="personCollege">${escapeHtml(college)}</span>`  : ""}
                </div>
            `;
            card.addEventListener("click", () => {
                window.location.href = `profile.html?id=${user.id}`;
            });
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Failed to load people:", err);
        el.innerHTML = "<p style='opacity:0.5;font-size:13px;'>Failed to load users.</p>";
    }
}