NEWACTION('Verify/exec', {
	name: 'Verification action',
	action: function($, model) {
		var countries = ['en', 'sk', 'cz', 'ru'];
		// Asynchronous simulation
		setTimeout(function() {
			var result = countries.find(i => i === model.countryid);
			if (result)
				$.done(result)();
			else
				$.invalid(400);
		}, 100);
	}
});