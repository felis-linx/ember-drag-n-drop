import Ember from 'ember';

export default Ember.Mixin.create({

  dragCoordinator: Ember.inject.service(),

  attributeBindings: ['draggable'],
  draggable: Ember.computed('allowDrag', 'suspendDrag', function() {
    return (this.get('allowDrag') && !this.get('suspendDrag') ? true : null );
  }),

  allowDrag: true, // enable by default, redefine to true for disallow drag this element
  suspendDrag: false, // used for temporary disable dragging

  transferEffect: 'move',

  classNames: ['draggable'],
  classNameBindings: ['isDragged:is-dragged'],
  isDragged: false,
  
  contentName: 'content',
  
  isNew: function() { //Ember.computed(`${this.contentName}.isNew`,
    return this.get(`${this.contentName}.isNew`);
  },

  x: Ember.computed({
    get() {
      if (this._x === undefined || isNaN(this._x)) {
        let marginLeft = parseFloat(this.$().css('margin-left'));
        this._x = this.element.scrollLeft + this.element.offsetLeft - marginLeft;
      }
      return this._x;
    },
    set(key, value) {
      if (value !== this._x/* && value > 0*/) {
        this._x = value;
        this._scheduleApplyPosition();
      }
    },
  }).volatile(),

  y: Ember.computed({
    get() {
      if (this._y === undefined || isNaN(this._y)) {
        this._y = this.element.offsetTop;
      }
      return this._y;
    },
    set(key, value) {
      if (value !== this._y/* && value > 0*/) {
        this._y = value;
        this._scheduleApplyPosition();
      }
    }
  }).volatile(),

  width: Ember.computed(function() {
    var el = this.$();
    return el.outerWidth(true);
  }).volatile(),

  height: Ember.computed(function() {
    var el = this.$();
    return el.outerHeight();// + parseFloat(el.css('margin-bottom'));
  }).volatile(),

  inRect: function(x, y) { //FIXME: treshold & prevent jumping
    var right = this._x + this.get('width'),
        bottom = this._y + this.get('height');
    return (x >= this._x && x <= right) && (y >= this._y && y <= bottom);
  },

  isMustMove(position, isAhead) {
    var width = this.get('width'),
        height = this.get('height'),
        treshold = 20, //height > 50 ? 20 : 5,
        point1 = { x: this._x, y: this._y },
        point2 = { x: this._x + width, y: this._y + height },
        center = {x: this._x + width/2, y: this._y + height/2},
        diff = { w: width - position.width, h: height - position.height };

    if (isAhead) {
      point2.x -= (diff.w > treshold ? diff.w : treshold);
      point2.y -= (diff.h > treshold ? diff.h : treshold);
    } else {
      point1.x += (diff.w > treshold ? diff.w : treshold);
      point1.y += (diff.h > treshold ? diff.h : treshold);
    }

    if (position.x > point1.x && position.x < point2.x && 
        position.y > point1.y && position.y < point2.y) {
      return true;
    }
    return false;
  },

  didInsertElement: function() {
    var self = this;
    this._super();
    Ember.run.schedule('afterRender', this, function() {
      self.set('_parent', self.parentView);
      self._tellParent('addItem', self);
    });
  },

  willDestroyElement: function() {
//    Ember.run.schedule('afterRender', this, '_tellParent', 'removeItem', this);
    this._tellParent('removeItem', this);
    this._super();
  },

  dragStart: function(event) {
    
    event.stopPropagation();    
    if (!this.get('draggable')) { // prevent dragging & bubbling event
      event.preventDefault();
      return false;      
    }
    
    this.get('dragCoordinator').set('object', this.get(this.contentName));
    this._dragStart(event);
  },

  _dragStart: function(event) {
    
    this.get('dragCoordinator').set('instance', this);

    event.dataTransfer.effectAllowed = this.get('transferEffect');
    
    var dragIcon = document.createElement('img');
    dragIcon.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    dragIcon.width = 1;
    dragIcon.height = 1;
    event.dataTransfer.setDragImage(dragIcon, 0, 0);
    
    this.set('isDragged', true);
    Ember.Logger.info('--- drag start', this.elementId/*,this.get('origin')*/);
//    this._tellParent('_dragStarted');
  },

  dragEnd: function(event) {
//    event.stopPropagation();
    return this._dragEnd(event);
  },
  
  _dragEnd: function(event) {
    Ember.Logger.log('-draggable dragEnd', this.elementId/*,this.get('origin')*/);
    this._tellParent('complete');
    this.set('isDragged', false);
    return false;
//    return this.get('dragCoordinator').dragEnded(this);
  },

  _drag: function(event) {
    event.preventDefault();
    event.stopPropagation();

    var parentRect = this._parent.element.getBoundingClientRect(),
        { x, y } = getEventCoordinates(event);

    this.setProperties({'x': x-parentRect.left, 'y': y-parentRect.top});
    Ember.run.throttle(this, '_tellParent', 'update', 150);
    return false;
  },

  _tellParent: function(method, ...args) {
    let parent = this._parent;
    if (Ember.typeOf(parent) !== 'instance') {
      Ember.assert('[Draggable mixin] The `parent` are empty in', this);
      return false;
    }
    if (method in parent) {
      parent[method](...args);
    } else {
      Ember.Logger.warn('[Draggable] parent hasn`t method', method, parent);
    }
  },

  _scheduleApplyPosition() {
    Ember.run.scheduleOnce('render', this, '_applyPosition');
  },

  _applyPosition: function() {
    var elem = this.element,
        dx = this.get('x') - elem.offsetLeft,// + parseFloat(this.$().css('margin-left')),
        dy = this.get('y') - elem.offsetTop,
        transform = `translateX(${dx}px) translateY(${dy}px)`;

//    Ember.Logger.info('_applyPosition'+this, transform, this._y, elem.offsetTop);

    elem.style.transform = transform;
    this.$().css({ transform: transform });
  },

  _reset: function() {
    var elem = this.$();

    delete this._y;
    delete this._x;

    elem.css({ transform: '' });
    elem.height(); // force apply styles
  }

});

/**
  Gets the touch or mouse coordinates for a given event.
  @method getEventCoordinates
  @return {Object} {x:Number, y:Number}
  @private
*/
function getEventCoordinates(event) {
  var originalEvent = event.originalEvent,
      touches = originalEvent && originalEvent.changedTouches,
      touch = touches && touches[0];

  if (touch) {
    return { x: touch.screenX, y: touch.screenY };
  }

  return { x: originalEvent.pageX, y: originalEvent.pageY };
}

/*  mouseDown(event) {
    //TODO: modificator key: Alt - copy ???
    this.startDragging(event);
  },
  touchStart(event) {
    this.startDragging(event);
  },
*/

