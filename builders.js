'use strict';

const REG_ARGS = /\{{1,2}[a-z0-9_.-\s]+\}{1,2}/gi;

var transforms = { error: {}, restbuilder: {} };
var restbuilderupgrades = [];

function Options(ctrl, error) {
	var t = this;
	t.controller = ctrl;
	t.error = error;
}

Options.prototype = {

	get client() {
		return this.controller;
	},

	get websocket() {
		return this.controller.parent;
	},

	get value() {
		return this.model;
	},

	get url() {
		return (this.controller ? this.controller.url : '') || '';
	},

	get uri() {
		return this.controller ? this.controller.uri : null;
	},

	get path() {
		return (this.controller ? this.controller.pathname : EMPTYARRAY);
	},

	get split() {
		return (this.controller ? this.controller.split : EMPTYARRAY);
	},

	get split2() {
		return (this.controller ? this.controller.split2 : EMPTYARRAY);
	},

	get language() {
		return (this.controller ? this.controller.language : '') || '';
	},

	get ip() {
		return this.controller ? this.controller.ip : null;
	},

	get files() {
		return this.controller ? this.controller.files : null;
	},

	get body() {
		return this.controller ? this.controller.body : null;
	},

	get mobile() {
		return this.controller ? this.controller.mobile : null;
	},

	get headers() {
		return this.controller ? this.controller.headers : null;
	},

	get ua() {
		return this.controller ? this.controller.ua : null;
	}
};

Options.prototype.action = function(schema, data) {

	var c = schema[0];

	if (c === '-' || c === '#' || c === '+')
		schema = schema.substring(1);
	else
		c = '';

	var key = 'action_' + schema;
	var tmp = F.temporary.calls[key];

	if (!tmp) {
		if (schema.indexOf('-->') === -1 && this.schema)
			schema = this.schema.name + ' --> ' + schema;
		F.temporary.calls[key] = tmp = schema.trim();
	}

	return CALL(c + tmp, data);
};

Options.prototype.publish = function(value) {
	var name = this.ID;
	if (F.tms.socket && F.tms.publish_cache[name] && F.tms.publishers[name]) {

		var tmp = {};
		if (tmp) {
			for (var key in value) {
				if (!this.$publish || this.$publish[key])
					tmp[key] = value[key];
			}
		}

		F.stats.performance.publish++;
		F.tms.socket.send({ type: 'publish', id: name, data: tmp }, client => client.tmsready);

	}
	return this;
};

Options.prototype.on = function(name, fn) {
	var self = this;
	if (!self.events)
		self.events = {};
	if (!self.events[name])
		self.events[name] = [];
	self.events[name].push(fn);
	return self;
};

Options.prototype.emit = function(name, a, b, c, d) {

	var self = this;

	if (!self.events || !self.events[name])
		return false;

	for (var evt of self.events[name])
		evt.call(self, a, b, c, d);

	return true;
};

// @TODO: Missing functionality "Options.cancel()"
Options.prototype.cancel = function() {
	var self = this;

	if (self.$async) {
		self.$async.tasks = null;
		self.$async.op = null;
		self.$async = null;
	}

	self.callback = self.next = null;
	self.error = null;
	self.controller = null;
	self.model = null;
	self.options = null;
	return self;
};

// @TODO: Missing functionality "Options.cancel()"
Options.redirect = function(url) {
	this.callback(new F.callback_redirect(url));
};

// @TODO: Missing functionality "Options.cancel()"
Options.audit = function(message, type) {
	F.audit(this, message, type);
};

Options.success = function(value) {
	this.callback(DEF.onSuccess(value));
};

Options.callback = function(value) {

	var self = this;

	if (arguments.length == 0) {
		return function(err, response) {
			err && self.error.push(err);
			self.callback(response);
		};
	}

	self.$callback(self.error.items.length ? self.error : null, value);
};

Options.done = function(arg) {
	var self = this;
	return function(err, response) {
		if (err) {
			err && self.error.push(err);
			self.callback();
		} else
			self.callback(DEF.onSuccess(arg === true ? response : arg));
	};
};

Options.invalid = function(error, path, index) {

	var self = this;

	if (arguments.length) {
		self.error.push(error, path, index);
		self.callback();
		return self;
	}

	return function(err) {
		self.error.push(err);
		self.callback();
	};
};

Options.cookie = function(name, value, expire, options) {
	var self = this;
	if (value === undefined)
		return self.controller.cookie(name);
	if (value === null)
		expire = '-1 day';
	self.controller.cookie(name, value, expire, options);
	return self;
};

Options.variables = function(str, data) {

	if (str.indexOf('{') === -1)
		return str;

	var $ = this;

	return str.replace(REG_ARGS, function(text) {
		var l = text[1] === '{' ? 2 : 1;
		var key = text.substring(l, text.length - l).trim();
		var val = null;
		var five = key.substring(0, 5);
		if (five === 'user.') {
			if ($.user) {
				key = key.substring(5);
				val = key.indexOf('.') === -1 ? $.user[key] : F.TUtils.get($.user, key);
			}
		} else if (five === 'data.') {
			if (data) {
				key = key.substring(5);
				val = key.indexOf('.') === -1 ? data[key] : F.TUtils.get(data, key);
			}
		} else {
			var six = key.substring(0, 6);
			if (six === 'model.' || six === 'value.') {
				if ($.model) {
					key = key.substring(6);
					val = key.indexOf('.') === -1 ? $.model[key] : F.TUtils.get($.model, key);
				}
			} else if (six === 'query.')
				val = $.query[key.substring(6)];
			else if (key.substring(0, 7) === 'params.')
				val = $.params[key.substring(7)];
		}
		return val == null ? text : val;
	});

};

