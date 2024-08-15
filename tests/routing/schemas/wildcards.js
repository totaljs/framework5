NEWSCHEMA('Wildcards', function(schema) {

	schema.action('one', {
		name: 'One action',
		action: function($) {
			$.success(1);
		}
	});

	schema.action('two', {
		name: 'Two action',
		action: function($) {
			$.success(2);
		}
	});

	schema.action('three', {
		name: 'Three action',
		action: function($) {
			$.success(3);
		}
	});

	schema.action('four', {
		name: 'Four action',
		action: function($) {
			$.success(4);
		}
	});

	schema.action('five', {
		name: 'Five action',
		action: function($) {
			$.success(5);
		}
	});

});
