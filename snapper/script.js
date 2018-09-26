function Snapper(options) {
  this.scrollStep = 50;
  this.scrollTimer;
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
  this.init();  
}

Snapper.prototype.init = function() {
  this.scrollHandler();

  $(window).on('wheel', this.wheelHandler);
  $(window).on('keydown', this.keysHandler);
  window.addEventListener('scroll', this.scrollHandler, {
    passive: true
  });
}

Snapper.prototype.scrollHandler = function(e) {
  var self = this;

  this.scrollTop = $(window).scrollTop();
  this.updateSectionsBounds();
  this.updateIndexes();
}

Snapper.prototype.wheelHandler = function(e) {
  if (this.isTriggering) {
    console.log('prevented');
    return false;
  };

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
    console.log('prevented');
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
    this.scrollTo({
      top: toPrevTrigger + this.scrollTop
    });

    return false;
  };
}

Snapper.prototype.down = function() {
  if (this.nextSection !== null) {
    this.scrollNextIntoView();

    return false;
  }

  var toNextTrigger = this.calcToNextTrigger();
  if (toNextTrigger > 0 &&  this.innerHeight > toNextTrigger) {
    this.scrollTo({
      top: toNextTrigger + this.scrollTop
    });

    return false;
  }
}

Snapper.prototype.scrollActiveIntoView = function() {
  var activeBounds = this.bounds[this.activeSection];

  this.scrollIntoView(this.activeSection, {
    block: activeBounds.height <= this.innerHeight ? 'start' : 'end'
  });

  console.log('scroll to active');
}

Snapper.prototype.scrollNextIntoView = function() {
  this.scrollIntoView(this.nextSection, {
    block: 'start'
  });

  console.log('scroll to next');
}

Snapper.prototype.scrollPrevIntoView = function() {
  var prevBounds = this.bounds[this.prevSection];
  this.scrollIntoView(this.prevSection, {
    block: prevBounds.height <= this.innerHeight ? 'start' : 'end'
  });

  console.log('scroll to prev');
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
  this.isTriggering = true;

  var top = options.top !== undefined ? 
    Math.round(options.top) : 
    Math.round(options.bottom - this.innerHeight);
  var step = top > this.scrollTop ? this.scrollStep : -this.scrollStep;
  var self = this;
  var interval = setInterval(function () {
    if (top === self.scrollTop) {      
      setTimeout(function () {
        self.isTriggering = false;
      }, 150);
    } else if (
        (top > self.scrollTop) ? 
          (step < top - self.scrollTop) :
          (step > top - self.scrollTop)
      ) {
      window.scrollTo({
        top: self.scrollTop + step
      });
    } else {
      window.scrollTo({
        top: top
      });

      clearInterval(interval);

      setTimeout(function () {
        self.isTriggering = false;
      }, 150);
    }
  }, 4);
}

Snapper.prototype.updateIndexes = function() {
  var bounds = this.bounds;
  var activeBounds;
  var nextBounds;
  var prevBounds;
  var currentActive;
  var activeSection = this.bounds.reduce(function(active, bound, index) {    
    if (bound.top <= 0 && bound.bottom > 0) {
      active = index;
    }

    return active;
  }, null);

  if (activeSection !== this.activeSection && this.activeSection !== null) {
    this.prevActiveSection = this.activeSection;
    console.log('prevActiveSection:', this.prevActiveSection);
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

  
  console.log(this.prevSection);
  console.log(this.activeSection);
  console.log(this.nextSection);
}

$(() => {
  snapper = new Snapper({
    panelSelector: '.section'
  });

  console.log(snapper);
});
