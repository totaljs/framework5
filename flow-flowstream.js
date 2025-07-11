// Total.js FlowStream module
// The MIT License
// Copyright 2021-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

if (!global.F)
	require('./index');

const W = F.Worker;
const Fork = F.Child.fork;
const VERSION = 32;
const NOTIFYPATH = '/notify/';

var isFLOWSTREAMWORKER = false;
var Parent = W.parentPort;
var CALLBACKS = {};
var FLOWS = {};
var PROXIES = {};
var TMS = {};
var RPC = {};
var CALLBACKID = 1;
var ASFILES = true;
var isrunning = false;

/*
	var instance = MODULE('flowstream').init({ components: {}, design: {}, variables: {}, variables2: {} }, true/false);

	Module exports:
	module.init(meta [isworker]);
	module.socket(meta, socket, check(client) => true);
	module.input([flowstreamid], [id], data);
	module.trigger(flowstreamid, id, data);
	module.refresh([flowstreamid], [type]);
	module.rpc(name, callback);
	module.exec(id, opt);

	Methods:
	instance.trigger(id, data);
	instance.destroy();
	instance.input([flowstreamid], [fromid], [toid], data);
	instance.add(id, body, [callback]);
	instance.rem(id, [callback]);
	instance.components(callback);
	instance.refresh([type]);
	instance.io(callback);
	instance.ioread(flowstreamid, id, callback);
	instance.reconfigure(id, config);
	instance.variables(variables);
	instance.variables2(variables);
	instance.pause(is);
	instance.socket(socket);
	instance.exec(opt, callback);
	instance.cmd(path, data);
	instance.httprequest(opt, callback);
	instance.eval(msg, callback);

	Delegates:
	instance.onsave(data);
	instance.ondone();
	instance.onerror(err, type, instanceid, componentid);
	instance.output(fid, data, tfsid, tid);
	instance.onhttproute(url, remove);
	instance.ondestroy();

	Extended Flow instances by:
	instance.save();
	instance.toinput(data, [flowstreamid], [id]);
	instance.output(data, [flowstreamid], [id]);
	instance.reconfigure(config);
	instance.newflowstream(meta, isworker);
	instance.input = function(data) {}
*/

function Instance(instance, id) {
	var self = this;
	self.httproutes = {};
	self.version = VERSION;
	self.id = id;
	self.flow = instance;
	// this.onoutput = null;
}

Instance.prototype = {

	get stats() {
		return this.worker ? this.worker.stats : this.flow.stats;
	},

	get worker() {
		return this.flow;
	},

	get stream() {
		return this.flow;
	}
};

Instance.prototype.postMessage = function(msg) {
	this.flow.postMessage && this.flow.postMessage(msg);
};

Instance.prototype.httprequest = function(opt, callback) {

	// opt.route {String} a URL address
	// opt.params {Object}
	// opt.query {Object}
	// opt.body {Object}
	// opt.headers {Object}
	// opt.files {Array Object}
	// opt.url {String}
	// opt.callback {Function(err, meta)}

	if (opt.callback) {
		callback = opt.callback;
		opt.callback = undefined;
	}

	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callbackid !== -1)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/httprequest', data: opt, callbackid: callbackid });
	} else
		httprequest(self.flow, opt, callback);

	return self;
};

// Can't be used in the FlowStream component
Instance.prototype.httprouting = function() {

	var instance = this;

	instance.onhttproute = function(url, remove) {

		// GET / #upload #5000 #10000
		// - #flag means a flag name
		// - first #number is timeout
		// - second #number is max. limit for the payload

		var flags = [];
		var limit = 0;
		var timeout = 0;
		var id = url;

		url = url.replace(/#[a-z0-9]+/g, function(text) {
			text = text.substring(1);
			if ((/^\d+$/).test(text)) {
				if (timeout)
					limit = +text;
				else
					timeout = +text;
			} else
				flags.push(text);
			return '';
		}).trim();

		var route;

		if (remove) {
			route = instance.httproutes[id];
			if (route) {
				route.remove();
				delete instance.httproutes[id];
			}
			return;
		}

		if (instance.httproutes[id])
			instance.httproutes[id].remove();

		if (timeout)
			flags.push(timeout);

		route = ROUTE(url, function() {

			var self = this;
			var opt = {};

			opt.route = id;
			opt.params = self.params;
			opt.query = self.query;
			opt.body = self.body;
			opt.files = self.files;
			opt.headers = self.headers;
			opt.url = self.url;
			opt.ip = self.ip;
			opt.cookies = {};

			var cookie = self.headers.cookie;
			if (cookie) {
				var arr = cookie.split(';');
				for (var i = 0; i < arr.length; i++) {
					var line = arr[i].trim();
					var index = line.indexOf('=');
					if (index !== -1) {
						try {
							opt.cookies[line.substring(0, index)] = decodeURIComponent(line.substring(index + 1));
						} catch {}
					}
				}
			}

			instance.httprequest(opt, function(meta) {

				if (meta.status)
					self.status = meta.status;

				if (meta.headers) {
					for (var key in meta.headers)
						self.response.headers[key] = meta.headers[key];
				}

				if (meta.cookies && meta.cookies instanceof Array) {
					for (var item of meta.cookies) {
						var name = item.name || item.id;
						var value = item.value;
						var expiration = item.expiration || item.expires || item.expire;
						if (name && value && expiration)
							self.cookie(name, value, expiration, item.options || item.config);
					}
				}

				var data = meta.body || meta.data || meta.payload;
				switch (meta.type) {
					case 'error':
						self.invalid(meta.body);
						break;
					case 'text':
					case 'plain':
						self.text(data);
						break;
					case 'html':
						self.html(data);
						break;
					case 'xml':
						self.binary(Buffer.from(data, 'utf8'), 'text/xml');
						break;
					case 'json':
						self.json(data);
						break;
					case 'empty':
						self.empty();
						break;
					default:
						if (meta.filename) {
							var stream = F.Fs.createReadStream(meta.filename);
							self.stream(stream, meta.type, meta.download);
							meta.remove && F.cleanup(stream, () => F.Fs.unlink(meta.filename, NOOP));
						} else {
							if (typeof(data) === 'string')
								self.binary(Buffer.from(data, 'base64'), meta.type);
							else
								self.json(data);
						}
						break;
				}

			}, flags, limit);
		});

		instance.httproutes[id] = route;
	};

	return instance;
};

Instance.prototype.cmd = function(path, data) {

	var self = this;
	if (self.flow.isworkerthread) {
		self.flow.postMessage2({ TYPE: 'stream/cmd', path: path, data: data });
	} else {
		var fn = path.indexOf('.') === - 1 ? global[path] : F.TUtils.get(global, path);
		if (typeof(fn) === 'function')
			fn(data);
	}

	return self;
};

Instance.prototype.send = function(id, data, callback) {
	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callbackid !== -1)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/send', id: id, data: data, callbackid: callbackid });
	} else
		send(self.flow, id, data, callback);
};

Instance.prototype.exec = function(opt, callback) {

	// opt.id = instance_ID
	// opt.callback = function(err, msg)
	// opt.uid = String/Number;             --> returned back
	// opt.ref = String/Number;             --> returned back
	// opt.repo = {};                       --> returned back
	// opt.data = {};                       --> returned back
	// opt.vars = {};
	// opt.timeout = Number;

	if (callback && !opt.callback)
		opt.callback = callback;

	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = opt.callback ? (CALLBACKID++) : -1;
		if (callbackid !== -1)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: opt.callback };
		self.flow.postMessage2({ TYPE: 'stream/exec', id: opt.id, uid: opt.uid, ref: opt.ref, vars: opt.vars, repo: opt.repo, data: opt.data, timeout: opt.timeout, callbackid: callbackid });
	} else
		exec(self.flow, opt);

	return self;
};

function execfn(self, name, id, data) {
	var flow = self.flow;
	if (flow.isworkerthread)
		flow.postMessage2({ TYPE: 'stream/' + name, id: id, data: data });
	else {
		if (!flow.paused) {
			if (id[0] === '@') {
				id = id.substring(1);
				for (let key in flow.meta.flow) {
					let com = flow.meta.flow[key];
					if (com.component === id && com[name])
						com[name](data);
				}
			} else if (id[0] === '#') {
				id = id.substring(1);
				for (let key in flow.meta.flow) {
					let com = flow.meta.flow[key];
					if (com.module.name === id && com[name])
						com[name](data);
				}
			} else {
				let com = flow.meta.flow[id];
				if (com && com[name])
					com[name](data);
			}
		}
	}
}

// Performs trigger
Instance.prototype.trigger = function(id, data) {
	execfn(this, 'trigger', id, data);
	return this;
};

// Notifies instance
Instance.prototype.notify = function(id, data) {
	execfn(this, 'notify', id, data);
	return this;
};


// Performs pause
Instance.prototype.pause = function(is) {
	var self = this;
	var flow = self.flow;
	if (flow.isworkerthread)
		flow.postMessage2({ TYPE: 'stream/pause', is: is });
	else
		flow.pause(is == null ? !flow.paused : is);
	return self;
};

// Asssigns UI websocket the the FlowStream
Instance.prototype.socket = function(socket) {
	var self = this;
	exports.socket(self.flow, socket);
	return self;
};

Instance.prototype.eval = function(msg, callback) {
	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callback)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'ui/message', data: msg, callbackid: callbackid });
	} else
		self.flow.proxy.message(msg, -1, callback);
	return self;
};

Instance.prototype.restart = function() {
	var self = this;
	self.flow.$socket && self.flow.$socket.destroy();
	self.flow.$client && self.flow.$client.destroy();
	if (self.flow.terminate)
		self.flow.terminate();
	else
		self.flow.kill(9);
};

Instance.prototype.remove = function() {
	F.TFlow.remove(this.id);
};

// Destroys the Flow
Instance.prototype.kill = Instance.prototype.destroy = function() {

	var self = this;

	setTimeout(() => exports.refresh(self.id, 'destroy'), 500);
	self.flow.$destroyed = true;
	self.flow.$terminated = true;
	self.flow.$socket && self.flow.$socket.close();

	if (self.flow.isworkerthread) {

		self.postMessage({ TYPE: 'stream/destroy' });
		setTimeout(self => self.flow.terminate ? self.flow.terminate() : self.flow.kill(9), 1000, self);

		if (PROXIES[self.id]) {
			PROXIES[self.id].remove();
			delete PROXIES[self.id];
		}

	} else {
		if (self.flow.sockets) {
			for (var key in self.flow.sockets)
				self.flow.sockets[key].destroy();
		}
		self.flow.destroy();
	}

	self.flow.$socket && self.flow.$socket.destroy();
	self.flow.$client && self.flow.$client.destroy();

	for (var key in CALLBACKS) {
		if (CALLBACKS[key].id === self.id)
			delete CALLBACKS[key];
	}

	if (self.httproutes) {
		for (var key in self.httproutes)
			self.httproutes[key].remove();
	}

	self.ondestroy && self.ondestroy();
	delete FLOWS[self.id];
};

