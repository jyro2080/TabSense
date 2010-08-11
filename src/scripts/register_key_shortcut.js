
var shift_s = 83; // Shift + s 
window.addEventListener('keydown', keyboardNavigation, false); 
function keyboardNavigation(e) { 
  switch(e.which) { 
     case shift_s: 
         if (e.ctrlKey) { 
            chrome.extension.sendRequest({action : 'openui'}); 
         } 
         break; 
  } 
} 
