/* eslint-disable */
require('../../index');
require('../../test');

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = true;

var url = 'http://localhost:8000/';
var filename = 'myapp.bundle';
var bundle_link = 'https://raw.githubusercontent.com/totaljs/flow/master/--bundles--/app.bundle';


Test.push('Bundles', function(next) {
	var arr = [];
	arr.push(function(resume) {

		RESTBuilder.GET(url).exec(function(err, response) {
			console.log(err, response);
			Test.print('From local', err === null ? null : 'App is not successfully started');
			Total.Path.unlink(PATH.root('bundles/' + filename), function() {
				Test.print('From local', err === null ? null : 'App is not successfully started');
				F.restart();
				resume();
			});
		});
	});

	arr.push(function(resume) {
		var file = `exports.install = function() {

ROUTE('GET /bundle/merge/', function($) {
$.plain('bundle is merged');
});`;
		var filename = Total.Path.controllers('--merge.js');
		console.log(filename);
		Total.Fs.writeFile(filename, file, function(err) {
			if (err)
				throw err;

		});
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
