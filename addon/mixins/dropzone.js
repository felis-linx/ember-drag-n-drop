import Ember from 'ember';

export default Ember.Mixin.create({
  
  store: Ember.inject.service(),
  dragCoordinator: Ember.inject.service(),
  
  classNames: ['dropzone'],
  classNameBindings: ['draggingOver:drag-over'],
  
  allowDrop: true,

  items: null,
  draggingOver: false,
  draggingInstance: null,
  
  childsName: 'content.childs',
  
  init() {
    this._super(...arguments);
    this.set('items', Ember.A());
  },
  
  isAllowDrop: function(/*event*/) {
    return this.get('allowDrop');
  },
  
  isSelf: function() {
    return this.get('dragCoordinator.instance') === this;
  },
  
  sortedItems: Ember.computed(function() {
    var items = Ember.ArrayProxy.create({ content: this.get('items') }),
        dragged = this.get('items').findBy('isDragged'),
        dragIndex = items.indexOf(dragged),
        position;
    
    if (dragged !== undefined) {
      position = {
        x: dragged.get('x'),
        y: dragged.get('y'),
        width: dragged.get('width'),
        height: dragged.get('height')
      };
      
      var matchedItem = items.find(function(item, index) {
        if (item === dragged) {
          return false;
        }
//        return item.inRect(position.x, position.y);
        return item.isMustMove(position, index < dragIndex);
      });

      if (matchedItem !== undefined) {
        var matchedIndex = items.indexOf(matchedItem);
        items = items.without(dragged);
        items.insertAt(matchedIndex, dragged);
      }

    } else {
      Ember.Logger.error('[Dropzone] ' + this.elementId + ' can`t find `dragged` in items.', items);
    }
    
    return items;
  }).volatile(),
  
  dragEnter: function(event) {
    
    if (this.get('draggingOver') === true) {
      return false; //yo-ho! catch repeated event 
    }
        
    //bubble event for self dragging or disallowed types
    if (this.isSelf() || !this.isAllowDrop(event)) {
      return true;
    }
    
    this._dragEnter(event);
    
    return false;
    
//    this.parentView._dragLeave(event);
//    dragObject = dragCoordinator.getDragged(); //refresh dragObject after releasing by parent
//    Ember.assert('[Dropzone]'+this.elementId+' dragObject is instance '+dragObject, Ember.typeOf(dragObject) !== 'instance');    
  },
  
  _dragEnter: function(event) {
    
    var dragCoordinator = this.get('dragCoordinator'),
        object = dragCoordinator.get('object');
    
    dragCoordinator.set('event', event);
    dragCoordinator.setDropzone(this);
    
    Ember.Logger.info('--- [Dropzone]',this.elementId,'drag enter', object.get('id')||object.elementId);
    
// stop bubbling for moved elements, handle it in dragOver()
//    if (event.dataTransfer.effectAllowed === 'move') {
//      return false;
//    }
    
    this.set('draggingOver', true);
    
    // check existence of dragged object among child
    if (this.get(this.childsName).indexOf(object) === -1) {
      this._addChild(object);
      return true; // tell that new child was added
    }
    
    // tell that no child was added and possible suspend dropzone behavior 
    // in nested elementsfor makeing sorting
    return false;
  },
  
  dragOver: function(event) {
    
    if (!this.isAllowDrop(event)) { //bubble event
      return true;
    }
    
    this.get('dragCoordinator').draggingOver(event, this);
    return false;    
  },
  
  dragLeave: function(event) {
    
    if (this.get('draggingOver') !== true || this.isSelf() === true) {
      return false; //?????? sure?
    }
/*    
    if (event.dataTransfer.effectAllowed === 'move') {
      return false;
    }
*/    
    if (this.get('draggingInstance') !== null) {
      var elRect = this.element.getBoundingClientRect(),
          cX = event.originalEvent.clientX,
          cY = event.originalEvent.clientY,
          outsideElement = (cX < elRect.left || cX > elRect.right || cY < elRect.top || cY > elRect.bottom) || false;

      if (outsideElement) {
        this._dragLeave(event);
      }
//      event.preventDefault();
//      return false;
    }
    return false;
  },
  
  _dragLeave(/*event*/) {
    
    Ember.Logger.info('--- [Dropzone] drag leave in',this.elementId);
    this.set('draggingOver', false);
    
    if (this.get('draggingInstance') === null) {
//      Ember.Logger.warn('[Dropzone]'+this+' draggingInstance is null');
      return false;
    }
    
    var dragCoordinator = this.get('dragCoordinator'),
        object = dragCoordinator.get('object');
    
    Ember.Logger.info('[Dropzone] '+this.elementId+' leave', object.id);
    
    this.get(this.childsName).removeObject(object);
    if (Ember.typeOf(dragObject) === 'instance') {
      Ember.Logger.info('--- clean up '+Ember.typeOf(dragObject), dragObject);
//FIXME: move cleaning to initiator — sample-template
//        dragObject.get('content').destroyRecord();
//      dragObject.get('content').deepUnload(['parent']);
    } else {
      Ember.Logger.info('--- skip clean up '+Ember.typeOf(dragObject), dragObject);
    }
    
//    dragCoordinator.dragStarted(this.get('draggingInstance'));

//    Ember.run.schedule('afterRender', this, 'update');
    this.update();
    this.complete();
    
    return this._finishDragging(event);    
  },
  
  drop: function(event) {
    
//    Ember.Logger.info('--- allowDrop', this.get('allowDrop'), 'isAllow', this.isAllowDrop(event));
//    Ember.Logger.info('--- types '+event.dataTransfer.types, 'allow '+this.allow, '| disallow '+this.disallow);

    if (this.isSelf() || !this.isAllowDrop(event)) { //skip self drop and bubble event
      return true;
    }
    
    Ember.Logger.log('[Dropzone] drop in', this.elementId);

    var dragCoordinator = this.get('dragCoordinator'),
        object = dragCoordinator.get('object'),
        instance = dragCoordinator.get('instance'); //this.get('draggingInstance');

    dragCoordinator.dropped(object);
    
//    if (instance && instance.isNew()) {
      instance._dragEnd(event);
//    }
/*
      Ember.Logger.log('In dropped object:');
      [].forEach.call(event.dataTransfer.types, function(type) { // firefox pleased...
        Ember.Logger.log('--- ('+type+')', event.dataTransfer.getData(type));
        if (type === 'type') { //'text/json'
          data = true;//JSON.parse(event.dataTransfer.getData(type));
        }
      });
      Ember.assert('[Dropzone] empty data in dropped item'+event, data !== null);
//        this._appendChild(data);
*/    

//    event.stopPropagation();    
    event.preventDefault();    
    return this._finishDragging(event);
  },
  
  _finishDragging: function(/*event*/) {
    this.setProperties({draggingOver: false, draggingInstance: null});
//NOTE : allow return false or event.stopPropagation() ?
    return false;
  },
  
  addItem: function(instance) {
    
    this.get('items').addObject(instance);
    
    if (this.get('draggingOver') === true /*instance.isNew() === true*/) {
      var dragCoordinator = this.get('dragCoordinator');
      dragCoordinator.set('instance', instance);
      Ember.Logger.info('------ addItem new item'+instance,'#', instance.get('content.id'));
      instance._dragStart(dragCoordinator.get('event'));
    }
  },
  
  removeItem: function(item) {
    this.get('items').removeObject(item);
  },
  
  update: function() {
    var items = this.get('sortedItems'),
        width = this.$().width(),
        position = { 
          x: /*this.element.offsetLeft +*/ (this.$().innerWidth()-width)/2 ,
          y: /*this.element.offsetTop +*/ (this.$().innerHeight()-this.$().height())/2
        },
        _x = position.x,
        _y = 0;
    
    items.forEach(function(item) {
      if (position.x + item.get('width') > width + _x) {
        position.x = _x;
        position.y += _y;
      }
      
      if (!item.get('isDragged')) {
        item.setProperties({'x': position.x, 'y': position.y });
      }
      
      position.x += item.get('width');
      _y = item.get('height');
    });
    this.set('items', items);
  },
  
  complete: function() {
    var items = this.get('sortedItems'),
        itemModels = items.mapBy('content');
    
    this.get(this.childsName).then(function(childs) {
      items.invoke('_reset');
      Ember.run.scheduleOnce('afterRender', function() {
        childs.setObjects(itemModels);
      });
    });
  },
  
  _addChild: function(element) {
    var self = this,
        content = this.get('content'),
        childs = this.get(this.childsName),
        store = this.get('store');
    
    Ember.assert('[Dropzone] can`t peek childs in '+this.elementId, Ember.typeOf(childs) === 'instance');

    childs.addObject(element);    
    Ember.Logger.info('[Dropzone]', this.elementId, 'add new '+element.get('type'), element.id);    
  }
});
