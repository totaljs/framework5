/* eslint-disable */
require('../../index');
require('../../test');

Test.push('Test Server', function(next) {

	var arr = [];

	// IP+PORT
	arr.push(function(next_fn) {
		var options = {};
		options.ip = '127.0.0.1';
		options.port = 8000;
		Total.load('Workers', function() {
			var child = NEWTHREAD('child', { ip: options.ip, port: options.port });
			child.on('message', function() {
				RESTBuilder.GET('http://{0}:{1}/exit/'.format(options.ip, options.port)).exec(function(err, response) {
					Test.print('Port + Ip: ', err === null && response && response.success === true ? null : 'Expected sucess == true response from child server')
					next_fn();
				})
			});
		});
	});

	// Unixsocket
	arr.push(function(next_fn) {
		var options = {};
		options.unixsocket = PATH.root('test.socket');
		options.unixsocket777 = true;
		Total.load('Workers', function() {
			var child2 = NEWTHREAD('child2', options);
			child2.on('message', function(message) {
				Test.print('UnixSocket  :', message.unixsocket == options.unixsocket ? null : 'Expected valid Unixsocket');
				next_fn();
			});
		});

	});

	arr.async(next);
});

Test.run(function() {
	process.exit(0);
});
