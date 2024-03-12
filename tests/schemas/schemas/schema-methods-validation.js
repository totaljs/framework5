NEWSCHEMA('Validation', function(schema) {

	schema.action('exec', {
		name: 'Exec action',
		input: '*email:Email',
		action: function($) {
			$.success();
		}
	});
});