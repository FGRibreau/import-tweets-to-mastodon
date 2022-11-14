'use strict';
const util = require('util');

function CommonEnvGetOrDieAliasesException(aliases) {
  this.message = 'At least one environment variable of [{key}] MUST be defined'.replace('{key}', aliases.join(', '));
  this.name = 'CommonEnvGetOrDieAliasesException';
}
util.inherits(CommonEnvGetOrDieAliasesException, Error);


function CommonEnvGetOrDieException(key) {
  this.message = '{key} MUST be defined'.replace('{key}', key);
  this.name = 'CommonEnvGetOrDieException';
}
util.inherits(CommonEnvGetOrDieException, Error);


function CommonEnvRootConfigurationObjectException(object, prefix) {
  this.message = '{prefix} array contains a special common-env configuration object (e.g. {$default:"", $types:"" [, $aliases:""]}) where it should contains an simple object'.replace('{prefix}', prefix);
  this.name = 'CommonEnvRootConfigurationObjectException';
}
util.inherits(CommonEnvRootConfigurationObjectException, Error);

function CommonEnvInvalidConfiguration(key) {
  this.message = 'Invalid configuration, `$aliases` must be defined along side $default or $type in key "{key}"'.replace('{key}', key);
  this.name = 'CommonEnvInvalidConfiguration';
}
util.inherits(CommonEnvInvalidConfiguration, Error);

module.exports = {
  CommonEnvGetOrDieAliasesException,
  CommonEnvGetOrDieException,
  CommonEnvRootConfigurationObjectException,
  CommonEnvInvalidConfiguration
};
