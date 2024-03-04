var USER = { id: '123', name: 'Peter Sirka', email: 'petersirka@gmail.com', sa: true };
AUTH(function($) {

	var cookie = $.cookie('auth');
	console.log(cookie);
	if (!cookie || cookie !== 'correct-cookie') {
		$.invalid();
		return;
	}
	$.success(USER);
});