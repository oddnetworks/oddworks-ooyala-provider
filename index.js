'use strict';

const Promise = require('bluebird');
const Client = require('./lib/client');
const defaultAssetTransform = require('./lib/default-asset-transform');
const defaultCollectionTransform = require('./lib/default-collection-transform');
const createChannelCache = require('./lib/create-channel-cache');
const fetchLabelCollection = require('./lib/fetch-label-collection');
const fetchBacklotAsset = require('./lib/fetch-backlot-asset');
const fetchPopularCollection = require('./lib/fetch-popular-collection');
const fetchSimilarCollection = require('./lib/fetch-similar-collection');
const fetchTrendingCollection = require('./lib/fetch-trending-collection');

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

	const collectionTransform = options.collectionTransform;
	const assetTransform = options.assetTransform;

	const client = new Client({bus, baseUrl, secretKey, apiKey});

	const getChannel = createChannelCache(bus);

	bus.queryHandler(
		{role, cmd, source: 'ooyala-label-provider'},
		exports.createLabelHandler(bus, getChannel, client, collectionTransform)
	);

	bus.queryHandler(
		{role, cmd, source: 'ooyala-asset-provider'},
		exports.createAssetHandler(bus, getChannel, client, assetTransform)
	);

	return Promise.resolve({
		name: 'ooyala-provider',
		client
	});
};

exports.createLabelHandler = function (bus, getChannel, client, transform) {
	const getCollection = fetchLabelCollection(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	//   args.spec.label.id
	const ooyalaLabelProvider = args => {
		const spec = args.spec;
		const labelId = (spec.label || {}).id;
		const channelId = spec.channel;

		if (!labelId || typeof labelId !== 'string') {
			throw new Error(
				'ooyala-label-provider spec.label.id String is required'
			);
		}

		return getChannel(channelId).then(channel => {
			return getCollection({spec, channel, labelId});
		});
	};

	return ooyalaLabelProvider;
};

exports.createAssetHandler = function (bus, getChannel, client, transform) {
	const getAsset = fetchBacklotAsset(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	//   args.spec.asset
	const ooyalaAssetProvider = args => {
		const spec = args.spec;
		const channelId = spec.channel;
		const asset = spec.asset || {};
		const assetId = asset.external_id || asset.embed_code;

		if (!assetId || typeof assetId !== 'string') {
			throw new Error(
				'ooyala-asset-provider spec.asset.id String is not available'
			);
		}

		return getChannel(channelId).then(channel => {
			return getAsset({spec, channel, assetId});
		});
	};

	return ooyalaAssetProvider;
};

exports.createPopularHandler = function (bus, getChannel, client, transform) {
	const getPopular = fetchPopularCollection(bus, client, transform);
	const ooyalaPopularProvider = args => {
		const spec = args.spec;
		const channelId = spec.channel;

		return getChannel(channelId).then(channel => {
			return getPopular({spec, channel});
		});
	};

	return ooyalaPopularProvider;
};

exports.createSimilarHandler = function (bus, getChannel, client, transform) {
	const getSimilar = fetchSimilarCollection(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	//   args.spec.asset
	const ooyalaSimilarProvider = args => {
		const spec = args.spec;
		const asset = spec.asset || {};
		const assetId = asset.external_id || asset.embed_code;
		const channelId = spec.channel;

		if (!assetId || typeof assetId !== 'string') {
			throw new Error(
				'ooyala-discovery-similar-provider spec.assetId String is not available'
			);
		}

		return getChannel(channelId).then(channel => {
			return getSimilar({spec, channel});
		});
	};

	return ooyalaSimilarProvider;
};

exports.createTrendingHandler = function (bus, getChannel, client, transform) {
	const getTrending = fetchTrendingCollection(bus, client, transform);
	const ooyalaTrendingProvider = args => {
		const spec = args.spec;
		const channelId = spec.channel;

		return getChannel(channelId).then(channel => {
			return getTrending({spec, channel});
		});
	};

	return ooyalaTrendingProvider;
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
