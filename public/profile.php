<!DOCTYPE html>
<html lang="en">
<head>
    <title>Profile | StudentLink</title>
    <link rel="stylesheet" href="styles/style.css">
    <link rel="icon" type="image/png" href="styles/images/ICON.png">
</head>
<body>

    <h2 id="displayName">Loading Name...</h2>
    <p><strong>Username:</strong> <span id="username"></span></p>
    <p><strong>Major:</strong> <span id="major"></span></p>
    <p><strong>Campus:</strong> <span id="campus"></span></p>

    <div id="userBio">
        <p><strong>Bio:</strong></p>
        <textarea id="bioText" maxlength="500" rows="5" cols="50" disabled style="width: 100%; max-width: 500px; display: block; margin-bottom: 10px;"></textarea>
        
        <button id="edit" class="themeObject">Edit Profile</button>
    </div>

    <script type="module">
        import { setupProfile } from "./js/profile.js";
        setupProfile();
    </script>

</body>
</html>