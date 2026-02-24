// public/js/commentsService.js
import { db } from "./firebaseInitialization.js";
import { bumpCommentCount } from "./postsService.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Add a comment under /posts/{postId}/comments
 * @param {string} postId
 * @param {Object} params
 * @param {string} params.authorId
 * @param {string} params.authorName
 * @param {string} params.text
 * @returns {Promise<string>} commentId
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

  // keep a count on the post for faster feed rendering
  await bumpCommentCount(postId, 1);

  return newDoc.id;
}

/**
 * Get recent comments for a post.
 * @param {string} postId
 * @param {Object} [options]
 * @param {number} [options.pageSize=50]
 * @returns {Promise<Object[]>} array of { id, ...data }
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