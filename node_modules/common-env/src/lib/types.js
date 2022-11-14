'use strict';
var _ = require('lodash');

module.exports = {
  seems: {
    Integer: seemsInteger,
    Float: seemsFloat,
    Boolean: seemsBoolean,
    String: seemsString,
    Array: seemsArray
  },
  convert: {
    Integer: createType('Integer', IntegerConverter),
    Float: createType('Float', FloatConverter),
    Boolean: createType('Boolean', BooleanConverter),
    String: createType('String', StringConverter),
    Array: ArrayConverter
  }
};

function createType(name, impl){
  impl._name = name;
  return impl;
}

function IntegerConverter(mixed) {
  if (!seemsInteger(mixed)) {
    throw new Error('`' + mixed + '` is not an integer, could not convert it.');
  }
  return parseInt(mixed, 10);
}

function FloatConverter(mixed) {
  if (!seemsFloat(mixed)) {
    throw new Error('`' + mixed + '` is not an float, could not convert it.');
  }
  return parseFloat(mixed);
}

function seemsInteger(mixed){
  var maybeInt = parseInt(mixed, 10);
  return !isNaN(maybeInt) && mixed + '' === maybeInt.toFixed(0);
}
function seemsFloat(mixed){
  var maybeFloat = parseFloat(mixed);
  return !isNaN(maybeFloat);
}

function BooleanConverter(mixed) {
  if (!seemsBoolean(mixed)) {
    throw new Error('`' + mixed + '` is not an boolean, could not convert it.');
  }

  return String(mixed).toLowerCase() === 'true';
}

function ArrayConverter(itemConverter){
  if(!_.isFunction(itemConverter)){
    throw new Error('itemConverter from ArrayConverter(itemConverter) should be a function');
  }

  return createType('Array('+itemConverter._name+')', function(mixed){
    if(!seemsArray(itemConverter, mixed)){
      throw new Error('`' + mixed + '` is not an Array('+itemConverter._name+'), could not convert it.');
    }

    return mixed.split(',').map(itemConverter);
  });
}

function seemsArray(itemConverter, itemType){
  try{
    itemType.split(',').every(itemConverter);
  } catch(err){
    return false;
  }

  return true;
}

function seemsBoolean(mixed) {
  var v = String(mixed).toLowerCase();
  return v === 'true' || v === 'false';
}

function StringConverter(mixed){
  if(!seemsString(mixed)){
    throw new Error('`' + mixed + '` is not an string, could not convert it.');
  }

  return mixed;
}

function seemsString(mixed){
  return _.isString(mixed);
}
