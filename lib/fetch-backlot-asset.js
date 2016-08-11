'use strict';

module.exports = function (bus, client, transform) {
	return function fetchAsset(args) {
		const channel = args.channel;
		const secrets = channel.secrets || {};
		const spec = args.spec;
		const assetId = args.assetId;

		const creds = Object.create(null);
		if (secrets.apiKey && secrets.secretKey) {
			creds.apiKey = secrets.apiKey;
			creds.secretsKey = secrets.secretKey;
		}

		const params = Object.assign({assetId}, creds);
		return client.getAsset(params).then(asset => {
			if (asset) {
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