// Sends data to the speficic input
// "@id" sends to all component with "id"
// "id" sends to instance with "id"
Instance.prototype.input = function(flowstreamid, fromid, toid, data, reference) {

	var self = this;
	var flow = self.flow;

	if (flow.isworkerthread) {
		flow.postMessage2({ TYPE: 'stream/input', flowstreamid: flowstreamid, fromid: fromid, id: toid, data: data, reference: reference });
		return self;
	}

	if (toid) {
		if (toid[0] === '@') {
			var tmpid = toid.substring(1);
			for (let key in flow.meta.flow) {
				let tmp = flow.meta.flow[key];
				if (tmp.input && tmp.component === tmpid)
					tmp.input(flowstreamid, fromid, data, reference);
			}
		} else {
			let tmp = flow.meta.flow[toid];
			if (tmp) {
				tmp.input && tmp.input(flowstreamid, fromid, data, reference);
			} else {
				for (let key in flow.meta.flow) {
					let tmp = flow.meta.flow[key];
					if (tmp.input && tmp.config.name === toid)
						tmp.input(flowstreamid, fromid, data, reference);
				}
			}
		}
	} else {
		// Send to all inputs
		for (let key in flow.meta.flow) {
			var f = flow.meta.flow[key];
			var c = flow.meta.components[f.component];
			if (f.input && c.type === 'input2')
				f.input(flowstreamid, fromid, data, reference);
		}
	}

	return self;
};

// Adds a new component
Instance.prototype.add = function(id, body, callback) {
	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callback)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/add', id: id, data: body, callbackid: callbackid });
	} else {
		self.flow.add(id, body, function(err) {
			callback && callback(err);
			self.flow.redraw();
			self.flow.save();
		}, ASFILES);
	}
	return self;
};

// Removes specific component
Instance.prototype.rem = function(id, callback) {
	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callback)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/rem', id: id, callbackid: callbackid });
	} else
		self.flow.unregister(id, callback);
	return self;
};

// Reads all components
Instance.prototype.components = function(callback) {

	var self = this;

	if (self.flow.isworkerthread) {
		var callbackid = CALLBACKID++;
		CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/components', callbackid: callbackid });
	} else
		callback(null, self.flow.components(true));

	return self;
};

function readmeta(meta) {
	var obj = {};
	obj.id = meta.id;
	obj.name = meta.name;
	obj.version = meta.version;
	obj.icon = meta.icon;
	obj.color = meta.color;
	obj.reference = meta.reference;
	obj.group = meta.group;
	obj.author = meta.author;
	return obj;
}

function readinstance(flow, id) {
	var tmp = flow.meta.flow[id];
	if (tmp) {
		var com = flow.meta.components[tmp.component];
		if (com) {
			if ((com.type === 'output' || com.type === 'input' || com.type === 'config'))
				return { id: id, componentid: tmp.component, component: com.name, name: tmp.config.name || com.name, schema: com.schemaid ? com.schemaid[1] : undefined, icon: com.icon, color: com.color, type: com.type, readme: tmp.config.readme, outputs: tmp.outputs, inputs: tmp.inputs };
		} else
			flow.clean();
	}
}

// Reads all inputs, outputs, publish, subscribe instances
Instance.prototype.io = function(id, callback) {

	var self = this;

	if (self.flow.isworkerthread) {
		var callbackid = CALLBACKID++;
		CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/io', id: id, callbackid: callbackid });
		return self;
	}

	var flow = self.flow;

	if (id) {
		var obj = null;
		if (flow.meta.flow[id])
			callback(null, readinstance(flow, id));
		else
			callback();
		return;
	}

	var arr = [];

	for (var key in flow.meta.flow) {
		var obj = readinstance(flow, key);
		obj && arr.push(obj);
	}

	callback(null, arr);
};

// Reconfigures a component
Instance.prototype.reconfigure = function(id, config) {
	var self = this;
	if (self.flow.isworkerthread)
		self.flow.postMessage2({ TYPE: 'stream/reconfigure', id: id, data: config });
	else
		self.flow.reconfigure(id, config);
	return self;
};

Instance.prototype.reload = function(data) {
	var self = this;
	var flow = self.flow;

	if (PROXIES[data.id]) {
		PROXIES[data.id].remove();
		delete PROXIES[data.id];
	}

	if (flow.isworkerthread) {

		if (data.proxypath) {

			if (!data.unixsocket) {
				data.unixsocket = flow.$schema.unixsocket || makeunixsocket(data.id);
				flow.$schema.unixsocket = data.unixsocket;
			}

			PROXIES[data.id] = F.proxy(data.proxypath, data.unixsocket);
		}

		for (let key in data)
			flow.$schema[key] = data[key];

		self.proxypath = data.proxypath;
		flow.postMessage2({ TYPE: 'stream/rewrite', data: data });

	} else {
		for (let key in data)
			flow.$schema[key] = data[key];
		flow.variables = data.variables;
		if (data.variables2)
			flow.variables2 = data.variables2;
		flow.rewrite(data, () => flow.proxy.refreshmeta());
	}
	return self;
};

Instance.prototype.refresh = function(id, type, data, restart) {
	var self = this;
	var flow = self.flow;

	if (flow.isworkerthread) {

		for (var key in data)
			flow.$schema[key] = data[key];

		if (restart) {
			if (flow.terminate)
				flow.terminate();
			else
				flow.kill(9);
		} else
			flow.postMessage2({ TYPE: 'stream/refresh', id: id, type: type, data: data });

	} else {

		if (type === 'meta' && data) {
			for (var key in data)
				flow.$schema[key] = data[key];
			flow.proxy.refreshmeta();
		}

		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.flowstream && instance.flowstream(id, type);
		}
	}
};

// Updates variables
Instance.prototype.variables = function(variables) {

	var self = this;
	var flow = self.flow;

	if (flow.isworkerthread) {
		flow.$schema.variables = variables;
		flow.postMessage2({ TYPE: 'stream/variables', data: variables });
	} else {
		flow.variables = variables;
		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.variables && instance.variables(flow.variables);
			instance.vary && instance.vary('variables');
		}
		flow.proxy.online && flow.proxy.send({ TYPE: 'flow/variables', data: variables });
		flow.save();
	}
	return self;
};

// Updates global variables
Instance.prototype.variables2 = function(variables) {

	var self = this;
	var flow = self.flow;

	if (flow.isworkerthread) {
		flow.$schema.variables2 = variables;
		flow.postMessage2({ TYPE: 'stream/variables2', data: variables });
	} else {
		flow.variables2 = variables;
		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.variables2 && instance.variables2(flow.variables2);
			instance.vary && instance.vary('variables2');
		}
		flow.save();
	}
	return self;
};

Instance.prototype.export = function(callback) {
	var self = this;
	var flow = self.flow;
	if (flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/export', callbackid: callbackid });
	} else
		callback(null, self.flow.export2());
	return self;
};

// Initializes FlowStream
exports.init = function(meta, isworker, callback, nested) {
	return isworker ? init_worker(meta, isworker, callback) : init_current(meta, callback, nested);
};

exports.exec = function(id, opt) {
	var fs = FLOWS[id];
	if (fs)
		fs.exec(id, opt);
	else if (opt.callback)
		opt.callback(404);
};

exports.eval = function(id, opt) {
	var fs = FLOWS[id];
	if (fs)
		fs.eval(id, opt);
	else if (opt.callback)
		opt.callback(404);
};

exports.input = function(ffsid, fid, tfsid, tid, data, reference) {
	if (tfsid) {
		var fs = FLOWS[tfsid];
		fs && fs.$instance.input(ffsid, fid, tid, data, reference);
	} else {
		for (var key in FLOWS) {
			var flow = FLOWS[key];
			flow.$instance.input(ffsid, fid, tid, data, reference);
		}
	}
};

exports.trigger = function(flowstreamid, id, data) {
	var fs = FLOWS[flowstreamid];
	fs && fs.trigger(id, data);
};

exports.refresh = function(id, type) {
	for (var key in FLOWS) {
		var flow = FLOWS[key];
		flow.$instance.refresh(id, type);
	}
};

exports.rpc = function(name, callback) {
	RPC[name] = callback;
};

exports.version = VERSION;

function send(self, id, data, callback) {

	var index = id.lastIndexOf('/');
	var input = '';

	if (index !== -1) {
		input = id.substring(index + 1);
		id = id.substring(0, index);
	}

	var instances = self.meta.flow;
	var instance = null;

	if (id[0] === '@') {
		id = id.substring(1);
		for (let key in instances) {
			if (instances[key].component === id) {
				instance = instances[key];
				break;
			}
		}
	} else if (id[0] === '#') {
		id = id.substring(1);
		for (let key in instances) {
			if (instances[key].module.name === id) {
				instance = instances[key];
				break;
			}
		}
	} else {
		if (instances[id])
			instance = instances[id];
	}

	if (!instance) {
		if (callback) {
			if (Parent) {
				let opt = {};
				opt.callbackid = callback;
				opt.data = { error: 404 };
				Parent.postMessage(opt);
			} else
				callback(404);
		}
		return;
	}

	var msg = instance.newmessage(data);

	msg.input = input;

	callback && msg.on('end', function(msg) {

		let output = {};

		output.error = msg.error;
		output.repo = msg.repo;
		output.data = msg.data;
		output.count = msg.count;
		output.cloned = msg.cloned;
		output.duration = Date.now() - msg.duration;
		output.meta = { id: instance.id, component: instance.component };

		if (Parent) {
			let opt = {};
			opt.TYPE = 'stream/send';
			opt.callbackid = callback;
			opt.data = output;
			Parent.postMessage(opt);
		} else
			callback(output.error, output);
	});

	instance.message(msg);
}

function exec(self, opt) {

	var target = [];
	var instances = self.meta.flow;
	var id;

	if (opt.id[0] === '@') {
		id = opt.id.substring(1);
		for (let key in instances) {
			if (instances[key].component === id)
				target.push(instances[key]);
		}
	} else if (opt.id[0] === '#') {
		id = opt.id.substring(1);
		for (let key in instances) {
			if (instances[key].module.name === id)
				target.push(instances[key]);
		}
	} else {
		if (instances[opt.id])
			target.push(instances[opt.id]);
	}

	target.wait(function(instance, next) {
		var msg = instance && instance.message ? instance.newmessage() : null;
		if (msg) {

			if (opt.vars)
				msg.vars = opt.vars;

			if (opt.repo)
				msg.repo = opt.repo;

			msg.data = opt.data == null ? {} : opt.data;

			if (opt.callbackid !== -1) {
				msg.on('end', function(msg) {

					var output = {};
					output.uid = opt.uid;
					output.ref = opt.ref;
					output.error = msg.error;
					output.repo = msg.repo;
					output.data = msg.data;
					output.count = msg.count;
					output.cloned = msg.cloned;
					output.duration = Date.now() - msg.duration;
					output.meta = { id: instance.id, component: instance.component };

					if (Parent) {
						if (opt.callbackid !== -1) {
							opt.repo = undefined;
							opt.vars = undefined;
							opt.data = output;
							Parent.postMessage(opt);
						}
					} else if (opt.callback)
						opt.callback(output.error, output);
				});
			}

			if (opt.timeout)
				msg.totaltimeout(opt.timeout);

			instance.message(msg);

		} else if (opt.callback) {
			opt.callback(404);
		} else if (Parent && opt.callbackid !== -1) {
			opt.repo = undefined;
			opt.vars = undefined;
			opt.data = { error: 404 };
			Parent.postMessage(opt);
		}

		setImmediate(next);

	}, function() {
		if (!target.length) {
			if (opt.callback) {
				opt.callback(404);
			} else if (Parent && opt.callbackid !== -1) {
				opt.repo = undefined;
				opt.vars = undefined;
				opt.data = { error: 404 };
				Parent.postMessage(opt);
			}
		}
	});
}

