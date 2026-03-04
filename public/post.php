<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Post Detail - Commit Comets</title>
    <link rel="stylesheet" href="styles/main.css"> </head>
<body>
    <div class="container">
        <h1 id="postTitle">Loading Title...</h1>
        <p id="postBody">Loading content...</p>

        <hr>

        <h3>Comments</h3>
        <div id="commentsContainer">
            <p>Loading comments...</p>
        </div>

        <div class="add-comment-section">
            <textarea id="commentInput" placeholder="Write a comment or offer support..."></textarea>
            <br>
            <button id="addCommentBtn">Add Comment</button>
        </div>
    </div>

    <script type="module" src="js/postDetail.js"></script>
</body>
</html>