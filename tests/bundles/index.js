/* eslint-disable */
require('../../index');
require('../../test');

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = false;
F.http({ port: 3000 });

var url = 'http://localhost:5000/';
var filename = 'openreports.bundle';
var bundle_link = 'https://raw.githubusercontent.com/totaljs/flow/master/--bundles--/app.bundle';

ON('ready', function() {

	Test.push('Bundles', function(next) {
		// Test.print('String.slug()', [error]);
		var arr = [];

		arr.push(function(resume) {
			RESTBuilder.GET(url).exec(function(err, response, output) {
				console.log(err, output);
				Test.print('From local', err === null ? null : 'App is not successfully started ');
				PATH.unlink(PATH.root('bundles/' + filename), function() {
					F.restart();
					resume()
				});
			});
		});

		arr.push(function(resume) {
			resume();
		});

		arr.push(function(resume) {
			resume();
		});

		arr.async(function() {
			next();
		});
	});

	setTimeout(() => Test.run(), 600);
});