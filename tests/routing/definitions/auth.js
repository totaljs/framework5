var USER = { id: '123', name: 'Peter Sirka', email: 'petersirka@gmail.com', sa: true };
AUTH(function($) {

	var cookie = $.cookie('auth');

	if (!cookie || cookie !== "correct-cookie") {
		$.invalid();
		return;
	}

	$.success(USER);

});