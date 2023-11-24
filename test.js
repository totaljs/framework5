// Total.js Tests
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

var Test = { items: [], count: 0 };

Test.start = function(message) {
	var divider = '------------------------------------------------';

	if (Test.count)
		console.log('');

	console.log(divider);
	console.log('| ' + message.padRight(divider.length - 4) + ' |');
	console.log(divider);
};

Test.print = function(message, err) {
	console.log('[' + (err ? 'FAIL' : 'OK') + ']', message);
	Test.count++;
	if (err) {
		setTimeout(() => process.exit(1), 1);
		if (err instanceof Error)
			throw err;
		else
			throw new Error(err.toString());
	}
};

Test.push = function(name, fn) {
	Test.items.push({ name: name, fn: fn });
};

Test.run = function(callback) {
	console.time('Time');
	Test.items.wait(function(item, next) {
		Test.start(item.name);
		item.fn(next);
	}, function() {
		console.log('');
		console.log('Tests:', Test.count);
		console.timeEnd('Time');
		console.log('');
		callback && callback();
	});
};

global.Test = Test;
