// API caller
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

var cache = {};

// Registers a new API type
exports.newapi = function(type, callback) {

	if (typeof(type) === 'function') {
		callback = type;
		type = 'default';
	}

	if (type.indexOf(',') !== -1) {
		var arr = type.split(',').trim();
		for (var m of arr)
			exports.newapi(m, callback);
		return;
	}

	// It can be "camel case"
	var lower = type.toLowerCase();
	cache[type] = lower;
	cache[lower] = lower;

	if (callback)
		F.apiservices[lower] = callback;
	else
		delete F.apiservices[lower];

};

function APICall() {
	var t = this;
	t.options = {};
}

const APICallProto = APICall.prototype;

APICallProto.output = function(type) {
	this.options.output = type;
	return this;
};

APICallProto.promise = function($) {
	var t = this;
	var promise = new Promise(function(resolve, reject) {
		t.$callback = function(err, response) {
			if (err) {
				if ($ && $.invalid) {
					$.invalid(err);
				} else {
					err.name = 'API(' + t.options.name + ' --> ' + t.options.schema + ')';
					reject(err);
				}
			} else
				resolve(response);
		};
	});

	return promise;
};

APICallProto.audit = function($, message, type) {
	var t = this;
	t.$audit = function() {
		// Dynamic arguments
		if (message)
			message = $.variables(message, t.options.data);
		$.audit(message, type);
	};
	return t;
};

APICallProto.done = function($, callback) {
	var t = this;
	t.$callback = function(err, response) {
		if (err)
			$.invalid(err);
		else if (callback)
			callback(response);
		t.free();
	};
	return t;
};

APICallProto.debug = function() {
	this.$debug = true;
	return this;
};

APICallProto.fail = function(cb) {
	this.$callback_fail = cb;
	return this;
};

APICallProto.data = function(cb) {
	this.$callback_data = cb;
	return this;
};

APICallProto.controller = function($) {
	this.options.controller = $.controller || $;
	return this;
};

APICallProto.file = function(filename, path, name) {

	var t = this;

	if (!t.options.files)
		t.options.files = [];

	var obj = { name: name || ('file' + t.options.files.length), filename: filename, path: path };

	if (t.options.files)
		t.options.files.push(obj);
	else
		t.options.files = [obj];

	return t;
};

APICallProto.error = APICallProto.err = function(err, reverse) {
	this.$error = err + '';
	this.$error_reverse = reverse;
	return this;
};

APICallProto.callback = function($) {
	var t = this;
	t.$callback = typeof($) === 'function' ? $ : $.callback();
	return t;
};

APICallProto.evaluate = function(err, response) {

	var t = this;
	if (!err && t.$error) {
		if (t.$error_reverse) {
			if (response)
				err = t.$error;
			else if (response instanceof Array && response.length)
				err = t.$error;
		} else if (!response)
			err = t.$error;
		else if (response instanceof Array && !response.length)
			err = t.$error;
	}

	if (err) {
		t.$callback_fail && t.$callback_fail(err);
	} else {
		if (t.$audit) {
			t.$audit();
			t.$audit = null;
		}
		t.$callback_data && t.$callback_data(response);
	}

	t.$debug && console.log('--DEBUG-- API: ' + t.options.name + ' --> ' + t.options.schema, '|', 'Error:', err, '|', 'Response:', response);
	t.$callback && t.$callback(err, response);
};

function execapi(api) {
	var conn = F.apiservices[cache[api.options.name]] || F.apiservices['*'];
	if (conn)
		conn.call(api, api.options, (err, response) => api.evaluate(err, response));
	else
		api.evaluate('API is not initialized');
}

// Executes API
exports.exec = function(name, schema, data, $) {
	var api = new APICall();
	api.options.name = cache[name] || name;
	api.options.schema = schema;
	api.options.data = data;
	api.options.controller = $;
	setImmediate(execapi, api);
	return api;
};

exports.newapi('TotalAPI,TAPI', function(opt, next) {

	if (!F.config.$tapi && opt.schema !== 'check') {
		next('totalapi_inactive');
		return;
	}

	if (opt.data && typeof(opt.data) !== 'object')
		opt.data = { value: opt.data };

	var req = {};

	req.method = 'POST';
	req.url = 'https://' + F.config.$tapiurl + '.api.totaljs.com/' + opt.schema + '/';

	if (opt.files) {
		req.body = opt.data;
		req.files = opt.files;
	} else
		req.body = JSON.stringify(opt.data);

	req.type = 'json';
	req.timeout = 60000;
	req.keepalive = true;
	req.headers = { 'x-token': opt.token || F.config.secret_totalapi || F.config.$tapisecret || '-', 'x-app': encodeURIComponent(F.config.name) };
	req.custom = true;

	req.callback = function(err, response) {

		if (err) {
			next(err.toString());
			return;
		}

		var buffer = [];

		// Error
		if (response.status > 200) {
			response.stream.on('data', chunk => buffer.push(chunk));
			F.cleanup(response.stream, function() {
				let output = Buffer.concat(buffer).toString('utf8');
				let response = output.parseJSON();
				next((response && response[0] && response[0].error) || output);
			});
			return;
		}

		if (!opt.output || opt.output === 'json' || opt.output === 'html' || opt.output === 'plain' || opt.output === 'text' || opt.output === 'base64' || opt.output === 'buffer' || opt.output === 'binary') {
			response.stream.on('data', chunk => buffer.push(chunk));
			F.cleanup(response.stream, function() {
				let output = Buffer.concat(buffer);
				if (opt.output === 'base64') {
					output = output.toString('base64');
				} else if (opt.output !== 'binary' && opt.output !== 'buffer') {
					output = output.toString('utf8');
					if (!opt.output || opt.output === 'json')
						output = output.parseJSON(true);
				}
				next(null, output);
			});
			return;
		}

		if (opt.output === 'stream') {
			next(null, response.stream);
			return;
		}

		// FileStorage in the form: "#name id filename"
		if (opt.output[0] === '#') {

			var fsdata = null;
			var fs = null;

			if (opt.output[0] === '#') {
				fsdata = opt.output.substring(1).split(' ');
				fs = F.filestorage(fsdata[0]);
			}

			var type = (response.headers['content-type'] || '').toLowerCase();
			var index = type.lastIndexOf(';');
			if (index !== -1)
				type = type.substring(0, index);

			var ext = type ? F.TUtils.getExtensionFromContentType(type) : 'bin';
			var id = fsdata[1] || UID();
			var filename = fsdata[2] || id + '.' + ext;

			response.stream.pause();
			fs.save(id, filename, response.stream, next);
			return;
		}

		var writer = F.Fs.createWriteStream(opt.output);
		response.stream.pipe(writer);
		F.cleanup(writer, function() {
			opt.next(null, opt.output);
		});

	};

	F.TUtils.request(req);
});