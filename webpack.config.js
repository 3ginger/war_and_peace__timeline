'use strict';

var _ = require('lodash');

var _configs = {
  global: require(__dirname + '/config/webpack/global'),
  production: require(__dirname + '/config/webpack/environments/production'),
  development: require(__dirname + '/config/webpack/environments/development')
};

var _load = function(enviroment) {
  if (!enviroment) throw 'Can\'t find local enviroment variable via process.env.NODE_ENV';
  if (!_configs[enviroment]) throw 'Can\'t find enviroments see _configs object';

  return _configs && _.merge(
    _configs['global'](__dirname),
    _configs[enviroment](__dirname)
  );
}

module.exports = _load(process.env.NODE_ENV);
