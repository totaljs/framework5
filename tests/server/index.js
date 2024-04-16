/* eslint-disable */
require('../../index');
require('../../test');

CONF.$imprint = false;

Test.push('Test Server', function(next) {

	var arr = [];

	// IP+PORT
	arr.push(function(resume) {
		var options = {};
		options.ip = '127.0.0.1';
		options.port = 8000;
		Total.load('Workers', function() {
			var child = NEWTHREAD('child', { ip: options.ip, port: options.port });
			child.on('message', function() {
				RESTBuilder.GET('http://{0}:{1}/exit/'.format(options.ip, options.port)).exec(function(err, response) {
					Test.print('Port + Ip: ', err === null && response && response.success === true ? null : 'Expected sucess == true response from child server')
					resume();
				})
			});
		});
	});

	// Unixsocket
	arr.push(function(resume) {
		var options = {};
		options.unixsocket = PATH.root('test.socket');
		options.unixsocket777 = true;
		Total.load('Workers', function() {
			var child2 = NEWTHREAD('child2', options);
			child2.on('message', function(message) {
				Test.print('UnixSocket  :', message.unixsocket == options.unixsocket ? null : 'Expected valid Unixsocket');
				resume();
			});
		});

	});

	arr.async(next);
});

Test.run();
