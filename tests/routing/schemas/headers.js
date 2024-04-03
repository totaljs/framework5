NEWSCHEMA('Headers', function(schema) {

	schema.action('xtoken', {
		name: 'X-Token Action',
		action: function($) {
			$.success($.headers['x-token']);
		}
	});

});
