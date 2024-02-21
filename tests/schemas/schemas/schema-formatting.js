NEWSCHEMA('Schema/Formatting', function(schema) {

	schema.define('number', 'Number');
	schema.define('number_float', 'Number');
	schema.define('string', 'String');
	schema.define('string_name', 'Name');
	schema.define('string_capitalize', 'Capitalize');
	schema.define('string_capitalize2', 'Capitalize2');
	schema.define('string_lowercase', 'Lowercase');
	schema.define('string_uppercase', 'Uppercase');
	schema.action('exec', {
		name: 'action with input data',
		input: 'number:Number,number_float,string_name:Name,string_capitalize:Capitalize,string_capitalize2:Capitalize2,string_lowecase:Lowercase,string_uppercase:Uppercase',
		action: function($, model) {
			$.callback(model);
		}
	});

});