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
	t.debugger = true;
}

Component.prototype.service = function(counter) {
	for (let m of this.instances)
		m.service && m.service(counter);
};

Component.prototype.status = function(instance, msg) {
	if (this.debugger)
		console.log('STATUS', this.name, msg);
};

Component.prototype.debug = function(instance, msg) {
	if (this.debugger)
		console.log('DEBUG', this.name + ':', msg);
};

Component.prototype.dashboard = function(instance, msg) {
	if (this.debugger)
		console.log('DASHBOARD', this.name + ':', msg);
};

Component.prototype.throw = function(instance, err) {
	if (this.debugger)
		console.log('ERROR', this.name + ':', err);
};

Component.prototype.output = function(instance, response) {
	if (this.debugger)
		console.log('OUTPUT', this.name + ' | ' + response.output + ':', response.data);
};

Component.prototype.create = function(opt, status) {

	let t = this;
	let instance = new Instance();
	instance.id = U.random_text(8);
	instance.config = t.config ? F.TUtils.clone(t.config) : {};
	instance.module = t;

	if (opt) {
		for (let key in opt)
			instance.config[key] = opt[key];
	}

	t.instances.push(instance);
	t.onextend && t.onextend(instance);
	t.make.call(instance, instance, instance.config, status);
	t.oncreate && setImmediate(() => t.oncreate(instance));
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

Component.prototype.save = function(instance) {
	// save state
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
	t.callback && t.callback(t);
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
	t.module.onremove && t.module.onremove(t);
	let index = t.module.instances.indexOf(t);
	t.module.instances.splice(index, 1);
};

Instance.prototype.input = function(input, data, callback) {
	let t = this;
	if (t.message) {

		let msg = t.newmessage(data);
		msg.input = input;
		msg.callback = callback;

		var schema = t.module.inputschemas[input];
		if (schema) {
			let tmp = schema.transform(msg.data);
			msg.data = tmp.response;
			msg.error = tmp.error;
		}

		t.message(msg);
		let fn = t['message_' + input];
		fn && fn(msg);
	}
};

Instance.prototype.send = function(output, data) {
	let msg = data instanceof Message ? data : this.newmessage();
	msg.output = output;
	msg.data = data;x
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

Instance.prototype.save = function() {
	this.module.save(this);
};

Instance.prototype.output = function(response) {
	this.module.output(this, response);
};

Instance.prototype.debug = function(msg) {
	this.module.debug(this, msg);
};

Instance.prototype.throw = function(err) {
	this.module.throw(this, error);
};

Instance.prototype.dashboard = function(msg) {
	this.module.dashboard(this, msg);
};

Instance.prototype.reconfigure = function(opt) {
	let t = this;
	for (let key in opt)
		t.config[key] = opt[key];
	t.configure && t.configure(t.config);
	t.save();
};

Instance.prototype.status = function(msg) {
	this.module.status(this, msg);
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

	if ((/^http(s)\:\/\//i).test(html)) {
		let opt = {};
		opt.url = html;
		opt.callback = function(err, response) {
			console.log(err, response);
			if (err)
				callback(err);
			else
				exports.compile(response.body, callback);
		};
		REQUEST(opt);
		return;
	}

	if (!html.includes('<')) {
		F.Fs.readFile(PATH.root('components/' + html + '.html'), 'utf8', function(err, response) {
			if (err)
				callback(err);
			else
				exports.compile(response, callback);
		});
		return;
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

		com.inputschemas = {};
		com.outputschemas = {};

		if (com.inputs) {
			for (let m of com.inputs) {
				if (m.schema)
					com.inputschemas[m.id] = m.schema.toJSONSchema();
			}
		}

		if (com.outputs) {
			for (let m of com.outputs) {
				if (m.schema)
					com.outputschemas[m.id] = m.schema.toJSONSchema();
			}
		}

		com.install && com.install.call(com, com);

		callback(null, com);
	});

};