/* global jasmine, describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
/* eslint-disable camelcase */
'use strict';

const Promise = require('bluebird');
const provider = require('../');

const assets = [
	{
		title: 'VIDEO_1',
		external_id: 'VIDEO_1'
	},
	{
		title: 'VIDEO_2',
		external_id: 'VIDEO_2'
	}
];

// fake the results of the getAsset method
function fakeGetAsset(args) {
	let returnedAsset = assets[0];
	assets.map(asset => {
		if (args.assetId === asset.external_id) {
			returnedAsset = asset;
		}
		return asset;
	});
	return returnedAsset;
}

describe('popularHandler', function () {
	function noop() {}

	describe('when Ooyala popular not found', function () {
		let result = null;
		let error = null;
		let popularErrorEvent = null;
		const spec = {
			channel: 'abc',
			type: 'collectionSpec',
			id: 'spec-ooyala-discovery-popular'
		};

		function getChannel() {
			return Promise.resolve({id: 'abc'});
		}

		beforeAll(function (done) {
			const bus = this.createBus();

			bus.observe({level: 'error'}, function (payload) {
				popularErrorEvent = payload;
			});

			const client = provider.createClient({apiKey: 'foo', secretKey: 'bar'});
			spyOn(client, 'getPopularRelated').and.returnValue(Promise.resolve(null));

			const popularHandler = provider.createPopularHandler(bus, getChannel, client, noop);

			return popularHandler({spec})
				.then(res => {
					result = res;
				})
				.catch(err => {
					error = err;
					// beforeAll was finishing before event could be observed
					setTimeout(function () {
						done();
					}, 10);
				});
		});

		it('does not have a result', function (done) {
			expect(result).toBe(null);
			done();
		});

		it('has an error', function (done) {
			expect(error.code).toBe('POPULAR_NOT_FOUND');
			done();
		});

		it('has an error event', function (done) {
			expect(popularErrorEvent.code).toBe('POPULAR_NOT_FOUND');
			expect(popularErrorEvent.message).toBe('popular not found');
			expect(popularErrorEvent.error.code).toBe('POPULAR_NOT_FOUND');
			done();
		});
	});

	describe('with assets', function () {
		let client;
		let setItemSpec;
		let transform;
		let result;
		let error = null;
		const spec = {
			channel: 'abc',
			type: 'collectionSpec',
			id: 'spec-ooyala-discovery-popular'
		};
		const collection = {title: 'COLLECTION'};

		function getChannel() {
			return Promise.resolve({id: 'abc'});
		}

		beforeAll(function (done) {
			const bus = this.createBus();

			// Mock the Oddworks setItemSpec command for the related assets (videos).
			setItemSpec = jasmine
				.createSpy('setItemSpec')
				.and.returnValues(
					Promise.resolve({type: 'videoSpec', resource: 'foo-123'}),
					Promise.resolve({type: 'videoSpec', resource: 'bar-123'})
				);

			bus.commandHandler({role: 'catalog', cmd: 'setItemSpec'}, setItemSpec);

			// Mock the Ooyala client methods.
			client = provider.createClient({apiKey: 'foo', secretKey: 'bar'});
			spyOn(client, 'getPopularRelated').and.returnValue(Promise.resolve(assets));
			spyOn(client, 'getAsset').and.callFake(fakeGetAsset);

			transform = jasmine.createSpy('transform').and.returnValue(collection);

			const popularHandler = provider.createPopularHandler(bus, getChannel, client, transform);

			return popularHandler({spec})
				.then(res => {
					result = res;
				})
				.catch(err => {
					error = err;
				})
				.then(done);
		});

		it('has a result', function () {
			expect(result.title).toBe('COLLECTION');
		});

		it('does not have an error', function () {
			expect(error).toBe(null);
		});

		it('sends setItemSpec commands', function () {
			expect(setItemSpec).toHaveBeenCalledTimes(2);
			expect(setItemSpec).toHaveBeenCalledWith({
				channel: 'abc',
				type: 'videoSpec',
				source: 'ooyala-asset-provider',
				id: 'spec-ooyala-VIDEO_1',
				asset: assets[0]
			});
			expect(setItemSpec).toHaveBeenCalledWith({
				channel: 'abc',
				type: 'videoSpec',
				source: 'ooyala-asset-provider',
				id: 'spec-ooyala-VIDEO_2',
				asset: assets[1]
			});
		});

		it('calls client.getAssets()', function () {
			expect(client.getAsset).toHaveBeenCalledTimes(2);
			expect(client.getAsset).toHaveBeenCalledWith({assetId: 'VIDEO_1'});
			expect(client.getAsset).toHaveBeenCalledWith({assetId: 'VIDEO_2'});
		});
	});

	describe('with channel secrets', function () {
		let client;
		let setItemSpec;
		let transform;
		let result;
		let error = null;
		const spec = {
			channel: 'abc',
			type: 'collectionSpec',
			id: 'spec-123'
		};
		const collection = {title: 'COLLECTION'};

		function getChannel() {
			return Promise.resolve({
				id: 'abc',
				secrets: {
					backlotApiKey: 'api-key-foo',
					backlotSecretKey: 'api-secret-bar'
				}
			});
		}

		beforeAll(function (done) {
			const bus = this.createBus();

			// Mock the Oddworks setItemSpec command for the related assets (videos).
			setItemSpec = jasmine
				.createSpy('setItemSpec')
				.and.returnValues(
					Promise.resolve({type: 'videoSpec', resource: 'foo-123'}),
					Promise.resolve({type: 'videoSpec', resource: 'bar-123'})
				);

			bus.commandHandler({role: 'catalog', cmd: 'setItemSpec'}, setItemSpec);

			// Mock the Ooyala client methods.
			client = provider.createClient({apiKey: 'foo', secretKey: 'bar'});
			spyOn(client, 'getPopularRelated').and.returnValue(Promise.resolve(assets));
			spyOn(client, 'getAsset').and.callFake(fakeGetAsset);

			transform = jasmine.createSpy('transform').and.returnValue(collection);

			const popularHandler = provider.createPopularHandler(bus, getChannel, client, transform);

			return popularHandler({spec})
				.then(res => {
					result = res;
				})
				.catch(err => {
					error = err;
				})
				.then(done);
		});

		it('has a result', function () {
			expect(result.title).toBe('COLLECTION');
		});

		it('does not have an error', function () {
			expect(error).toBe(null);
		});

		it('sends setItemSpec commands', function () {
			expect(setItemSpec).toHaveBeenCalledTimes(2);
			expect(setItemSpec).toHaveBeenCalledWith({
				channel: 'abc',
				type: 'videoSpec',
				source: 'ooyala-asset-provider',
				id: 'spec-ooyala-VIDEO_1',
				asset: assets[0]
			});
			expect(setItemSpec).toHaveBeenCalledWith({
				channel: 'abc',
				type: 'videoSpec',
				source: 'ooyala-asset-provider',
				id: 'spec-ooyala-VIDEO_2',
				asset: assets[1]
			});
		});

		it('calls client.getAsset())', function () {
			expect(client.getAsset).toHaveBeenCalledTimes(2);
			expect(client.getAsset).toHaveBeenCalledWith({
				assetId: 'VIDEO_1',
				apiKey: 'api-key-foo',
				secretKey: 'api-secret-bar'
			});
			expect(client.getAsset).toHaveBeenCalledWith({
				assetId: 'VIDEO_2',
				apiKey: 'api-key-foo',
				secretKey: 'api-secret-bar'
			});
		});
	});
});
