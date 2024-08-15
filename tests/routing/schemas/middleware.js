NEWSCHEMA('Middleware', function(schema) {

	schema.action('exec', {
		name: 'Execution action',
		action: function($) {
			$.success();
		}
	});
});
