import { db } from "./firebaseInitialization.js";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function createDropdown(input) {
    const existing = document.getElementById('searchDropdown');
    if (existing) existing.remove();

    const dropdown = document.createElement('div');
    dropdown.id = 'searchDropdown';

    const rect = input.getBoundingClientRect();
    dropdown.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 6}px;
        left: ${rect.left}px;
        width: ${Math.max(rect.width, 280)}px;
        background: #1e2a38;
        border: 1px solid #444;
        border-radius: 10px;
        z-index: 999;
        max-height: 420px;
        overflow-y: auto;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(dropdown);
    return dropdown;
}

function closeDropdown() {
    const existing = document.getElementById('searchDropdown');
    if (existing) existing.remove();
}

function sectionHeader(label) {
    const el = document.createElement('div');
    el.style.cssText = `
        padding: 6px 14px 4px;
        font-size: 11px;
        font-weight: bold;
        color: #586373;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border-top: 1px solid #333;
        margin-top: 4px;
    `;
    el.textContent = label;
    return el;
}

function resultItem(icon, title, subtitle, onClick) {
    const item = document.createElement('div');
    item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 14px;
        cursor: pointer;
        transition: background 0.1s;
    `;
    item.innerHTML = `
        <div style="width:32px; height:32px; border-radius:50%; background:#2a3b4f; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:14px;">
            ${icon}
        </div>
        <div style="flex:1; min-width:0;">
            <p style="margin:0; font-size:13px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(title)}
            </p>
            <p style="margin:0; font-size:11px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(subtitle)}
            </p>
        </div>
    `;
    item.addEventListener('mouseenter', () => item.style.background = '#2a3b4f');
    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
    item.addEventListener('click', onClick);
    return item;
}

function noResults(dropdown, value) {
    dropdown.innerHTML = `<p style="color:#aaa; font-size:13px; padding:14px 16px; margin:0; text-align:center;">No results found for "<strong>${escapeHtml(value)}</strong>"</p>`;
}

async function runSearch(input, value) {
    const dropdown = createDropdown(input);
    dropdown.innerHTML = `<p style="color:#aaa; font-size:13px; padding:12px 16px; margin:0;">Searching...</p>`;

    const lower = value.toLowerCase();
    const upper = lower + "\uf8ff";

    try {
        // Run all searches in parallel
        const [
            usernameSnap,
            nameSnap,
            postsSnap,
            listingsSnap,
            commentsSnap
        ] = await Promise.all([
            // Users by username
            getDocs(query(
                collection(db, "users"),
                where("username", ">=", lower),
                where("username", "<=", upper)
            )),
            // Users by display name
            getDocs(query(
                collection(db, "users"),
                where("name", ">=", value),
                where("name", "<=", value + "\uf8ff")
            )),
            // Posts by body
            getDocs(query(
                collection(db, "posts"),
                where("body", ">=", value),
                where("body", "<=", value + "\uf8ff")
            )),
            // Listings by title
            getDocs(query(
                collection(db, "listings"),
                where("title", ">=", value),
                where("title", "<=", value + "\uf8ff")
            )),
            // Comments by text
            getDocs(query(
                collectionGroup(db, "comments"),
                where("text", ">=", value),
                where("text", "<=", value + "\uf8ff")
            ))
        ]);

        // Deduplicate users
        const seen = new Set();
        const users = [];
        [...usernameSnap.docs, ...nameSnap.docs].forEach(d => {
            if (!seen.has(d.id)) {
                seen.add(d.id);
                users.push({ id: d.id, ...d.data() });
            }
        });

        const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const listings = listingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const comments = commentsSnap.docs.map(d => ({
            id: d.id,
            postId: d.ref.parent.parent.id,
            ...d.data()
        }));

        const totalResults = users.length + posts.length + listings.length + comments.length;

        if (totalResults === 0) {
            noResults(dropdown, value);
            return;
        }

        dropdown.innerHTML = '';

        // ── Users ──
        if (users.length > 0) {
            dropdown.appendChild(sectionHeader(`People (${users.length})`));
            users.slice(0, 5).forEach(user => {
                dropdown.appendChild(resultItem(
                    '👤',
                    user.name || user.displayName || 'Unknown',
                    `@${user.username || ''}`,
                    () => { window.location.href = `profile.html?id=${user.id}`; }
                ));
            });
        }

        // ── Posts ──
        if (posts.length > 0) {
            dropdown.appendChild(sectionHeader(`Posts (${posts.length})`));
            posts.slice(0, 5).forEach(post => {
                dropdown.appendChild(resultItem(
                    '📝',
                    post.body?.substring(0, 60) || 'Post',
                    `by @${post.authorUsername || 'unknown'} · ${post.likes || 0} likes`,
                    () => { window.location.href = `post.php?id=${post.id}`; }
                ));
            });
        }

        // ── Listings ──
        if (listings.length > 0) {
            dropdown.appendChild(sectionHeader(`Listings (${listings.length})`));
            listings.slice(0, 5).forEach(listing => {
                dropdown.appendChild(resultItem(
                    '🏷️',
                    listing.title || 'Listing',
                    `$${listing.price || 'N/A'} · ${listing.condition || ''}`,
                    () => { window.location.href = `listingDetail.html?id=${listing.id}`; }
                ));
            });
        }

        // ── Comments ──
        if (comments.length > 0) {
            dropdown.appendChild(sectionHeader(`Comments (${comments.length})`));
            comments.slice(0, 5).forEach(comment => {
                dropdown.appendChild(resultItem(
                    '💬',
                    comment.text?.substring(0, 60) || 'Comment',
                    `by @${comment.authorName || 'unknown'}`,
                    () => { window.location.href = `post.php?id=${comment.postId}`; }
                ));
            });
        }

    } catch (err) {
        console.error("Search failed:", err);
        dropdown.innerHTML = `<p style="color:#e55; font-size:13px; padding:12px 16px; margin:0;">Search failed. Try again.</p>`;
    }
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Attach to all search bars
const searchInputs = document.querySelectorAll(".searchBar");

searchInputs.forEach(input => {
    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const value = input.value.trim();
        if (!value) { closeDropdown(); return; }
        debounceTimer = setTimeout(() => runSearch(input, value), 350);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            const value = input.value.trim();
            if (value) runSearch(input, value);
        }
        if (e.key === 'Escape') closeDropdown();
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('searchBar') && !e.target.closest('#searchDropdown')) {
        closeDropdown();
    }
});