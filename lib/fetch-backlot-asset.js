'use strict';

const Promise = require('bluebird');
const fetchPlayableUrl = require('./fetch-playable-url');

module.exports = function (bus, client, transform) {
	// args.spec.asset
	//   .skipMetadata
	//   .skipStreams
	//   .getPlayableUrl
	const fetchAsset = args => {
		const channel = args.channel;
		const secrets = (channel.secrets || {}).ooyala || {};
		const spec = args.spec;
		const assetId = args.assetId;

		const skipMetadata = Boolean(spec.asset.skipMetadata || secrets.skipMetadata);
		const skipStreams = Boolean(spec.asset.skipStreams || secrets.skipStreams);
		const getPlayableUrl = Boolean(spec.getPlayableUrl);

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

					if (!getPlayableUrl) {
						return transform(spec, asset);
					}

					return fetchPlayableUrl({
						apiKey: secrets.backlotApiKey,
						embedCode: asset.embed_code}
					).then(url => {
						asset.streams.push({label: 'hls-playable', url});
						return transform(spec, asset);
					}).catch(err => {
						if (err.code === 'STREAM_UNDEFINED') {
							bus.broadcast({level: 'info'}, {
								spec,
								error: err,
								code: err.code,
								message: 'playable url not found'
							});
							return transform(spec, asset);
						}

						return Promise.reject(err);
					});
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

	return fetchAsset;
};
