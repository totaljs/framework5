// Total.js TMS
// The MIT License
// Copyright 2022-2023 (c) Peter Širka <petersirka@gmail.com>

const ErrorBuilder = F.TBuilders.ErrorBuilder;

var Cache = {
	subscribers: {},
	swatchers: {},    // watchers for subscribers
	scache: {},       // cache for subscribers
	pcache: {},       // cache for publishers
	calls: {},
	socket: null,
	timeout: null,
	url: ''
};

exports.cache = Cache;

function tmscontroller($) {

	var temporary = F.temporary;

	Cache.socket = $;

	$.autodestroy(() => Cache.socket = null);

	$.on('open', function(client) {

		if (temporary.tmsblocked[client.ip] > 5) {
			client.close(4001);
			return;
		}

		if (F.config.secret_tms) {
			var token = client.headers['x-token']; // || client.query.token;
			if (token != F.config.secret_tms) {
				if (temporary.tmsblocked[client.ip])
					temporary.tmsblocked[client.ip]++;
				else
					temporary.tmsblocked[client.ip] = 1;
				client.close(4001);
				return;
			}
		}

		delete temporary.tmsblocked[client.ip];
		client.$subscribers = {};
		client.tmsready = true;
		refresh(client);
	});

	$.on('message', function(client, msg) {

		// msg.type {String}
		// msg.data {Object}

		var response;

		if (client.tmsready) {
			if (msg.type === 'ping') {
				msg.type = 'pong';
				client.send(msg);
			} else if (msg.type === 'subscribe' && msg.id) {
				F.stats.performance.subscribe++;
				var schema = Cache.scache[msg.id];
				if (schema) {
					response = schema.transform(msg.data);
					if (!response.error)
						F.TTMS.subscribe(msg.id, response, client);
				}
			} else if (msg.type === 'subscribers' && msg.subscribers instanceof Array) {
				client.$subscribers = {};
				for (let sub of msg.subscribers)
					client.$subscribers[sub] = true;
			} else if (msg.type === 'call' && msg.id) {
				var tmp = Cache.calls[msg.id];
				if (tmp) {
					F.stats.performance.call++;
					response = tmp.schema.transform(msg.data);
					if (response.error) {
						msg.data = response.error instanceof ErrorBuilder ? response.error.output() : response.response.toString();
						msg.error = true;
						client.send(msg);
					} else {
						tmp.callback(response.response, function(err, response) {
							if (err) {
								msg.error = true;
								if (err instanceof ErrorBuilder)
									msg.data = err.output();
								else
									msg.data = [{ error: err + '' }];
							} else {
								msg.success = true;
								msg.data = response;
							}
							if (client && !client.isClosed)
								client.send(msg);
						}, client);
					}
				}
			} else {
				msg.error = true;
				msg.data = new ErrorBuilder.push(404).output();
				client.send(msg);
			}
		}
	});
}

exports.client = function(url, token, callback) {

	if (typeof(token) === 'function') {
		callback = token;
		token = undefined;
	}

	var client = new F.TWebSocket.WebSocketClient();
	var publishers = {};
	var subscribers = {};
	var callbacks = {};
	var isopen = false;
	var callbackid = 0;
	var timeout;

	if (token)
		client.headers['x-token'] = token;

	client.options.reconnectserver = true;
	client.connect(url.replace(/^http/, 'ws'));
	client.ready = false;

	client.on('destroy', function() {

		publishers = null;
		subscribers = null;

		for (let key in callbacks) {
			let item = callbacks[key];
			clearTimeout(item.timeout);
			item.callback && item.callback('TMS has been destroyed');
		}

		callbacks = null;

		timeout && clearTimeout(timeout);
		timeout = null;
	});

	client.on('close', function() {
		isopen = false;
		client.ready = false;
	});

	client.on('message', function(msg) {
		if (msg.type === 'call') {
			if (callbacks[msg.callbackid]) {
				let tmp = callbacks[msg.callbackid];
				tmp.callback(msg.error ? ErrorBuilder.assign(msg.data) : null, msg.success ? msg.data : null);
				tmp.timeout && clearTimeout(tmp.timeout);
				delete callbacks[msg.callbackid];
			}
		} else if (msg.type === 'publish' && subscribers[msg.id] && publishers[msg.id]) {
			var err = new ErrorBuilder();
			var data = F.TJSONSchema.transform(publishers[msg.id], err, msg.data, true);
			if (data) {
				for (let fn of subscribers[msg.id])
					fn(data);
			}
		} else if (msg.type === 'meta') {
			publishers = {};
			for (let item of msg.publish)
				publishers[item.id] = item.schema;
			sync_subscribers();
			isopen = true;
			client.ready = true;
			client.meta = msg;
			if (callback) {
				setImmediate(callback, null, client, client.meta);
				callback = null;
			}
			client.emit('meta', msg);
			client.emit('ready');
		}
	});

	var timeouthandler = function(id) {
		let obj = callbacks[id];
		obj.callback && obj.callback('408: Timeout');
		delete callbacks[id];
	};

	client.call = function(name, data, callback, timeout) {
		if (callback)
			client.$call(name, data, callback, timeout);
		else
			return new Promise((resolve, reject) => client.$call(name, data, (err, res) => err ? reject(err) : resolve(res), timeout));
	};

	client.$call = function(name, data, callback, timeout) {
		if (isopen) {
			let key = (callbackid++) + '';
			let obj = {};
			obj.callback = callback;
			obj.timeout = setTimeout(timeouthandler, timeout || 10000, key);
			callbacks[key] = obj;
			client.send({ type: 'call', id: name, data: data, callbackid: key });
		} else
			callback('TMS is offline');
	};

	client.subscribe = function(name, callback) {
		timeout && clearTimeout(timeout);
		timeout = setTimeout(sync_subscribers, 50, true);
		if (subscribers[name])
			subscribers[name].push(callback);
		else
			subscribers[name] = [callback];
	};

	client.publish = function(name, data) {
		isopen && client.send({ type: 'subscribe', id: name, data: data });
	};

	var sync_subscribers = function(force) {
		timeout && clearTimeout(timeout);
		timeout = null;
		let keys = Object.keys(subscribers);
		if (force || keys.length)
			client.send({ type: 'subscribers', subscribers: keys });
	};

};

