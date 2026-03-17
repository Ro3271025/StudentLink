// Account Options

const expandAcc = () => {
    const accOpt = document.getElementById('accOption');

    /* Im sure theres a better comparison but this is the easiest imo */

    if(accOpt.innerHTML.length > 204) { // exact length of the base option
        accOpt.innerHTML = "<p id='accOption'><button class='openBtn optionTxt' onclick='expandAcc()'>Your Account<br><small class='smallTxt'>"+
        "See information about your account and update details</small></button></p>"
    } else {
        accOpt.innerHTML = "<button class='openBtn optionTxt' onclick='expandAcc()'>Your Account<br>" +
        "<small class='smallTxt'>See information about your account and update details</small></button>" +
        "<div class='settingsOpt'>" + 
            "<p><strong>Choose a New Username</strong></p>" +
            "<p>This will display as <strong>@username</strong> on posts and comments.</p>" +
        
            "<input class='settingsInput' placeholder='e.g., rodolfo_tan' /> " +
            "<button class='saveBtn' type='button' style='font-size:12pt; padding:3px'>Save</button>"+
        "</div>" +
        "<div class='settingsOpt'>" + 
            "<p><strong>Change Your Email Address (.edu only)</strong></p>"+
            "<p>This will be the address you use to sign into the application</p>"+
        
            "<input class='settingsInput' placeholder='e.g., jdoe@suny.edu' /> "+
            "<button class='saveBtn' type='button' style='font-size:12pt; padding:3px'>Save</button>"+
        "</div>"+
        "<div class='settingsOpt'>" + 
            "<p><strong>Delete Your Account</strong></p>"+
            "<p><b><u>WARNING:</u></b> This will permanently delete your account</p>"+
        
            "<button class='delBtn' type='button' onclick=confDelete()>Delete Account</button><br><br>"+
        "</div>"+ 
        "<div class='separator'></div>";
    }
}

function confDelete(){
    var trueUsername = document.getElementById('username').innerText;
    trueUsername = trueUsername.replace("@", "");

    var username = prompt('Are you certain you would like to delete your account?\n\nTo delete your account, type your username below:');

    /* Need some firebase code here */


    // sign them out after deletion
    if(username.toLowerCase == trueUsername.toLowerCase){
        location.replace('userlogin.html');
    }
}

// Theme Options

const expandTheme = () => {
    const themeOpt = document.getElementById('themeOption');

    if(themeOpt.innerHTML.length > 158){
        themeOpt.innerHTML = "<p><button class='openBtn optionTxt' onclick='expandTheme()'>Appearance<br>" +
        "<small class='smallTxt'>Change your color scheme or background</small></button></p>"
    } else {
        themeOpt.innerHTML = "<p><button class='openBtn optionTxt' onclick='expandTheme()'>Appearance<br>" +
        "<small class='smallTxt'>Change your color scheme or background</small></button></p>"+
        "<div class='settingsOpt'>" +
        "<p style='font-weight:bold'>Theme</p>" +
        "<select id='themeSelector' class='themeObject' onchange='changeTheme()'>"+
            "<option value='#0f73ff' selected>Blue</option>"+
            "<option value='#A11010'>Red</option>"+
            "<option value='#E86C13'>Orange</option>"+
            "<option value='#A947C9'>Purple</option>"+
            "<option value='#004a41'>Green</option>"+
        "</select> "+      
        "<select id='bgSelector' class='themeObject' onchange='changeBG()'>"+
            "<option value='#000000'>Lights Out</option>"+
            "<option value='#F2F2EB'>Light</option>"+
            "<option value='#151D28' selected>Dark</option>"+
        "</select><br><br>"+
    "</div>"+
    "<div class='separator'></div>";
    }
}