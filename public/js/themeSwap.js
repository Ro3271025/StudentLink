
function changeTheme(){ 
    var rootCSS = document.querySelector(':root');

    var selBox = document.getElementById("themeSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;
    localStorage.setItem("storedAccent", selValue);

    rootCSS.style.setProperty('--theme-accent', selValue);

    switch (selValue) { // theres a better way to do this I just don't have the time or patience right now - PR
        case "#0f73ff": // blue
            rootCSS.style.setProperty('--button-hover', "#113D7A");
            localStorage.setItem("storedHover", "#113D7A");
            break;
        case "#A11010": // red
            rootCSS.style.setProperty('--button-hover', "#4A0808");
            localStorage.setItem("storedHover", "#4A0808");
            break;
        case "#E86C13": // orange
            rootCSS.style.setProperty('--button-hover', "#99490F");
            localStorage.setItem("storedHover", "#99490F");
            break;
        case "#A947C9": // purple
            rootCSS.style.setProperty('--button-hover', "#4D205C");
            localStorage.setItem("storedHover", "#4D205C");
            break;
        case "#004a41": // green
            rootCSS.style.setProperty('--button-hover', "#01241F");
            localStorage.setItem("storedHover", "#01241F");
            break;
    }

}

function changeBG(){
    var rootCSS = document.querySelector(':root');

    var selBox = document.getElementById("bgSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;

    rootCSS.style.setProperty('--bg-primary', selValue);

    switch (selValue){
        case "#151D28": // Dark
            rootCSS.style.setProperty('--text-fill', "#ffffff");
            localStorage.setItem("storedBG", "#151D28");
            break;
        case "#000000": // Lights out
            rootCSS.style.setProperty('--text-fill', "#ffffff");
            localStorage.setItem("storedBG", "#000000");
            break;
        case "#F2F2EB": // Light
            rootCSS.style.setProperty('--text-fill', "#000000");
            localStorage.setItem("storedBG", "#F2F2EB");
            break;
    }
}

function reloadTheme(accent, hoverAccent, BG){
    var rootCSS = document.querySelector(':root');

    rootCSS.style.setProperty('--bg-primary', BG); // background
    rootCSS.style.setProperty('--theme-accent', accent); // primary accent
    rootCSS.style.setProperty('--button-hover', hoverAccent); // on hover accent

}

// retain the user's theme across refresh
document.addEventListener('DOMContentLoaded', reloadTheme(localStorage.getItem("storedAccent"), localStorage.getItem("storedHover"), localStorage.getItem("storedBG")));




