if (!window.setImmediate) window.setImmediate = (function() {
  var head = { }, tail = head;

  var ID = Math.random();

  function onmessage(e) {
    if(e.data != ID) return;
    head = head.next;
    var func = head.func;
    delete head.func;
    func();
  }

  window.addEventListener('message', onmessage);

  return function(func) {
    tail = tail.next = { func: func };
    window.postMessage(ID, "*");
  };
}());

function throttle(func, timeout) {
  var timer = null;
  
  func.cancel = function () {
    if (timer === null) {     
      return;
     }
    clearTimeout(timer);      
    timer = null;
  }

  return function (e) {
    var args = arguments;
    
    func.cancel();
    
    timer = setTimeout(function () {
      func.apply(null, args);
      
      timer = null;
    }, timeout);
  }
}

function Snapper(options) {
  this.scrollStep = options.scrollStep !== undefined ? 
    options.scrollStep : 50;
  this.scrollInterval = options.scrollInterval !== undefined ? 
    options.scrollInterval : 4;
  this.isNative = !!options.isNative;
  this.scrollTimer;
  this.interval = null;
  this.timer = null;

  this.scrollTop = $(window).scrollTop();
  this.innerHeight = window.innerHeight;
  this.isScrolling = false;
  this.isTriggering = false;

  this.sections = $(options.panelSelector);
  this.bounds = [];

  this.activeSection = null;
  this.prevActiveSection = null;
  this.nextSection = null;
  this.prevSection = null;

  this.wheelHandler = this.wheelHandler.bind(this);
  this.keysHandler = this.keysHandler.bind(this);
  this.scrollHandler = this.scrollHandler.bind(this);
  this.resizeHandler = this.resizeHandler.bind(this);

  if (this.isNative && ('scrollBehavior' in document.documentElement.style)) {
    var self = this;
    this.scrollTo = throttle(function (options) {
      options.behavior = 'smooth';
      window.scrollTo(options);    
    }, 50);
    this.scrollIntoView = throttle(function (elemIndex, options) {
      options.behavior = 'smooth';
      self.sections[elemIndex].scrollIntoView(options);
    }, 50);
  } else {
    this.scrollTo = throttle(this.scrollTo.bind(this), 50);
    this.scrollIntoView = throttle(this.scrollIntoView.bind(this), 50);  
  }
  
  this.init();  
}

Snapper.prototype.init = function() {
  this.scrollHandler();

  $(window).on('wheel', this.wheelHandler);
  $(window).on('keydown', this.keysHandler);
  window.addEventListener('resize', this.resizeHandler, {
    passive: true
  });
  window.addEventListener('scroll', this.scrollHandler, {
    passive: true
  });
}
Snapper.prototype.resizeHandler = function(e) {
  var self = this;
  
  this.scrollTop = $(window).scrollTop();
  this.innerHeight = window.innerHeight;
  this.updateSectionsBounds();
  this.updateIndexes(); 
}

Snapper.prototype.scrollHandler = function(e) {
  if (this.timer) {
    clearTimeout(this.timer);
  }
  var self = this;

  this.scrollTop = $(window).scrollTop();
  this.updateSectionsBounds();
  this.updateIndexes();  

  if (this.isTriggering) {
    this.timer =  setTimeout(function () {
      self.isTriggering = false;
      self.timer = null;
    }, 150);
  }
}

Snapper.prototype.wheelHandler = function(e) {
  if (this.isTriggering) {
    return false;
  };

  console.log('wheel')

  var deltaY = e.originalEvent.deltaY;
  var direction;
  var toNextTrigger;
  var toPrevTrigger;
  
  if (deltaY > 0) {
    direction = 'down';
  } else if (deltaY < 0) {
    direction = 'up';
  } else {
    direction = null;
  }

  return this.onMove(direction);
}

Snapper.prototype.keysHandler = function(e) {
  if (this.isTriggering) {
    return false;
  };

  var key = e.originalEvent.key;
  var direction;

  switch(key) {
    case 'ArrowDown':
      direction = 'down';
      break;
    case 'ArrowUp':
      direction = 'up';
      break;
    default:
      direction = null;
  }

  return this.onMove(direction);
}

Snapper.prototype.onMove = function(direction) {
  if (!direction) return;
  
  switch(direction) {
    case 'up':
      return this.up();
    case 'down':
      return this.down();
    default:
  }
}

Snapper.prototype.up = function() {
  if (this.activeSection !== null && 
    this.bounds[this.activeSection].bottom < this.innerHeight -1 &&
    this.bounds[this.activeSection].top < -1
  ) {
    this.scrollActiveIntoView();

    return false;
  }
  
  if (this.prevSection !== null) {
    this.scrollPrevIntoView();

    return false;
  }

  var toPrevTrigger = this.calcToPrevTrigger();
  if (toPrevTrigger < 0 && this.innerHeight > -toPrevTrigger) {   
    if (!this.isTriggering) {
      this.isTriggering = true;
    };
    
    this.scrollTo({
      top: toPrevTrigger + this.scrollTop
    });

    return false;
  };
}

