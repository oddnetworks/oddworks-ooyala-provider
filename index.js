'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const request = require('request');

const DEFAULTS = {
	baseUrl: 'http://api.ooyala.com',
	sourceName: 'ooyala'
};

const PATH_PREFIX = '/v2';

// options.bus
// options.sourceName
// options.baseUrl
// options.secretKey
// options.apiKey
exports.initialize = function (options) {
	options = Object.assign({}, DEFAULTS, options || {});
	const bus = options.bus;
	const source = options.sourceName;
	const baseUrl = options.baseUrl;
	const apiKey = options.apiKey;
	const secretKey = options.secretKey;
	const role = 'provider';
	const cmd = 'get';

	if (!bus || typeof bus !== 'object') {
		throw new Error('oddworks-ooyala-provider requires an Oddcast Bus');
	}
	if (!apiKey || typeof apiKey !== 'string') {
		throw new Error('oddworks-ooyala-provider requires an Ooyala secretKey key');
	}
	if (!secretKey || typeof secretKey !== 'string') {
		throw new Error('oddworks-ooyala-provider requires an Ooyala secretKey key');
	}

	const handler = exports.createHandler({baseUrl, apiKey, secretKey});
	bus.queryHandler({role, cmd, source}, handler);

	return Promise.resolve(true);
};

exports.createHandler = function (options) {
	const BASE_URL = options.baseUrl;
	const secretKey = options.secretKey;
	const apiKey = options.apiKey;

	function makeRequest(params) {
		return new Promise((resolve, reject) => {
			request(params, (err, res, body) => {
				if (err) {
					return reject(err);
				}

				// TODO: Parse response body as JSON
				return resolve(body);
			});
		});
	}

	// Called from Oddworks core via bus.query
	return function ooyalaProvider() {
		// const spec = args.spec;
		// const object = args.object;

		const method = 'GET';
		const path = `${PATH_PREFIX}/labels/6c0040e4158b4e95b7563580459c9819/assets`;
		const query = {
			api_key: apiKey, // eslint-disable-line camelcase
			expires: (60 + Math.floor(Date.now() / 1000)).toString()
		};

		const signature = exports.generateSignature({secretKey, method, path, query});
		const qs = Object.assign({}, query, {signature});
		const url = `${BASE_URL}${path}`;

		return makeRequest({method, url, qs});
	};
};

// params.secretKey
// params.method
// params.path
// params.query
exports.generateSignature = function (params) {
	const secretKey = params.secretKey;
	const method = params.method;
	const path = params.path;
	const query = exports.concatQueryParameters(params.query);
	const sha = crypto.createHash('sha256');
	sha.update(`${secretKey}${method}${path}${query}`);
	return sha.digest('base64').slice(0, 43).replace(/[=]+$/, '');
};

exports.concatQueryParameters = function (params) {
	return Object.keys(params || {})
		.map(k => {
			return [k, params[k]];
		})
		.sort()
		.reduce((str, query) => {
			return `${str}${query.join('=')}`;
		}, '');
};
