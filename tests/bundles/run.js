/* eslint-disable */
require('../../index');
require('../../test');

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

// load web server and test app
CONF.$imprint = true;

var url = 'http://localhost:3000/';
var filename = 'app.bundle';
var bundle_link = 'https://raw.githubusercontent.com/totaljs/flow/master/--bundles--/app.bundle';
var trash = ['index.js.map', 'bundles/' + filename];
Test.push('Bundles', function(next) {
    var arr = [];

    arr.push(function(resume) {
        var app = PATH.root('app');
        SHELL('cd ' + app + ' && ' + ' total5 bundle app && cp app.bundle ' + PATH.root('bundles/app.bundle'), function(err) {
            resume();
        });
    });

    arr.push(async function(resume) {
        var child = NEWTHREAD('~./index.js');
            child.on('message', function(msg) {
                RESTBuilder.GET(url).exec(function(err, response) {
                    Test.print('From local', err === null ? null : 'App is not successfully started');
                    resume()
                });
            });
    });

    arr.push(function(resume) {
        var file = 'console.log(window);';
        var filename = PATH.root('/.src/public/js/--ui.js');
        RESTBuilder.POST(url + 'bundles/merge', { filename: filename, content: file }).exec(function(err, res, out) {
            resume();
        });
    });

    arr.push(function(resume) {
        RESTBuilder.GET(url + 'ui.js').callback(function(err, res, output) {
            Test.print('Test endpoint', err == null ? null : 'Failed to write merge file');
            resume();
        });
    });

    arr.push(function(resume) {
        PATH.unlink(PATH.root('bundles/' + filename), function() {
            PATH.exists(PATH.root('bundles/' + filename), function(exists) {
                Test.print('Remove bundle', !exists ? null : 'Failed to remove the bundle');
                resume();
            });
        });
    });

    arr.push(function(resume) {
        RESTBuilder.GET(bundle_link).callback(function(err, response, output) {
            Test.print('Download bundle', err === null ? null : 'Failed to download bundle from CDN' + err);
            Total.Fs.writeFile(PATH.root('bundles/' + filename), output.response, function(error) {
                Test.print('Save bundle', err === null ? null : 'Failed to save the bundle file' + error);
                resume();
            });
        });
    });

    arr.push(async function(resume) {
        var child = NEWTHREAD('~./index.js');
        child.on('message', function(msg) {
            // check if at least a known expected file like modules/cdn.js exists in the unpacked bundle
            PATH.exists(PATH.root('.src/modules/cdn.js'), function(exists) {
                Test.print('Successfully run downloaded bundle', exists ? null : 'Failed to run the downloaded bundle');
                resume();
            });
        });
    });

    arr.push(function(resume) {
        trash.wait(function(item, next) {
            var path = PATH.root(item);
            PATH.unlink(path, NOOP);
            next();
        }, function(err) {
            PATH.rmdir(PATH.root('.src'), function() {
                Test.print('Clean up', !err ? null : 'Failed to Clean up the trash');
                resume();
            });
        });
    });

    arr.async(function() {
        next();
    });
});
setTimeout(() => {
    Test.run(process.exit);
}, 1000);

