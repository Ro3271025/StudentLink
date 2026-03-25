// public/js/commentsService.js
import { db } from "./firebaseInitialization.js";
import { bumpCommentCount } from "./postsService.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Add a comment under /posts/{postId}/comments
 */
export async function addComment(postId, params) {
  if (!postId) throw new Error("addComment: postId is required");

  const { authorId, authorName, text } = params || {};

  if (!authorId) throw new Error("addComment: authorId is required");
  if (!text || !text.trim()) throw new Error("addComment: text is required");

  const commentsRef = collection(db, "posts", postId, "comments");

  const newDoc = await addDoc(commentsRef, {
    authorId,
    authorName: authorName || "",
    text: text.trim(),
    createdAt: serverTimestamp()
  });

  await bumpCommentCount(postId, 1);

  return newDoc.id;
}

/**
 * Get recent comments for a post.
 */
export async function getComments(postId, options = {}) {
  if (!postId) throw new Error("getComments: postId is required");

  const pageSize = Number(options.pageSize || 50);

  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc"),
    limit(pageSize)
  );

  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Delete a comment — only the author should call this.
 * Also decrements the post's commentCount.
 */
export async function deleteComment(postId, commentId) {
  if (!postId) throw new Error("deleteComment: postId is required");
  if (!commentId) throw new Error("deleteComment: commentId is required");

  const ref = doc(db, "posts", postId, "comments", commentId);
  await deleteDoc(ref);

  await bumpCommentCount(postId, -1);
}

/**
 * Edit a comment's text — only the author should call this.
 */
export async function editComment(postId, commentId, newText) {
  if (!postId) throw new Error("editComment: postId is required");
  if (!commentId) throw new Error("editComment: commentId is required");
  if (!newText || !newText.trim()) throw new Error("editComment: newText is required");

  const ref = doc(db, "posts", postId, "comments", commentId);
  await updateDoc(ref, {
    text: newText.trim(),
    editedAt: serverTimestamp()
  });
}