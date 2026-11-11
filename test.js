// Total.js Tests
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

if (!global.Total)
	require('total5');

var Test = { items: [], count: 0, fakes: {} };

Test.start = function(message) {
	var divider = '------------------------------------------------';

	if (Test.count)
		console.log('');

	console.log(divider);
	console.log('> ' + message.padRight(divider.length - 4) + ' <');
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

// Replaces an action with a fake, the original action is kept for "Test.restore()"
Test.fake = function(name, obj) {

	if (Test.fakes[name] === undefined) {
		Test.fakes[name] = F.actions[name] || null;
		delete F.actions[name];
	}

	return NEWACTION(name, obj);
};

// Removes all fakes and puts the original actions back
Test.restore = function() {

	for (var name in Test.fakes) {

		var action = Test.fakes[name];

		F.actions[name] && F.actions[name].remove();

		if (action)
			F.actions[name] = action;
	}

	Test.fakes = {};
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
		if (callback)
			callback();
		else
			setTimeout(() => process.exit(0), 2);
	});
};

global.Test = Test;