function ErrorBuilder() {
	this.items = [];
	this.count = 0;
	// this.replacer = null;
	this.status = 400;
}

ErrorBuilder.prototype = {
	get length() {
		return this.items.length;
	}
};

ErrorBuilder.prototype.push = function(err, path, index) {
	var self = this;
	if (err > 400) {
		self.status = err;
		self.items.push({ error: F.TUtils.httpstatus(err) });
	} else
		self.items.push({ error: err.toString(), path: path, index: index });
	return self;
};

ErrorBuilder.assign = function(arr) {
	var builder = new ErrorBuilder();
	if (arr instanceof Array) {
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].error)
				builder.items.push(arr[i]);
		}
	} else {
		var type = typeof(arr);
		if (type === 'number' || type === 'string')
			builder.push(arr);
		else if (arr instanceof Error)
			builder.push(arr + '');
	}
	return builder;
};

ErrorBuilder.prototype.replace = function(search, value) {
	var self = this;
	if (!self.replacer)
		self.replacer = {};
	self.replacer[search] = value;
	return self;
};

ErrorBuilder.prototype.output = function(language = 'default') {

	var self = this;
	var output = [];

	for (let m of self.items) {

		let err = m.error;

		if (err[0] == '@')
			err = F.translate(language, err);

		if (self.replacer) {
			for (let key in self.replacer)
				err = err.replaceAll(key, self.replacer[key]);
		}

		output.push({ error: err, path: m.path, index: m.index });
	}

	if (ErrorBuilder.$transform)
		output = ErrorBuilder.$transform(output, language);

	return output;
};

ErrorBuilder.transform = function(callback) {
	ErrorBuilder.$transform = callback;
};

function RESTBuilder(url) {

	this.$schema;
	this.$length = 0;
	this.$transform = transforms.restbuilder_default;
	this.$persistentcookies = false;

	this.options = { url: url, timeout: 10000, method: 'GET', resolve: true, headers: { 'user-agent': 'Total.js/v' + F.version_header, accept: 'application/json, text/plain, text/plain, text/xml' }};

	// this.$data = {};
	// this.$nodnscache = true;
	// this.$cache_expire;
	// this.$cache_nocache;
	// this.$redirect

	// Auto Total.js Error Handling
	this.$errorbuilderhandler = true;
}

RESTBuilder.make = function(fn) {
	var instance = new RESTBuilder();
	fn && fn(instance);
	return instance;
};

RESTBuilder.url = function(url) {
	return new RESTBuilder(url);
};

RESTBuilder.GET = function(url, data) {
	var builder = new RESTBuilder(url);
	builder.options.query = data;
	return builder;
};

RESTBuilder.API = function(url, name, data) {
	var builder = new RESTBuilder(url);
	builder.operation = name;
	builder.options.method = 'POST';
	builder.raw(data, 'raw');
	return builder;
};

RESTBuilder.POST = function(url, data) {
	var builder = new RESTBuilder(url);
	builder.options.method = 'POST';
	data && builder.raw(data, 'json');
	return builder;
};

RESTBuilder.PUT = function(url, data) {
	var builder = new RESTBuilder(url);
	builder.options.method = 'PUT';
	data && builder.raw(data, 'json');
	return builder;
};

RESTBuilder.DELETE = function(url, data) {
	var builder = new RESTBuilder(url);
	builder.$method = 'delete';
	builder.options.method = 'DELETE';
	data && builder.raw(data, 'json');
	return builder;
};

RESTBuilder.PATCH = function(url, data) {
	var builder = new RESTBuilder(url);
	builder.$method = 'patch';
	builder.options.method = 'PATCH';
	data && builder.raw(data, 'json');
	return builder;
};

RESTBuilder.HEAD = function(url) {
	var builder = new RESTBuilder(url);
	builder.options.method = 'HEAD';
	return builder;
};

RESTBuilder.upgrade = function(fn) {
	restbuilderupgrades.push(fn);
};

RESTBuilder.addTransform = function(name, fn, isDefault) {
	transforms.restbuilder[name] = fn;
	isDefault && RESTBuilder.setDefaultTransform(name);
};

RESTBuilder.setDefaultTransform = function(name) {
	if (name)
		transforms.restbuilder_default = name;
	else
		delete transforms.restbuilder_default;
};

var RESTP = RESTBuilder.prototype;

RESTP.insecure = function() {
	this.options.insecure = true;
	return this;
};

RESTP.error = function(err) {
	this.$errorhandler = err;
	return this;
};

RESTP.strict = function() {
	this.$strict = true;
	return this;
};

RESTP.noparse = function() {
	this.$noparse = true;
	return this;
};

RESTP.debug = function() {
	this.$debug = true;
	return this;
};

