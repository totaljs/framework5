/* eslint-disable */
require('../../index');
require('../../test');
var worker = NEWTHREAD();

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = true;
F.http({ release: true, port: 3000 });
ON('ready', function() {
	//console.log('READY');
	DEBUG = true;
	setTimeout( function() {
	worker.postMessage(JSON.stringify({ ready: true }));
	setTimeout(process.exit, 1000);
	}, 3000);
});



