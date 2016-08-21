'use strict';

module.exports = function defaultAssetTransform(spec, asset) {
	// The spec object will contain, at a minimum:
	//   spec.id - String
	//   spec.type - "videoSpec"
	//   spec.channel - String
	//   spec.source - "ooyala-asset-provider"

	// Additionally, the spec object will contain any other attributes you
	// assigned to it when you saved it.

	// The asset object will look like this:
	//
	// {
	//   "asset_type": "remote_asset",
	//   "created_at": "2016-07-29T05:31:26Z",
	//   "description": "",
	//   "duration": 77369,
	//   "embed_code": "E1OTAxNTE6J1iCCeMoUk6rTDZoXl-EPf",
	//   "external_id": null,
	//   "name": "Ooyala Pulse Animation.mp4",
	//   "preview_image_url": "http://cf.c.ooyala.com/VqbzAwNTE6_98ZWv-Lpe0Rk6iiPwf3RT/Ut_HKthATH4eww8X4xMDoxOjA4MTsiGN",
	//   "status": "live",
	//   "stream_urls": {
	//     "flash": "http://cf.c.ooyala.com/VqbzAwNTE6_98ZWv-Lpe0Rk6iiPwf3RT/VqbzAwNTE6_98ZWv-Lpe0Rk6iiPwf3RT_1.f4m",
	//     "iphone": null,
	//     "ipad": null,
	//     "itunes": null,
	//     "source_file": null,
	//     "smooth": null
	//   },
	//   "time_restrictions": null,
	//   "updated_at": "2016-07-29T05:31:26Z",
	//   "hosted_at": null,
	//   "original_file_name": null,
	//   "is_live_stream": false,
	//   "publishing_rule_id": "c06085a0f98f48f68d608609502b20b0",
	//   "ad_set_id": null,
	//   "player_id": "efe1ffa281494aefbe12af13daff54d1",
	//   "meta": {
	//     "SegmentOrder": "3",
	//     "date": "August 18, 2016",
	//     "host1": "Bill Doe",
	//     "publishdate": "8/18/2016",
	//     "topic1": "Benjamin Franklin",
	//     "topic2": "Founding Fathers",
	//     "topic3": "Constitution",
	//     "topic4": "Declaration of Independence"
	//   },
	//   "streams": [
	//     {
	//       "profile": "baseline",
	//       "video_height": 136,
	//       "video_width": 240,
	//       "is_source": false,
	//       "file_size": 6192720,
	//       "audio_codec": "aac",
	//       "video_codec": "h264",
	//       "average_video_bitrate": 150,
	//       "stream_type": "abr",
	//       "url": "http://player.ooyala.com/player/iphone/xzYzc0NTE6VzfuPoW893mFj36Xoe2Uoa.m3u8",
	//       "audio_bitrate": 32,
	//       "muxing_format": "TS"
	//     }
	//   ]
	// }

	return Object.assign({}, spec, asset, {
		title: asset.name,
		description: asset.description,
		images: {
			aspect16x9: asset.preview_image_url
		},
		player: {
			type: 'ooyala',
			embedCode: asset.embed_code || asset.external_id
		},
		meta: asset.meta || {}
	});
};