RESTP.map = function(map) {

	var arr = map.split(',');
	var self = this;
	var reg = /=|:|\s/;
	var convertor = [];

	self.$map = [];

	for (var i = 0; i < arr.length; i++) {
		var item = arr[i].split(reg);
		var target = (item[2] || item[0]).trim();
		convertor.push(target + ':' + (item[1].trim() || 'string'));
		self.$map.push({ id: item[0], target: target });
	}

	if (convertor.length)
		self.$mapconvertor = convertor.join(',');

	return self;
};

RESTP.unixsocket = function(socket, path) {
	var self = this;
	self.options.unixsocket = { socket: socket, path: path };
	return self;
};

RESTP.promise = function($) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.exec(function(err, response) {
			if (err) {
				if ($ && $.invalid)
					$.invalid(err);
				else
					reject(err);
			} else
				resolve(response);
		});
	});
};

RESTP.proxy = function(value) {
	this.options.proxy = value;
	return this;
};

RESTP.setTransform = function(name) {
	this.$transform = name;
	return this;
};

RESTP.url = function(url) {
	if (url === undefined)
		return this.options.url;
	this.options.url = url;
	return this;
};

RESTP.cert = function(key, cert, dhparam) {
	this.options.key = key;
	this.options.cert = cert;
	this.options.dhparam = dhparam;
	return this;
};

RESTP.file = function(name, filename, buffer) {

	var obj = { name: name, filename: filename };

	if (buffer) {
		if (typeof(buffer) === 'string') {
			if (buffer.isURL())
				obj.url = buffer;
			else
				obj.path = buffer;
		} else
			obj.buffer = buffer;
	}

	if (this.options.files)
		this.options.files.push(obj);
	else
		this.options.files = [obj];
	return this;
};

RESTP.maketransform = function(obj, data) {
	if (this.$transform) {
		var fn = transforms.restbuilder[this.$transform];
		return fn ? fn.call(this, obj, data) : obj;
	}
	return obj;
};

RESTP.timeout = function(number) {
	this.options.timeout = number;
	return this;
};

RESTP.maxlength = function(number) {
	this.options.limit = number;
	return this;
};

RESTP.auth = function(user, password) {
	this.options.headers.authorization = password == null ? user : 'Basic ' + Buffer.from(user + ':' + password).toString('base64');
	return this;
};

RESTP.convert = function(convert) {
	this.$convert = convert;
	return this;
};

RESTP.schema = function(name) {
	this.$schema = GETSCHEMA(name);
	if (!this.$schema)
		throw Error('RESTBuilder: Schema "{0}" not found.'.format(name));
	return this;
};

RESTP.nodnscache = function() {
	this.options.resolve = false;
	return this;
};

RESTP.nocache = function() {
	this.$nocache = true;
	return this;
};

RESTP.make = function(fn) {
	fn.call(this, this);
	return this;
};

RESTP.xhr = function() {
	this.options.xhr = true;
	return this;
};

RESTP.method = function(method, data) {
	this.options.method = method.charCodeAt(0) > 96 ? method.toUpperCase() : method;
	data && this.raw(data, 'json');
	return this;
};

RESTP.referer = RESTP.referrer = function(value) {
	this.options.headers.Referer = value;
	return this;
};

RESTP.origin = function(value) {
	this.options.headers.Origin = value;
	return this;
};

RESTP.robot = function() {
	if (this.options.headers['User-Agent'])
		this.options.headers['User-Agent'] += ' Bot';
	else
		this.options.headers['User-Agent'] = 'Bot';
	return this;
};

RESTP.mobile = function() {
	if (this.options.headers['User-Agent'])
		this.options.headers['User-Agent'] += ' iPhone';
	else
		this.options.headers['User-Agent'] = 'iPhone';
	return this;
};

RESTP.put = RESTP.PUT = function(data) {
	this.options.method = 'PUT';
	data && this.raw(data, this.options.type || 'json');
	return this;
};

RESTP.delete = RESTP.DELETE = function(data) {
	this.options.method = 'DELETE';
	data && this.raw(data, this.options.type || 'json');
	return this;
};

RESTP.get = RESTP.GET = function(data) {
	this.options.method = 'GET';
	this.options.query = data;
	return this;
};

RESTP.post = RESTP.POST = function(data) {
	this.options.method = 'POST';
	data && this.raw(data, this.options.type || 'json');
	return this;
};

RESTP.head = RESTP.HEAD = function() {
	this.options.method = 'HEAD';
	return this;
};

RESTP.patch = RESTP.PATCH = function(data) {
	this.options.method = 'PATCH';
	data && this.raw(data, this.options.type || 'json');
	return this;
};

RESTP.json = function(data) {
	data && this.raw(data, 'json');
	if (this.options.method === 'GET')
		this.options.method = 'POST';
	return this;
};

RESTP.urlencoded = function(data) {
	if (this.options.method === 'GET')
		this.options.method = 'POST';
	this.options.type = 'urlencoded';
	data && this.raw(data, this.options.type);
	return this;
};

RESTP.accept = function(ext) {
	var type;
	if (ext.length > 8)
		type = ext;
	else
		type = framework_utils.getContentType(ext);
	this.options.headers.Accept = type;
	return this;
};

RESTP.xml = function(data, replace) {

	if (this.options.method === 'GET')
		this.options.method = 'POST';

	if (replace)
		this.$replace = true;

	this.options.type = 'xml';
	data && this.raw(data, this.options.type);
	return this;
};

