NEWSCHEMA('Schema/Chaining', function(schema) {

	schema.define('value', 'Object', true);

	schema.action('one', {
		name: 'Action number one',
		input: 'value:Object',
		action: function($, model) {
			$.success(model.value.one);
		}
	});

	schema.action('two', {
		name: 'Action number two',
		input: 'value:Object',
		action: function($, model) {
			$.success(model.value.two);
		}
	});

	
});