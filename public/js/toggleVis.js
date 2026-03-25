function toggleOverlay(target){
    var targetItem = document.getElementById(target);
    var rootCSS = document.querySelector(':root');
    
    if(targetItem.style.visibility == 'hidden' || targetItem.style.visibility == ""){ // the calculated CSS style isn't sent to the script unless set as inline, so check for ""
        targetItem.style.visibility = 'visible'; // I have to fix this later
        rootCSS.style.setProperty('--overlay-vis', 'visible');
    } else {
        targetItem.style.visibility = 'hidden';
        rootCSS.style.setProperty('--overlay-vis', 'hidden');
    }
}