RESTP.redirect = function(value) {
	this.options.noredirect = !value;
	return this;
};

RESTP.raw = function(value, type) {
	this.options.type = type;
	this.options.body = value;
	return this;
};

RESTP.plain = function(val) {
	this.$plain = true;
	this.options.body = val;
	this.options.type = 'plain';
	return this;
};

RESTP.cook = function(value) {
	this.options.cook = value !== false;
	return this;
};

RESTP.cookies = function(obj) {
	this.options.cookies = obj;
	return this;
};

RESTP.cookie = function(name, value) {
	if (!this.options.cookies)
		this.options.cookies = {};
	this.options.cookies[name] = value;
	return this;
};

RESTP.header = function(name, value) {
	this.options.headers[name] = value;
	return this;
};

RESTP.type = function(value) {
	this.options.headers['Content-Type'] = value;
	return this;
};

function execrestbuilder(instance, callback) {
	instance.exec(callback);
}

RESTP.callback = function(fn) {

	var self = this;

	if (typeof(fn) === 'function') {
		setImmediate(execrestbuilder, self, fn);
		return self;
	}

	self.$ = fn;
	setImmediate(execrestbuilder, self);
	return new Promise(function(resolve, reject) {
		self.$resolve = resolve;
		self.$reject = reject;
	});
};

RESTP.csrf = function(value) {
	this.options.headers['X-Csrf-Token'] = value;
	return this;
};

RESTP.encrypt = function(key) {
	this.options.encrypt = key || DEF.secret_encryption;
	return this;
};

RESTP.compress = function(val) {
	this.$compress = val == null || val == true;
	return this;
};

RESTP.cache = function(expire) {
	this.$cache_expire = expire;
	return this;
};

RESTP.set = function(name, value) {
	if (!this.options.body)
		this.options.body = {};
	if (typeof(name) !== 'object') {
		this.options.body[name] = value;
	} else {
		for (var key in name)
			this.options.body[key] = name[key];
	}
	return this;
};

RESTP.rem = function(name) {
	if (this.options.body && this.options.body[name])
		this.options.body[name] = undefined;
	return this;
};

RESTP.progress = function(fn) {
	this.options.onprogress = fn;
	return this;
};

RESTP.stream = function(callback) {
	var self = this;
	self.options.custom = true;
	setImmediate(streamresponse, self, callback);
	return self;
};

function streamresponse(builder, callback) {
	builder.exec(callback);
}

RESTP.keepalive = function() {
	this.options.keepalive = true;
	return this;
};

RESTP.exec = function(callback) {

	if (!callback)
		callback = NOOP;

	var self = this;

	if (self.operation) {

		// API
		if (self.options.body)
			self.options.body = { data: self.options.body };
		else
			self.options.body = {};

		if (self.options.query) {
			self.options.body.query = self.options.query;
			self.options.query = null;
		}

		self.options.body.schema = self.operation;
		self.options.body = JSON.stringify(self.options.body, self.$compress ? exports.json2replacer : null);
		self.options.type = 'json';
	}

	if (self.options.files && self.options.method === 'GET')
		self.options.method = 'POST';

	if (self.options.body && !self.options.files && typeof(self.options.body) !== 'string' && self.options.type !== 'raw')
		self.options.body = self.options.type === 'urlencoded' ? F.TUtils.toURLEncode(self.options.body) : JSON.stringify(self.options.body);

	if (self.options.unixsocket && self.options.url) {
		if (!self.options.path)
			self.options.path = self.options.url;
		self.options.url = undefined;
	}

	self.$callback = callback;

	if (restbuilderupgrades.length) {
		for (var i = 0; i < restbuilderupgrades.length; i++)
			restbuilderupgrades[i](self);
	}

	var key;

	if (self.$cache_expire && !self.$nocache) {
		key = '$rest_' + ((self.options.url || '') + (self.options.socketpath || '') + (self.options.path || '') + (self.options.body || '')).hash(true);
		var data = F.cache.read2(key);
		if (data) {
			data = self.$transform ? self.maketransform(self.$schema ? self.$schema.make(data.value) : data.value, data) : self.$schema ? self.$schema.make(data.value) : data.value;

			if (self.$resolve) {
				self.$resolve(data);
				self.$reject = null;
				self.$resolve = null;
			} else
				callback(null, data, data);

			return self;
		}
	}

	self.$callback_key = key;
	self.options.callback = exec_callback;
	self.options.response = {};
	self.options.response.builder = self;
	self.request = REQUEST(self.options);
	return self;
};

