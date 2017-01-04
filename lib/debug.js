'use strict';

var debugPkg = require('debug');
var DEBUG_ENABLED = localStorage.debug && (localStorage.debug.search('geotool') >= 0);
var debug = module.exports = function(pkgName) {
	return DEBUG_ENABLED ? debugPkg(pkgName) : null;
};
