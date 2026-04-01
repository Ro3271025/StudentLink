import { db } from "./firebaseInitialization.js";
import {
    collection,
    query,
    where,
    getDocs,
    collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const RECENT_SEARCHES_KEY = "studentlink_recent_searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches() {
    try {
        const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn("Failed to read recent searches:", err);
        return [];
    }
}

function saveRecentSearch(term) {
    const normalized = String(term || "").trim();
    if (!normalized) return;

    const recent = getRecentSearches()
        .filter(item => String(item).trim().toLowerCase() !== normalized.toLowerCase());

    recent.unshift(normalized);
    const next = recent.slice(0, MAX_RECENT_SEARCHES);

    try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch (err) {
        console.warn("Failed to save recent search:", err);
    }
}

function renderRecentSearches(input) {
    const container = document.getElementById("recentSearches");
    if (!container) return;

    const table = container.querySelector(".recentSearchesTable");
    if (!table) return;

    table.querySelectorAll(".recentSearchData").forEach(row => row.parentElement?.remove());

    const recent = getRecentSearches();
    if (recent.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("th");
        cell.className = "recentSearchData";
        cell.textContent = "No recent searches";
        row.appendChild(cell);
        table.appendChild(row);
        return;
    }

    recent.forEach(term => {
        const row = document.createElement("tr");
        const cell = document.createElement("th");
        cell.className = "recentSearchData";

        const link = document.createElement("a");
        link.className = "tableAnchorLink";
        link.href = "#";
        link.textContent = term;
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            input.value = term;
            await runSearch(input, term, true);
            input.focus();
        });

        cell.appendChild(link);
        row.appendChild(cell);
        table.appendChild(row);
    });
}

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

function resultItem(icon, title, subtitle, onClick, searchInput, searchTerm) {
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
    item.addEventListener('click', () => {
        if (searchTerm) {
            saveRecentSearch(searchTerm);
            renderRecentSearches(searchInput);
        }
        onClick();
    });
    return item;
}

function noResults(dropdown, value) {
    dropdown.innerHTML = `<p style="color:#aaa; font-size:13px; padding:14px 16px; margin:0; text-align:center;">No results found for "<strong>${escapeHtml(value)}</strong>"</p>`;
}