function rpc(name, data, callback) {
	var fn = RPC[name];
	if (fn)
		fn(data, callback);
	else
		callback('Invalid remote procedure name');
}

function httprequest(self, opt, callback) {
	if (self.httproutes[opt.route]) {
		self.httproutes[opt.route].callback(opt, function(data) {
			// data.status {Number}
			// data.headers {Object}
			// data.body {Buffer}
			if (Parent)
				Parent.postMessage({ TYPE: 'stream/httpresponse', data: data, callbackid: callback });
			else
				callback(data);
		});
	} else {
		if (Parent)
			Parent.postMessage({ TYPE: 'stream/httpresponse', data: { type: 'error', body: 404 }, callbackid: callback });
		else
			callback({ type: 'error', body: 404 });
	}
}

function killprocess() {
	// console.error('Main process doesn\'t respond');
	process.exit(1);
}

function init_current(meta, callback, nested) {

	initrunning();

	if (!meta.directory)
		meta.directory = F.path.root('flowstream');

	// Due to C/C++ modules
	if (W.workerData || meta.sandbox)
		F.config.$node_modules = F.path.join(meta.directory, meta.id, 'node_modules');

	ASFILES = meta.asfiles === true;

	var flow = MAKEFLOWSTREAM(meta);
	FLOWS[meta.id] = flow;

	if (isFLOWSTREAMWORKER) {
		if (meta.unixsocket && meta.proxypath) {
			if (!F.isWindows)
				F.Fs.unlink(meta.unixsocket, NOOP);
			F.http({ load: 'none', unixsocket: meta.unixsocket, config: { $stats: false, $sourcemap: false }});
		} else {
			F.config.$sourcemap = false;
			F.config.$stats = false;
			F.load('none');
		}
	}

	flow.name = meta.name || meta.id;
	flow.env = meta.env;
	flow.origin = meta.origin;
	flow.proxypath = meta.proxypath || '';
	flow.proxy.online = false;
	flow.proxy.ping = 0;

	if (meta.import) {
		let tmp = meta.import.split(/,|;/).trim();
		for (let m of tmp) {
			let mod = require(F.path.root(m));
			mod.install && mod.install(flow);
			mod.init && mod.init(flow);
		}
	}

	if (meta.initscript) {
		try {
			new Function('instance', meta.initscript)(flow);
		} catch (e) {
			flow.error(e, 'initscript');
		}
	}

	flow.$instance = new Instance(flow, meta.id);

	flow.$instance.output = function(fid, data, tfsid, tid, reference) {
		exports.input(meta.id, fid, tfsid, tid, data, reference);
	};

	if (!nested && Parent) {
		Parent.on('message', function(msg) {

			var id;

			switch (msg.TYPE) {

				case 'ping':
					flow.proxy.ping && clearTimeout(flow.proxy.ping);
					flow.proxy.ping = setTimeout(killprocess, 10000);
					break;

				case 'stream/destroy':
					flow.destroy();
					break;

				case 'stream/export':
					msg.data = flow.export2();
					Parent.postMessage(msg);
					break;

				case 'stream/reconfigure':
					flow.reconfigure(msg.id, msg.data);
					break;

				case 'stream/httprequest':
					httprequest(flow, msg.data, msg.callbackid);
					break;

				case 'stream/cmd':
					var fn = msg.path.indexOf('.') === - 1 ? global[msg.path] : F.TUtils.get(global, msg.path);
					if (fn && typeof(fn) === 'function')
						fn(msg.data);
					break;

				case 'stream/send':
					send(flow, msg.id, msg.data, msg.callbackid);
					break;

				case 'stream/exec':
					exec(flow, msg);
					break;

				case 'stream/eval':
					if (msg.callbackid) {
						flow.proxy.message(msg, function(response) {
							msg.data = response;
							Parent.postMessage(msg);
						});
					} else
						flow.proxy.message(msg);
					break;

				case 'stream/notify':
				case 'stream/trigger':
					id = msg.id;
					var type = msg.TYPE.substring(7);
					if (!flow.paused) {
						if (id[0] === '@') {
							id = id.substring(1);
							for (var key in flow.meta.flow) {
								var com = flow.meta.flow[key];
								if (com.component === id && com[type])
									com[type](msg.data);
							}
						} else if (id[0] === '#') {
							id = id.substring(1);
							for (var key in flow.meta.flow) {
								var com = flow.meta.flow[key];
								if (com.module.name === id && com[type])
									com[type](msg.data);
							}
						} else {
							var com = flow.meta.flow[id];
							if (com && com[type])
								com[type](msg.data);
						}
					}
					break;

				case 'stream/pause':
					flow.pause(msg.is == null ? !flow.paused : msg.is);
					flow.save();
					break;

				case 'stream/rewrite':
					for (var key in msg.data)
						flow.$schema[key] = msg.data[key];

					flow.rewrite(msg.data, function() {

						// @err {Error}

						flow.proxy.refreshmeta();

						if (flow.proxy.online) {
							flow.proxy.send({ TYPE: 'flow/components', data: flow.components(true) });
							flow.proxy.send({ TYPE: 'flow/design', data: flow.export() });
							flow.proxy.send({ TYPE: 'flow/variables', data: flow.variables });
						}

					});
					break;

				case 'stream/refresh':

					if (msg.type === 'meta' && msg.data) {
						for (var key in msg.data)
							flow.$schema[key] = msg.data[key];
						flow.proxy.refreshmeta();
					}

					for (var key in flow.meta.flow) {
						var instance = flow.meta.flow[key];
						instance.flowstream && instance.flowstream(msg.id, msg.type);
					}
					break;

				case 'stream/io2':
				case 'stream/rpcresponse':
					var cb = CALLBACKS[msg.callbackid];
					if (cb) {
						delete CALLBACKS[msg.callbackid];
						cb.callback(msg.error, msg.data);
					}
					break;

				case 'stream/components':
					msg.data = flow.components(true);
					Parent.postMessage(msg);
					break;

				case 'stream/io':

					if (msg.id) {
						msg.data = readinstance(flow, msg.id);
					} else {
						var arr = [];
						for (var key in flow.meta.flow) {
							let tmp = readinstance(flow, key);
							if (tmp)
								arr.push(tmp);
						}
						msg.data = arr;
					}

					Parent.postMessage(msg);
					break;

				case 'stream/input':

					if (msg.id) {
						if (msg.id[0] === '@') {
							id = msg.id.substring(1);
							for (let key in flow.meta.flow) {
								let tmp = flow.meta.flow[key];
								if (tmp.input && tmp.component === id)
									tmp.input(msg.flowstreamid, msg.fromid, msg.data, msg.reference);
							}
						} else {
							let tmp = flow.meta.flow[msg.id];
							if (tmp) {
								tmp.input && tmp.input(msg.flowstreamid, msg.fromid, msg.data, msg.reference);
							} else {
								for (let key in flow.meta.flow) {
									let tmp = flow.meta.flow[key];
									if (tmp.input && tmp.config.name === msg.id)
										tmp.input(msg.flowstreamid, msg.fromid, msg.data, msg.reference);
								}
							}
						}
					} else {
						for (let key in flow.meta.flow) {
							var f = flow.meta.flow[key];
							var c = flow.meta.components[f.component];
							if (f.input && c.type === 'input2')
								f.input(msg.flowstreamid, msg.fromid, msg.data, msg.reference);
						}
					}
					break;

				case 'stream/add':
					flow.add(msg.id, msg.data, function(err) {
						msg.error = err ? err.toString() : null;
						if (msg.callbackid !== -1)
							Parent.postMessage(msg);
						flow.redraw();
						flow.save();
					}, ASFILES);
					break;

				case 'stream/rem':
					flow.unregister(msg.id, function(err) {
						msg.error = err ? err.toString() : null;
						if (msg.callbackid !== -1)
							Parent.postMessage(msg);
						flow.save();
					});
					break;

				case 'stream/variables':
					flow.variables = msg.data;
					for (var key in flow.meta.flow) {
						var instance = flow.meta.flow[key];
						instance.variables && instance.variables(flow.variables);
					}
					flow.proxy.online && flow.proxy.send({ TYPE: 'flow/variables', data: msg.data });
					flow.save();
					break;

				case 'stream/variables2':
					flow.variables2 = msg.data;
					for (var key in flow.meta.flow) {
						var instance = flow.meta.flow[key];
						instance.variables2 && instance.variables2(flow.variables2);
					}
					flow.save();
					break;

				case 'ui/newclient':
					flow.proxy.online = true;
					flow.proxy.newclient(msg.clientid);
					break;

				case 'ui/online':
					flow.proxy.online = msg.online;
					break;

				case 'ui/message':
					if (msg.callbackid) {
						flow.proxy.message(msg.data, msg.clientid, function(data) {
							msg.TYPE = 'stream/eval';
							msg.data = data;
							Parent.postMessage(msg);
						});
					} else
						flow.proxy.message(msg.data, msg.clientid);
					break;
			}
		});

		flow.proxy.remove = function() {
			Parent.postMessage({ TYPE: 'stream/remove' });
		};

		flow.proxy.kill = function() {
			Parent.postMessage({ TYPE: 'stream/kill' });
		};

		flow.proxy.send = function(msg, type, clientid) {
			Parent.postMessage({ TYPE: 'ui/send', data: msg, type: type, clientid: clientid });
		};

		flow.proxy.save = function(data) {
			if (!flow.$schema || !flow.$schema.readonly)
				Parent.postMessage({ TYPE: 'stream/save', data: data });
		};

		flow.proxy.httproute = function(url, callback, instance) {
			if (!flow.$schema || !flow.$schema.readonly) {
				if (callback)
					flow.httproutes[url] = { id: instance.id, component: instance.component, callback: callback };
				else
					delete flow.httproutes[url];
				Parent.postMessage({ TYPE: 'stream/httproute', data: { url: url, remove: callback == null }});
			}
		};

		flow.proxy.done = function(err) {
			Parent.postMessage({ TYPE: 'stream/done', error: err });
		};

		flow.proxy.error = function(err, source, instance) {

			var instanceid = '';
			var componentid = '';

			if (instance) {
				if (typeof(instance) === 'string') {
					if (source === 'add' || source === 'register') {
						componentid = instance;
						F.error(err, 'FlowStream | register component | ' + instance);
					} else if (meta.design[instance]) {
						instanceid = instance;
						componentid = meta.design[instance].component;
					}
				} else if (source === 'instance_message') {
					if (instance.instance) {
						instanceid = instance.instance.id;
						componentid = instance.instance.component;
					} else
						F.error(err, 'FlowStream | message | ' + instance);
				} else if (source === 'instance_close') {
					instanceid = instance.id;
					componentid = instance.component;
				} else if (source === 'instance_make') {
					instanceid = instance.id;
					componentid = instance.component;
				} else {
					instanceid = instance.id;
					componentid = instance.module.id;
				}
			}

			Parent.postMessage({ TYPE: 'stream/error', error: err.toString(), stack: err.stack, source: source, id: instanceid, component: componentid });
		};

		flow.proxy.refresh = function(type) {
			Parent.postMessage({ TYPE: 'stream/refresh', type: type });
		};

		flow.proxy.output = function(id, data, flowstreamid, instanceid, reference) {
			Parent.postMessage({ TYPE: 'stream/output', id: id, data: data, flowstreamid: flowstreamid, instanceid: instanceid, reference: reference });
		};

		flow.proxy.input = function(fromid, tfsid, toid, data, reference) {
			Parent.postMessage({ TYPE: 'stream/toinput', fromflowstreamid: flow.id, fromid: fromid, toflowstreamid: tfsid, toid: toid, data: data, reference: reference });
		};

		flow.proxy.restart = function() {
			Parent.postMessage({ TYPE: 'stream/restart' });
		};

		flow.proxy.io = function(flowstreamid, id, callback) {

			if (typeof(flowstreamid) === 'function') {
				callback = flowstreamid;
				id = null;
				flowstreamid = null;
			} else if (typeof(id) === 'function') {
				callback = id;
				id = null;
			}

			var callbackid = callback ? (CALLBACKID++) : -1;
			if (callback)
				CALLBACKS[callbackid] = { id: flow.id, callback: callback };

			Parent.postMessage({ TYPE: 'stream/io2', flowstreamid: flowstreamid, id: id, callbackid: callbackid });
		};

	} else {

		flow.proxy.io = function(flowstreamid, id, callback) {
			exports.io(flowstreamid, id, callback);
		};

		flow.proxy.restart = function() {
			// nothing
		};

		flow.proxy.remove = function() {
			flow.$instance.remove();
		};

		flow.proxy.kill = function() {
			flow.$instance.kill();
		};

		flow.proxy.send = NOOP;
		flow.proxy.save = function(data) {
			if (!flow.$schema || !flow.$schema.readonly)
				flow.$instance.onsave && flow.$instance.onsave(data);
		};

		flow.proxy.httproute = function(url, callback, instanceid) {
			if (!flow.$schema || !flow.$schema.readonly) {
				if (callback)
					flow.httproutes[url] = { id: instanceid, callback: callback };
				else
					delete flow.httproutes[url];
				flow.$instance.onhttproute && flow.$instance.onhttproute(url, callback == null);
			}
		};

		flow.proxy.refresh = function(type) {
			exports.refresh(flow.id, type);
		};

		flow.proxy.done = function(err) {
			flow.$instance.ondone && setImmediate(flow.$instance.ondone, err);
		};

		flow.proxy.input = function(fromid, tfsid, toid, data, reference) {
			exports.input(flow.id, fromid, tfsid, toid, data, reference);
		};

		flow.proxy.error = function(err, source, instance) {

			let instanceid = '';
			let componentid = '';

			if (instance) {
				if (source === 'instance_message') {
					instanceid = instance.instance.id;
					componentid = instance.instance.component;
				} else if (source === 'instance_close') {
					instanceid = instance.id;
					componentid = instance.component;
				} else if (source === 'instance_make') {
					instanceid = instance.id;
					componentid = instance.component;
				} else if (source === 'register') {
					instanceid = '';
					componentid = instance;
				} else if (source === 'add') {
					componentid = instance;
				} else {
					instanceid = instance.id;
					componentid = instance.module ? instance.module.id : null;
				}
			}

			let tmp = { TYPE: 'flow/error', error: err.toString(), source: source, id: instanceid, component: componentid, ts: new Date() };
			flow.$socket && flow.$socket.send(tmp);
			flow.$client && flow.$client.send(tmp);
			flow.$instance.onerror && flow.$instance.onerror(err, source, instanceid, componentid);
		};

		flow.proxy.output = function(id, data, flowstreamid, instanceid, reference) {
			flow.$instance.output && flow.$instance.output(id, data, flowstreamid, instanceid, reference);
		};
	}

	callback && callback(null, flow.$instance);
	return flow.$instance;
}

