// public/js/userSearch.js
import { db } from "./firebaseInitialization.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Create dropdown element
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
        width: ${rect.width}px;
        background: #1e2a38;
        border: 1px solid #444;
        border-radius: 10px;
        z-index: 999;
        max-height: 320px;
        overflow-y: auto;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(dropdown);
    return dropdown;
}

function closeDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) dropdown.remove();
}

function renderResults(dropdown, results, query) {
    dropdown.innerHTML = '';

    if (results.length === 0) {
        dropdown.innerHTML = `<p style="color:#aaa; font-size:13px; padding:12px 16px; margin:0;">No users found for "${query}"</p>`;
        return;
    }

    results.forEach(user => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            cursor: pointer;
            border-bottom: 1px solid #333;
            transition: background 0.1s;
        `;
        item.innerHTML = `
            <img src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG"
                 style="width:36px; height:36px; border-radius:50%; flex-shrink:0;">
            <div>
                <p style="margin:0; font-size:14px; font-weight:600; color:#fff;">
                    ${escapeHtml(user.name || user.displayName || 'Unknown')}
                </p>
                <p style="margin:0; font-size:12px; color:#aaa;">
                    @${escapeHtml(user.username || '')}
                </p>
            </div>
        `;

        item.addEventListener('mouseenter', () => item.style.background = '#2a3b4f');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', () => {
            window.location.href = `profile.html?id=${user.id}`;
        });

        dropdown.appendChild(item);
    });
}

async function runSearch(input, value) {
    const dropdown = createDropdown(input);
    dropdown.innerHTML = `<p style="color:#aaa; font-size:13px; padding:12px 16px; margin:0;">Searching...</p>`;

    try {
        const lower = value.toLowerCase();

        const usernameQuery = query(
            collection(db, "users"),
            where("username", ">=", lower),
            where("username", "<=", lower + "\uf8ff")
        );

        const nameQuery = query(
            collection(db, "users"),
            where("name", ">=", value),
            where("name", "<=", value + "\uf8ff")
        );

        const [usernameSnap, nameSnap] = await Promise.all([
            getDocs(usernameQuery),
            getDocs(nameQuery)
        ]);

        // Deduplicate by user id
        const seen = new Set();
        const results = [];

        usernameSnap.forEach(doc => {
            if (!seen.has(doc.id)) {
                seen.add(doc.id);
                results.push({ id: doc.id, ...doc.data() });
            }
        });
        nameSnap.forEach(doc => {
            if (!seen.has(doc.id)) {
                seen.add(doc.id);
                results.push({ id: doc.id, ...doc.data() });
            }
        });

        renderResults(dropdown, results, value);

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

    // Search as you type (debounced)
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const value = input.value.trim();

        if (!value) {
            closeDropdown();
            return;
        }

        debounceTimer = setTimeout(() => {
            runSearch(input, value);
        }, 300);
    });

    // Also search on Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            const value = input.value.trim();
            if (value) runSearch(input, value);
        }
        if (e.key === 'Escape') closeDropdown();
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('searchBar') && !e.target.closest('#searchDropdown')) {
        closeDropdown();
    }
});