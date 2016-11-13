'use strict';

const path = require('path');
const debug = require('debug');

const DEBUG_ROOT = 'oddworks:provider:ooyala-backlot';

exports.debug = function (filepath) {
	const parts = filepath.split(path.sep);
	const moduleName = parts[parts.length - 1].replace(/\.js$/, '');
	return debug(`${DEBUG_ROOT}:${moduleName}`);
};
