/* eslint-disable */

require('../../index');
require('../../test');

// unixsocket
// ip + port

var opt = {};

// load web server and test app


Test.push('Test Server', function(next) {
	var arr = [];
	// arr.push(function(next_fn) {
	// 	opt.ip = '192.168.1.100';
	// 	opt.port =  5000;

	// 	F.run(opt)
	// 	ON('ready', function() {
	// 		var port = CONF.$port;
	// 		var ip = CONF.$ip;
	// 		Test.print('IP + PORT: ', port == opt.port && ip == opt.ip ? null : 'Expected IP: {0} and PORT: {0}'.format(opt.ip, opt.port));
	// 		next_fn();
	// 	});

	// });

	arr.push(function(next_fn) {

		opt = {};
		opt.unixsocket = PATH.root('test.socket');
		opt.unixsocket777 = true;

		F.http(opt)
		ON('ready', function() {
			Test.print('UnixSocket  :', CONF.$unixsocket === opt.unixsocket ? null : 'Expected valid Unixsocket');
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
