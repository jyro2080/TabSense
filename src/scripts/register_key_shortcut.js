
var shift_t = 84; // Shift + t 
window.addEventListener('keydown', keyboardNavigation, false); 
function keyboardNavigation(e) { 
  switch(e.which) { 
     case shift_t: 
         if (e.ctrlKey) { 
            chrome.extension.sendRequest({}); 
         } 
         break; 
  } 
} 
