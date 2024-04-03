NEWSCHEMA('Notrequired', function(schema) {
	schema.action('exec', {
		name: 'action with input data',
		input: 'number:Number,email:Email,phone:Phone,boolean:Boolean,uid:UID,base64:Base64,url:URL,object:Object,date:Date,json:JSON,datauri:DataURI,zip:ZIP,icon:Icon,color:Color,guid:GUID,tinyint:TinyInt,smallint:SmallInt,enums:{red|green|blue},inlineobject:{name:String,email:Email},arrayobj:[name:String,email:Email],linkedschema:@Address',
		action: function($, model) {
			console.log(model);
			$.success(model);
		}
	});
});