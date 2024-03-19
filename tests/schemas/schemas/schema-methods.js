NEWSCHEMA('Methods', function(schema) {
	schema.action('query', {
		name: 'Query action',
		action: function($) {
			$.success([]);
		}
	});

	schema.action('read', {
		name: 'Read action',
		params: 'id:UID',
		action: function($) {
			$.success([]);
		}
	});

	schema.action('insert', {
		name: 'Insert action',
		input: 'value:String',
		action: function($, model) {
			$.success(model);
		}
	});

	schema.action('update', {
		name: 'Update action',
		input: 'value:String',
		params: 'id:UID',
		action: function($, model) {
			$.success(model);
		}
	});


	schema.action('patch', {
		name: 'Patch action',
		input: 'value:String',
		params: 'id:UID',
		action: function($, model) {
			$.success(model);
		}
	});
	schema.action('remove', {
		name: 'Remove action',
		params: 'id:UID',
		action: function($) {
			$.success();
		}
	});
});