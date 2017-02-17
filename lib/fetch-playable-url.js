'use strict';

const Promise = require('bluebird');
const request = require('request');

const BASE_URL = 'http://player.ooyala.com/sas/player_api/v1/authorization/embed_code';
const QUERY = 'device=roku&domain=www.ooyala.com&supportedFormats=m3u8';

// args.apiKey
// args.embedCode
//
// If the playable URL is not defined, this will reject with:
//   error.code === 'STREAM_UNDEFINED'
function fetchPlayableUrl(args) {
	args = args || {};
	const apiKey = args.apiKey;
	const embedCode = args.embedCode;

	if (!apiKey) {
		throw new Error('args.apiKey is required');
	}
	if (!embedCode) {
		throw new Error('args.embedCode is required');
	}

	const params = {
		method: 'GET',
		url: `${BASE_URL}/${apiKey}/${embedCode}?${QUERY}`
	};

	return fetchPlayableUrl.makeRequest(params).then(data => {
		const stream = (((data.authorization_data || {})[embedCode] || {}).streams || [])[0];

		if (!stream || !stream.url || (stream.url.data || '').length < 1) {
			const error = new Error(
				`Stream undefined for playable URL with apiKey ${apiKey} and embedCode ${embedCode}.`
			);
			error.code = 'STREAM_UNDEFINED';
			return Promise.reject(error);
		}

		const buff = new Buffer(stream.url.data, 'base64');
		const deCoded = buff.toString();

		return deCoded.replace(/player\/iphone/, 'player/appletv');
	});
}

function makeRequest(params) {
	return new Promise((resolve, reject) => {
		request(params, (err, res) => {
			if (err) {
				return reject(err);
			}

			if (res.statusCode !== 200) {
				return reject(new Error(
					`Ooyala player API returned unexpected ${res.statusCode} status response`
				));
			}

			let body = res.body;
			if (typeof body === 'string') {
				try {
					body = JSON.parse(body);
				} catch (err) {
					return reject(new Error(
						`JSON parsing error in fetchPlaybleUrl ${res.statusCode} response from Ooyala: ${err.message}`
					));
				}
			}

			return resolve(body);
		});
	});
}

fetchPlayableUrl.makeRequest = makeRequest;

module.exports = fetchPlayableUrl;
