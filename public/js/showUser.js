/* Generic Script to display the current user on the left sidebar */
import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { listenUnreadCount } from "./NotificationsService.js";

export function setupSidebar() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "../public/userlogin.html";
            return;
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const data = userSnap.data() || {};

        const displayEl = document.getElementById("displayName");
        const usernameEl = document.getElementById("username");

        if (displayEl) {
            displayEl.innerText = data.displayName || user.displayName || "";
        }
        if (usernameEl) {
            usernameEl.innerText = data.username ? "@" + data.username : "";
        }

        const sideProfileIcon = document.querySelector('.sideProfileIcon');
        if (sideProfileIcon && data.photoURL) {
            sideProfileIcon.src = data.photoURL;
        }

        // Find the Notifications link in the sidebar and add a badge
        const notifLink = [...document.querySelectorAll('.sidebarText a')]
            .find(a => a.href.includes('notifications.html'));

        if (notifLink) {
            // Wrap text in a span if not already done
            notifLink.style.display = 'flex';
            notifLink.style.alignItems = 'center';
            notifLink.style.gap = '6px';

            // Create badge element
            const badge = document.createElement('span');
            badge.id = 'notifBadge';
            badge.style.cssText = `
                background: #e55;
                color: #fff;
                font-size: 11px;
                font-weight: 700;
                border-radius: 50%;
                min-width: 18px;
                height: 18px;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                line-height: 18px;
            `;
            notifLink.appendChild(badge);

            // Listen for real-time unread count updates
            listenUnreadCount(user.uid, (count) => {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            });
        }
    });
}