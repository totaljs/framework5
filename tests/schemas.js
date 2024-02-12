/* eslint-disable */

require('../index');
require('../test');

// NEWACTION()

// NEWSCHEMA()
// ACTION()
// JSON schema types defined in the ACTIONS

F.console = NOOP;

// load web server and test app
F.http();



var url = 'http://0.0.0.0:8000';

ON('ready', function() {
	Test.push('NEWACTION()', function(next) {

		
		NEWACTION('success', {
			input: 'valid:String',
			action: function($, model) {
				$.success(model);
			}
		});
		
		NEWACTION('keys', {
			input: 'valid:String',
			action: function($) {
				$.success($.keys);
			}
		});
		
		NEWACTION('one', {
			action: function($) {
				$.success();
			}
		});
		
		NEWACTION('two', {
			action: function($) {
				$.success();
			}
		});
		// Test.print('String.slug()', [error]);
		Test.print('Test');
		next();
	});
	
	
	Test.run();
});
