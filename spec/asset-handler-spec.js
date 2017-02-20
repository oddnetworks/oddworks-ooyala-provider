/* global jasmine, describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const provider = require('../');
const fetchPlayableUrl = require('../lib/fetch-playable-url');

describe('assetHandler', function () {
	function noop() {}

	describe('when Ooyala asset not found', function () {
		let result = null;
		let error = null;
		let event = null;
		const spec = {
			channel: 'abc',
			type: 'videoSpec',
			id: 'spec-123',
			asset: {external_id: 'foo'} // eslint-disable-line camelcase
		};

		function getChannel() {
			return Promise.resolve({id: 'abc'});
		}

		beforeAll(function (done) {
			const bus = this.createBus();

			function maybeDone() {
				if (error && event) {
					done();
				}
			}

			bus.observe({level: 'error'}, function (payload) {
				event = payload;
				maybeDone();
			});

			const client = provider.createClient({apiKey: 'foo', secretKey: 'bar'});
			spyOn(client, 'getAsset').and.returnValue(Promise.resolve(null));
			spyOn(client, 'getAssetMetadata').and.returnValue(Promise.resolve(null));
			spyOn(client, 'getAssetStreams').and.returnValue(Promise.resolve(null));

			const assetHandler = provider.createAssetHandler(bus, getChannel, client, noop);

			return assetHandler({spec})
				.then(res => {
					result = res;
				})
				.catch(err => {
					error = err;
					maybeDone();
				});
		});

		it('does not have a result', function () {
			expect(result).toBe(null);
		});

		it('has an error', function () {
			expect(error.code).toBe('ASSET_NOT_FOUND');
		});

		it('has an error event', function () {
			expect(event.code).toBe('ASSET_NOT_FOUND');
			expect(event.message).toBe('asset not found');
			expect(event.error.code).toBe('ASSET_NOT_FOUND');
			expect(event.spec.asset.external_id).toBe('foo');
		});
	});

	describe('with Ooyala asset', function () {
		let result = null;
		let error = null;
		const asset = {ASSET: 'ASSET', embed_code: 'EMBED_CODE'}; // eslint-disable-line camelcase
		const video = {VIDEO: 'VIDEO'};
		const metadata = {METADATA: 'METADATA'};
		const streams = [];
		const spec = {
			channel: 'abc',
			type: 'videoSpec',
			id: 'spec-123',
			asset: {external_id: 'foo', embed_code: 'EMBED_CODE'} // eslint-disable-line camelcase
		};

		const playableUrls = {authorization_data: { // eslint-disable-line camelcase
			EMBED_CODE: {
				streams: [{url: {data: 'aHR0cDovL3NvbWUtdXJsLmNvbS9wbGF5ZXIvaXBob25lL2Zvbw=='}}]
			}
		}};

		let transform;
		let client;

		function getChannel() {
			return Promise.resolve({
				id: 'abc',
				secrets: {
					ooyala: {
						backlotApiKey: 'api-key-foo',
						backlotSecretKey: 'api-secret-bar',
						providerId: 'provider-id'
					}
				}
			});
		}

		beforeAll(function (done) {
			const bus = this.createBus();

			client = provider.createClient({apiKey: 'foo', secretKey: 'bar'});
			spyOn(client, 'getAsset').and.returnValue(Promise.resolve(asset));
			spyOn(client, 'getAssetMetadata').and.returnValue(Promise.resolve(metadata));
			spyOn(client, 'getAssetStreams').and.returnValue(Promise.resolve(streams));
			spyOn(fetchPlayableUrl, 'makeRequest').and.returnValue(Promise.resolve(playableUrls));

			transform = jasmine.createSpy('transform').and.returnValue(video);

			const assetHandler = provider.createAssetHandler(bus, getChannel, client, transform);

			return assetHandler({spec})
				.then(res => {
					result = res;
				})
				.catch(err => {
					error = err;
				})
				.then(done);
		});

		it('has a result', function () {
			expect(result.VIDEO).toBe('VIDEO');
		});

		it('calls client.getAsset', function () {
			expect(client.getAsset).toHaveBeenCalledTimes(1);
			expect(client.getAsset).toHaveBeenCalledWith({
				assetId: spec.asset.external_id,
				apiKey: 'api-key-foo',
				secretKey: 'api-secret-bar'
			});
		});

		it('calls client.getAssetMetadata', function () {
			expect(client.getAssetMetadata).toHaveBeenCalledTimes(1);
			expect(client.getAssetMetadata).toHaveBeenCalledWith({
				assetId: spec.asset.external_id,
				apiKey: 'api-key-foo',
				secretKey: 'api-secret-bar'
			});
		});

		it('calls client.getAssetStreams', function () {
			expect(client.getAssetStreams).toHaveBeenCalledTimes(1);
			expect(client.getAssetStreams).toHaveBeenCalledWith({
				assetId: spec.asset.external_id,
				apiKey: 'api-key-foo',
				secretKey: 'api-secret-bar'
			});
		});

		it('calls the transform', function () {
			expect(transform).toHaveBeenCalledTimes(1);
			const args = transform.calls.allArgs()[0];
			expect(args[0]).toBe(spec);
			expect(args[1]).toBe(asset);
			expect(args[1].meta).toBe(metadata);
			expect(args[1].streams).toBe(streams);
		});

		it('does not have an error', function () {
			expect(error).toBe(null);
		});
	});

	describe('with Channel secrets and skip metadaa and streams', function () {
		let result = null;
		let error = null;
		const asset = {ASSET: 'ASSET'};
		const video = {VIDEO: 'VIDEO'};
		const metadata = {METADATA: 'METADATA'};
		const streams = {STREAMS: 'STREAMS'};
		const spec = {
			channel: 'abc',
			type: 'videoSpec',
			id: 'spec-123',
			asset: {external_id: 'foo'} // eslint-disable-line camelcase
		};
		let transform;
		let client;

		function getChannel() {
			return Promise.resolve({
				id: 'abc',
				secrets: {
					ooyala: {
						backlotApiKey: 'api-key-foo',
						backlotSecretKey: 'api-secret-bar',
						providerId: 'provider-id',
						skipMetadata: true,
						skipStreams: true,
						skipPlayableUrl: true
					}
				}
			});
		}

		beforeAll(function (done) {
			const bus = this.createBus();

			client = provider.createClient({apiKey: 'foo', secretKey: 'bar'});
			spyOn(client, 'getAsset').and.returnValue(Promise.resolve(asset));
			spyOn(client, 'getAssetMetadata').and.returnValue(Promise.resolve(metadata));
			spyOn(client, 'getAssetStreams').and.returnValue(Promise.resolve(streams));
			spyOn(fetchPlayableUrl, 'makeRequest');

			transform = jasmine.createSpy('transform').and.returnValue(video);

			const assetHandler = provider.createAssetHandler(bus, getChannel, client, transform);

			return assetHandler({spec})
				.then(res => {
					result = res;
				})
				.catch(err => {
					error = err;
				})
				.then(done);
		});

		it('has a result', function () {
			expect(result.VIDEO).toBe('VIDEO');
		});

		it('calls client.getAsset', function () {
			expect(client.getAsset).toHaveBeenCalledTimes(1);
			expect(client.getAsset).toHaveBeenCalledWith({
				assetId: spec.asset.external_id,
				apiKey: 'api-key-foo',
				secretKey: 'api-secret-bar'
			});
		});

		it('does not call client.getAssetMetadata', function () {
			expect(client.getAssetMetadata).not.toHaveBeenCalled();
		});

		it('does not call client.getAssetStreams', function () {
			expect(client.getAssetStreams).not.toHaveBeenCalled();
		});

		it('does not call for the playable URL', function () {
			expect(fetchPlayableUrl.makeRequest).not.toHaveBeenCalled();
		});

		it('calls the transform', function () {
			expect(transform).toHaveBeenCalledTimes(1);
			const args = transform.calls.allArgs()[0];
			expect(args[0]).toBe(spec);
			expect(args[1]).toBe(asset);
			expect(args[1].meta).toEqual({});
			expect(args[1].streams).toEqual([]);
		});

		it('does not have an error', function () {
			expect(error).toBe(null);
		});
	});

	describe('fetch playable stream', function () {
		let result = null;
		let error = null;
		const asset = {ASSET: 'ASSET', embed_code: 'EMBED_CODE'}; // eslint-disable-line camelcase
		const video = {VIDEO: 'VIDEO'};
		const metadata = {METADATA: 'METADATA'};
		const streams = {STREAMS: 'STREAMS'};
		const spec = {
			channel: 'abc',
			type: 'videoSpec',
			id: 'spec-123',
			getPlayableUrl: true,
			asset: {external_id: 'foo', embed_code: 'EMBED_CODE'} // eslint-disable-line camelcase
		};

		const playableUrls = {authorization_data: { // eslint-disable-line camelcase
			EMBED_CODE: {
				streams: [{url: {data: 'aHR0cDovL3NvbWUtdXJsLmNvbS9wbGF5ZXIvaXBob25lL2Zvbw=='}}]
			}
		}};

		let transform;
		let client;

		function getChannel() {
			return Promise.resolve({
				id: 'abc',
				secrets: {
					ooyala: {
						backlotApiKey: 'api-key-foo',
						backlotSecretKey: 'api-secret-bar',
						providerId: 'provider-id',
						skipMetadata: true,
						skipStreams: true
					}
				}
			});
		}

		beforeAll(function (done) {
			const bus = this.createBus();

			client = provider.createClient({apiKey: 'foo', secretKey: 'bar'});
			spyOn(client, 'getAsset').and.returnValue(Promise.resolve(asset));
			spyOn(client, 'getAssetMetadata').and.returnValue(Promise.resolve(metadata));
			spyOn(client, 'getAssetStreams').and.returnValue(Promise.resolve(streams));
			spyOn(fetchPlayableUrl, 'makeRequest').and.returnValue(Promise.resolve(playableUrls));

			transform = jasmine.createSpy('transform').and.returnValue(video);

			const assetHandler = provider.createAssetHandler(bus, getChannel, client, transform);

			return assetHandler({spec})
				.then(res => {
					result = res;
				})
				.catch(err => {
					error = err;
				})
				.then(done);
		});

		it('has a result', function () {
			expect(result.VIDEO).toBe('VIDEO');
		});

		it('makes request for url', function () {
			expect(fetchPlayableUrl.makeRequest).toHaveBeenCalledTimes(1);
			const params = fetchPlayableUrl.makeRequest.calls.allArgs()[0][0];
			expect(params.method).toBe('GET');
			expect(params.url).toBe('http://player.ooyala.com/sas/player_api/v1/authorization/embed_code/provider-id/EMBED_CODE?device=roku&domain=www.ooyala.com&supportedFormats=m3u8');
		});

		it('calls the transform', function () {
			expect(transform).toHaveBeenCalledTimes(1);
			const args = transform.calls.allArgs()[0];
			expect(args[0]).toBe(spec);
			expect(args[1]).toBe(asset);
			expect(args[1].meta).toEqual({});
			expect(args[1].streams).toEqual([{
				label: 'hls-playable',
				url: 'http://some-url.com/player/appletv/foo'
			}]);
		});

		it('does not have an error', function () {
			expect(error).toBe(null);
		});
	});
});
