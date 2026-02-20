/* DO NOT MERGE THIS FILE ITS NOT DONE!!!!!! */

function changeTheme(){ 
    var rootCSS = document.querySelector(':root');
    var rootComputed = getComputedStyle(rootCSS); // debug

    var selBox = document.getElementById("themeSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;

    console.log(rootComputed.getPropertyValue('--theme-accent')); //debug

    rootCSS.style.setProperty('--theme-accent', selValue)
}

function swapTheme(){
    var selBox = document.getElementById("themeSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;
    var object = document.getElementsByClassName("themeObject");

    for(const element of object){ // breaks the hover colors
        element.style.backgroundColor = selValue;
        element.style.borderColor = selValue;
    }


}

function swapBg(){ // super messy - TODO: fix
    var bgSelbBox = document.getElementById("bgSelector");
    var bgSelValue = bgSelbBox.options[bgSelbBox.selectedIndex].value;
    var body = document.getElementById("documentBody");
    var otherText = document.getElementsByTagName("textarea");
    var paragraph = document.getElementsByTagName("p");



    if(bgSelValue === "#F2F2EB"){ // Light Themes
        body.style.backgroundColor = bgSelValue;
        body.style.color = "black";

        for(const element of otherText){
            element.style.color = "black";
            element.style.backgroundColor = bgSelValue;

        }
        for(const element of paragraph){
            element.style.color = "black";
            element.style.backgroundColor = bgSelValue;
        }
    }
    else{ // Dark Themes
        body.style.backgroundColor = bgSelValue;
        body.style.color = "white";

        for(const element of otherText){
            element.style.color = "white";
            element.style.backgroundColor = bgSelValue;
        }
        for(const element of paragraph){
            element.style.color = "white";
            element.style.backgroundColor = bgSelValue;
        }
    }
}



