'use strict';

module.exports = function (bus, client, transform) {
	const fetchPopularCollection = args => {
		const spec = args.spec;
		const channel = args.channel;
		const secrets = (channel.secrets || {}).ooyala || {};
		let collection;

		const creds = Object.create(null);
		if (secrets.backlotApiKey && secrets.backlotSecretKey) {
			creds.apiKey = secrets.backlotApiKey;
			creds.secretKey = secrets.backlotSecretKey;
		}

		return client.getPopularRelated(creds)
			.then(popular => {
				if (popular) {
					// If the popular results exist, cast it to an Oddworks collection.
					const name = spec.name || 'Popular Videos';
					// There should only be one popular collection
					spec.id = 'spec-ooyala-discovery-popular';
					collection = transform(spec, {name});

					return popular;
				}
				const error = new Error(`Popular videos not found for channel "${channel}"`);
				error.code = 'POPULAR_NOT_FOUND';

				// Report the POPULAR_NOT_FOUND error.
				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'popular not found'
				});
				// Return a rejection to short circuit the rest of the operation.
				return Promise.reject(error);
			})
			.then(popular => {
				const assets = popular.results;

				if (assets && assets.length > 0) {
					// If there are any videos associated the popular discovery api call,
					// then fetch those too.

					return Promise.all(assets.map(asset => {
						const spec = {
							channel: channel.id,
							type: 'videoSpec',
							source: 'ooyala-asset-provider',
							asset
						};

						if (asset.external_id || asset.embed_code) {
							spec.id = `spec-ooyala-${asset.external_id || asset.embed_code}`;
						}

						return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec);
					}));
				}

				return [];
			})
			.then(specs => {
				collection.relationships = collection.relationships || {};

				// Assign the relationships.
				collection.relationships.entities = {
					data: specs.map(spec => {
						return {
							type: spec.type.replace(/Spec$/, ''),
							id: spec.resource
						};
					})
				};

				return collection;
			});
	};

	return fetchPopularCollection;
};
