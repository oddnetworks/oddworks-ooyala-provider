# Oddworks Ooyala Provider

An Ooyala provider plugin for the Oddworks content server.

Installation
------------
Install the npm package as a Node.js library:

    npm install --save oddworks-ooyala-provider

For full Ooyala Backlot API documentation see [support.ooyala.com/developers/documentation/concepts/chapter_api_setup.html](http://support.ooyala.com/developers/documentation/concepts/chapter_api_setup.html).

Oddworks Server Integration
---------------------------
The Oddworks-Ooyala provider is designed to be integrated with an Oddworks server [catalog](https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog), specifically as a [provider](https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#providers). To initialize the plugin in your server:

```JavaScript
const ooyalaProvider = require('oddworks-ooyala-provider');

// See https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#patterns
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