function exec_callback(err, response) {

	var self = response.builder;

	if (self.options.custom) {
		if (self.$resolve) {
			if (err)
				self.$.invalid(err);
			else
				self.$resolve(response);
			self.$ = null;
			self.$reject = null;
			self.$resolve = null;
		} else
			self.$callback.call(self, err, response);
		return;
	}

	var callback = self.$callback;
	var key = self.$callback_key;
	var type = err ? '' : response.headers['content-type'] || '';
	var output = new RESTBuilderResponse();

	if (self.options.cook && self.options.cookies)
		output.cookies = self.options.cookies;

	if (type) {
		var index = type.lastIndexOf(';');
		if (index !== -1)
			type = type.substring(0, index).trim();
	}

	var ishead = response.status === 204;
	if (ishead) {
		output.value = response.status < 400;
	} else if (self.$plain || self.$noparse) {
		output.value = response.body;
	} else {
		switch (type.toLowerCase()) {
			case 'text/xml':
			case 'application/xml':
				output.value = response.body ? response.body.parseXML(self.$replace ? true : false) : {};
				break;
			case 'application/x-www-form-urlencoded':
				output.value = response.body ? DEF.parsers.urlencoded(response.body) : {};
				break;
			case 'application/json':
			case 'text/json':
				output.value = response.body ? response.body.parseJSON(true) : null;
				break;
			default:
				output.value = response.body && response.body.isJSON() ? response.body.parseJSON(true) : null;
				break;
		}
	}

	if (output.value && self.$map) {

		var res;

		if (output.value instanceof Array) {
			res = [];
			for (var j = 0; j < output.value.length; j++) {
				var item = {};
				for (var i = 0; i < self.$map.length; i++) {
					var m = self.$map[i];
					if (output.value[j])
						item[m.target] = output.value[j][m.id];
				}
				if (self.$mapconvertor)
					item = CONVERT(item, self.$mapconvertor);
				res.push(item);
			}
		} else {
			res = {};
			for (var i = 0; i < self.$map.length; i++) {
				var m = self.$map[i];
				res[m.target] = output.value[m.id];
			}
			if (self.$mapconvertor)
				res = CONVERT(res, self.$mapconvertor);
		}

		output.value = res;
	}

	if (output.value == null)
		output.value = EMPTYOBJECT;

	output.response = response.body;
	output.status = response.status;
	output.headers = response.headers;
	output.hostname = response.host;
	output.origin = response.origin;
	output.cache = false;
	output.datetime = NOW;

	if (self.$debug)
		console.log('--DEBUG-- RESTBuilder: ' + response.status + ' ' + self.options.method + ' ' + QUERIFY(self.options.url || (self.options.unixsocket + self.options.path), self.options.query), '|', 'Error:', err, '|', 'Response:', response.body);

	if (!err && self.$errorhandler) {
		if (typeof(self.$errorhandler) === 'function')
			err = self.$errorhandler(output.value);
		else if (!output.value || output.value === EMPTYOBJECT || (output.value instanceof Array && output.value.length))
			err = self.$errorhandler;
	}

	var val;

	if (self.$schema) {

		if (err) {
			if (self.$resolve) {
				self.$.invalid(err);
				self.$ = null;
				self.$reject = null;
				self.$resolve = null;
			} else
				callback(err, EMPTYOBJECT, output);
			return;
		}

		val = self.$transform ? self.maketransform(output.value, output) : output.value;

		if (self.$errorbuilderhandler) {

			// Is the response Total.js ErrorBuilder?
			if (val instanceof Array && val.length && val[0] && val[0].error) {
				err = ErrorBuilder.assign(val);
				if (err)
					val = EMPTYOBJECT;
				if (err) {
					callback(err, EMPTYOBJECT, output);
					return;
				}
			} else if (output.status >= 400) {
				err = output.status;
				if (self.$resolve) {
					self.$.invalid(err);
					self.$ = null;
					self.$reject = null;
					self.$resolve = null;
				} else
					callback(err, response, output);
				return;
			}

		}

		self.$schema.make(val, function(err, model) {

			if (!err && key && output.status === 200)
				F.cache.add(key, output, self.$cache_expire);

			if (self.$resolve) {

				if (err)
					self.$.invalid(err);
				else
					self.$resolve(model);

				self.$ = null;
				self.$reject = null;
				self.$resolve = null;
				return;
			}

			callback(err, err ? EMPTYOBJECT : model, output);
			output.cache = true;
		});

	} else {

		if (!err && key && output.status === 200)
			F.cache.add(key, output, self.$cache_expire);

		val = self.$transform ? self.maketransform(output.value, output) : output.value;

		if (self.$errorbuilderhandler) {
			// Is the response Total.js ErrorBuilder?
			if (val instanceof Array && val.length && val[0] && val[0].error) {
				err = ErrorBuilder.assign(val);
				if (err)
					val = EMPTYOBJECT;
			}
		}

		if (!err && self.$strict && output.status >= 400)
			err = output.status;

		if (self.$convert && val && val !== EMPTYOBJECT)
			val = CONVERT(val, self.$convert);

		if (self.$resolve) {

			if (err)
				self.$.invalid(err);
			else
				self.$resolve(val);

			self.$ = null;
			self.$reject = null;
			self.$resolve = null;
		} else {
			callback(err, val, output);
			output.cache = true;
		}
	}
}

function RESTBuilderResponse() {}

RESTBuilderResponse.prototype.cookie = function(name) {

	var self = this;
	if (self.cookies)
		return F.TUtils.decodeURIComponent(self.cookies[name] || '');

	self.cookies = {};

	var cookies = self.headers['set-cookie'];
	if (!cookies)
		return '';

	if (typeof(cookies) === 'string')
		cookies = [cookies];

	for (var i = 0; i < cookies.length; i++) {
		var line = cookies[i].split(';', 1)[0];
		var index = line.indexOf('=');
		if (index !== -1)
			self.cookies[line.substring(0, index)] = line.substring(index + 1);
	}

	return F.TUtils.decodeURIComponent(self.cookies[name] || '');
};