async function runSearch(input, value, persistRecent = false) {
    const dropdown = createDropdown(input);
    dropdown.innerHTML = `<p style="color:#aaa; font-size:13px; padding:12px 16px; margin:0;">Searching...</p>`;

    const raw = value.trim();
    if (persistRecent) {
        saveRecentSearch(raw);
        renderRecentSearches(input);
    }
    const lower = raw.toLowerCase();
    const upperRaw = raw + "\uf8ff";
    const upperLower = lower + "\uf8ff";

    try {
        // Query buckets are isolated so one failed index/rule does not kill the whole search.
        const searchTasks = {
            username: getDocs(query(
                collection(db, "users"),
                where("username", ">=", lower),
                where("username", "<=", upperLower)
            )),
            displayName: getDocs(query(
                collection(db, "users"),
                where("displayName", ">=", raw),
                where("displayName", "<=", upperRaw)
            )),
            name: getDocs(query(
                collection(db, "users"),
                where("name", ">=", raw),
                where("name", "<=", upperRaw)
            )),
            postBody: getDocs(query(
                collection(db, "posts"),
                where("body", ">=", raw),
                where("body", "<=", upperRaw)
            )),
            postTitle: getDocs(query(
                collection(db, "posts"),
                where("title", ">=", raw),
                where("title", "<=", upperRaw)
            )),
            listingTitle: getDocs(query(
                collection(db, "listings"),
                where("title", ">=", raw),
                where("title", "<=", upperRaw)
            )),
            listingDescription: getDocs(query(
                collection(db, "listings"),
                where("description", ">=", raw),
                where("description", "<=", upperRaw)
            )),
            comments: getDocs(query(
                collectionGroup(db, "comments"),
                where("text", ">=", raw),
                where("text", "<=", upperRaw)
            ))
        };

        const taskEntries = Object.entries(searchTasks);
        const settled = await Promise.allSettled(taskEntries.map(([, task]) => task));
        const results = {};

        taskEntries.forEach(([key], index) => {
            const outcome = settled[index];
            if (outcome.status === "fulfilled") {
                results[key] = outcome.value;
                return;
            }
            results[key] = null;
            console.warn(`Search query failed (${key}):`, outcome.reason);
        });

        // Deduplicate users
        const seen = new Set();
        const users = [];
        const userSnaps = [results.username, results.displayName, results.name].filter(Boolean);

        userSnaps.flatMap(snap => snap.docs).forEach(d => {
            const userKey = `user:${d.id}`;
            if (!seen.has(userKey)) {
                seen.add(userKey);
                users.push({ id: d.id, ...d.data() });
            }
        });

        const seenPosts = new Set();
        const posts = [];
        [results.postBody, results.postTitle]
            .filter(Boolean)
            .flatMap(snap => snap.docs)
            .forEach(d => {
                const postKey = `post:${d.id}`;
                if (seenPosts.has(postKey)) return;
                seenPosts.add(postKey);
                posts.push({ id: d.id, ...d.data() });
            });

        const seenListings = new Set();
        const listings = [];
        [results.listingTitle, results.listingDescription]
            .filter(Boolean)
            .flatMap(snap => snap.docs)
            .forEach(d => {
                const listingKey = `listing:${d.id}`;
                if (seenListings.has(listingKey)) return;
                seenListings.add(listingKey);
                listings.push({ id: d.id, ...d.data() });
            });

        const comments = (results.comments?.docs || []).map(d => ({
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
                const label = user.name || user.displayName || 'Unknown';
                dropdown.appendChild(resultItem(
                    '👤',
                    label,
                    `@${user.username || ''}`,
                    () => { window.location.href = `profile.html?id=${user.id}`; },
                    input, label
                ));
            });
        }

        // ── Posts ──
        if (posts.length > 0) {
            dropdown.appendChild(sectionHeader(`Posts (${posts.length})`));
            posts.slice(0, 5).forEach(post => {
                const label = post.body?.substring(0, 60) || 'Post';
                dropdown.appendChild(resultItem(
                    '📝',
                    label,
                    `by @${post.authorUsername || 'unknown'} · ${post.likes || 0} likes`,
                    () => { window.location.href = `post.php?id=${post.id}`; },
                    input, label
                ));
            });
        }

        // ── Listings ──
        if (listings.length > 0) {
            dropdown.appendChild(sectionHeader(`Listings (${listings.length})`));
            listings.slice(0, 5).forEach(listing => {
                const label = listing.title || 'Listing';
                dropdown.appendChild(resultItem(
                    '🏷️',
                    label,
                    `$${listing.price || 'N/A'} · ${listing.condition || ''}`,
                    () => { window.location.href = `listingDetail.html?id=${listing.id}`; },
                    input, label
                ));
            });
        }

        // ── Comments ──
        if (comments.length > 0) {
            dropdown.appendChild(sectionHeader(`Comments (${comments.length})`));
            comments.slice(0, 5).forEach(comment => {
                const label = comment.text?.substring(0, 60) || 'Comment';
                dropdown.appendChild(resultItem(
                    '💬',
                    label,
                    `by @${comment.authorName || 'unknown'}`,
                    () => { window.location.href = `post.php?id=${comment.postId}`; },
                    input, label
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

// Attach only to global sidebar search bars.
const searchInputs = document.querySelectorAll(".searchBar.themeObject");

searchInputs.forEach(input => {
    let debounceTimer;

    renderRecentSearches(input);

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const value = input.value.trim();
        if (!value) { closeDropdown(); return; }
        debounceTimer = setTimeout(() => runSearch(input, value), 350);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            const value = input.value.trim();
            if (value) runSearch(input, value, true);
        }
        if (e.key === 'Escape') closeDropdown();
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('searchBar') && !e.target.closest('#searchDropdown')) {
        closeDropdown();
    }
});