function init_worker(meta, type, callback) {

	var forkargs = [F.directory, '--fork'];

	if (F.config.$insecure)
		forkargs.push('--insecure');

	if (meta.memory)
		forkargs.push('--max-old-space-size=' + meta.memory);

	var worker = type === 'worker' ? (new W.Worker(__filename, { workerData: meta })) : Fork(__filename, forkargs, { serialization: 'json', detached: false });
	var ischild = false;

	meta.unixsocket = makeunixsocket(meta.id);

	if (PROXIES[meta.id]) {
		PROXIES[meta.id].remove();
		delete PROXIES[meta.id];
	}

	if (meta.proxypath)
		PROXIES[meta.id] = F.proxy(meta.proxypath, meta.unixsocket);

	if (!worker.postMessage) {
		worker.postMessage = worker.send;
		ischild = true;
	}

	worker.postMessage2 = function(a, b) {
		if (!worker.$terminated)
			worker.postMessage(a, b);
	};

	worker.$instance = new Instance(worker, meta.id);
	worker.$instance.isworkerthread = true;
	worker.isworkerthread = true;
	worker.$schema = meta;

	worker.$instance.output = function(id, data, flowstreamid, instanceid, reference) {
		exports.input(meta.id, id, flowstreamid, instanceid, data, reference);
	};

	FLOWS[meta.id] = worker;

	var restart = function(code) {
		worker.$terminated = true;
		setTimeout(function(worker, code) {
			worker.$socket && setTimeout(socket => socket && socket.destroy(), 2000, worker.$socket);
			worker.$client && setTimeout(client => client && client.destroy(), 2000, worker.$client);
			if (!worker.$destroyed) {
				console.log('FlowStream auto-restart: ' + worker.$schema.name + ' (exit code: ' + ((code || '0') + '') + ')');
				init_worker(worker.$schema, type, callback);
				worker.$instance = null;
				worker.$schema = null;
				worker.$destroyed = true;
			}
		}, 1000, worker, code);
	};

	worker.on('exit', restart);

	worker.on('message', function(msg) {

		var tmp;

		Flow.$events.message && Flow.emit('message', worker.$instance.id, msg);

		switch (msg.TYPE) {

			case 'stream/stats':
				worker.stats = msg.data;
				if (Flow.$events.stats)
					Flow.emit('stats', meta.id, msg.data);
				break;

			case 'stream/restart':
				if (worker.terminate)
					worker.terminate();
				else
					worker.kill(9);
				break;

			case 'stream/kill':
				if (!worker.$terminated)
					worker.$instance.destroy(msg.code || 9);
				break;

			case 'stream/remove':
				if (!worker.$terminated)
					worker.$instance.remove();
				break;

			case 'stream/send':
				tmp = CALLBACKS[msg.callbackid];
				if (tmp) {
					delete CALLBACKS[msg.callbackid];
					tmp.callback(msg.data.error, msg.data);
				}
				break;
			case 'stream/exec':
				tmp = CALLBACKS[msg.callbackid];
				if (tmp) {
					delete CALLBACKS[msg.callbackid];
					tmp.callback(msg.data.error, msg.data, msg.meta);
				}
				break;

			case 'stream/httpresponse':
				tmp = CALLBACKS[msg.callbackid];
				if (tmp) {
					delete CALLBACKS[msg.callbackid];
					tmp.callback(msg.data, msg.meta);
				}
				break;

			case 'stream/rpc':
				rpc(msg.name, msg.data, (err, response) => worker.postMessage2({ TYPE: 'stream/rpcresponse', error: err, data: response, callbackid: msg.callbackid }));
				break;

			case 'stream/export':
			case 'stream/components':
				var cb = CALLBACKS[msg.callbackid];
				if (cb) {
					delete CALLBACKS[msg.callbackid];
					cb.callback(null, msg.data);
				}
				break;

			case 'stream/toinput':
				exports.input(msg.fromflowstreamid, msg.fromid, msg.toflowstreamid, msg.toid, msg.data, msg.reference);
				break;

			case 'stream/refresh':
				exports.refresh(meta.id, msg.type);
				break;

			case 'stream/error':
				tmp = { TYPE: 'flow/error', error: msg.error, stack: msg.stack, source: msg.source, id: msg.id, component: msg.component, ts: new Date() };
				worker.$socket && worker.$socket.send(tmp);
				worker.$client && worker.$client.send(tmp);
				worker.$instance.onerror && worker.$instance.onerror(msg.error, msg.source, msg.id, msg.component, msg.stack);
				break;

			case 'stream/save':
				worker.$schema.name = msg.data.name;
				worker.$schema.components = msg.data.components;
				worker.$schema.design = msg.data.design;
				worker.$schema.variables = msg.data.variables;
				worker.$schema.origin = msg.data.origin;
				worker.$schema.sources = msg.data.sources;
				worker.$instance.onsave && worker.$instance.onsave(msg.data);
				break;

			case 'stream/httproute':
				worker.$instance.onhttproute && worker.$instance.onhttproute(msg.data.url, msg.data.remove);
				break;

			case 'stream/done':
				worker.$instance.ondone && worker.$instance.ondone(msg.error);
				break;

			case 'stream/io2':
				exports.io(msg.flowstreamid, msg.id, function(err, data) {
					msg.data = data;
					msg.error = err;
					worker.postMessage(msg);
				});
				break;

			case 'stream/output':
				if (worker.$instance.onoutput) {
					tmp = meta.design[msg.id];
					tmp && worker.$instance.onoutput({ id: msg.id, name: tmp.config.name, data: msg.data, reference: msg.reference });
				}
				worker.$instance.output && worker.$instance.output(msg.id, msg.data, msg.flowstreamid, msg.instanceid, msg.reference);
				break;

			case 'stream/add':
			case 'stream/rem':
				tmp = CALLBACKS[msg.callbackid];
				if (tmp) {
					delete CALLBACKS[msg.callbackid];
					tmp.callback(msg.error);
				}
				break;

			case 'stream/io':
			case 'stream/eval':
				tmp = CALLBACKS[msg.callbackid];
				if (tmp) {
					delete CALLBACKS[msg.callbackid];
					tmp.callback(msg.error, msg.data);
				}
				break;

			case 'ui/send':

				worker.$client && worker.$client.send(msg.data);

				switch (msg.type) {
					case 1:
						worker.$socket && worker.$socket.send(msg.data, client => client.id === msg.clientid);
						break;
					case 2:
						worker.$socket && worker.$socket.send(msg.data, client => client.id !== msg.clientid);
						break;
					default:
						worker.$socket && worker.$socket.send(msg.data);
						break;
				}
				break;
		}

	});

	ischild && worker.send({ TYPE: 'init', data: meta });
	callback && callback(null, worker.$instance);
	return worker.$instance;
}

