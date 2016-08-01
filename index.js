'use strict';

const Promise = require('bluebird');
const Client = require('./lib/client');
const defaultAssetTransform = require('./lib/default-asset-transform');
const defaultCollectionTransform = require('./lib/default-collection-transform');

const DEFAULTS = {
	baseUrl: 'http://api.ooyala.com',
	collectionTransform: defaultCollectionTransform,
	assetTransform: defaultAssetTransform
};

// options.bus
// options.baseUrl
// options.secretKey
// options.apiKey
// options.collectionTransform
// options.assetTransform
exports.initialize = function (options) {
	options = Object.assign({}, DEFAULTS, options || {});

	const bus = options.bus;
	const baseUrl = options.baseUrl;
	const apiKey = options.apiKey;
	const secretKey = options.secretKey;
	const role = 'provider';
	const cmd = 'get';

	if (!bus || typeof bus !== 'object') {
		throw new Error('oddworks-ooyala-provider requires an Oddcast Bus');
	}
	if (!apiKey || typeof apiKey !== 'string') {
		throw new Error('oddworks-ooyala-provider requires an Ooyala apiKey key');
	}
	if (!secretKey || typeof secretKey !== 'string') {
		throw new Error('oddworks-ooyala-provider requires an Ooyala secretKey key');
	}

	const collectionTransform = options.collectionTransform;
	const assetTransform = options.assetTransform;

	const client = new Client({bus, baseUrl, secretKey, apiKey});

	bus.queryHandler(
		{role, cmd, source: 'ooyala-label-provider'},
		exports.createLabelHandler(bus, client, collectionTransform)
	);

	bus.queryHandler(
		{role, cmd, source: 'ooyala-asset-provider'},
		exports.createAssetHandler(bus, client, assetTransform)
	);

	return Promise.resolve({
		name: 'ooyala-provider',
		client
	});
};

exports.createLabelHandler = function (bus, client, transform) {
	// Called from Oddworks core via bus.query
	// Expects:
	//   args.spec.label.id
	return function ooyalaLabelProvider(args) {
		const spec = args.spec;
		const labelId = (spec.label || {}).id;
		const channel = spec.channel;

		if (!labelId || typeof labelId !== 'string') {
			throw new Error(
				'ooyala-label-provider spec.label.id String is required'
			);
		}

		// The Oddworks collection.
		let collection = args.object;

		// First, get the label object from Ooyala.
		return client.getLabel({labelId})
			.then(label => {
				if (label) {
					// If the label object exists, cast it to an Oddworks collection.
					collection = Object.assign({}, collection, transform(spec, label));

					// Then check for assets (videos) which belong to this label, and
					// check for child labels.
					return Promise.all([
						client.getAssetsByLabel({labelId}),
						client.getChildLabels({labelId})
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

				if (assets && assets.length) {
					// If there are any videos associated with this label, then fetch
					// those too.
					return Promise.all(assets.map(asset => {
						return bus.sendCommand(
							{role: 'catalog', cmd: 'setItemSpec'},
							{channel, type: 'videoSpec', source: 'ooyala-asset-provider', asset}
						);
					}));
				} else if (children && children.length) {
					// Otherwise, attempt to fetch child labels, which will become child
					// collections.
					return Promise.all(children.map(label => {
						return bus.sendCommand(
							{role: 'catalog', cmd: 'setItemSpec'},
							{channel, type: 'collectionSpec', source: 'ooyala-label-provider', label}
						);
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
};

exports.createAssetHandler = function (bus, client, transform) {
	// Called from Oddworks core via bus.query
	// Expects:
	//   args.spec.asset
	return function ooyalaAssetProvider(args) {
		const spec = args.spec;
		const asset = spec.asset || {};
		const assetId = asset.external_id || asset.embed_code;

		if (!assetId || typeof assetId !== 'string') {
			throw new Error(
				'ooyala-asset-provider spec.asset.id String is not available'
			);
		}

		return client.getAsset({assetId}).then(asset => {
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

// options.secretKey *required
// options.apiKey *required
// options.bus *optional
// options.baseUrl *optional
exports.createClient = function (options) {
	options = Object.assign({}, DEFAULTS, options || {});

	const bus = options.bus;
	const baseUrl = options.baseUrl;
	const secretKey = options.secretKey;
	const apiKey = options.apiKey;

	if (!apiKey || typeof apiKey !== 'string') {
		throw new Error('oddworks-ooyala-provider requires an Ooyala apiKey key');
	}
	if (!secretKey || typeof secretKey !== 'string') {
		throw new Error('oddworks-ooyala-provider requires an Ooyala secretKey key');
	}

	return new Client({bus, baseUrl, secretKey, apiKey});
};
