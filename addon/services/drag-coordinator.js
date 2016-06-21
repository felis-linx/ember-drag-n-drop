import Ember from 'ember';

export default Ember.Service.extend({
  
  activeDropzone: null,
  
  event: Ember.computed({
    get() {
      return this._event || false;
    },
    set(key, value) {
      this._event = value;
//      Ember.Logger.info('[Drag coordinator] set event',value);
    }
  }).volatile(),

  object: Ember.computed({
    get() {
      return this._object || false;
    },
    set(key, value) {
      this._object = value;
//      Ember.Logger.info('[Drag coordinator] set object',value);
    }
  }).volatile(),

  instance: Ember.computed({
    get() {
      return this._instance || false;
    },
    set(key, value) {
      this._instance = value;
//      Ember.Logger.info('[Drag coordinator] set instance',value);
    }
  }).volatile(),  
  
  reset: function(entity) {
    this.set(entity, null);
    Ember.Logger.info('[Drag coordinator] reset',entity);
//    delete `this.${entity}`;
  },
  
  dragStarted: function(content) {
    this.set('object', content);
  },
  
  dragEnded: function(content, dropped) {
    if (content !== undefined) {
      Ember.assert('[Drag coordinator] `content` mismatch '+content, this.get('object') === content);
    }
    var object = this.get('object');
    return object || false;
  },
  
  draggingOver: function(event/*, item*/) {
    if (this._instance && Ember.typeOf(this._instance) === 'instance' && ('_drag' in this._instance)) {
      return this._instance._drag(event);
    }
  },
  
  dropped: function(content) {
    if (content !== undefined) {
      Ember.assert('[Drag coordinator] dropeed `content` mismatch '+content, this.get('object') === content);
    }
    this.reset('object');
    this.reset('instance');
    this.reset('activeDropzone');
  },
  
  setDropzone: function(dropzone) {
    var current = this.get('activeDropzone');
    if (current !== null && '_dragLeave' in current) {
      current._dragLeave();
      this.reset('instance');
    }
    this.set('activeDropzone', dropzone);
  }
});
