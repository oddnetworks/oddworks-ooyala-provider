'use strict';

module.exports = function (bus, client, transform) {
	const fetchSimilarCollection = args => {
		const spec = args.spec;
		const channel = args.channel;
		const secrets = (channel.secrets || {}).ooyala || {};
		let collection;
		const originAsset = spec.asset || {};
		const assetId = originAsset.external_id || originAsset.embed_code;

		const creds = Object.create(null);
		if (secrets.backlotApiKey && secrets.backlotSecretKey) {
			creds.apiKey = secrets.backlotApiKey;
			creds.secretKey = secrets.backlotSecretKey;
		}

		// First, get the discovery object from Ooyala.
		return client.getSimilarRelated(Object.assign({assetId}, creds))
			.then(similar => {
				if (similar) {
					// If the similar results exist, cast it to an Oddworks collection.
					const name = spec.name || 'Similar Videos';
					// There should only be one similar collection per asset
					spec.id = `spec-ooyala-discovery-similar-${assetId}`;
					collection = transform(spec, {name});

					return similar;
				}
				const error = new Error(`Similar videos not found for channel "${channel}"`);
				error.code = 'SIMILAR_NOT_FOUND';

				// Report the SIMILAR_NOT_FOUND error.
				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'similar not found'
				});
				// Return a rejection to short circuit the rest of the operation.
				return Promise.reject(error);
			})
			.then(similar => {
				const assets = similar.results;

				if (assets && assets.length > 0) {
					// If there are any videos associated the similar discovery api call,
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

	return fetchSimilarCollection;
};
