// public/js/notificationsService.js
import { db } from "./firebaseInitialization.js";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Create a notification.
 * Skips if the actor is the same as the recipient (no self-notifications).
 */
export async function createNotification({
    toUserId,
    fromUserId,
    fromUserName,
    type,
    postId = null,
    postBody = null,
    commentText = null
}) {
    if (!toUserId || !fromUserId) return;
    if (toUserId === fromUserId) return;
    await addDoc(collection(db, "notifications"), {
        toUserId,
        fromUserId,
        fromUserName: fromUserName || "Someone",
        type,
        postId: postId || null,
        postBody: postBody ? postBody.substring(0, 80) : null,
        commentText: commentText ? commentText.substring(0, 80) : null,
        read: false,
        createdAt: serverTimestamp()
    });
}

/**
 * Get all notifications for a user, newest first.
 */
export async function getNotifications(userId) {
    if (!userId) return [];
    const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", userId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId) {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId) {
    const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", userId),
        where("read", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
}

/**
 * Get unread notification count for a user (one-time fetch).
 */
export async function getUnreadCount(userId) {
    if (!userId) return 0;
    const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", userId),
        where("read", "==", false)
    );
    const snap = await getDocs(q);
    return snap.size;
}

/**
 * Listen to unread notification count in real time.
 * Calls callback(count) whenever it changes.
 * Returns the unsubscribe function.
 */
export function listenUnreadCount(userId, callback) {
    if (!userId) return () => {};
    const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", userId),
        where("read", "==", false)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.size);
    });
}