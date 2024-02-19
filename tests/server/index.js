/* eslint-disable */
require('../../index');
require('../../test');

// unixsocket
// ip + port

var opt = {};

// load web server and test app


Test.push('Test Server', function(next) {
	var arr = [];
	arr.push(function(next_fn) {
		opt.ip = '192.168.1.100';
		opt.port =  5000;

		Total.load('Workers', function() {

			var child = NEWTHREAD('~./workers/child', { ip: opt.ip, port: opt.port });
			child.on('message', function(message) {
				console.log(message);
				RESTBuilder.GET('http://{0}:{1}/exit/'.format(opt.ip, opt.port)).exec(function(err, response) {
					console.log(err, response);
					next_fn();
				})
			});
		});
	});

	arr.push(function(next_fn) {
		opt = {};
		opt.unixsocket = PATH.root('test.socket');
		opt.unixsocket777 = true;

		F.run(opt);
		ON('ready', function() {
			Test.print('UnixSocket  :', Total.unixsocket === opt.unixsocket ? null : 'Expected valid Unixsocket');
			next_fn();
		});
	});
	arr.async(function() {
		next();
	});
});

Test.run(function() {
	process.exit(0);
});
