# Oddworks Ooyala Provider

[![pipeline status](https://gitlab.com/oddnetworks/oddworks/ooyala-provider/badges/master/pipeline.svg)](https://gitlab.com/oddnetworks/oddworks/ooyala-provider/commits/master)

An Ooyala provider plugin for the Oddworks content server.

Installation
------------
Install the npm package as a Node.js library:

    npm install --save oddworks-ooyala-provider

For full Ooyala Backlot API documentation see [support.ooyala.com/developers/documentation/concepts/chapter_api_setup.html](http://support.ooyala.com/developers/documentation/concepts/chapter_api_setup.html).

Oddworks Server Integration
---------------------------
The Oddworks-Ooyala provider is designed to be integrated with an Oddworks server [catalog](https://gitlab.com/oddnetworks/oddworks/core/tree/master/lib/services/catalog), specifically as a [provider](https://gitlab.com/oddnetworks/oddworks/core/tree/master/lib/services/catalog#providers). To initialize the plugin in your server:

```JavaScript
const ooyalaProvider = require('oddworks-ooyala-provider');

// See https://gitlab.com/oddnetworks/oddworks/core/tree/master/lib/services/catalog#patterns
// for more information regarding an Oddcast Bus.
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    apiKey: process.env.OOYALA_API_KEY,
    secretKey: process.env.OOYALA_SECRET_KEY
};

ooyalaProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

The initialization process will attach Oddcast listeners for the following queries:

- `bus.query({role: 'provider', cmd: 'get', source: 'ooyala-label-provider'})`
- `bus.query({role: 'provider', cmd: 'get', source: 'ooyala-asset-provider'})`

To use them you send Oddcast commands to save a specification object:

```JavaScript
// To create a collection based on a Backlot label:
bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, {
    channel: 'abc',
    type: 'collectionSpec',
    source: 'ooyala-label-provider',
    label: {id: '123456'}
});

// To create a video based on a Backlot asset:
bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, {
    channel: 'abc',
    type: 'videoSpec',
    source: 'ooyala-asset-provider',
    asset: {external_id: '123456'}
});
```

#### Transform Functions
This library provides a default transform function for collections and assets. Usually you don't want to use the default. You'll want to provide your own like this:

```JavaScript
const ooyalaProvider = require('oddworks-ooyala-provider');
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    collectionTransform: myCollectionTransform,
    assetTransform: myAssetTransform
};

ooyalaProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

Your transform functions `myCollectionTransform` and `myAssetTransform` will be called when the `ooyala-label-provider` and `ooyala-asset-provider` have respectively received a response from the Backlot API. Each transform will be called with 2 arguments: The spec object and the Backlot API response object.

See `lib/default-asset-transform` and `lib/default-collection-transform` for more info.

Ooyala API Client
-----------------
You can create a stand-alone API client outside of the Oddworks provider:

```JavaScript
const ooyalaProvider = require('oddworks-ooyala-provider');

const client = ooyalaProvider.createClient({
    bus: bus,
    apiKey: process.env.OOYALA_API_KEY,
    secretKey: process.env.OOYALA_SECRET_KEY
});
```

The client can also be initialized with the high performance GET API using the `baseUrl` option (see below).

### Client Methods
All methods return a Promise.

- `client.getLabels()`
- `client.getLabel({labelId})`
- `client.getChildLabels({labelId})`
- `client.getAssetsByLabel({labelId})`
- `client.getAsset({assetId})`
- `client.getAssetMetadata({assetId})`
- `client.getAssetStreams({assetId})`

Command Line Interface
----------------------
You can interact with the Backlot client using the CLI tool. To get started, run:

    bin/backlot --help

To authenticate the API you'll need to export the following environment variables:

- `BACKLOT_API_KEY` The Backlot API key
- `BACKLOT_SECRET_KEY` The Backlot secret key

To get help with commands:

    bin/backlot list --help
    bin/backlot req --help

High Performance API
--------------------
Ooyala offers a [CDN API](http://support.ooyala.com/developers/documentation/concepts/api_high_performance.html) for serving GET requests only, which may be preferable to the standard Backlot API. To use it, initialize the provider like this:

```JavaScript
const ooyalaProvider = require('oddworks-ooyala-provider');

const options = {
    bus: bus,
    apiKey: process.env.OOYALA_API_KEY,
    secretKey: process.env.OOYALA_SECRET_KEY,
    // Use the high performance API
    baseUrl: 'https://cdn-api.ooyala.com'
};

ooyalaProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)
