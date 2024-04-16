/* eslint-disable */
require('../../index');
require('../../test');

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = true;

var url = 'http://localhost:8000';
var filename = 'myapp.bundle';
var bundle_link = 'https://raw.githubusercontent.com/totaljs/flow/master/--bundles--/app.bundle';

F.run({ released: false });

Test.push('Bundles', function(next) {
	var arr = [];
	arr.push(function(resume) {
		RESTBuilder.GET(url).exec(function(err, response) {
			Test.print('From local', err === null ? null : 'App is not successfully started');
			resume();
		});
	});

	arr.push(function(resume) {
		PATH.mkdir(PATH.root('public/js'));
		var file = 'console.log(window);';
		var filename = PATH.root('public/js/--ui.js');
		console.log(filename);
		Total.Fs.writeFile(filename, file, function(err) {
			if (err)
				throw err;
			Test.print('Write merge file', err == null ? null : 'Failed to write merge file');
			resume();
		});
	});

	arr.push(function(resume) {
		RESTBuilder.GET(url + 'ui.js').callback(function(err, res, output) {
			console.log(res, output);
			//Test.print('Test endpoint', err == null ? null : 'Failed to write merge file');

			resume();
		});
	});

	// arr.push(function(resume) {
		// PATH.unlink(PATH.root('bundles/' + filename), function() {
			// Test.print('From local', err === null ? null : 'App is not successfully started');
			// resume();
		// });
	// });

	// arr.async(function() {
		// next();
	// });
});

setTimeout(() => Test.run(), 1000);
