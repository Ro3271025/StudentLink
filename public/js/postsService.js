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
 * Supports both support posts and marketplace listings via `type`.
 *
 * @param {Object} params
 * @param {string} params.authorId
 * @param {string} params.authorName
 * @param {string} params.authorUsername  // the user's chosen handle (without @)
 * @param {string} params.title
 * @param {string} params.body
 * @param {"support"|"marketplace"} [params.type="support"]
 * @param {string} [params.category="General"]   // for support posts
 * @param {string} [params.campus="Farmingdale"]
 * @param {string} [params.status="open"]        // open/solved/locked
 * @param {string[]} [params.tags=[]]
 *
 * // marketplace-only fields:
 * @param {number} [params.price]
 * @param {string} [params.condition]            // New/Like New/Good/Fair
 * @param {string} [params.itemCategory]         // Textbook/Calculator/Lab Kit/Supplies/Dorm
 * @param {boolean} [params.isAvailable=true]
 *
 * @returns {Promise<string>} created postId
 */
export async function createPost(params) {
  const {
    authorId,
    authorName,
    authorUsername,
    title,
    body,
    type = "support",
    category = "General",
    campus = "Farmingdale",
    status = "open",
    tags = [],

    // marketplace fields
    price,
    condition,
    itemCategory,
    isAvailable = true
  } = params || {};

  if (!authorId) throw new Error("createPost: authorId is required");
  if (!authorName) throw new Error("createPost: authorName is required");
  if (!authorUsername) throw new Error("createPost: authorUsername is required");
  if (!title || !title.trim()) throw new Error("createPost: title is required");
  if (!body || !body.trim()) throw new Error("createPost: body is required");

  if (type !== "support" && type !== "marketplace") {
    throw new Error('createPost: type must be "support" or "marketplace"');
  }

  // Basic validation for marketplace posts
  if (type === "marketplace") {
    if (price == null || Number.isNaN(Number(price))) {
      throw new Error("createPost: price is required for marketplace posts");
    }
    if (!condition) throw new Error("createPost: condition is required for marketplace posts");
    if (!itemCategory) throw new Error("createPost: itemCategory is required for marketplace posts");
  }

  const payload = {
    authorId,
    authorName: authorName || "",
    authorUsername: authorUsername || "",
    title: title.trim(),
    body: body.trim(),
    type,
    campus,
    status,
    tags,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // Support-only fields
  if (type === "support") {
    payload.category = category;
  }

  // Marketplace-only fields
  if (type === "marketplace") {
    payload.price = Number(price);
    payload.condition = condition;
    payload.itemCategory = itemCategory;
    payload.isAvailable = Boolean(isAvailable);
  }

  const postsRef = collection(db, "posts");
  const newDoc = await addDoc(postsRef, payload);

  return newDoc.id;
}

/** Fetch a single post by ID. */
export async function getPostById(postId) {
  if (!postId) throw new Error("getPostById: postId is required");

  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Fetch recent posts sorted by createdAt desc. */
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

/** Fetch only marketplace listings. */
export async function getMarketplacePosts(options = {}) {
  const pageSize = Number(options.pageSize || 20);

  const q = query(
    collection(db, "posts"),
    where("type", "==", "marketplace"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Fetch only support posts. */
export async function getSupportPosts(options = {}) {
  const pageSize = Number(options.pageSize || 20);

  const q = query(
    collection(db, "posts"),
    where("type", "==", "support"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Increment/decrement commentCount on a post. */
export async function bumpCommentCount(postId, delta = 1) {
  if (!postId) throw new Error("bumpCommentCount: postId is required");

  const ref = doc(db, "posts", postId);
  await updateDoc(ref, {
    commentCount: increment(delta),
    updatedAt: serverTimestamp()
  });
}