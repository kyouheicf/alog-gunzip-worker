/*
{
	"account":"xxx",
	"bucket":"alog-gzip",
	"object":{
		"key":"20240819T161800Z_20240819T161800Z_a60c6cb5.log.gz",
		"size":0,
		"eTag":"d41d8cd98f00b204e9800998ecf8427e"
	},
	"action":"PutObject",
	"eventTime":"2024-08-21T15:10:40.624Z"
}
*/
import { ungzip } from 'pako';

export interface Env {
	LOGPUSH_BUCKET: R2Bucket;
	MOUNT_BUCKET: R2Bucket;
}
  
export default {
	async queue(batch, env): Promise<void> {
		// A queue consumer can make requests to other endpoints on the Internet,
		// write to R2 object storage, query a D1 Database, and much more.
		for (const message of batch.messages) {
			// Process each message (we'll just log these)
			console.log(`Message: ${JSON.stringify(message.body)}`);
			const fileName = message.body["object"]["key"];
			console.log(`object.key: ${fileName}`);
			//gunzip data into decompressedData
			const response = await env.LOGPUSH_BUCKET.get(fileName);
			const decompressedData = ungzip(new Uint8Array(await response.arrayBuffer()));
			// Write the batch of messages to R2
			console.log(`object.target: ${fileName.split('.')[0]}`);
			const fileTargetName = fileName.split('.')[0] + ".csv";
			await env.MOUNT_BUCKET.put(fileTargetName, decompressedData, {
				httpMetadata: {
					contentType: "text/csv",
				},
			});
			// Explicitly acknowledge the message as delivered
			message.ack();
		}
	},
} satisfies ExportedHandler<Env>;