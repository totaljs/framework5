NEWSCHEMA('Methods', function(schema) {
	schema.action('exec', {
		name: 'Exec action',
		action: function($) {
			$.success();
		}
	});
});