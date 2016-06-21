import Ember from 'ember';
import DropzoneMixin from 'ember-darg-n-drop/mixins/dropzone';
import { module, test } from 'qunit';

module('Unit | Mixin | dropzone');

// Replace this with your real tests.
test('it works', function(assert) {
  let DropzoneObject = Ember.Object.extend(DropzoneMixin);
  let subject = DropzoneObject.create();
  assert.ok(subject);
});
