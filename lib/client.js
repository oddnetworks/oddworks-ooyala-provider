'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const request = require('request');
const debug = require('./').debug(__filename);

const PATH_PREFIX = '/v2';

class Client {
	// spec.bus *optional
	// spec.baseUrl *required
	// spec.apiKey *required
	// spec.secretKey *required
	constructor(spec) {
		// The bus is optional, so you need to check for it before
		// using it.
		this.bus = spec.bus || null;

		this.baseUrl = spec.baseUrl;
		this.apiKey = spec.apiKey;
		this.secretKey = spec.secretKey;

		this.getLabels = this.getLabels.bind(this);
		this.getLabel = this.getLabel.bind(this);
		this.getChildLabels = this.getChildLabels.bind(this);
		this.getAssetsByLabel = this.getAssetsByLabel.bind(this);
	}

	// args.apiKey
	// args.secretKey
	// args.query
	getLabels(args) {
		debug('getLabels request');
		args = Object.assign({}, args || {});
		args.path = `${PATH_PREFIX}/labels`;
		return this.makeRequest(args).then(body => {
			return body.items;
		});
	}

	// args.labelId *required
	// args.apiKey
	// args.secretKey
	// args.query
	getLabel(args) {
		debug('getLabel request');
		args = Object.assign({}, args || {});
		const id = args.labelId;
		if (!id || typeof id !== 'string') {
			throw new Error('getLabel() labelId is required');
		}
		args.path = `${PATH_PREFIX}/labels/${id}`;
		return this.makeRequest(args);
	}

	// args.labelId *required
	// args.apiKey
	// args.secretKey
	// args.query
	getChildLabels(args) {
		debug('getChildLabels request');
		args = Object.assign({}, args || {});
		const id = args.labelId;
		if (!id || typeof id !== 'string') {
			throw new Error('getChildLabels() labelId is required');
		}
		args.path = `${PATH_PREFIX}/labels/${id}/children`;
		return this.makeRequest(args).then(body => {
			return body.items;
		});
	}

	// args.labelId *required
	// args.apiKey
	// args.secretKey
	// args.query
	getAssetsByLabel(args) {
		debug('getAssetsByLabel request');
		args = Object.assign({}, args || {});
		const id = args.labelId;
		if (!id || typeof id !== 'string') {
			throw new Error('getAssetsByLabel() labelId is required');
		}
		args.path = `${PATH_PREFIX}/labels/${id}/assets`;
		return this.makeRequest(args).then(body => {
			return body.items;
		});
	}

	// args.assetId *required
	// args.apiKey
	// args.secretKey
	// args.query
	getAsset(args) {
		debug('getAsset request');
		args = Object.assign({}, args || {});
		const id = args.assetId;
		if (!id || typeof id !== 'string') {
			throw new Error('getAsset() assetId is required');
		}
		args.path = `${PATH_PREFIX}/assets/${id}`;
		return this.makeRequest(args);
	}

	// args.assetId *required
	// args.apiKey
	// args.secretKey
	// args.query
	getAssetMetadata(args) {
		debug('getAssetMetadata request');
		args = Object.assign({}, args || {});
		const id = args.assetId;
		if (!id || typeof id !== 'string') {
			throw new Error('getAsset() assetId is required');
		}
		args.path = `${PATH_PREFIX}/assets/${id}/metadata`;
		return this.makeRequest(args);
	}

	// args.assetId *required
	// args.apiKey
	// args.secretKey
	// args.query
	getAssetStreams(args) {
		debug('getAssetStreams request');
		args = Object.assign({}, args || {});
		const id = args.assetId;
		if (!id || typeof id !== 'string') {
			throw new Error('getAssetStreams() assetId is required');
		}
		args.path = `${PATH_PREFIX}/assets/${id}/streams`;
		return this.makeRequest(args);
	}

	// args.path *required
	// args.apiKey
	// args.secretKey
	makeRequest(args) {
		debug('makeRequest');
		const method = 'GET';
		const path = args.path;

		const apiKey = args.apiKey || this.apiKey;
		const secretKey = args.secretKey || this.secretKey;

		if (!apiKey || typeof apiKey !== 'string') {
			throw new Error('An apiKey is required to makeRequest()');
		}
		if (!secretKey || typeof secretKey !== 'string') {
			throw new Error('An secretKey is required to makeRequest()');
		}

		let query = {
			api_key: apiKey, // eslint-disable-line camelcase
			expires: (60 + Math.floor(Date.now() / 1000)).toString()
		};

		query = Object.assign({}, args.query || {}, query);
		query.signature = Client.generateSignature({secretKey, method, path, query});

		const url = `${this.baseUrl}${path}`;

		return Client.request({method, url, qs: query});
	}

	isAuthenticated() {
		const hasApiKey = this.apiKey && typeof this.apiKey === 'string';
		const hasSecretKey = this.secretKey && typeof this.secretKey === 'string';
		return hasApiKey && hasSecretKey;
	}

	static request(params) {
		return new Promise((resolve, reject) => {
			debug(`Client.request ${params.method} ${params.url} ${JSON.stringify(params.qs)}`);

			request(params, (err, res, body) => {
				if (err) {
					debug(`Client.request response: Error ${err.message || err.name || err}`);
					return reject(err);
				}

				debug(`Client.request response: res.statusCode ${res.statusCode}`);

				if (res.statusCode === 404) {
					return resolve(null);
				}

				const isJson = /^application\/json/.test(res.headers['content-type']);

				let data = {};
				if (isJson && body && typeof body === 'string') {
					try {
						data = JSON.parse(body);
					} catch (err) {
						debug(`Client.request response: JSON parsing error ${err.message}`);
						return reject(new Error(
							`Ooyala client JSON parsing error: ${err.message}`
						));
					}
				} else if (isJson) {
					debug('Client.request response: empty JSON Body');
					return reject(new Error(
						'Ooyala client received an empty application/json body'
					));
				} else if (typeof body === 'string') {
					debug('Client.request response: unexpected string Body');
					debug(body);
					return reject(new Error(
						'Ooyala client expects content-type to be application/json'
					));
				}

				if (res.statusCode !== 200) {
					debug(`Client.request statusCode !== 200 (${res.statusCode})`);
					return reject(new Error(
						'Ooyala client expects statusCode to be 200'
					));
				}

				debug('Client.request resolved successfuly');
				return resolve(data);
			});
		});
	}

	// params.secretKey
	// params.method
	// params.path
	// params.query
	static generateSignature(params) {
		const secretKey = params.secretKey;
		const method = params.method;
		const path = params.path;
		const query = Client.concatQueryParameters(params.query);
		const sha = crypto.createHash('sha256');
		sha.update(`${secretKey}${method}${path}${query}`);
		return sha.digest('base64').slice(0, 43).replace(/[=]+$/, '');
	}

	static concatQueryParameters(params) {
		return Object.keys(params || {})
			.map(k => {
				return [k, params[k]];
			})
			.sort()
			.reduce((str, query) => {
				return `${str}${query.join('=')}`;
			}, '');
	}
}

module.exports = Client;