exports.io = function(flowstreamid, id, callback) {

	if (typeof(flowstreamid) === 'function') {
		callback = flowstreamid;
		id = null;
		flowstreamid = null;
	} else if (typeof(id) === 'function') {
		callback = id;
		id = null;
	}

	var flow;

	if (id) {
		flow = FLOWS[flowstreamid];

		if (flow) {
			flow.$instance.io(id, function(err, data) {
				if (data) {
					var tmp = readmeta(flow.$schema);
					tmp.item = data;
					data = tmp;
				}
				callback(err, data);
			});
		} else
			callback();

		return;
	}

	if (flowstreamid) {
		flow = FLOWS[flowstreamid];
		if (flow) {
			flow.$instance.io(null, function(err, data) {
				var f = flow.$schema || EMPTYOBJECT;
				var meta = readmeta(f);
				meta.items = data;
				callback(null, meta);
			});
		} else
			callback();
		return;
	}

	var arr = [];

	Object.keys(FLOWS).wait(function(key, next) {
		var flow = FLOWS[key];
		if (flow) {
			flow.$instance.io(null, function(err, data) {
				var f = flow.$schema || EMPTYOBJECT;
				var meta = readmeta(f);
				meta.items = data;
				arr.push(meta);
				next();
			});
		} else
			next();
	}, function() {
		callback(null, arr);
	});
};

exports.socket = function(flow, socket, verify, check) {

	if (typeof(flow) === 'string')
		flow = FLOWS[flow];

	if (!flow) {
		setTimeout(() => socket.destroy(), 100);
		return;
	}

	flow.$socket = socket;

	var newclient = function(client) {

		client.isflowstreamready = true;

		if (flow.isworkerthread) {
			flow.postMessage2({ TYPE: 'ui/newclient', clientid: client.id });
		} else {
			flow.proxy.online = true;
			flow.proxy.newclient(client.id);
		}

	};

	socket.on('open', function(client) {
		if (verify)
			verify(client, () => newclient(client));
		else
			newclient(client);
	});

	socket.autodestroy(function() {

		delete flow.$socket;

		if (flow.isworkerthread)
			flow.postMessage2({ TYPE: 'ui/online', online: false });
		else
			flow.proxy.online = false;
	});

	socket.on('close', function(client) {
		if (client.isflowstreamready) {
			var is = socket.online > 0;
			if (flow.isworkerthread)
				flow.postMessage2({ TYPE: 'ui/online', online: is });
			else
				flow.proxy.online = is;
		}
	});

	socket.on('message', function(client, msg) {
		if (client.isflowstreamready) {

			// It can check permissions
			if (check) {
				let err = check(client, msg);
				if (err !== true) {
					if (msg.callbackid)
						client.send({ callbackid: msg.callbackid, error: typeof(err) === 'string' ? err : '401' });
					return;
				}
			}

			if (flow.isworkerthread)
				flow.postMessage2({ TYPE: 'ui/message', clientid: client.id, data: msg });
			else
				flow.proxy.message(msg, client.id);
		}
	});

	if (flow.isworkerthread)
		return;

	flow.proxy.send = function(msg, type, clientid) {

		// 0: all
		// 1: client
		// 2: with except client

		switch (type) {
			case 1:
				clientid && socket.send(msg, conn => conn.id === clientid);
				break;
			case 2:
				socket.send(msg, conn => conn.id !== clientid);
				break;
			default:
				socket.send(msg);
				break;
		}
	};
};

exports.client = function(flow, socket) {

	if (typeof(flow) === 'string')
		flow = FLOWS[flow];

	var clientid = flow.id;

	flow.$client = socket;

	socket.on('close', function() {
		if (flow.isworkerthread)
			flow.postMessage2({ TYPE: 'ui/online', online: false });
		else
			flow.proxy.online = false;
	});

	socket.on('message', function(msg) {
		if (msg.TYPE === 'flow') {
			if (flow.isworkerthread) {
				flow.postMessage2({ TYPE: 'ui/newclient', clientid: clientid });
			} else {
				flow.proxy.online = true;
				flow.proxy.newclient(clientid);
			}
		} else {
			if (flow.isworkerthread)
				flow.postMessage2({ TYPE: 'ui/message', clientid: clientid, data: msg });
			else
				flow.proxy.message(msg, clientid);
		}
	});

	if (flow.isworkerthread)
		return;

	flow.proxy.send = msg => socket.send(msg);
};

