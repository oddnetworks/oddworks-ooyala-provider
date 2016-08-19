'use strict';

module.exports = function defaultAssetTransform(spec, asset) {
	return Object.assign({}, spec, asset, {
		title: asset.name,
		description: asset.description,
		images: {
			aspect16x9: asset.preview_image_url
		},
		player: {
			type: 'ooyala',
			embedCode: asset.embed_code || asset.external_id
		},
		meta: asset.meta || {}
	});
};