function parseactioncache(obj, meta) {

	var query = meta.query;
	var user = meta.user;
	var params = meta.params;
	var language = meta.language;
	var search = meta.id || meta.key;

	if (typeof(user) === 'string')
		user = user.split(',').trim();
	else if (user === true)
		user = ['id'];
	else
		user = null;

	if (typeof(params) === 'string')
		params = params.split(',').trim();
	else if (params === true) {
		if (obj.jsonschemaparams) {
			params = [];
			for (var key in obj.jsonschemaparams.properties)
				params.push(key);
		} else
			params = null;
	} else
		params = null;

	if (typeof(query) === 'string')
		query = query.split(',').trim();
	else if (query === true) {
		if (obj.jsonschemaquery) {
			query = [];
			for (var key in obj.jsonschemaquery.properties)
				query.push(key);
		} else
			query = null;
	} else
		query = null;

	return function($, value) {
		if (value === undefined) {

			var key = 'action|' + (search ? (search + '|') : '') + $.ID;
			var sum = '';
			var tmp;

			if (language)
				sum += ($.language || '');

			if (query) {
				for (let key of query) {
					tmp = $.query[key];
					if (tmp)
						sum += '|' + tmp;
				}
			}

			if (params) {
				for (let key of params) {
					tmp = $.params[key];
					if (tmp)
						sum += '|' + tmp;
				}
			}

			if (user && $.user) {
				for (let key of user) {
					tmp = $.user[key];
					if (tmp)
						sum += '|' + tmp;
				}
			}

			$.cachekey = key + sum;
			return F.cache.get2($.cachekey);
		}

		$.cachekey && F.cache.set($.cachekey, value && value.success ? CLONE(value) : value, meta.expire || '5 minutes');
	};

}

exports.newaction = function(name, obj) {

	if (typeof(name) === 'object') {
		obj = name;
		name = obj.id || obj.name;
	}

	var url = name;
	var tmp = name.split('/').trim();
	if (tmp.length)
		obj.$url = url.replace(/\//g, '_').toLowerCase();

	name = tmp[0].trim();

	// Helper for auto-routing due to older operations
	F.$newoperations = true;

	if (F.actions[name])
		F.actions[name].remove();

	F.actions[name] = obj;
	obj.id = name;
	obj.isaction = true;
	obj.jsonschemainput = obj.input ? F.TUtils.jsonschema(obj.input) : null;
	obj.jsonschemaoutput = obj.output ? F.TUtils.jsonschema(obj.output) : null;
	obj.jsonschemaparams = obj.params ? F.TUtils.jsonschema(obj.params) : null;
	obj.jsonschemaquery = obj.query ? F.TUtils.jsonschema(obj.query) : null;
	obj.schema = {};
	obj.schema.$csrf = obj.csrf;
	obj.schema.$encrypt = obj.encrypt;
	obj.schema.$compress = obj.compress;

	if (obj.cache)
		obj.cache = parseactioncache(obj, obj.cache);

	if (obj.middleware)
		obj.middleware = obj.middleware.replace(/,/g, ' ').replace(/\s{2,}/, ' ');

	obj.remove = function() {
		obj.route && obj.route.remove();
		delete F.actions[obj.id];
		obj = null;
		F.makesourcemap();
	};

	if (obj.route) {
		if (obj.route.indexOf('-->') === -1)
			obj.route = obj.route + '  ' + (obj.input ? '+' : '-') + obj.$url + '  *  -->  ' + name;
		var flags = null;
		if (obj.encrypt)
			flags = ['encrypt'];
		obj.route = ROUTE(obj.route, flags || []);
	}

	if (obj.permissions && typeof(obj.permissions) === 'string')
		obj.permissions = obj.permissions.split(/,|;/).trim();

	if (obj.publish) {

		var tmsschema = obj.publish == true ? (obj.input || obj.output) : obj.publish;

		if (typeof(tmsschema) === 'string') {
			if (tmsschema[0] === '+')
				tmsschema = (obj.input || obj.output) + ',' + tmsschema.substring(1);

			var keys = tmsschema.split(',');
			obj.$publish = [];
			for (var key of keys) {
				var index = key.indexOf(':');
				obj.$publish.push(index === -1 ? key : key.substring(0, index));
			}
		}

		F.TMS.newpublish(name, tmsschema);
	}

	obj.validate = function(type, value, partial) {
		var jsonschema = this['jsonschema' + type];
		return jsonschema ? jsonschema.transform(value, null, partial) : { error: null, response: value };
	};

	F.makesourcemap();
	return obj;
};

function SchemaCall() {
	this.options = {};
	setImmediate(t => t.exec(), this);
}

var SCP = SchemaCall.prototype;

SCP.debug = function() {
	this.options.debug = true;
	return this;
};

SCP.params = function(value) {
	this.options.params = value;
	return this;
};

SCP.exec = function() {

	var self = this;
	var controller = self.options.controller;
	var meta = self.meta;

	self.options.callback = function(err, response) {

		if (!self.options.$callback)
			self.options.$callback = NOOP;

		if (err) {
			self.options.error && self.options.error(err);
			self.options.$callback(err);
		} else {
			self.action && self.action.cache && self.action.cache(self.$, response);
			self.options.$callback(null, response);
		}
	};

	if (self.$error) {
		self.options.callback(self.$error);
		return;
	}

	if (controller && controller.$checkcsrf === 1) {
		if (controller.route.flags2.csrf || meta.schema.$csrf) {
			controller.$checkcsrf = 2;
			if (!DEF.onCSRFcheck(controller.req)) {
				self.options.callback(new ErrorBuilder().push('csrf', 'Invalid CSRF token'));
				return;
			}
		} else
			controller.$checkcsrf = 2;
	}

	if (!meta.action && meta.symbol !== '-' && self.options.model) {
		meta.schema.make(self.options.model, function(err, response) {
			if (err) {
				self.options.callback(err);
			} else {
				self.options.model = response;
				performsschemaaction(self);
			}
		}, null, null, null, meta.operations);
	} else {

		if (meta.symbol === '-')
			self.options.model = EMPTYOBJECT;

		performsschemaaction(self);
	}

};

function evalaction($, name, caller, skipmiddleware) {

	var action = F.actions[name];

	if (!action) {
		$.invalid('Action "{0}" not found'.format(name));
		return;
	}

	$.ID = name;
	$.name = name;
	$.query = $.cache.query;
	$.params = $.cache.params;

	// Check a user session
	if (action.user && !$.user) {
		$.invalid(401);
		return;
	}

	if (action.sa) {
		if (!$.user || (!$.user.sa && !$.user.su)) {
			$.invalid(401);
			return;
		}
	}

	// Check permissions
	if (action.permissions) {
		var permissions = action.permissions.slice(0);
		permissions.unshift($);
		if (F.unauthorized.apply(global, permissions))
			return;
	}

	var meta = caller.meta;

	if (!skipmiddleware && action.middleware) {
		CALL(meta.symbol + action.middleware, $.model, $.controller).callback(function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			for (var key in response)
				$.responses[key] = response[key];

			evalaction($, name, caller, true);
		});
		return;
	}

	var res;

	if (action.jsonschemainput) {

		var ispatch = meta.method === 'PATCH' || ($.controller && $.controller.req && $.controller.req.keys);

		res = action.validate('input', $.model || EMPTYOBJECT, $.ispatch);

		if (res.error) {
			$.invalid(res.error);
			return;
		}

		$.model = res.response;

		if (ispatch)
			$.keys = Object.keys($.model);
	}

	if (action.jsonschemaquery) {
		res = action.validate('query', $.query || EMPTYOBJECT);
		if (res.error) {
			for (var item of res.error.items)
				item.name = 'query.' + item.name;
			$.invalid(res.error);
			return;
		}
		$.query = res.response;
	}

	if (action.jsonschemaparams) {
		res = action.validate('params', $.params || EMPTYOBJECT);
		if (res.error) {
			for (var item of res.error.items)
				item.name = 'params.' + item.name;
			$.invalid(res.error);
			return;
		}
		$.params = res.response;
	}

	$.$action = action;
	$.caller.$ = $;
	$.caller.action = action;

	var value = action.cache ? action.cache($) : null;
	if (value != null) {
		$.cachekey = null;
		$.callback(null, value);
	} else {
		action.action.call($, $, $.model);
	}
}

