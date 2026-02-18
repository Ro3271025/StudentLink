<!DOCTYPE html>
<html lang="en">
<head>
   <title>Sign in | StudentLink</title>
   <link rel="stylesheet" href="styles/style.css">
   <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body id="loginBody">

<div id="loginContainer">

    <div id="loginLeft">
        <p id="signIn">Sign in</p>
        <p id="subtitle">Select your sign in method</p>
    </div>

    <div id="verticalDivider"></div>

    <div id="loginRight">
        <button id="msLoginBtn">
            <img src="styles/images/MS_LOGO.svg">
            Sign in with Microsoft
        </button>

        <button id="loginBtn">
            <img src="styles/images/GOOGLE_LOGO.svg">
            Sign in with Google
        </button>
    </div>

</div>

<script type="module">
import { setupLogin } from "./js/auth.js";
setupLogin();
</script>

</body>
</html>
