NEWSCHEMA('Formatting', function(schema) {
	schema.action('exec', {
		name: 'action with input data',
		input: 'number:Number,number_float,string_name:Name,string_capitalize:Capitalize,string_capitalize2:Capitalize2,string_lowecase:Lowercase,string_uppercase:Uppercase',
		action: function($, model) {
			$.callback(model);
		}
	});
});