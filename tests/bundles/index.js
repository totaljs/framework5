/* eslint-disable */
require('../../index');
require('../../test');
var worker = NEWTHREAD();

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = true;
F.run({ release: false, port: 3000 });
ON('ready', function() {
	worker.postMessage({ ready: true });
});



