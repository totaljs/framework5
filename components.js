'use strict';

const REG_ARGS = /\{{1,2}[a-z0-9_.-\s]+\}{1,2}/gi;

function variables(str, data, encoding) {

	if (typeof(str) === 'object') {
		var obj = {};
		for (var key in str) {
			var val = str[key];
			if (typeof(val) === 'string')
				obj[key] = variables.call(this, val, data, encoding);
			else
				obj[key] = val;
		}
		return obj;
	}

	if (typeof(str) !== 'string' || str.indexOf('{') === -1)
		return str;

	var main = this.instance ? this.instance.module : (this.module || this);

	if (data == null || data == true)
		data = this;

	return str.replace(REG_ARGS, function(text) {

		var l = text[1] === '{' ? 2 : 1;
		var key = text.substring(l, text.length - l).trim();
		var val = null;

		if (main.variables)
			val = main.variables[key];

		if (!val && main.variables2)
			val = main.variables2[key];

		if (!val && main.secrets)
			val = main.secrets[key];

		/*
		if (!val && key === 'hostname') {
			val = '';
			if (val[val.length - 1] === '/')
				val = val.substring(0, val.length - 1);
		}*/

		var customencoding = typeof(encoding) === 'function';

		if (!val && data != null && typeof(data) === 'object') {
			var nested = key.indexOf('.') !== -1;
			val = nested ? F.TUtils.get(data, key) : data[key];
		}

		if (customencoding) {

			val = encoding(val, key);

		} else {

			if (encoding !== 'json') {
				if (val instanceof Date)
					val = val.format();
			}

			switch (encoding) {
				case 'urlencoded':
				case 'url':
					val = encodeURIComponent(val);
					break;
				case 'json':
					val = JSON.stringify(val);
					break;
				case 'querify':
					val = F.TUtils.querify(val).substring(1);
					break;
			}
		}

		return val == null ? text : val;

	});
}

function Component() {
	let t = this;
	t.variables = t.variables2 = {};
	t.secrets = {};
	t.instances = [];
}

Component.prototype.create = function(opt) {

	let t = this;
	let instance = new Instance();
	instance.id = U.random_text(8);
	instance.stats = { pending: 0, input: 0, output: 0, duration: 0, destroyed: 0 };
	instance.cache = {};
	instance.module = t;
	instance.config = t.config ? F.TUtils.clone(t.config) : {};
	instance.middleware = NOOP;
	instance.transform = NOOP;
	instance.replace = variables;
	instance.instances = EMPTYOBJECT;
	instance.components = EMPTYOBJECT;

	if (opt) {
		for (let key in opt)
			instance.config[key] = opt[key];
	}

	t.make.call(instance, instance, instance.config);
	t.instances.push(instance);
	return instance;
};

Component.prototype.remove = function() {
	let t = this;
	t.instances.wait(function(instance, next) {
		instance.remove();
		setImmediate(next);
	}, function() {
		t.uninstall && t.uninstall.call(t, t);
	});
};

function Message() {
	let t = this;
	t.repo = {};
	t.vars = {};
	t.used = 1;
	t.main = null;
	t.processed = 0;
}

Message.prototype.replace = variables;

Message.prototype.send = function(output, data) {
	let t = this;
	if (!t.instance)
		return;
	if (data != null)
		t.data = data;
	t.output = output;
	t.instance.output && t.instance.output(t);
};

Message.prototype.end = Message.prototype.destroy = function() {
	let t = this;
	t.data = null;
	t.fromcomponent = null;
	t.instance = null;
	t.vars = null;
	t.repo = null;
	t.refs = null;
}

function Instance() {
	let t = this;
	t.id = U.random_text(8);
	t.stats = { pending: 0, input: 0, output: 0, duration: 0, destroyed: 0 };
	t.cache = {};
	t.middleware = NOOP;
	t.transform = NOOP;
	t.replace = variables;
	t.instances = EMPTYOBJECT;
	t.components = EMPTYOBJECT;
}

Instance.prototype.replace = variables;

Instance.prototype.remove = function() {
	let t = this;
	t.close && t.close.call(t, true);
	t.destroy && t.destroy.call(t);
	let index = t.module.instances.indexOf(t);
	t.module.instances.splice(index, 1);
};

Instance.prototype.input = function(input, data) {
	let t = this;
	if (t.message) {
		let msg = t.newmessage(data);
		msg.input = input;
		t.message(msg);
	}
};

Instance.prototype.send = function(output, data) {
	let msg = data instanceof Message ? data : this.newmessage();
	msg.output = output;
	msg.data = data;
	msg.send(output);
};

Instance.prototype.newmessage = function(data) {
	var t = this;
	var msg = new Message();
	msg.from = msg.instance = t;
	msg.fromid = msg.id;
	msg.fromcomponent = msg.component;
	msg.data = data instanceof Message ? data.data : data;
	return msg;
};

Instance.prototype.output = function(response) {
	console.log('OUTPUT', this.module.name + ':', response);
};

Instance.prototype.debug = function(a, b, c, d) {
	console.log('DEBUG', this.module.name + ':', a, b, c, d);
};

Instance.prototype.throw = function(a, b, c, d) {
	console.log('ERROR', this.module.name + ':', a, b, c, d);
};

Instance.prototype.dashboard = function(a, b, c, d) {
	console.log('DASHBOARD', this.module.name + ':', a, b, c, d);
};

Instance.prototype.status = function(a, b, c, d) {
	console.log('STATUS', this.module.name + ':', a, b, c, d);
};

Instance.prototype.logger = NOOP;
Instance.prototype.transform = NOOP;
Instance.prototype.middleware = NOOP;

exports.compile = function(html, callback) {

	if (callback == null) {
		return new Promise(function(resolve, reject) {
			exports.compile(html, function(err, com) {
				if (err)
					reject(err);
				else
					resolve(com);
			});
		})
	}

	var meta = html.parseComponent({ readme: '<readme>', settings: '<settings>', css: '<style>', be: '<script total>', be2: '<script node>', js: '<script>', html: '<body>', schema: '<schema>', template: '<template>' });
	var node = (meta.be || meta.be2 || '').trim().replace(/\n\t/g, '\n');

	if (!meta.be && !meta.be2) {
		var e = new Error('Invalid component content');
		callback(e);
		return;
	}

	var fn = null;
	var com = new Component();

	delete meta.be;
	delete meta.be2;
	com.ui = meta;

	try {
		fn = new Function('exports', 'require', node);
		fn(com, F.require);
	} catch (e) {
		callback(e);
		return;
	}

	var errors = [];

	(com.npm || EMPTYARRAY).wait(function(name, next) {
		NPMINSTALL(name, function(err) {
			if (err) {
				callback(err);
				next = null;
			} else
				next();
		});
	}, function() {
		com.install && com.install.call(com, com);
		callback(null, com);
	});

};