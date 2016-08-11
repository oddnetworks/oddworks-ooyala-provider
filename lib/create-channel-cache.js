'use strict';

const Promise = require('bluebird');

module.exports = function (bus) {
	const channels = Object.create(null);
	const pattern = {role: 'store', cmd: 'get', type: 'channel'};

	return function getChannel(id) {
		if (channels[id]) {
			return Promise.resolve(channels[id]);
		}

		return bus.query(pattern, {id}).then(channel => {
			channels[channel.id] = channel;
			return channel;
		});
	};
};
