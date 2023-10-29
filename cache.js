// Total.js Cache (in-memory)
// The MIT License
// Copyright 2012-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

exports.set = function(key, value, expire = '5 minutes') {
	global.NOW = new Date();
	F.temporary.cache[key] = { value: value, expire: global.NOW.add(expire) };
};

exports.read = exports.get = function(key, def) {
	var item = F.temporary.cache[key];
	global.NOW = new Date();
	if (item && item.expire < global.NOW)
		return item.value;
	else
		return def;
};

exports.remove = function(key) {
	if (F.temporary.cache[key])
		delete F.temporary.cache[key];
};

exports.reset = function(search) {

	var isreg = search instanceof RegExp;
	var count = 0;

	if (search) {
		for (let key in F.temporary.cache) {
			if (isreg) {
				if (search.test(key)) {
					count++;
					delete F.temporary.cache[key];
				}
			} else if (search) {
				if (key.indexOf(search) !== -1) {
					count++;
					delete F.temporary.cache[key];
				}
			}
		}
	} else
		F.temporary.cache = {};

	return count;

};

exports.refresh = function() {
	for (let key in F.temporary.cache) {
		let item = F.temporary.cache[key];
		if (item.expire < NOW)
			delete F.temporary.cache[key];
	}
};