/* global describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const provider = require('../');
const defaultAssetTransform = require('../lib/default-asset-transform');
const defaultCollectionTransform = require('../lib/default-collection-transform');

describe('initialize', function () {
	describe('with valid data', function () {
		let bus;
		let result = null;

		function labelHandler() {}
		function assetHandler() {}

		beforeAll(function (done) {
			bus = this.createBus();
			spyOn(provider, 'createLabelHandler').and.returnValue(labelHandler);
			spyOn(provider, 'createAssetHandler').and.returnValue(assetHandler);
			spyOn(bus, 'queryHandler');

			const options = {
				bus,
				apiKey: 'foo',
				secretKey: 'bar'
			};

			provider.initialize(options).then(res => {
				result = res;
				done();
				return null;
			}).catch(done.fail);
		});

		it('creates an Ooyala client', function () {
			expect(result.client).toBeTruthy();
			expect(result.client.apiKey).toBe('foo');
			expect(result.client.secretKey).toBe('bar');
			expect(result.client.baseUrl).toBe('http://api.ooyala.com');
		});

		it('calls createLabelHandler', function () {
			expect(provider.createLabelHandler).toHaveBeenCalledTimes(1);
			expect(provider.createLabelHandler).toHaveBeenCalledWith(
				bus,
				result.client,
				defaultCollectionTransform
			);
		});

		it('calls createAssetHandler', function () {
			expect(provider.createAssetHandler).toHaveBeenCalledTimes(1);
			expect(provider.createAssetHandler).toHaveBeenCalledWith(
				bus,
				result.client,
				defaultAssetTransform
			);
		});

		it('calls bus.queryHandler', function () {
			expect(bus.queryHandler).toHaveBeenCalledTimes(2);
			expect(bus.queryHandler).toHaveBeenCalledWith(
				{role: 'provider', cmd: 'get', source: 'ooyala-label-provider'},
				labelHandler
			);
			expect(bus.queryHandler).toHaveBeenCalledWith(
				{role: 'provider', cmd: 'get', source: 'ooyala-asset-provider'},
				assetHandler
			);
		});
	});
});
