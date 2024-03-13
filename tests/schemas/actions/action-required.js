NEWACTION('Required/exec',{
	name: 'action with input data',
	input: '*number:Number,*email:Email,*phone:Phone,*boolean:Boolean,*uid:UID,*base64:Base64,*url:URL,*object:Object,*date:Date,*json:JSON',
	action: function($, model) {
		$.callback(model);
	}
});