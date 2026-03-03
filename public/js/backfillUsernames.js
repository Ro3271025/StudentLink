import { db } from "./firebaseInitialization.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// This script is meant to be run once to backfill the `authorUsername` field for existing posts in the Firestore database.
// It will loop through all posts and set the `authorUsername` field to the correct username
// if missing. This is to backfill the new `authorUsername` field for existing posts.
export async function runBackfill({ pageSize = 500 } = {}) {
  const postsRef = collection(db, "posts");
  const snaps = await getDocs(postsRef);
  let updated = 0;

  for (const snap of snaps.docs) {
    const data = snap.data() || {};
    if (data.authorUsername && data.authorUsername.trim()) continue;
    const authorId = data.authorId;
    if (!authorId) continue;

    const userSnap = await getDoc(doc(db, "users", authorId));
    const uname = userSnap.exists() ? userSnap.data().username : "";
    if (uname && uname.trim()) {
      await updateDoc(doc(db, "posts", snap.id), { authorUsername: uname });
      updated++;
      console.log(`Updated post ${snap.id} -> @${uname}`);
    }
  }

  console.log(`Backfill complete. Updated ${updated} posts.`);
  return { updated };
}

// For manual quick use in browser console:
window.runBackfillUsernames = runBackfill;
