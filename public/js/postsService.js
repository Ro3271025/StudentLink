// public/js/postsService.js
import { db } from "./firebaseInitialization.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Create a new post in /posts.
 * @param {Object} params
 * @param {string} params.authorId
 * @param {string} params.authorName
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} [params.category]
 * @param {string} [params.campus]
 * @param {string} [params.status] - open/solved/locked
 * @param {string[]} [params.tags]
 * @returns {Promise<string>} created postId
 */
export async function createPost(params) {
  const {
    authorId,
    authorName,
    title,
    body,
    category = "General",
    campus = "Farmingdale",
    status = "open",
    tags = []
  } = params || {};

  if (!authorId) throw new Error("createPost: authorId is required");
  if (!title || !title.trim()) throw new Error("createPost: title is required");
  if (!body || !body.trim()) throw new Error("createPost: body is required");

  const postsRef = collection(db, "posts");

  const newDoc = await addDoc(postsRef, {
    authorId,
    authorName: authorName || "",
    title: title.trim(),
    body: body.trim(),
    category,
    campus,
    status,
    tags,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return newDoc.id;
}

/**
 * Fetch a single post by ID.
 * @param {string} postId
 * @returns {Promise<Object|null>} { id, ...data } or null
 */
export async function getPostById(postId) {
  if (!postId) throw new Error("getPostById: postId is required");

  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
}

/**
 * Fetch recent posts sorted by createdAt desc.
 * @param {Object} [options]
 * @param {number} [options.pageSize=20]
 * @returns {Promise<Object[]>} array of { id, ...data }
 */
export async function getRecentPosts(options = {}) {
  const pageSize = Number(options.pageSize || 20);

  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch posts by category (optional helper).
 * @param {string} category
 * @param {number} [pageSize=20]
 */
export async function getPostsByCategory(category, pageSize = 20) {
  if (!category) throw new Error("getPostsByCategory: category is required");

  const q = query(
    collection(db, "posts"),
    where("category", "==", category),
    orderBy("createdAt", "desc"),
    limit(Number(pageSize))
  );

  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Increment or decrement the commentCount on a post.
 * (Used by commentsService after adding a comment.)
 */
export async function bumpCommentCount(postId, delta = 1) {
  if (!postId) throw new Error("bumpCommentCount: postId is required");
  const ref = doc(db, "posts", postId);
  await updateDoc(ref, {
    commentCount: increment(delta),
    updatedAt: serverTimestamp()
  });
}