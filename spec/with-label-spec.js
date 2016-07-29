/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const provider = require('../');

describe('with label', function () {
	let bus;
	let secretKey;
	let apiKey;
	let res;

	beforeAll(function (done) {
		bus = this.createBus();
		secretKey = this.secretKey;
		apiKey = this.apiKey;

		provider
			.initialize({bus, secretKey, apiKey})
			.then(() => {
				return bus.query(
					{role: 'provider', cmd: 'get', source: 'ooyala'},
					{}
				);
			})
			.then(response => {
				res = response;
				return null;
			})
			.then(done)
			.catch(done.fail);
	});

	it('should be truthy', function () {
		console.log(JSON.stringify(JSON.parse(res), null, 2));
		expect(res).toBeTruthy();
	});
});
