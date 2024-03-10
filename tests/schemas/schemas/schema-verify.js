NEWSCHEMA('Verify', function(schema) {
	schema.action('verify', {
		name: 'Verification action',
		action: function($) {
			var countries = ['en', 'sk', 'cz', 'ru'];
	
			// Asynchronous simulation
			setTimeout(function() {
				var result = countries.find(i => i === $.value);
				if (result)
					$.done(result);
				else
					$.invalid(400);
	
			}, 100);
	
		}
	});
});