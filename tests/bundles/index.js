/* eslint-disable */
require('../../index');
require('../../test');

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = false;
F.http();

var url = 'http://localhost:8000/';
var filename = 'openreports.bundle';
var bundle_link = 'https://raw.githubusercontent.com/totaljs/flow/master/--bundles--/app.bundle';
ON('ready', function() {

	Test.push('Bundles', function(next) {
		// Test.print('String.slug()', [error]);
		var arr = [];

		arr.push(function(next_fn) {
			RESTBuilder.GET(url).exec(function(err, response) {
				console.log(err, response);
				Test.print('From local', err === null ? null : 'App is not successfully started ');
				PATH.unlink(PATH.root('bundles/' + filename), function() {
					F.restart();
					next_fn()
				});
			});
		});

		arr.push(function(next_fn) {
			next_fn();
		});

		arr.push(function(next_fn) {
			next_fn();
		});

		arr.async(function() {

			next();
		});
	});

	setTimeout(function(){
		Test.run(function() {
			//process.exit(0);
		});

	}, 600);
});