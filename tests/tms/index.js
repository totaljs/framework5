require('../../index');
require('../../test');

F.run({ port: 8000, release: false });


ON('ready', function() {

	var url = 'http://localhost:8000/$tms/';
	var token = 'u0eH4l6k2JmfVdn0kyGp05i989x4byJcqZa';
	MAIN.client1 = TMSCLIENT(url, token);
	MAIN.client2 = TMSCLIENT(url, token);

	Test.push('TMS - ', function(next) {
		MAIN.client2 && MAIN.client2.subscribe('users_create', function(data) {
			console.log(data);
		});
		next();
	});

	Test.push('TMS - ', function(next) {
		MAIN.client1 && MAIN.client1.publish('users_create', { name: 'Peter Sirka', email: 'petersirka@gmail.com' });
		next();
	});

	setTimeout(function() {
		Test.run(function() {
			console.log('DONE');
		});
	}, 5000);
});