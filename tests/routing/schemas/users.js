NEWSCHEMA('@Users', function(schema) {

	schema.action('list', {
		name: 'Listing action',
		action: $ => $.success(true)
	});
	
	schema.action('read', {
		name: 'Read specific user',
		params: '*id:Number',
		action: $ => $.success(true)
	});

	schema.action('insert', {
		name: 'Insert new lement',
		input: '*name:Name,*email:Email,phone:Phone',
		action: ($, model) => $.success(model)
	});

	schema.action('update', {
		name: 'Insert new lement',
		params: '*id:Number',
		input: '*name:Name,*email:Email,phone:Phone',
		action: ($, model) => $.success(true)
	});

	schema.action('delete', {
		name: 'Delete specific user',
		params: '*id:Number',
		action: $ => $.success(true)
	});


	schema.action('api_basic', {
		name: 'Test basic api',
		action: $ => $.success(true)
	});


	schema.action('validation', {
		name: 'Test validation',
		input: '*valid:String,*invalid:Number',
		action: $ => $.success(true)
	});
});