function MAKEFLOWSTREAM(meta) {

	var flow = F.TFlowStream.create(meta.id, function(err, type, instance) {
		this.proxy.error(err, type, instance);
	});

	var saveid = null;

	flow.cloning = meta.cloning != false;
	flow.export_instance2 = function(id) {

		var com = flow.meta.flow[id];
		if (com) {

			if (id === 'paused' || id === 'groups' || id === 'tabs')
				return CLONE(com);

			var tmp = {};
			tmp.id = id;
			tmp.config = CLONE(com.config);
			tmp.x = com.x;
			tmp.y = com.y;
			tmp.offset = com.offset;
			tmp.size = com.size;
			tmp.meta = com.meta;
			tmp.schemaid = com.schemaid;
			tmp.note = com.note;
			tmp.schema = com.schema;
			tmp.component = com.component;
			tmp.connections = CLONE(com.connections);
			tmp.tab = com.tab;

			if (com.outputs)
				tmp.outputs = com.outputs;

			if (com.inputs)
				tmp.inputs = com.inputs;

			var c = flow.meta.components[com.component];
			if (c) {
				tmp.template = { type: c.type, icon: c.icon, color: c.color, group: c.group, name: c.name, inputs: c.inputs, outputs: c.outputs };
				return tmp;
			}
		}
	};

	function stringifyskip(key, value) {
		return key === '$$ID' || key === '$$REQUIRED' ? undefined : value;
	}

	flow.export2 = function() {

		var variables = flow.variables;
		var design = {};
		var components = {};
		var sources = flow.sources ? JSON.parse(JSON.stringify(flow.sources, stringifyskip)) : {};

		for (let key in flow.meta.components) {
			let com = flow.meta.components[key];
			components[key] = com.ui.raw;
		}

		for (let key in flow.meta.flow) {
			design[key] = flow.export_instance2(key);
			delete design[key].template;
		}

		var data = {};
		var blacklist = { unixsocket: 1, components: 1, variables2: 1, sources: 1, design: 1, size: 1, directory: 1 };

		for (let key in flow.$schema) {
			if (!blacklist[key])
				data[key] = flow.$schema[key];
		}

		data.paused = flow.paused;
		data.components = components;
		data.design = design;
		data.variables = variables;
		data.sources = sources;
		return data;
	};

	var saveforce = function() {
		saveid && clearTimeout(saveid);
		saveid = null;
		if (!flow.$destroyed)
			flow.proxy.save(flow.export2());
	};

	var save = function() {

		// reloads TMS
		for (var key in flow.sockets)
			flow.sockets[key].synchronize();

		if (flow.$schema && flow.$schema.readonly)
			return;

		clearTimeout(saveid);
		saveid = setTimeout(saveforce, 5000);
	};

	flow.save = function() {
		save();
	};

	flow.remove = function() {
		flow.proxy.remove();
	};

	flow.kill = function(code) {
		flow.proxy.kill(code);
	};

	flow.restart = function() {
		flow.proxy.restart();
	};

	var timeoutrefresh = null;

	var refresh_components_force = function() {
		timeoutrefresh = null;
		if (!flow.$destroyed && flow.proxy.online) {
			flow.proxy.send({ TYPE: 'flow/components', data: flow.components(true) });
			let instances = flow.export();
			flow.proxy.send({ TYPE: 'flow/design', data: instances });
		}
	};

	var refresh_components = function() {
		timeoutrefresh && clearTimeout(timeoutrefresh);
		timeoutrefresh = setTimeout(refresh_components_force, 700);
	};

	flow.rpc = function(name, data, callback) {
		if (Parent) {
			var callbackid = callback ? (CALLBACKID++) : -1;
			if (callbackid !== -1)
				CALLBACKS[callbackid] = { id: flow.id, callback: callback };
			Parent.postMessage({ TYPE: 'stream/rpc', name: name, data: data, callbackid: callbackid });
		} else
			rpc(name, data, callback);
	};

	flow.redraw = refresh_components;
	flow.sources = meta.sources || {};
	flow.proxy = {};

	flow.proxy.variables = function(data) {
		flow.variables = data;
		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.variables && instance.variables(flow.variables);
		}
		var msg = {};
		msg.TYPE = 'flow/variables';
		msg.data = data;
		flow.proxy.online && flow.proxy.send(msg);
		save();
	};

	flow.proxy.message = function(msg, clientid, callback) {

		var tmp;

		switch (msg.TYPE) {

			case 'call':

				var instance;

				// Executes "exports.call"
				if (msg.id[0] === '@') {
					instance = flow.meta.components[msg.id.substring(1)];
					if (instance && instance.call) {
						msg.id = msg.callbackid;
						msg.TYPE = 'flow/call';
						instance.call.call(flow, msg.data, function(data) {
							msg.data = data;
							flow.proxy.online && flow.proxy.send(msg, 1, clientid);
							callback && callback(msg);
						});
					}
					return;
				}

				instance = flow.meta.flow[msg.id];
				if (instance && instance.call) {
					msg.id = msg.callbackid;
					msg.TYPE = 'flow/call';
					instance.call(msg.data, function(data) {
						msg.data = data;
						flow.proxy.online && flow.proxy.send(msg, 1, clientid);
						callback && callback(msg);
					});
				}
				break;

			case 'note':
			case 'meta':
				var instance = flow.meta.flow[msg.id];
				if (instance) {
					instance[msg.TYPE] = msg.data;
					msg.TYPE = 'flow/' + msg.TYPE;
					flow.proxy.online && flow.proxy.send(msg, 0, clientid);
					callback && callback(msg);
					save();
				}
				break;

			case 'status':
				flow.instances().wait(function(com, next) {
					com[msg.TYPE] && com[msg.TYPE](msg, 0, clientid);
					setImmediate(next);
				}, 3);
				break;

			case 'refresh':
				// Sends last statuses
				flow.instances().wait(function(com, next) {
					com.status();
					setImmediate(next);
				}, 3);
				break;

			case 'reset':
				flow.errors.length = 0;
				msg.TYPE = 'flow/reset';
				flow.proxy.online && flow.proxy.send(msg, 0, clientid);
				callback && callback(msg);
				break;

			case 'trigger':
				var instance = flow.meta.flow[msg.id];
				instance && instance.trigger && instance.trigger(msg);
				break;

			case 'config':
				var instance = flow.meta.flow[msg.id];
				if (instance) {
					msg.TYPE = 'flow/configuration';
					msg.data = instance.config;
					flow.proxy.send(msg, 1, clientid);
				}
				break;

			case 'reconfigure':
				flow.reconfigure(msg.id, msg.data);
				break;

			case 'move':
				var com = flow.meta.flow[msg.id];
				if (com) {
					com.x = msg.data.x;
					com.y = msg.data.y;
					msg.TYPE = 'flow/move';
					flow.proxy.online && flow.proxy.send(msg, 2, clientid);
					callback && callback(msg);
					save();
				}
				break;

			case 'groups':
				flow.meta.flow.groups = msg.data;
				msg.TYPE = 'flow/groups';
				flow.proxy.online && flow.proxy.send(msg, 2, clientid);
				callback && callback(msg);
				save();
				break;

			case 'export':
				msg.TYPE = 'flow/export';
				if (flow.proxy.online) {
					msg.data = flow.export2();
					if (isFLOWSTREAMWORKER)
						msg.data.worker = process.argv.indexOf('--fork') === -1 ? 'worker' : 'fork';
					flow.proxy.send(msg, 1, clientid);
					callback && callback(msg);
				}
				break;

			case 'origin':
				var origin = msg.body || '';
				if (flow.$schema.origin !== origin) {
					flow.origin = flow.$schema.origin = origin;
					flow.proxy.refreshmeta();
					save();
				}
				break;

			case 'restart':
				flow.proxy.restart();
				break;

			case 'reset_stats':
				flow.stats.messages = 0;
				flow.stats.pending = 0;
				break;

			case 'save':
				flow.use(CLONE(msg.data), function(err) {
					msg.error = err ? err.toString() : null;
					msg.TYPE = 'flow/design';
					flow.proxy.online && flow.proxy.send(msg);
					callback && callback(msg);
					save();
				});
				break;

			case 'insert':
				flow.insert(CLONE(msg.data), function(err) {
					for (var key in msg.data)
						msg.data[key] = flow.export_instance2(key);
					msg.TYPE = 'flow/design_insert';
					msg.error = err ? err.toString() : null;
					flow.proxy.online && flow.proxy.send(msg);
					callback && callback(msg);
					save();
				});
				break;

			case 'remove':
				flow.remove(msg.data, function(err) {
					msg.TYPE = 'flow/design_remove';
					msg.error = err ? err.toString() : null;
					flow.proxy.online && flow.proxy.send(msg);
					callback && callback(msg);
					save();
				});
				break;

			case 'variables':
				flow.variables = msg.data;
				for (var key in flow.meta.flow) {
					var instance = flow.meta.flow[key];
					instance.variables && instance.variables(flow.variables);
				}
				msg.TYPE = 'flow/variables';
				flow.proxy.online && flow.proxy.send(msg);
				callback && callback(msg);
				save();
				break;

			case 'sources':
				msg.TYPE = 'flow/sources';
				msg.data = flow.sources;
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'pause':

				if (msg.id == null) {
					// entire flow
					flow.pause(msg.is);
					save();
					return;
				}

				if (msg.is) {
					if (!flow.meta.flow.paused)
						flow.meta.flow.paused = {};
					flow.meta.flow.paused[msg.id] = 1;
					save();
				} else {
					if (flow.meta.flow.paused) {
						delete flow.meta.flow.paused[msg.id];
						save();
					}
				}
				msg.TYPE = 'flow/pause';
				flow.proxy.online && flow.proxy.send(msg, 2, clientid);
				callback && callback(msg);
				break;

			case 'source_read':
				msg.TYPE = 'flow/source_read';
				msg.data = flow.sources[msg.id];
				msg.error = msg.data ? null : 'Not found';
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'source_save':

				TMS.check(msg.data, function(err, meta) {

					if (err) {
						delete msg.data;
						msg.TYPE = 'flow/source_save';
						msg.error = err.toString();
						flow.proxy.online && flow.proxy.send(msg, 1, clientid);
						callback && callback(msg);
						return;
					}

					var source = flow.sources[msg.data.id];
					if (source) {
						source.name = msg.data.name;
						source.url = msg.data.url;
						source.token = msg.data.token;
						source.dtupdated = NOW;
						source.meta = meta;
						source.checksum = HASH(JSON.stringify(meta)).toString(36) + '';
					} else {
						flow.sources[msg.data.id] = msg.data;
						msg.data.meta = meta;
						msg.data.checksum = HASH(JSON.stringify(meta)).toString(36) + '';
					}

					TMS.refresh(flow);
					save();
					flow.proxy.online && flow.proxy.send({ TYPE: 'flow/source_save', callbackid: msg.callbackid, error: null }, 1, clientid);
					callback && callback(msg);
				});

				break;

			case 'source_remove':

				msg.TYPE = 'flow/remove';
				var source = flow.sources[msg.id];
				if (source) {
					delete flow.sources[msg.id];
					flow.sockets[msg.id] && flow.sockets[msg.id].destroy();
					var remove = [];
					for (var key in flow.meta.components) {
						var com = flow.meta.components[key];
						if (com.schemaid && com.schemaid[0] === msg.id)
							remove.push(key);
					}

					remove.wait(function(key, next) {
						flow.unregister(key, next);
					}, function() {
						refresh_components();
						save();
					});
				}

				msg.error = source == null ? 'Not found' : null;
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'component_read':

				tmp = flow.meta.components[msg.id];
				if (tmp && tmp.meta) {
					if (tmp.meta.readonly) {
						msg.TYPE = 'flow/component_read';
						msg.data = null;
						msg.error = 'The component cannot be edited';
						flow.proxy.online && flow.proxy.send(msg, 1, clientid);
						callback && callback(msg);
						return;
					}
				}

				msg.TYPE = 'flow/component_read';
				msg.data = flow.meta.components[msg.id] ? flow.meta.components[msg.id].ui.raw : null;
				msg.error = msg.data == null ? 'Not found' : null;
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'component_save':

				// check prev functionality
				tmp = flow.meta.components[msg.id];
				if (tmp && tmp.meta) {
					if (tmp.meta.readonly) {
						msg.TYPE = 'flow/component_save';
						msg.error = 'The component cannot be edited';
						flow.proxy.online && flow.proxy.send(msg, 1, clientid);
						callback && callback(msg);
						return;
					}
				}

				flow.add(msg.id, msg.data, function(err) {
					delete msg.data;
					msg.TYPE = 'flow/component_save';
					msg.error = err ? err.toString() : null;
					flow.proxy.online && flow.proxy.send(msg, 1, clientid);
					callback && callback(msg);
					refresh_components();
					save();
				}, ASFILES);
				break;

			case 'component_remove':

				// check prev functionality
				tmp = flow.meta.components[msg.id];
				if (tmp && tmp.meta) {
					if (tmp.meta.protected) {
						msg.TYPE = 'flow/component_remove';
						msg.error = 'The component cannot be removed';
						flow.proxy.online && flow.proxy.send(msg, 1, clientid);
						callback && callback(msg);
						return;
					}
				}

				flow.unregister(msg.id, function() {
					refresh_components();
					save();
				});

				break;
		}
	};

	flow.errors = [];
	flow.variables = meta.variables;
	flow.variables2 = meta.variables2;
	flow.sockets = {};
	flow.$schema = meta;
	flow.httproutes = {};
	flow.secrets = {};

	if (meta.paused)
		flow.pause(true);

	flow.load(meta, function() {

		if (flow.sources) {
			Object.keys(flow.sources).wait(function(key, next) {
				TMS.connect(flow, key, next);
			});
		}

		flow.ready = true;
		setImmediate(() => flow.proxy.done());
	}, ASFILES);

	flow.components = function(prepare_export) {

		var self = this;
		var arr = [];

		for (var key in self.meta.components) {
			var com = self.meta.components[key];
			if (prepare_export) {
				var obj = {};
				obj.id = com.id;
				obj.meta = com.meta;
				obj.name = com.name;
				obj.type = com.type;
				obj.css = com.ui.css;
				obj.js = com.ui.js;
				obj.icon = com.icon;
				obj.color = com.color;
				obj.config = com.config;
				obj.html = com.ui.html;
				obj.schema = com.schema ? com.schema.id : null;
				obj.readme = com.ui.readme;
				obj.template = com.ui.template;
				obj.settings = com.ui.settings;
				obj.inputs = com.inputs;
				obj.outputs = com.outputs;
				obj.group = com.group;
				obj.version = com.version;
				obj.author = com.author;
				obj.permissions = com.permissions;
				arr.push(obj);
			} else
				arr.push(com);
		}

		return arr;
	};

	var minutes = -1;
	var memory = 0;
	var notifier = 0;

	// Captures stats from the Flow
	flow.onstats = function(stats) {

		if (stats.minutes !== minutes) {
			minutes = stats.minutes;
			if (isFLOWSTREAMWORKER)
				memory = process.memoryUsage().heapUsed;
			else if (F.consumption.memory)
				memory = F.consumption.memory * 1024 * 1024;
		}

		flow.stats.memory = memory;
		flow.stats.errors = flow.errors.length;

		// Each 9 seconds
		if (notifier % 3 === 0) {
			notifier = 0;
			if (Parent || Flow.$events.stats) {
				let pstats = { paused: flow.paused, messages: flow.stats.messages, pending: flow.stats.pending, memory: flow.stats.memory, minutes: flow.stats.minutes, errors: flow.stats.errors, mm: flow.stats.mm, pid: process.pid };
				if (Parent)
					Parent.postMessage({ TYPE: 'stream/stats', data: pstats });
				else if (Flow.$events.stats)
					Flow.emit(flow.$schema.id, pstats);
			}
		}

		notifier++;
		stats.paused = flow.paused;

		flow.stats.TYPE = 'flow/stats';
		flow.proxy.online && flow.proxy.send(stats);
	};

	var cleanerid;
	var problematic = [];
	var cleaner = function() {

		cleanerid = null;

		for (var key of problematic) {
			delete meta.components[key];
			flow.unregister(key);
		}

		if (flow.proxy.online)
			refresh_components();

		save();
	};

	var cleanerservice = function() {
		cleanerid && clearTimeout(cleanerid);
		cleanerid = setTimeout(cleaner, 500);
	};

	flow.onunregister = function(component) {
		for (var key in flow.httproutes) {
			var route = flow.httproutes[key];
			if (route && route.component === component.id)
				flow.proxy.httproute(key, null);
		}
	};

	flow.onregister = function(component) {
		if (!component.schema && component.schemaid && (component.type === 'pub' || component.type === 'sub' || component.type === 'call')) {
			var tmp = flow.sources[component.schemaid[0]];
			if (tmp && tmp.meta) {
				var arr = component.type === 'pub' ? tmp.meta.publish : component.type === 'call' ? tmp.meta.call : tmp.meta.subscribe;
				component.schema = arr.findItem('id', component.schemaid[1]);
				component.itemid = component.schemaid[0];
			} else {
				problematic.push(component.id);
				cleanerservice();
			}
		}
	};

	flow.httproute = function(url, callback) {
		flow.proxy.httproute(url, callback);
	};

	flow.ondisconnect = function(instance) {

		if (instance.$statusdelay) {
			clearTimeout(instance.$statusdelay);
			instance.$statusdelay = null;
		}

		for (var key in flow.httproutes) {
			var route = flow.httproutes[key];
			if (route && route.id === instance.id)
				flow.proxy.httproute(key, null);
		}
	};

	flow.onconnect = function(instance) {

		instance.env = instance.main.env;

		instance.httproute = function(url, callback) {
			flow.proxy.httproute(url, callback, instance);
		};

		instance.href = function(url) {
			var hostname = (flow.$schema.origin || '') + (flow.$schema.proxypath || '');

			if (url && hostname[hostname.length - 1] === '/')
				hostname = hostname.substring(0, hostname.length - 1);

			return url ? (hostname + url) : hostname;
		};

		instance.save = function() {
			var item = {};
			item.x = instance.x;
			item.y = instance.y;
			item.size = instance.size;
			item.offset = instance.offset;
			item.meta = instance.meta;
			item.note = instance.note;
			item.config = instance.config;
			item.outputs = instance.outputs;
			item.inputs = instance.inputs;
			item.tab = instance.tab;

			if (!flow.loading) {
				flow.cleanforce();
				save();
			}

			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/redraw', id: instance.id, data: item });
		};

		instance.newvariables = function(data) {
			flow.proxy.variables(data || {});
		};

		instance.newsecrets = function(data) {

			for (var key in data)
				flow.secrets[key] = data[key];

			for (var key in flow.meta.flow) {
				var m = flow.meta.flow[key];
				m.secrets && m.secrets(flow.secrets);
				m.vary && m.vary('secrets');
			}

		};

		instance.newflowstream = function(meta, isworker, callback) {
			return exports.init(meta, isworker, callback, true);
		};

		instance.io = function(flowstreamid, id, callback) {
			flow.proxy.io(flowstreamid, id, callback);
		};

		instance.toinput = function(data, flowstreamid, id, reference) {
			flow.proxy.input(instance.id, flowstreamid, id, data, reference);
		};

		instance.output = function(data, flowstreamid, id, reference) {
			flow.proxy.output(instance.id, data, flowstreamid, id, reference);
		};

		instance.reconfigure = function(config) {
			instance.main.reconfigure(instance.id, config);
		};
	};

	flow.io = function(flowstreamid, id, callback) {
		flow.proxy.io(flowstreamid, id, callback);
	};

	flow.onreconfigure = function(instance, init) {
		if (!init) {
			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/config', id: instance.id, data: instance.config });
			flow.proxy.refresh('configure');
			save();
		}
	};

	flow.onerror = function(err, source) {

		err += '';

		var obj = {};
		obj.error = err;
		obj.id = this.id;
		obj.ts = new Date();
		obj.source = source;

		flow.errors.unshift(obj);

		if (flow.errors.length > 10)
			flow.errors.pop();

		flow.proxy.error(err, source, this);
		flow.proxy.online && flow.proxy.send({ TYPE: 'flow/error', error: err, id: obj.id, ts: obj.ts, source: source });
	};

	var sendstatusforce = function(instance) {
		instance.$statusdelay = null;
		if (instance.$status != null) {
			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/status', id: instance.id, data: instance.$status });
			flow.$events.status && flow.emit('status', instance, instance.$status);
		}
	};

	// component.status() will execute this method
	flow.onstatus = function(status, delay) {

		var instance = this;

		if (status != undefined)
			instance.$status = status;

		if (delay) {
			if (!instance.$statusdelay)
				instance.$statusdelay = setTimeout(sendstatusforce, delay || 1000, instance);
		} else
			sendstatusforce(instance);
	};

	// component.dashboard() will execute this method
	flow.ondashboard = function(data) {

		var instance = this;

		if (data == null)
			data = instance.$dashboard;
		else
			instance.$dashboard = data;

		if (data != null) {
			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/dashboard', id: instance.id, data: data });
			flow.$events.dashboard && flow.emit('dashboard', instance, instance.data);
		}

	};

	var loaded = false;

	flow.on('schema', function() {
		if (flow.ready) {

			for (var key in flow.sockets)
				flow.sockets[key].synchronize();

			if (loaded)
				flow.proxy.refresh('schema');

			loaded = true;
		}
	});

	var makemeta = function() {
		return { TYPE: 'flow/flowstream', id: flow.$schema.id, version: VERSION, paused: flow.paused, node: F.version_node, total: F.version, name: flow.$schema.name, version2: flow.$schema.version, icon: flow.$schema.icon, reference: flow.$schema.reference, author: flow.$schema.author, color: flow.$schema.color, origin: flow.$schema.origin, notify: flow.$schema.origin + NOTIFYPATH + flow.$schema.id + '-/', readme: flow.$schema.readme, url: flow.$schema.url, proxypath: isFLOWSTREAMWORKER ? flow.$schema.proxypath : '/', env: flow.$schema.env, worker: isFLOWSTREAMWORKER ? (W.workerData ? 'Worker Thread' : 'Child Process') : false, cloning: flow.cloning };
	};

	flow.proxy.refreshmeta = function() {

		flow.name = flow.$schema.name || flow.$schema.id;
		flow.origin = flow.$schema.origin;
		flow.proxypath = flow.$schema.proxypath || '';

		if (isFLOWSTREAMWORKER) {
			if (flow.proxypath) {
				if (!F.server)
					F.httpload({ unixsocket: flow.$schema.unixsocket });
			} else if (F.server)
				F.server.close();
		}

		flow.cloning = flow.$schema.cloning != false;
		flow.proxy.send(makemeta(), 0);
	};

	flow.proxy.newclient = function(clientid, metaonly) {
		if (flow.proxy.online) {
			flow.proxy.send(makemeta(), 1, clientid);
			if (!metaonly) {
				flow.proxy.send({ TYPE: 'flow/variables', data: flow.variables }, 1, clientid);
				flow.proxy.send({ TYPE: 'flow/variables2', data: flow.variables2 }, 1, clientid);
				flow.proxy.send({ TYPE: 'flow/components', data: flow.components(true) }, 1, clientid);
				flow.proxy.send({ TYPE: 'flow/design', data: flow.export() }, 1, clientid);
				flow.proxy.send({ TYPE: 'flow/errors', data: flow.errors }, 1, clientid);
				setTimeout(function() {
					if (!flow.$destroyed) {
						flow.instances().wait(function(com, next) {
							com.status();
							setImmediate(next);
						}, 3);
					}
				}, 1500);
			}
		}
	};

	return flow;
}

