NEWACTION('Actions/success', {
	input: 'valid:String',
	action: function($, model) {
		$.success(model);
	}
});

NEWACTION('Actions/keys', {
	input: 'valid:String',
	action: function($) {
		$.success($.keys);
	}
});

NEWACTION('Actions/one', {
	action: function($) {
		$.success();
	}
});

NEWACTION('Actions/two', {
	action: function($) {
		$.success();
	}
}); 