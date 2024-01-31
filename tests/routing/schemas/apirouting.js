NEWSCHEMA('APIRoutes', function(schema) {

    schema.action('success', {
        name: 'Success action',
        input: 'valid:String',
        action: function($, model) {
		    $.success(model);
        }
    });

    schema.action('keys', {
        name: 'Get keys',
        action: function($) {
		    $.success($.keys);
        }
    });

    schema.action('one', {
        name: 'Get one',
        action: function($) {
		    $.success();
        }
    });
    
    schema.action('two', {
        name: 'Get two',
        action: function($) {
		    $.success();
        }
    });
});