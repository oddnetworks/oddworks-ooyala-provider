'use strict';

module.exports = function (bus, client, transform) {
	const fetchLabelCollection = args => {
		const spec = args.spec;
		const channel = args.channel;
		const secrets = channel.secrets || {};
		let collection = args.collection;
		const labelId = args.labelId;

		const creds = Object.create(null);
		if (secrets.backlotApiKey && secrets.backlotSecretKey) {
			creds.apiKey = secrets.backlotApiKey;
			creds.secretKey = secrets.backlotSecretKey;
		}

		// First, get the label object from Ooyala.
		return client.getLabel(Object.assign({labelId}, creds))
			.then(label => {
				if (label) {
					// If the label object exists, cast it to an Oddworks collection.
					collection = Object.assign({}, collection, transform(spec, label));

					// Then check for assets (videos) which belong to this label, and
					// check for child labels.
					return Promise.all([
						client.getAssetsByLabel(Object.assign({labelId}, creds)),
						client.getChildLabels(Object.assign({labelId}, creds))
					]);
				}

				const error = new Error(`Label not found for id "${labelId}"`);
				error.code = 'LABEL_NOT_FOUND';

				// Report the LABEL_NOT_FOUND error.
				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'label not found'
				});

				// Return a rejection to short circuit the rest of the operation.
				return Promise.reject(error);
			})
			.then(results => {
				const assets = results[0];
				const children = results[1];

				if (assets && assets.length > 0) {
					// If there are any videos associated with this label, then fetch
					// those too.

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
				} else if (children && children.length > 0) {
					// Otherwise, attempt to fetch child labels, which will become child
					// collections.
					return Promise.all(children.map(label => {
						const spec = {
							channel: channel.id,
							type: 'collectionSpec',
							id: `spec-ooyala-label-${label.id}`,
							source: 'ooyala-label-provider',
							label
						};

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

	return fetchLabelCollection;
};