// TMS implementation:
TMS.check = function(item, callback) {

	var client = F.websocketclient();

	if (item.token)
		client.headers['x-token'] = item.token;

	client.options.reconnect = 0;

	client.on('open', function() {
		client.tmsready = true;
	});

	client.on('error', function(err) {
		client.tmsready = false;
		callback(err);
		clearTimeout(client.timeout);
	});

	client.on('close', function() {
		client.tmsready = false;
		callback('401: Unauthorized');
	});

	client.on('message', function(msg) {
		switch (msg.type) {
			case 'ping':
				msg.type = 'pong';
				client.send(msg);
				break;
			case 'meta':
				callback(null, msg);
				clearTimeout(client.timeout);
				client.close();
				break;
		}
	});

	client.timeout = setTimeout(function() {
		if (client.tmsready) {
			client.close();
			callback('408: Timeout');
		}
	}, 2500);

	client.connect(item.url.replace(/^http/g, 'ws'));
};

function makemodel(item) {
	return { url: item.url, token: item.token, error: item.error };
}

TMS.connect = function(fs, sourceid, callback) {

	if (fs.sockets[sourceid]) {
		fs.sockets[sourceid].close();
		delete fs.sockets[sourceid];
	}

	var client = F.websocketclient();

	var item = fs.sources[sourceid];
	var prev;

	item.restart = false;
	client.options.reconnectserver = true;
	client.callbacks = {};
	client.callbackindexer = 0;
	client.callbacktimeout = function(callbackid) {
		var cb = client.callbacks[callbackid];
		if (cb) {
			delete client.callbacks[callbackid];
			cb(new ErrorBuilder().push(408).output());
		}
	};

	if (item.token)
		client.headers['x-token'] = item.token;

	var syncforce = function() {
		client.synchronize();
	};

	client.on('open', function() {
		prev = null;
		fs.sockets[item.id] = client;
		item.error = 0;
		item.init = true;
		item.online = true;
		client.subscribers = {};
		client.tmsready = true;
		client.model = makemodel(item);
		setTimeout(syncforce, 10);
	});

	client.synchronize = function() {

		if (!client.tmsready)
			return;

		var publishers = {};

		for (var key in fs.meta.flow) {
			var instance = fs.meta.flow[key];
			var com = fs.meta.components[instance.component];
			if (com && com.itemid === item.id && com.outputs && com.outputs.length) {
				if (Object.keys(instance.connections).length)
					publishers[com.schema.id] = 1;
			}
		}

		var keys = Object.keys(publishers);
		var cache = keys.join(',');

		if (!prev || prev !== cache) {
			prev = cache;
			client.send({ type: 'subscribers', subscribers: keys });
		}

	};

	client.on('close', function(code) {

		if (code === 4001)
			client.destroy();

		item.error = code;
		item.online = false;

		client.model = makemodel(item);
		// AUDIT(client, 'close');

		delete fs.sockets[item.id];
		client.tmsready = false;
	});

	client.on('message', function(msg) {

		var type = msg.type || msg.TYPE;
		var tmp;

		switch (type) {
			case 'meta':

				item.meta = msg;

				tmp = HASH(JSON.stringify(msg)).toString(36);
				client.subscribers = {};
				client.publishers = {};
				client.calls = {};

				for (let pub of msg.publish)
					client.publishers[pub.id] = pub.schema;

				for (let sub of msg.subscribe)
					client.subscribers[sub.id] = 1;

				if (msg.call) {
					for (let call of msg.call)
						client.calls[call.id] = 1;
				}

				if (item.checksum !== tmp) {
					item.checksum = tmp;
					item.init = false;
					TMS.refresh2(fs);
				}

				client.synchronize();
				break;

			case 'call':

				tmp = client.callbacks[msg.callbackid];
				if (tmp) {
					tmp.id && clearTimeout(tmp.id);
					tmp.callback(msg.error ? msg.data : null, msg.error ? null : msg.data);
					delete client.callbacks[msg.callbackid];
				}

				break;

			case 'subscribers':
				client.subscribers = {};
				if (msg.subscribers instanceof Array) {
					for (let key of msg.subscribers)
						client.subscribers[key] = 1;
				}
				break;

			case 'publish':

				if (fs.paused)
					return;

				tmp = client.publishers[msg.id];
				if (tmp) {
					// HACK: very fast validation
					var err = new F.TBuilders.ErrorBuilder();
					var data = F.TJSONSchema.transform(tmp, err, msg.data, true);
					if (data) {
						var id = 'pub' + item.id + 'X' + msg.id;
						for (let key in fs.meta.flow) {
							var flow = fs.meta.flow[key];
							if (flow.component === id)
								flow.process(data, client);
						}
					}
				}

				break;
		}
	});

	client.connect(item.url.replace(/^http/g, 'ws'));
	callback && setImmediate(callback);
};

