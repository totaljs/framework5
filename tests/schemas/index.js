/* eslint-disable */

require('../../index');
require('../../test');

// NEWACTION()
// NEWSCHEMA()
// ACTION()
// JSON schema types defined in the ACTIONS

F.console = NOOP;

// load web server and test app
F.http();

ON('ready', function() {
	Test.push('NEWACTION()', function(next) {

		// Test.print('String.slug()', [error]);
		Test.print('Test');
		next();
	});
	
	
	Test.run();
});
