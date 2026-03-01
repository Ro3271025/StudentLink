function toggleOverlay(target){
    var targetItem = document.getElementById(target);

    console.log(targetItem)
    
    if(targetItem.style.visibility == 'hidden' || targetItem.style.visibility == ""){ // the calculated CSS style isn't sent to the script unless set as inline, so check for ""
        targetItem.style.visibility = 'visible';
    } else {
        targetItem.style.visibility = 'hidden';
    }
}