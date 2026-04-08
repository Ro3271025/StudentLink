<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Post | StudentLink</title>
    <link rel="stylesheet" href="styles/style.css">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body id="documentBody">

    <div id="header">
    <img id="logo" src="styles/images/STUDENT_LINK_LOGO.svg">
    </div>

    <!-- POST DETAIL -->
    <div id="postDetailContainer" class="content" style="padding: 16px 3.5%;">
        <p style="text-align:center; color:#aaa; padding:20px;">Loading post...</p>
    </div>

    <!-- COMMENTS SECTION -->
    <div id="commentsSection" class="content" style="padding: 16px 3.5%; display:none;">
        <h3 style="font-size:15pt; margin-bottom:12px; border-bottom: 1px solid var(--border-color); padding-bottom:8px;">Comments</h3>
        <div id="commentsContainer"></div>

        <!-- Add comment -->
        <div id="addCommentSection" style="margin-top:16px; display:flex; gap:8px; align-items:center;">
            <input
                id="commentInput"
                type="text"
                placeholder="Write a comment..."
                maxlength="300"
                style="flex:1; padding:8px 14px; border-radius:20px; border:1px solid #444; background:#222; color:#fff; font-size:14px; font-family: var(--font-family);"
            />
            <button id="addCommentBtn" class="themeObject" style="font-size:13pt; padding: 6px 18px; border-radius:20px;">Post</button>
        </div>
    </div>

    <br>

    <!-- LEFT SIDEBAR -->
    <div class="sidebar" id="leftBar">
        <br><img class="sideProfileIcon" src="styles/images/placeholder/PROFILE_DEFAULT_IMAGE.SVG"><br>
        <p id="displayName">Display Name</p>
        <p id="username">@Username</p><br>
        <p class="sidebarText"><a href="home.html">Home</a></p>
        <p class="sidebarText"><a href="listings.html">Listings</a></p>
        <p class="sidebarText">Explore</p>
        <p class="sidebarText">Notifications</p>
        <p class="sidebarText"><a href="chat.html">Chat</a></p>
        <p class="sidebarText"><a href="profile.html">Profile</a></p>
        <p class="sidebarText"><a href="settings.html">Settings</a></p><br><br>
        <button class="themeObject" onclick="toggleOverlay('newPostContainer')">New Post</button><br><br>
    </div>

    <!-- NEW POST OVERLAY -->
    <div class="overlayDiv">
        <div id="newPostContainer">
            <p id="newPostHeader">
                <button class="themeObject" id="closeNewPostBtn" onclick="toggleOverlay('newPostContainer')">X</button>
                <b>Create New Post</b>
                <button class="themeObject" id="createPostBtn">Post</button>
            </p>
            <div id="newPostTXT">
                <textarea maxlength="300" placeholder="What's happening?"></textarea>
            </div>
        </div>
    </div>

    <!-- RIGHT SIDEBAR -->
    <div class="sidebar" id="rightBar">
        <br>
        <input class="searchBar themeObject" placeholder="Search"><br><br>
        <div id="recentSearches">
            <table class="recentSearchesTable">
            </table>
        </div>
    </div>

    <script type="module" src="js/postDetail.js"></script>
    <script type="module" src="js/userSearch.js"></script>
    <script src="js/themeSwap.js" type="text/javascript"></script>
    <script src="js/toggleVis.js" type="text/javascript"></script>
</body>
</html>