function callnewaction(caller, meta) {

	var error = new ErrorBuilder();
	var $ = new Options(error, caller.options.model, null, function(a, b) {

		var response = null;

		if (a) {
			if (a instanceof Error || a instanceof ErrorBuilder)
				error.push(a);
			else
				response = a;
		} else
			response = b;

		if (error.items.length) {
			caller.options.callback(error.items.length ? error : null);
			return;
		}

		if (response && $.$action && $.$action.jsonschemaoutput)
			response = $.$action.jsonschemaoutput.transform(response).response;

		if (meta.multiple) {

			if ($.$action && $.$action.cache) {
				$.$action.cache($, response);
				$.cachekey = null;
			}

			$.responses[$.current] = response;
			$.index++;

			var next = meta.op[$.index];
			if (next) {
				$.current = next.name;
				evalaction($, $.current, caller);
				return;
			} else
				response = meta.opcallback ? $.responses[meta.opcallback] : $.responses;
		}

		caller.options.callback(error.items.length ? error : null, response);

	}, caller.options.controller, '');

	var additional = caller.options;
	var controller = caller.options.controller;

	$.cache = {};

	if (additional && additional.params)
		$.cache.params = additional.params;
	else
		$.cache.params = controller ? controller.params : {};

	if (additional && additional.query)
		$.cache.query = additional.query;
	else
		$.cache.query = controller ? controller.query : {};

	if (additional && additional.user)
		$.user = additional.user;
	else
		$.user = controller ? controller.user : null;

	if (additional && additional.session)
		$.session = additional.session;
	else
		$.session = controller ? controller.session : {};

	$.multiple = meta.multiple;

	if ($.multiple)
		$.index = 0;

	$.current = meta.op[0].name;
	$.caller = caller;
	$.caller.$ = $;

	evalaction($, $.current, caller);
}

