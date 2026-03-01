import { db } from "./firebaseInitialization.js";
import {
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function normalize(username) {
  return (username || "").trim().toLowerCase();
}

function validate(username) {
  // 3–20 chars: letters/numbers/underscore
  if (!username) throw new Error("Please enter a username.");
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username must be 3–20 chars: letters, numbers, underscores only.");
  }
}

export async function claimUsername({ uid, email, displayName, username }) {
  const uname = normalize(username);
  validate(uname);

  const usernameRef = doc(db, "usernames", uname);
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const unameSnap = await tx.get(usernameRef);

    if (unameSnap.exists()) {
      const owner = unameSnap.data()?.uid;
      if (owner === uid) return; // already claimed by same user
      throw new Error("That username is already taken.");
    }

    // Reserve the username
    tx.set(usernameRef, { uid, createdAt: serverTimestamp() });

    // Save to user profile
    tx.set(
      userRef,
      {
        email: email || "",
        displayName: displayName || "",
        username: uname,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });

  return uname;
}