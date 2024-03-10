/* eslint-disable */

require('../../index');
require('../../test');

// NEWSCHEMA()
// NEWACTION()
// ACTION()
// JSON schema types defined in the ACTIONS

F.console = NOOP;
var url = 'http://0.0.0.0:8000';
// load web server and test app
F.http();
ON('ready', function() {
	Test.push('NEWSCHEMA()', function(next) {
		// Test.print('String.slug()', [error]);

		var arr = [];
		var methods = ['query', 'read', 'update', 'patch', 'remove', 'insert'];

		arr.push(function(next_fn) {
			methods.wait(function(item, fn) {
				RESTBuilder.GET(url + '/schema/methods/' + item).exec(function(err, res, output) {
					console.log(output);
					Test.print('Methods (GET) ' + item, err === null && res.success ? null : item + ' Failed');
					fn();
				});
			}, function() {
				next_fn();
			});
		});


		arr.async(function() {
			next();
		});
		
		Test.print('Test');
		next();
	});
	
	Test.run();
});
