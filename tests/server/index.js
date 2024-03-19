/* eslint-disable */
require('../../index');
require('../../test');
// unixsocket
// ip + port
var opt = {};
Test.push('Test Server', function(next) {
	var arr = [];
	arr.push(function(next_fn) {
		opt.ip = '192.168.1.100';
		opt.port =  5000;
		Total.load('Workers', function() {
			var child = NEWTHREAD('~./workers/child', { ip: opt.ip, port: opt.port });
			child.on('message', function() {
				RESTBuilder.GET('http://{0}:{1}/exit/'.format(opt.ip, opt.port)).exec(function(err, response) {
					Test.print('Port + Ip: ', err === null && response && response.success === true ? null : 'Expected sucess == true response from child server')
					next_fn();
				})
			});
		});
	});
	arr.push(function(next_fn) {
		var options = {};
		options.unixsocket = PATH.root('test.socket');
		options.unixsocket777 = true;
		Total.load('Workers', function() {
			var child2 = NEWTHREAD('~./workers/child2', options);
			child2.on('message', function(message) {
				Test.print('UnixSocket  :', message.unixsocket == options.unixsocket ? null : 'Expected valid Unixsocket');
				next_fn();
			});
		});

	});
	arr.async(function() {
		next();
	});
});
Test.run(function() {
	process.exit(0);
});