Snapper.prototype.down = function() {
  if (this.nextSection === this.sections.length - 1 && 
    Math.round(this.bounds[this.nextSection].bottom) <= this.innerHeight
  ) {
    return false;
  }

  if (this.nextSection !== null) {
    this.scrollNextIntoView();

    return false;
  }

  var toNextTrigger = this.calcToNextTrigger();
  if (toNextTrigger > 0 &&  this.innerHeight > toNextTrigger) {  
    if (!this.isTriggering) {
      this.isTriggering = true;
    };
    
    this.scrollTo({
      top: toNextTrigger + this.scrollTop
    });

    return false;
  }
}

Snapper.prototype.scrollActiveIntoView = function() { 
  if (!this.isTriggering) {
    this.isTriggering = true;
  };
  
  var activeBounds = this.bounds[this.activeSection];

  this.scrollIntoView(this.activeSection, {
    block: activeBounds.height <= this.innerHeight ? 'start' : 'end'
  });
}

Snapper.prototype.scrollNextIntoView = function() {
  if (!this.isTriggering) {
    this.isTriggering = true;
  };
  
  var bound = this.bounds[this.nextSection];
  
  if (
    this.nextSection === (this.sections.length - 1) &&
    Math.round(bound.height) <= this.innerHeight
  ) {
    this.scrollIntoView(this.nextSection, {
      block: 'end'
    });  
  } else {
    this.scrollIntoView(this.nextSection, {
      block: 'start'
    });  
  }  
}

Snapper.prototype.scrollPrevIntoView = function() {  
  if (!this.isTriggering) {
    this.isTriggering = true;
  };
  
  var prevBounds = this.bounds[this.prevSection];
  this.scrollIntoView(this.prevSection, {
    block: prevBounds.height <= this.innerHeight ? 'start' : 'end'
  });
}


Snapper.prototype.calcToNextTrigger = function() {
  var currentActive = this.activeSection === null ? 
    this.prevActiveSection :
    this.activeSection;
  var nextSectionBounds = this.bounds[currentActive + 1];
  if (!nextSectionBounds) {
    return 0;
  }

  return Math.round(nextSectionBounds.top - this.innerHeight);
}

Snapper.prototype.calcToPrevTrigger = function() {
  var currentActive = this.activeSection === null ? 
    this.prevActiveSection :
    this.activeSection;
  var prevSectionBounds = this.bounds[currentActive - 1];
  if (!prevSectionBounds) {
    return 0;
  }

  return Math.round(prevSectionBounds.bottom);
}

Snapper.prototype.updateSectionsBounds = function() {
  var bounds = [];

  this.sections.each(function () {
    bounds.push(this.getBoundingClientRect())
  });

  this.bounds = bounds;
}

Snapper.prototype.scrollIntoView = function(sectionIndex, options) {
  var bound = this.bounds[sectionIndex];
  var block = options.block;

  switch(block) {
    case 'start':
      this.scrollTo({
        top: bound.top + this.scrollTop
      });
      return;
    case 'end':
      this.scrollTo({
        bottom: bound.bottom + this.scrollTop
      });
      return;
    default:
      return;
  }
}

Snapper.prototype.scrollTo = function(options) {
  if (!this.isTriggering) {
    this.isTriggering = true;
  }
  var top = options.top !== undefined ? 
    Math.round(options.top) : 
    Math.round(options.bottom - this.innerHeight);
  var self = this;
  var interval;
  
  function recursiveInterval() {  
    return setTimeout(function () {
      var isDown = top === self.scrollTop ? null : top > self.scrollTop;
      
      if (isDown !== null && Math.abs(top - self.scrollTop) > self.scrollStep) {
        var step = isDown ? self.scrollStep : -self.scrollStep;
        window.scrollTo(0, self.scrollTop + step);
        interval = recursiveInterval();
      } else {        
        if (interval) {
          clearTimeout(interval);
          interval = null;
        }
        window.scrollTo(0, top);
      }
    }, this.scrollInterval);
  }
  interval = recursiveInterval();
}

Snapper.prototype.updateIndexes = function() {
  var bounds = this.bounds;
  var activeBounds;
  var nextBounds;
  var prevBounds;
  var currentActive;
  var activeSection = this.bounds.reduce(function(active, bound, index) {    
    if (Math.round(bound.top) <= 0 && Math.round(bound.bottom) > 0) {
      active = index;
    }

    return active;
  }, null);

  if (activeSection !== this.activeSection && this.activeSection !== null) {
    this.prevActiveSection = this.activeSection;
  }

  this.activeSection = activeSection;

  currentActive = this.activeSection === null ? 
    this.prevActiveSection :
    this.activeSection;
  
  activeBounds = bounds[currentActive]
  prevBounds = bounds[currentActive - 1];  
  nextBounds = bounds[currentActive + 1];

  this.prevSection = prevBounds && 
    prevBounds.bottom >= -100 && prevBounds.bottom <= 0 ?
    currentActive - 1 : null;

  this.nextSection = nextBounds && 
    (nextBounds.top <= this.innerHeight + 1) ?
    (currentActive + 1) : null;
}
