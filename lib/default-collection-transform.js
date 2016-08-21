'use strict';

module.exports = function defaultCollectionTransform(spec, label) {
	// The spec object will contain, at a minimum:
	//   spec.id - String
	//   spec.type - "collectionSpec"
	//   spec.channel - String
	//   spec.source - "ooyala-label-provider"

	// Additionally, the spec object will contain any other attributes you
	// assigned to it when you saved it.

	// The label object will look like this:
	//
	// {
	//   "name": "100 Greatest Moments",
	//   "full_name": "/100 Greatest Moments",
	//   "id": "f0ecb1fe1c8d4c11978ea0a4755332b4",
	//   "parent_id": null
	// }

	return Object.assign({}, spec, label, {
		title: label.name
	});
};
