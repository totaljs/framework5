/* eslint-disable */

require('../../index');
require('../../test');

// HTTP routing
// API routing
// WebSocket routing + WebSocketClient (text, json and binary communication)
// File routing
// Removing routess

// load web server and test app
F.http();

ON('ready', function() {

	Test.push('A test name', function(next) {
		// Test.print('String.slug()', [error]);
		Test.print('String.slug()');
		next();
	});

	Test.run(function() {
		process.exit(0);
	});

});