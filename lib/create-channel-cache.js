'use strict';

const Promise = require('bluebird');

const TTL_IN_SECONDS = 300;

module.exports = function (bus) {
	const channels = Object.create(null);
	const pattern = {role: 'store', cmd: 'get', type: 'channel'};

	return function getChannel(id) {
		if (channels[id]) {
			return Promise.resolve(channels[id]);
		}

		return bus.query(pattern, {id}).then(channel => {
			channels[channel.id] = channel;

			// Remove the channel from memory after the time-to-live.
			setTimeout(() => {
				delete channels[channel.id];
			}, TTL_IN_SECONDS * 100);

			return channel;
		});
	};
};
