function checkTouch() {
  var htmlClasses = document.documentElement.classList;

  if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
    htmlClasses.remove('hover');
    htmlClasses.add('touch');
  } else {  
    htmlClasses.add('hover');
  }

  addEventListener('touchstart', touchDetected);
  addEventListener('mouseover', hoverDetected);
  addEventListener('keydown', tabDetected);

  function touchDetected() {
    if (htmlClasses.contains('hover')) {
      htmlClasses.remove('hover');
    }

    htmlClasses.add('touch');

    removeListeners();
  }

  function hoverDetected() {
    if (htmlClasses.contains('touch')) {
      htmlClasses.remove('touch');
    }

    htmlClasses.add('hover');

    removeListeners();
  }

  function tabDetected(e) {

    if (e.keyCode == 9) {
      if (htmlClasses.contains('touch')) {
        htmlClasses.remove('touch');
      }
    }

    htmlClasses.add('hover');

    removeListeners();
  }

  function removeListeners() {
    removeEventListener('touchstart', touchDetected);
    removeEventListener('mouseover', hoverDetected);
    removeEventListener('keydown', tabDetected);
  }

  function addEventListener(event, func) {
    if (document.addEventListener) {
      document.addEventListener(event, func);
    } else {
      document.attachEvent('on' + event, func);
    }
  }

  function removeEventListener(event, func) {
    if (document.removeEventListener) {
      document.removeEventListener(event, func);
    } else {
      document.detachEvent('on' + event, func);
    }
  }

}

checkTouch();