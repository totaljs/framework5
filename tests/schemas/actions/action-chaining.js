
NEWACTION('Chaining/one', {
	name: 'Action number one',
	input: 'value:Object',
	action: function($, model) {
		$.success(model.value.one);
	}
});



NEWACTION('Chaining/two', {
	name: 'Action number two',
	input: 'value:Object',
	action: function($, model) {
		$.success(model.value.two);
	}
});