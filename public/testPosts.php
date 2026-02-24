<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Posts/Comments Test</title>
</head>
<body>
  <h1>Posts/Comments Test</h1>

  <button id="createPostBtn" type="button">Create Test Post</button>
  <button id="loadPostsBtn" type="button">Load Recent Posts</button>
  <br><br>

  <input id="postIdInput" placeholder="Paste a postId here" style="width:320px;" />
  <button id="addCommentBtn" type="button">Add Comment</button>
  <button id="loadCommentsBtn" type="button">Load Comments</button>

  <pre id="output" style="margin-top:20px; white-space:pre-wrap;"></pre>

  <script type="module">
    import { auth } from "./js/firebaseInitialization.js";
    import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

    import { createPost, getRecentPosts } from "./js/postsService.js";
    import { addComment, getComments } from "./js/commentsService.js";

    const out = document.getElementById("output");
    const log = (msg, obj) => {
      out.textContent += msg + (obj ? "\n" + JSON.stringify(obj, null, 2) : "") + "\n\n";
      console.log(msg, obj || "");
    };

    // Require login (because your rules may be auth-only later)
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        log("❌ Not signed in. Go sign in first at /public/login.php");
      } else {
        log("✅ Signed in as: " + user.email);
      }
    });

    document.getElementById("createPostBtn").addEventListener("click", async () => {
      try {
        const user = auth.currentUser;
        if (!user) return log("❌ Please sign in first.");

        const postId = await createPost({
          authorId: user.uid,
          authorName: user.displayName || "Student",
          title: "Test Post " + new Date().toLocaleString(),
          body: "This post was created from testPosts.php",
          category: "General",
          campus: "Farmingdale"
        });

        log("✅ Post created. postId:", { postId });
        document.getElementById("postIdInput").value = postId;
      } catch (e) {
        log("❌ createPost error:", { message: e.message });
      }
    });

    document.getElementById("loadPostsBtn").addEventListener("click", async () => {
      try {
        const posts = await getRecentPosts({ pageSize: 10 });
        log("✅ Recent posts:", posts);
      } catch (e) {
        log("❌ getRecentPosts error:", { message: e.message });
      }
    });

    document.getElementById("addCommentBtn").addEventListener("click", async () => {
      try {
        const user = auth.currentUser;
        if (!user) return log("❌ Please sign in first.");

        const postId = document.getElementById("postIdInput").value.trim();
        if (!postId) return log("❌ Paste a postId first.");

        const commentId = await addComment(postId, {
          authorId: user.uid,
          authorName: user.displayName || "Student",
          text: "Test comment at " + new Date().toLocaleTimeString()
        });

        log("✅ Comment added:", { postId, commentId });
      } catch (e) {
        log("❌ addComment error:", { message: e.message });
      }
    });

    document.getElementById("loadCommentsBtn").addEventListener("click", async () => {
      try {
        const postId = document.getElementById("postIdInput").value.trim();
        if (!postId) return log("❌ Paste a postId first.");

        const comments = await getComments(postId, { pageSize: 50 });
        log("✅ Comments:", comments);
      } catch (e) {
        log("❌ getComments error:", { message: e.message });
      }
    });
  </script>
</body>
</html>