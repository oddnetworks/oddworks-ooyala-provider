'use strict';

const Promise = require('bluebird');

module.exports = function (bus, client, transform) {
	return function fetchAsset(args) {
		const channel = args.channel;
		const secrets = channel.secrets || {};
		const spec = args.spec;
		const assetId = args.assetId;

		const skipMetadata = Boolean(secrets.skipMetadata || spec.skipMetadata);
		const skipStreams = Boolean(secrets.skipStreams || spec.skipStreams);

		const creds = Object.create(null);
		if (secrets.backlotApiKey && secrets.backlotSecretKey) {
			creds.apiKey = secrets.backlotApiKey;
			creds.secretKey = secrets.backlotSecretKey;
		}

		const params = Object.assign({assetId}, creds);

		const promises = [
			client.getAsset(params),
			skipMetadata ? Promise.resolve({}) : client.getAssetMetadata(params),
			skipStreams ? Promise.resolve([]) : client.getAssetStreams(params)
		];

		return Promise.all(promises)
			.then(args => {
				const asset = args[0];
				const meta = args[1];
				const streams = args[2];

				if (asset) {
					asset.meta = meta;
					asset.streams = streams || [];
					return transform(spec, asset);
				}

				const error = new Error(`Video not found for id "${assetId}"`);
				error.code = 'ASSET_NOT_FOUND';

				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'asset not found'
				});

				return Promise.reject(error);
			});
	};
};
