'use strict';

module.exports = function defaultCollectionTransform(spec, label) {
	return Object.assign({}, spec, label, {
		title: label.name
	});
};
