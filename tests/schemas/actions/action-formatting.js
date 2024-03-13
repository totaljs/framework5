NEWACTION('Formatting/exec', {
	name: 'action with input data',
	input: 'number:Number,number_float:Number,string:String,string_name:Name,string_capitalize:Capitalize,string_capitalize2:Capitalize2,string_lowercase:Lowercase,string_uppercase:Uppercase',
	action: function($, model) {
		$.callback(model);
	}
});