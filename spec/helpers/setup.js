/* global beforeAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';

const oddcast = require('oddcast');

beforeAll(function () {
	this.apiKey = process.env.API_KEY;
	this.secretKey = process.env.SECRET_KEY;

	this.createBus = function () {
		const bus = oddcast.bus();
		bus.requests.use({}, oddcast.inprocessTransport());
		return bus;
	};
});
