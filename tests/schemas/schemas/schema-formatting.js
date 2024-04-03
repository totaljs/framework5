NEWSCHEMA('Address', 'name:String,email:Email,address:String');
NEWSCHEMA('Formatting', function(schema) {
	schema.action('exec', {
		name: 'action with input data',
		input: 'number:Number,number_float:Number,string:String,string_name:Name,string_capitalize:Capitalize,string_capitalize2:Capitalize2,string_lowercase:Lowercase,string_uppercase:Uppercase,datauri:DataURI,zip:ZIP,icon:Icon,color:Color,guid:GUID,tinyint:TinyInt,smallint:SmallInt,enums:{red|green|blue},inlineobject:{name:String,email:Email},arrayobj:[name:String,email:Email],linkedschema:@Address',
		action: function($, model) {
			console.log(model);
			$.callback(model);
		}
	});
});