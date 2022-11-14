/*global process, module */
'use strict';

const _ = require('lodash');

const types = require('./types');
const EventEmitter = require('events').EventEmitter;

const errors = require('./errors');
const {
  CommonEnvInvalidConfiguration,
  CommonEnvRootConfigurationObjectException,
  CommonEnvGetOrDieAliasesException,
  CommonEnvGetOrDieException
} = errors;

const EVENT_FOUND = 'env:found';
const EVENT_FALLBACK = 'env:fallback';

module.exports = function envFactory() {
  var em = new EventEmitter();

  var getOrDie = getOrDieFactory(function(fullKeyName) {
    throw new CommonEnvGetOrDieException(fullKeyName);
  });

  var getOrDieWithAliases = getOrDieFactory(function(fullKeyName, $typeConverter, aliases) {
    throw new CommonEnvGetOrDieAliasesException(aliases);
  });

  function createContext() {
    return {
      fullKeyName: '',
    };
  }

  function addSuffix(context, suffix) {
    const newContext = _.clone(context);
    newContext.fullKeyName += suffix;
    return newContext;
  }

  function aliasesDeprecationNotice() {
    if (aliasesDeprecationNotice.called) {
      return;
    }
    console.warn('$aliases is deprecated and will be removed in common-env v7. More info at http://bit.ly/2bRSMN3');
    aliasesDeprecationNotice.called = true;
  }

  function getOrElseAll(object, topContext) {
    topContext = topContext || createContext();

    if (isConfigurationObject(object)) {
      throw new CommonEnvRootConfigurationObjectException(object, topContext.fullKeyName);
    }

    function resolver(config, value, key) {
      const innerContext = addSuffix(topContext, key.toUpperCase());

      if (isConfigurationObject(value)) {
        config[key] = _getOrElseConfigurationObject(value, innerContext);
      } else if (_.isPlainObject(value)) {
        config[key] = getOrElseAll(value, addSuffix(innerContext, '_'));
      } else if (_.isArray(value) && !isArrayOfAtom(value)) {
        config[key] = _getOrElseArray(value, innerContext);
      } else {
        config[key] = getOrElse(innerContext.fullKeyName, value, null, null, innerContext);
      }

      return config;
    }

    return _.reduce(object, resolver, {});
  }

  /**
   * [_getOrElseArray description]
   * @param  {Array} descriptionValue        configuration array description
   * @param  {Object} context
   * @return {Array}
   */
  function _getOrElseArray(arrayValues, context) {

    // use the first descriptionValue[0] as a template for other elements

    /**
     * find the largest defined INDEX that starts with ${fullKeyName}__ OR that uses one of the aliases
     * @param  {String} envKeyNamePrefix  env key name prefix
     * @param  {[type]} env              [description]
     * @return {[type]}                  [description]
     */
    function getMaxIndex(envKeyNamePrefix, env) {
      var envMaxIndex = _.chain(env)
        .toPairs()
        // only keep keys that are in the format {envKeyNamePrefix}__{NUMBER}[....] (because it can either be an array of array or an array of other objects)
        .filter(([envKey, envVal], k) => {
          // console.log(envKeyNamePrefix, envKey.substring(envKeyNamePrefix.length), (/^__[0-9]+/).test(envKey.substring(envKeyNamePrefix.length)));
          return envKey.startsWith(envKeyNamePrefix) && (/^__[0-9]+/).test(envKey.substring(envKeyNamePrefix.length));
        })
        // then extract the number from the env key name
        .map(([envKey, envVal], k) => {
          const matches = envKey.substring(envKeyNamePrefix.length).match(/^__([0-9]+)/);
          return parseInt(matches[1], 10);
        })
        .max()
        .value() || 0;

      // we want to at least map all config defined elements
      // so we choose the greater index between config defined index and the env var defined one
      return Math.max(envMaxIndex, arrayValues.length - 1);
    }

    return _.range(0, getMaxIndex(context.fullKeyName, process.env) + 1).map(function(___, index) {
      const object = arrayValues[index] ||  arrayValues[0];
      // we always use the first element of the array as a full type descriptor of every other element of this array
      return getOrElseAll(object, addSuffix(context, '__' + index + '_'), index);
    });
  }

  /**
   * [_getOrElseConfigurationObject description]
   * @param  {object} config  configuration object e.g. {$default: '', $types, ...}
   * @param  {object} context context
   * @return {mixed} a configuration primitive value
   */
  function _getOrElseConfigurationObject(config, context) {

    if (!_.isUndefined(config.$secure) && typeof(config.$secure) !== 'boolean') {
      throw new Error('$secure must be a boolean');
    }
    if (!_.isUndefined(config.$aliases) && !Array.isArray(config.$aliases)) {
      throw new Error('$aliases must be an array');
    }

    if (!_.isUndefined(config.$aliases) && (_.isUndefined(config.$type) && _.isUndefined(config.$default))) {
      throw new CommonEnvInvalidConfiguration(context.fullKeyName);
    }

    if (_.isUndefined(config.$secure)) {
      config.$secure = false;
    }
    if (_.isUndefined(config.$aliases)) {
      config.$aliases = [];
    } else {
      aliasesDeprecationNotice();
    }

    // if `$type` is specified it will be used as a type checker and converter, otherwise infer the type from `$default`
    var $typeConverter = config.$type || getTypeConverter(config.$default);

    return config.$aliases.concat([context.fullKeyName]).reduce(function(memo, varEnvName, i, aliases) {
      var isLast = i === aliases.length - 1;

      if (memo !== null) {
        return memo;
      }

      // only try to get an env var if memo is undefined
      if (isLast) {
        return _.isUndefined(config.$default) ? getOrDieWithAliases(varEnvName, $typeConverter, aliases, config.$secure) : getOrElse(varEnvName, config.$default, $typeConverter, config.$secure);
      }

      return getOrElse(varEnvName, null, $typeConverter, config.$secure);
    }, null);
  }

  /**
   * [getOrElse description]
   * @param  {String} fullKeyName    env. var. name
   * @param  {B} $default       default fallback value
   * @param  {Function} $typeConverter f(A) -> B
   * @deprecated it will soon be merged into `context`
   * @param  {B} $secure        hide output log value
   * @deprecated it will soon be merged into `context`
   * @param {Object} contenxt
   * @return {B}
   */
  function getOrElse(fullKeyName, $default, $typeConverter, $secure, context) {
    $secure = typeof($secure) === 'boolean' ? $secure : false;
    $typeConverter = $typeConverter || getTypeConverter($default);

    if (_.has(process.env, fullKeyName)) {
      return emitFound(fullKeyName, $typeConverter(process.env[fullKeyName]), $secure);
    }

    return emitFallback(fullKeyName, $default, $secure);
  }

  function getOrDieFactory(f) {
    return function(fullKeyName, $typeConverter, aliases, $secure) {
      var value = getOrElse(fullKeyName, null, $typeConverter, $secure);

      if (value === null) {
        f.apply(null, arguments);
      }

      return value;
    };
  }

  function emitFound(key, value, secure) {
    em.emit(EVENT_FOUND, key, value, secure);
    return value;
  }

  function emitFallback(key, value, secure) {
    em.emit(EVENT_FALLBACK, key, value, secure);
    return value;
  }

  return _.extend(em, errors, {
    getOrElseAll: getOrElseAll,
    getOrElse: getOrElse,
    getOrDie: getOrDie,

    EVENT_FOUND: EVENT_FOUND,
    EVENT_FALLBACK: EVENT_FALLBACK,

    types: types.convert
  });
};

// Helpers

function getTypeConverter($default) {
  return isArrayOfAtom($default) ? arrayTypeConverter($default) : function(value) {

    if (_.isNumber($default)) { // @todo it's a bug, it should be types.seems.Integer, changing this will be a breaking change
      return toInt(value);
    }

    if (types.seems.Boolean(value)) {
      return String(value).toLowerCase() === 'true';
    }

    return value;
  };
}

function toInt(str) {
  return parseInt(str, 10);
}

function isArrayOfAtom(array) {
  return _.isArray(array) && array.every(isAtom);
}

function isConfigurationObject(value) {
  return _.isObject(value) && (_.has(value, '$default') || _.has(value, '$aliases') || _.has(value, '$type') || _.has(value, '$secure'));
}

/**
 * [arrayTypeConverter description]
 * @param  {string} value environment value
 * @return {[type]}       [description]
 */
function arrayTypeConverter($default) {
  var typeConverter = getTypeConverter($default[0]);
  return function(value) {
    return value.split(',').map(typeConverter);
  };
}

/**
 * @param  {mixed}  value
 * @return {Boolean}       true if the specified value is either a string, a number or a boolean
 */
function isAtom(value) {
  return _.isString(value) || _.isNumber(value) || types.seems.Boolean(value);
}
