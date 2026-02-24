<?php
// public/testPosts.php
// Simple test harness for postsService.js + commentsService.js (Support + Marketplace)

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>StudentLink — Posts/Comments Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, Arial, sans-serif; padding: 16px; }
    button { margin: 6px 6px 6px 0; padding: 8px 12px; cursor: pointer; }
    input, select, textarea { padding: 8px; width: 100%; max-width: 520px; margin: 6px 0; }
    .row { max-width: 720px; }
    pre { margin-top: 16px; white-space: pre-wrap; border: 1px solid #ccc; padding: 12px; border-radius: 8px; }
    .card { border: 1px solid #ddd; padding: 12px; border-radius: 10px; margin-top: 12px; max-width: 720px; }
    .muted { color: #555; }
  </style>
</head>

<body>
  <h1> StudentLink Test Harness</h1>
  <p class="muted">This page is for testing Firestore posts and comments functionality.</p>

  <p>
    <a href="./login.php">Go to Login</a> |
    <a href="./dashboard.php">Go to Dashboard</a>
  </p>

  <div class="card row">
    <h2>Auth Status</h2>
    <p id="authStatus">Loading…</p>
  </div>

  <div class="card row">
    <h2>Create Support Post</h2>
    <input id="supportTitle" placeholder="Title (support)" value="Need help with Firebase imports" />
    <textarea id="supportBody" rows="3">I'm getting a MIME type error when importing a module. Any tips?</textarea>
    <input id="supportCategory" placeholder="Category" value="IT Help" />
    <button id="createSupportPostBtn" type="button">Create Support Post</button>
  </div>

  <div class="card row">
    <h2>Create Marketplace Listing</h2>
    <input id="marketTitle" placeholder="Title (marketplace)" value="Selling TI-84 Calculator (cheap)" />
    <textarea id="marketBody" rows="3">Works perfectly. Meet on campus. Cheaper than retail.</textarea>
    <input id="marketPrice" type="number" placeholder="Price" value="45" />
    <select id="marketCondition">
      <option value="New">New</option>
      <option value="Like New">Like New</option>
      <option value="Good" selected>Good</option>
      <option value="Fair">Fair</option>
    </select>
    <select id="marketItemCategory">
      <option value="Textbook">Textbook</option>
      <option value="Calculator" selected>Calculator</option>
      <option value="Lab Kit">Lab Kit</option>
      <option value="Supplies">Supplies</option>
      <option value="Dorm">Dorm</option>
    </select>
    <button id="createMarketplacePostBtn" type="button">Create Marketplace Listing</button>
  </div>

  <div class="card row">
    <h2>Load Posts</h2>
    <button id="loadAllPostsBtn" type="button">Load Recent Posts (All)</button>
    <button id="loadMarketplacePostsBtn" type="button">Load Marketplace Only</button>
    <button id="loadSupportPostsBtn" type="button">Load Support Only</button>
  </div>

  <div class="card row">
    <h2>Comments (for a Post)</h2>
    <input id="postIdInput" placeholder="Paste a postId here (or create a post above)" />
    <textarea id="commentText" rows="2">Test comment from testPosts.php</textarea>
    <button id="addCommentBtn" type="button">Add Comment</button>
    <button id="loadCommentsBtn" type="button">Load Comments</button>
  </div>

  <pre id="output">Output will appear here…</pre>

  <script type="module">
    const out = document.getElementById("output");
    const log = (msg, obj) => {
      out.textContent += "\n" + msg + (obj ? "\n" + JSON.stringify(obj, null, 2) : "") + "\n";
      console.log(msg, obj || "");
    };

    out.textContent = " Module script started…\n";

    try {
      // Import Firebase + services (paths assume this file is /public/testPosts.php)
      const { auth } = await import("./js/firebaseInitialization.js");
      const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

      const postsSvc = await import("./js/postsService.js");
      const commentsSvc = await import("./js/commentsService.js");

      log(" Imports OK");

      // Auth status
      const authStatus = document.getElementById("authStatus");
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          authStatus.textContent = " Not signed in. Go to /public/login.php first.";
          log(" Not signed in. Sign in first at ./login.php");
        } else {
          authStatus.textContent = ` Signed in as: ${user.email}`;
          log(" Signed in as:", { email: user.email, uid: user.uid });
        }
      });

      // Helpers
      function requireUser() {
        const user = auth.currentUser;
        if (!user) {
          log(" Please sign in first.");
          return null;
        }
        return user;
      }

      // Create Support Post
      document.getElementById("createSupportPostBtn").addEventListener("click", async () => {
        try {
          const user = requireUser();
          if (!user) return;

          const postId = await postsSvc.createPost({
            authorId: user.uid,
            authorName: user.displayName || "Student",
            title: document.getElementById("supportTitle").value,
            body: document.getElementById("supportBody").value,
            type: "support",
            category: document.getElementById("supportCategory").value || "General",
            campus: "Farmingdale"
          });

          document.getElementById("postIdInput").value = postId;
          log(" Support post created:", { postId });
        } catch (e) {
          log(" createSupportPost error:", { message: e.message });
        }
      });

      // Create Marketplace Listing
      document.getElementById("createMarketplacePostBtn").addEventListener("click", async () => {
        try {
          const user = requireUser();
          if (!user) return;

          const postId = await postsSvc.createPost({
            authorId: user.uid,
            authorName: user.displayName || "Student",
            title: document.getElementById("marketTitle").value,
            body: document.getElementById("marketBody").value,
            type: "marketplace",
            campus: "Farmingdale",
            price: Number(document.getElementById("marketPrice").value),
            condition: document.getElementById("marketCondition").value,
            itemCategory: document.getElementById("marketItemCategory").value,
            isAvailable: true
          });

          document.getElementById("postIdInput").value = postId;
          log(" Marketplace listing created:", { postId });
        } catch (e) {
          log(" createMarketplacePost error:", { message: e.message });
        }
      });

      // Load recent posts (all)
      document.getElementById("loadAllPostsBtn").addEventListener("click", async () => {
        try {
          const posts = await postsSvc.getRecentPosts({ pageSize: 10 });
          log(" Recent posts (all):", posts);
        } catch (e) {
          log(" getRecentPosts error:", { message: e.message });
        }
      });

      // Load marketplace only
      document.getElementById("loadMarketplacePostsBtn").addEventListener("click", async () => {
        try {
          const posts = await postsSvc.getMarketplacePosts({ pageSize: 10 });
          log(" Marketplace posts:", posts);
        } catch (e) {
          log(" getMarketplacePosts error:", { message: e.message });
        }
      });

      // Load support only
      document.getElementById("loadSupportPostsBtn").addEventListener("click", async () => {
        try {
          const posts = await postsSvc.getSupportPosts({ pageSize: 10 });
          log(" Support posts:", posts);
        } catch (e) {
          log(" getSupportPosts error:", { message: e.message });
        }
      });

      // Add comment
      document.getElementById("addCommentBtn").addEventListener("click", async () => {
        try {
          const user = requireUser();
          if (!user) return;

          const postId = document.getElementById("postIdInput").value.trim();
          if (!postId) return log(" Paste a postId first.");

          const text = document.getElementById("commentText").value;
          const commentId = await commentsSvc.addComment(postId, {
            authorId: user.uid,
            authorName: user.displayName || "Student",
            text
          });

          log(" Comment added:", { postId, commentId });
        } catch (e) {
          log(" addComment error:", { message: e.message });
        }
      });

      // Load comments
      document.getElementById("loadCommentsBtn").addEventListener("click", async () => {
        try {
          const postId = document.getElementById("postIdInput").value.trim();
          if (!postId) return log(" Paste a postId first.");

          const comments = await commentsSvc.getComments(postId, { pageSize: 50 });
          log(" Comments:", comments);
        } catch (e) {
          log(" getComments error:", { message: e.message });
        }
      });

    } catch (err) {
      log(" Import/Module error:", { message: err.message });
    }
  </script>
</body>
</html>