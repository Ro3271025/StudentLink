<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Choose Username | StudentLink</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <h1>Choose your username</h1>
  <p>This will display as <strong>@username</strong> on posts and comments.</p>

  <input id="usernameInput" placeholder="e.g., rodolfo_tan" />
  <button id="saveBtn" type="button">Save Username</button>
  <p id="msg"></p>

  <script type="module">
    import { auth, db } from "./js/firebaseInitialization.js";
    import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
    import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
    import { claimUsername } from "./js/usernameService.js";

    const msg = document.getElementById("msg");
    const input = document.getElementById("usernameInput");
    const btn = document.getElementById("saveBtn");

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "./login.php";
        return;
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists() && userSnap.data()?.username) {
        // already picked a username; send to main app
        window.location.href = "../application/home.html";
      }
    });

    btn.addEventListener("click", async () => {
      msg.textContent = "";
      btn.disabled = true;
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not signed in.");

        const uname = await claimUsername({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          username: input.value
        });

        msg.textContent = `Saved! You are now @${uname}`;
        // after choosing a username go to the main home page
        window.location.href = "../application/home.html";
      } catch (e) {
        msg.textContent = e.message || "Error saving username.";
      } finally {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>