function performsschemaaction(caller) {

	var meta = caller.meta;
	var controller = caller.options.controller;

	if (meta.schema.$encrypt && controller)
		controller.response.encrypt = true;

	if (meta.schema.$compress && controller)
		controller.response.minifyjson = true;

	var callback = caller.options.callback;

	if (caller.options.debug) {
		callback = function(err, response) {
			console.log('--DEBUG-- CALL:', 'Query:', caller.options.query, '|', 'Params:', caller.options.params, '|', 'Model:', caller.options.model, '|', 'Error:', err, '|', 'Response:', response);
			caller.options.callback(err, response);
		};
	}

	if (meta.action) {
		callnewaction(caller, meta);
	} else if (meta.multiple) {
		var add = meta.schema.async(caller.options.model, callback, meta.opcallbackindex, controller, caller, true);
		for (var i = 0; i < meta.op.length; i++)
			add(meta.op[i].name);
	} else {
		var op = meta.op[0];
		// meta.schema.exec(op.type, op.name, caller.options.model, caller.options.config || EMPTYOBJECT, controller, callback, true, caller.options, caller.meta.symbol, caller);
		// meta.schema.exec(op.name, null, caller.options.model, caller.options.config, controller, callback, true, caller.options, caller.meta.symbol, caller);
		if (op.type)
			meta.schema.exec(op.type, op.name, caller.options.model, caller.options.config || EMPTYOBJECT, controller, callback, true, caller);
		else
			meta.schema.exec(op.name, null, caller.options.model, caller.options.config, controller, callback, true, caller);
	}
}

SCP.query = function(value) {
	this.options.query = value;
	return this;
};

SCP.user = function(value) {

	if (value instanceof Options)
		value = value.user;

	this.options.user = value;
	return this;
};

SCP.language = function(value) {
	this.options.language = value;
	return this;
};

SCP.error = function(value) {
	this.options.error = value;
	return this;
};

SCP.done = function($, fn) {
	this.options.$callback = function(err, response) {
		if (err)
			$.invalid(err);
		else
			fn(response);
	};
	return this;
};

SCP.callback = function(value) {
	this.options.$callback = value;
	return this;
};

SCP.promise = function($) {
	var t = this;
	return new Promise(function(resolve, reject) {
		t.options.$callback = function(err, response) {
			if (err) {
				t.options.error && t.options.error(err);
				if ($ && $.invalid)
					$.invalid(err);
				else
					reject(err);
			} else
				resolve(response);
		};
	});
};

SCP.controller = function(ctrl) {

	if (ctrl instanceof Options)
		ctrl = ctrl.controller;

	this.options.controller = ctrl;
	return this;
};

global.CALL = function(schema, model, controller) {

	// Because "controller" should be "Options"
	if (controller && !(controller instanceof F.TWebSocket.WebSocketClient) && controller.controller)
		controller = controller.controller;

	var caller = new SchemaCall();
	var key = schema;

	caller.options.model = model;
	caller.options.controller = controller;

	var meta = F.temporary.calls[key];
	if (meta) {
		caller.meta = meta;
		return caller;
	}

	var method;

	meta = {};
	meta.symbol = schema[0];

	switch (schema[0]) {
		case '+':
			method = 'POST';
			break;
		case '#':
			method = 'PATCH';
			break;
		case '-':
			method = 'GET';
			break;
		default:
			meta.symbol = model ? '+' : '-';
			break;
	}

	if (method)
		schema = schema.substring(1);

	var tmp, index, op;

	index = schema.indexOf('-->');

	if (index === -1) {
		// operation
		op = schema.split(/\s/).trim();
		tmp = '*';
	} else {
		op = (schema.substring(index + 3).trim().trim().replace(/@/g, '') + ' ').split(/\s/).trim();
		tmp = schema.substring(0, index).split(/\s|\t/).trim();
	}

	meta.method = method;
	meta.schema = tmp[0];

	if (meta.schema[0] === '*')
		meta.schema = meta.schema.substring(1).trim();

	meta.action = !meta.schema;
	meta.op = [];

	var o;

	if (meta.schema) {
		var o = GETSCHEMA(meta.schema);
		if (!o) {
			caller.$error = new ErrorBuilder().push('Schema "{0}" not found'.format(meta.schema));
			return caller;
		}
	}

	meta.operations = {};

	for (var i = 0; i < op.length; i++) {

		tmp = {};

		var item = op[i];
		if (item[0] === '@')
			item = item.substring(1);

		index = item.indexOf('(');

		if (index !== -1) {
			meta.opcallbackindex = i - 1;
			tmp.response = true;
			item = item.substring(0, index).trim();
			meta.opcallback = meta.op[meta.opcallbackindex].name;
			continue;
		}

		tmp.name = item;

		if (meta.action) {
			meta.operations[item] = 1;
			meta.op.push(tmp);
			continue;
		}

		if (!o.meta[item]) {
			caller.$error = new ErrorBuilder().push(Schema "{0}" doesn\'t contain "{1}" operation'.format(meta.schema, item));
			return caller;
		}

		meta.operations[tmp.name] = 1;
		meta.op.push(tmp);
	}

	meta.multiple = meta.op.length > 1;

	if (!meta.action)
		meta.schema = o;

	F.temporary.calls[key] = meta;
	caller.meta = meta;
	return caller;
};

exports.RESTBuilder = RESTBuilder;
exports.ErrorBuilder = ErrorBuilder;
exports.Options = Options;