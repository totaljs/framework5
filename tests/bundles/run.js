/* eslint-disable */
require('../../index');
require('../../test');

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = true;

var url = 'http://localhost:3000/';
var filename = 'myapp.bundle';
var bundle_link = 'https://raw.githubusercontent.com/totaljs/flow/master/--bundles--/app.bundle';
F.run({ release: false, port: 5000 });
ON('ready', function() {
    console.log('nodejs');
	Test.push('Bundles', function(next) {
		var arr = [];
		arr.push(async function(resume) {
            var child = NEWTHREAD('~./index.js');
            console.log(child);
                child.on('message', function(msg) {
                    RESTBuilder.GET(url).exec(function(err, response) {
                        Test.print('From local', err === null ? null : 'App is not successfully started');
                        setTimeout(() => resume(), 3000);
                    });
                });
		});
	
		arr.push(function(resume) {
			var file = 'console.log(window);';
	        var filename = PATH.root('public/js/--ui.js');
            RESTBuilder.POST(url + 'bundles/merge', { filename: filename, content: file }).exec(function(err, res, out) {
                console.log(err, res, out);
                resume();
            });
		});
	
		arr.push(function(resume) {
			RESTBuilder.GET(url + 'ui.js').callback(function(err, res, output) {
                console.log(err, res, output);
				Test.print('Test endpoint', err == null ? null : 'Failed to write merge file');
	
				resume();
			});
		});
	
		// arr.push(function(resume) {
			// PATH.unlink(PATH.root('bundles/' + filename), function() {
				// Test.print('From local', err === null ? null : 'App is not successfully started');
				// resume();
			// });
		// });
	
		arr.async(function() {
			next();
		});
	});
    setTimeout(() => Test.run(), 1000);
});