// In the Flow will be the "Publish" mentioned in the "Subscribe" group
const TEMPLATE_PUBLISH = `<script total>

	exports.name = '{0}';
	exports.icon = '{3}';
	exports.config = {};
	exports.outputs = [{ id: 'publish', name: 'Output' }];
	exports.group = 'Subscribe';
	exports.type = 'pub';
	exports.schemaid = ['{7}', '{1}'];

	exports.make = function(instance) {
		instance.process = function(msg, client) {
			instance.send('publish', msg, client);
		};
	};

</script>

<style>
	.f-{5} .url { font-size: 11px; }
</style>

<readme>
{2}
</readme>

<body>
	<header>
		<div><i class="{3} mr5"></i><span>{6} / <b>{1}</b></span></div>
		<div class="url">{4}</div>
	</header>
</body>`;

// In the Flow will be the "Subscribe" mentioned in the "Publish" group
const TEMPLATE_SUBSCRIBE = `<script total>

	exports.name = '{0}';
	exports.icon = '{3}';
	exports.group = 'Publish';
	exports.config = {};
	exports.inputs = [{ id: 'subscribe', name: 'Input' }];
	exports.type = 'sub';
	exports.schemaid = ['{7}', '{1}'];

	exports.make = function(instance) {
		instance.message = function($) {
			var socket = instance.main.sockets['{7}'];
			if (socket && socket.subscribers && socket.subscribers['{1}']) {

				var data = $.data;

				/*
					var err = new F.ErrorBuilder();
					data = F.TJSONSchema.transform(schema, err, data, true);

					if (err.is) {
						$.destroy();
						return;
					}

				*/

				socket.send({ type: 'subscribe', id: '{1}', data: data });
			}
			$.destroy();
		};
	};

</script>

<style>
	.f-{5} .url { font-size: 11px; }
</style>

<readme>
{2}
</readme>

<body>
	<header>
		<div><i class="{3} mr5"></i><span>{6} / <b>{1}</b></span></div>
		<div class="url">{4}</div>
	</header>
</body>`;

const TEMPLATE_CALL = `<script total>

	exports.name = '{0}';
	exports.icon = '{3}';
	exports.config = { timeout: 60000 };
	exports.inputs = [{ id: 'input', name: 'Input' }];
	exports.outputs = [{ id: 'output', name: 'Output' }, { id: 'error', name: 'Error' }];
	exports.group = 'Calls';
	exports.type = 'call';
	exports.schemaid = ['{7}', '{1}'];

	exports.make = function(instance, config) {

		instance.message = function($, client) {
			var socket = instance.main.sockets['{7}'];
			if (socket && socket.calls && socket.calls['{1}']) {

				var data = $.data;

				/*
					var err = new F.ErrorBuilder();
					data = F.TJSONSchema.transform(schema, err, data, true);

					if (err.is) {
						$.send('error', err.toString());
						return;
					}

				*/

				var callback = function(err, response) {
					if (err)
						$.send('error', err);
					else
						$.send('output', response);
				};

				var callbackid = (socket.callbackindexer++) + '';

				if (socket.callbackindexer > 999999999)
					socket.callbackindexer = 0;

				socket.callbacks[callbackid] = { callback: callback, id: setTimeout(socket.callbacktimeout, config.timeout, callbackid) };
				socket.send({ type: 'call', id: '{1}', data: data, callbackid: callbackid });

			} else
				$.destroy();
		};
	};

</script>

<style>
	.f-{5} .url { font-size: 11px; }
</style>

<readme>
{2}
</readme>

<body>
	<header>
		<div><i class="{3} mr5"></i><span>{6} / <b>{1}</b></span></div>
		<div class="url">{4}</div>
	</header>
</body>`;

function beautifyjsonschema(schema) {

	var builder = ['__Data__:\n```json'];

	for (var key in schema.properties) {
		var prop = schema.properties[key];
		var val = prop.type;
		var required = schema.required ? schema.required.includes(key) : false;
		if (prop.enum)
			val = prop.enum.join('|');
		builder.push((required ? '*' : '') + key + ' {' + val + '}');
	}
	builder.join('```');
	return builder.join('\n');
}

TMS.refresh = function(fs, callback) {

	Object.keys(fs.sources).wait(function(key, next) {

		var item = fs.sources[key];
		if (item.init) {
			if (item.restart || !fs.sources[key])
				TMS.connect(fs, item.id, next);
			else
				next();

		} else {

			var index = item.url.indexOf('/', 10);
			var url = item.url.substring(0, index);

			if (item.meta.publish instanceof Array) {
				for (var i = 0; i < item.meta.publish.length; i++) {
					var m = item.meta.publish[i];
					var readme = [];

					readme.push('# ' + m.id);
					readme.push('- URL address: <' + url + '>');
					readme.push('- Channel: __publish__');
					readme.push('- JSON schema `' + m.id + '.json`');
					readme.push('');
					readme.push(beautifyjsonschema(m.schema));

					var id = 'pub' + item.id + 'X' + m.id;
					var template = TEMPLATE_PUBLISH.format(item.meta.name, m.id, readme.join('\n'), m.icon || 'ti ti-antenna', m.url, id, item.meta.name.max(15), item.id);
					var com = fs.add(id, template);
					m.url = url;
					com.type = 'pub';
					com.itemid = item.id;
					com.schema = m;
				}
			}

			if (item.meta.subscribe instanceof Array) {
				for (var i = 0; i < item.meta.subscribe.length; i++) {
					var m = item.meta.subscribe[i];
					var readme = [];

					readme.push('# ' + m.id);
					readme.push('- URL address: <' + url + '>');
					readme.push('- Channel: __subscribe__');
					readme.push('- JSON schema `' + m.id + '.json`');
					readme.push('');
					readme.push(beautifyjsonschema(m));

					var id = 'sub' + item.id + 'X' + m.id;
					var template = TEMPLATE_SUBSCRIBE.format(item.meta.name, m.id, readme.join('\n'), m.icon || 'ti ti-satellite', m.url, id, item.meta.name.max(15), item.id);
					var com = fs.add(id, template);
					m.url = url;
					com.type = 'sub';
					com.itemid = item.id;
					com.schema = m;
				}
			}

			if (item.meta.call instanceof Array) {
				for (var i = 0; i < item.meta.call.length; i++) {
					var m = item.meta.call[i];
					var readme = [];

					readme.push('# ' + m.id);
					readme.push('- URL address: <' + url + '>');
					readme.push('- Channel: __call__');
					readme.push('- JSON schema `' + m.id + '.json`');
					readme.push('');
					readme.push(beautifyjsonschema(m.schema));

					var id = 'cal' + item.id + 'X' + m.id;
					var template = TEMPLATE_CALL.format(item.meta.name, m.id, readme.join('\n'), m.icon || 'ti ti-plug', m.url, id, item.meta.name.max(15), item.id);
					var com = fs.add(id, template);
					m.url = url;
					com.type = 'call';
					com.itemid = item.id;
					com.schema = m;
				}
			}

			if (item.socket)
				next();
			else
				TMS.connect(fs, item.id, next);
		}

	}, function() {

		var components = fs.meta.components;
		var unregister = [];

		for (var key in components) {
			var com = components[key];
			var type = com.type;
			if (type === 'pub' || type === 'sub' || type === 'call') {
				var index = key.indexOf('X');
				if (index !== -1) {

					var sourceid = key.substring(3, index);
					var subid = key.substring(index + 1);
					var source = fs.sources[sourceid];

					if (source) {
						if (type === 'call') {
							if (source.meta.call instanceof Array) {
								if (source.meta.call.findItem('id', subid))
									continue;
							}
						} else if (type === 'pub') {
							if (source.meta.publish instanceof Array) {
								if (source.meta.publish.findItem('id', subid))
									continue;
							}
						} else {
							if (source.meta.subscribe instanceof Array) {
								if (source.meta.subscribe.findItem('id', subid))
									continue;
							}
						}
					}

					unregister.push(key);
				}
			}
		}

		unregister.wait(function(key, next) {
			fs.unregister(key, next);
		}, function() {

			if (fs.proxy.online) {
				fs.proxy.send({ TYPE: 'flow/components', data: fs.components(true) });
				fs.proxy.send({ TYPE: 'flow/design', data: fs.export() });
			}

			fs.save();
			callback && callback();
		});

	});

};

TMS.synchronize = function(fs) {

	var sync = {};

	for (var key in fs.meta.components) {
		var com = fs.meta.components[key];
		if (com.itemid)
			sync[com.itemid] = fs.sources.findItem('id', com.itemid);
	}

	for (var key in sync) {
		var source = sync[key];
		if (source && source.socket)
			source.socket.synchronize();
	}
};

TMS.refresh2 = function(fs) {
	setTimeout2('tms_refresh_' + fs.name, fs => TMS.refresh(fs), 500, null, fs);
};

function initrunning() {

	if (isrunning)
		return;

	isrunning = true;

	F.on('service', function() {
		if (CALLBACKID > 999999999)
			CALLBACKID = 1;
	});

	F.on('exit', function() {
		for (var key in FLOWS) {
			var flow = FLOWS[key];
			if (flow.terminate || flow.kill) {
				if (flow.terminate)
					flow.terminate();
				else
					flow.kill(9);
			}
		}
	});

}

function makeunixsocket(id) {
	return F.isWindows ? ('\\\\?\\pipe\\flowstream' + F.directory.makeid() + id + Date.now().toString(36)) : (F.Path.join(F.Os.tmpdir(), 'flowstream_' + F.directory.makeid() + '_' + id + '_' + Date.now().toString(36) + '.socket'));
}

if (process.argv[1].endsWith('flow-flowstream.js')) {

	isFLOWSTREAMWORKER = W.workerData || process.argv.includes('--fork');

	if (process.argv.includes('--insecure')) {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
		F.config.$insecure = true;
	}

	// Runs the worker
	if (W.workerData) {
		F.dir(F.path.join(__dirname, '../'));
		exports.init(W.workerData);
	}

	if (process.argv.includes('--fork')) {

		process.once('message', function(msg) {
			if (msg.TYPE === 'init') {
				Parent = process;
				if (!Parent.postMessage)
					Parent.postMessage = process.send;
				F.dir(process.argv[2]);
				exports.init(msg.data);
			}
		});

		F.on('error', function(obj) {
			if (obj.error.indexOf('ERR_IPC_CHANNEL_CLOSED') !== -1)
				process.exit(1);
		});
	}

}