function refresh(client) {

	if (Cache.socket) {

		var subscribed = [];
		var published = [];

		for (let key in Cache.pcache)
			published.push({ id: key, schema: Cache.pcache[key] });

		for (let key in Cache.scache)
			subscribed.push({ id: key, schema: Cache.scache[key] });

		var calls = [];
		for (let key in Cache.calls)
			calls.push({ id: key, schema: Cache.calls[key].schema });

		var msg = { type: 'meta', name: F.config.name, subscribe: subscribed, publish: published, subscribers: Object.keys(Cache.subscribers), call: calls };
		if (client)
			client.send(msg);
		else
			Cache.socket.send(msg);
	}
}

exports.refresh = function() {
	Cache.timeout && clearTimeout(Cache.timeout);
	Cache.timeout = setTimeout(refresh, 500);
};

exports.newpublish = function(name, schema) {

	if (schema == null) {
		delete Cache.pcache[name];
		exports.refresh();
		return;
	}

	Cache.pcache[name] = F.TUtils.jsonschema(schema);
	exports.refresh();
};

exports.newcall = function(name, schema, callback) {

	if (schema == null) {
		delete Cache.calls[name];
		exports.refresh();
		return;
	}

	if (!callback)
		callback = (data, callback, client) => F.action(schema, data, client).callback(callback);

	let obj = {};
	obj.schema = F.TUtils.jsonschema(schema);
	obj.callback = callback;
	Cache.calls[name] = obj;
	exports.refresh();
};

exports.newsubscribe = function(name, schema, callback) {

	if (typeof(schema) === 'function') {
		callback = schema;
		schema = null;
	}

	if (schema)
		Cache.scache[name] = F.TUtils.jsonschema(schema);
	else
		delete Cache.scache[name];

	exports.subscribe(name, callback);
	exports.refresh();

};

exports.publish = function(name, value) {
	if (Cache.socket && Cache.pcache[name]) {
		F.stats.performance.publish++;
		Cache.socket.send({ type: 'publish', id: name, data: value }, client => client.tmsready && client.$subscribers[name]);
	}
};

exports.subscribe = function(name, callback, client) {
	if (client) {
		var arr = Cache.swatchers[name];
		if (arr) {
			for (let fn of Cache.arr)
				fn(callback, client);
		}
	} else {
		if (Cache.swatchers[name])
			Cache.swatchers[name].push(callback);
		else
			Cache.swatchers[name] = [callback];
		Cache.subscribers[name] = 1;
		exports.refresh();
	}
};

exports.unsubscribe = function(name, callback) {
	if (Cache.swatchers[name]) {
		exports.refresh();
		if (callback) {
			let index = Cache.swatchers[name].indexOf(callback);
			if (index !== -1)
				Cache.swatchers[name].splice(index, 1);
			if (!Cache.swatchers[name].length)
				delete Cache.swatchers[name];
			if (Cache.swatchers[name])
				Cache.subscribers[name] = 1;
			else
				delete Cache.subscribers[name];
			return index !== -1;
		} else {
			delete Cache.swatchers[name];
			delete Cache.subscribers[name];
			return true;
		}
	}
	return false;
};

F.on('$tms', function() {

	var endpoint = F.config.$tmsurl;
	var is = Cache.url !== endpoint;

	if (is && Cache.route) {
		Cache.route.remove();
		Cache.route = null;
	}

	if ((is && endpoint && F.config.$tms) || (endpoint && F.config.$tms && !Cache.route))
		Cache.route = F.route('SOCKET ' + endpoint, tmscontroller, F.config.$tmsmaxsize);

	Cache.url = endpoint;

	if (endpoint && Cache.token !== F.config.secret_tms) {
		Cache.token = F.config.secret_tms;
		Cache.socket && Cache.socket.close(1000, 'Changed TMS secret');
	}

});