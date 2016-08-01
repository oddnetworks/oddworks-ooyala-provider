/* global beforeAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';

const oddcast = require('oddcast');

beforeAll(function () {
	this.createBus = function () {
		const bus = oddcast.bus();
		bus.requests.use({}, oddcast.inprocessTransport());
		bus.commands.use({}, oddcast.inprocessTransport());
		bus.events.use({}, oddcast.inprocessTransport());
		return bus;
	};
});
