// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

const NEWLINE = '\r\n';

const PROXY_KEEPALIVE = new F.Http.Agent({ keepAlive: true, timeout: 60000 });
const PROXY_KEEPALIVEHTTPS = new F.Https.Agent({ keepAlive: true, timeout: 60000 });
const PROXY_OPTIONS = { end: true };

function parseSizeTimeout(route, value) {

	var number = +value.match(/\d+/)[0];
	var type = value.match(/[a-z]+/i);

	if (type)
		type = type[0].toLowerCase();
	else
		type = '';

	switch (type) {
		case 's':
			route.timeout = number;
			break;
		case 'm':
			route.timeout = number * 60;
			break;
		case 'h':
			route.timeout = number * 60 * 60;
			break;
		case 'b':
			route.size = number / 1024;
			break;
		case 'kb':
			route.size = number;
			break;
		case 'gb':
			route.size = (number * 1024) * 1000;
			break;
		case 'mb':
		default:
			route.size = number * 1024;
			break;
	}
}

// Total.js routing
function Route(url, action, size) {

	if (typeof(action) === 'number') {
		size = action;
		action = null;
	}

	var t = this;

	if (url[0] === '#') {
		// internal routing
		t.url = [url[0].substring(1)];
		t.action = action;
		t.fallback = true;
		F.routes.fallback[t.url[0]] = t;
		return;
	}

	var index = url.indexOf(' ');

	t.method = url.substring(0, index).toUpperCase();
	url = url.substring(index + 1).trim();

	index = url.indexOf(' ');

	if (index === -1)
		index = url.length;

	t.url2 = url.substring(0, index);

	if (t.url2[0] === '@') {
		// @TODO: missing WAPI implementation
		t.skip = true;
		console.log('This "{0}" kind of routes are not supported yet'.formaT(t.url2));
		return;
	}

	t.url = exports.split(t.url2, true);
	url = url.substring(index + 1);
	t.id = t.method + '/' + t.url.join('/');

	t.auth = 0;
	t.action = action;

	switch (t.method[0]) {
		case '+':
			t.auth = 1;
			t.method = t.method.substring(1);
			break;
		case '-':
			t.auth = 2;
			t.method = t.method.substring(1);
			break;
	}

	if (t.method === 'FILE') {
		let types = t.url[t.url.length - 1];

		// fixed filename
		if (t.url2.indexOf('*') === -1) {
			t.fixed = true;
		} else if (types === '*') {
			t.url[t.url.length - 1] = '*';
		} else if (types === '*.*') {
			t.url.splice(t.url.length - 1, 1);
		} else {
			t.url.splice(t.url.length - 1, 1);
			index = types.lastIndexOf('.');
			types = types.substring(index + 1).split('|');
			t.ext = {};
			for (let type of types)
				t.ext[type] = 1;
		}
	} else {
		t.params = [];
		index = 0;
		for (let path of t.url) {
			if (path[0] === '{') {
				let tmp = path.split(':').trim();
				t.params.push({ name: tmp[0].replace(/\{|\}/g, ''), type: tmp[1] || 'string', index: index });
			}
			index++;
		}
		t.size = size || 0;
	}

	t.flags = {};
	t.middleware = [];

	index = t.url.indexOf('*');
	t.wildcard = index != -1;

	if (index != -1)
		t.url.splice(index, 1);

	if (!t.url.length)
		t.url[0] = '/';

	url = url.replace(/<\d+[mb|gb|kb|b|m|s|h]+/gi, function(text) {
		parseSizeTimeout(t, text.substring(1));
		return '';
	});

	t.priority = 100;
	t.type = t.method === 'WEBSOCKET' || t.method === 'SOCKET' ? 'websocket' : t.method === 'FILE' ? 'file' : 'route';
	t.partial = t.method === 'PATCH';

	var endpoint = '';
	var isapi = false;

	if (t.method === 'API') {
		t.method = 'POST';
		isapi = true;
		t.id = t.id.replace(/^(\+|-)/, '');
		url = url.replace(/(\*|\+|-|%)?[a-z0-9-_/{}]+/i, function(text) {
			let tmp = text.trim();
			endpoint = tmp.substring(1);
			t.partial = tmp[0] === '%';
			return text;
		});
	}

	// Parse flags
	url = url.replace(/(@|#)+[a-z0-9]+/gi, function(text) {
		let tmp = text.trim();
		if (tmp[0] === '#') {
			t.middleware.push(tmp.substring(1));
		} else {
			t.flags[tmp.substring(1)] = 1;
			t.priority--;
		}
		return '';
	}).trim();

	// Parse actions
	index = url.indexOf('-->');

	if (index !== -1) {
		t.actions = [];
		url = url.substring(index + 3).replace(/(\+|-|%)?[a-z0-9-_/]+(\s\(response\))?/gi, function(text) {
			t.actions.push(text.trim());
			return '';
		}).trim();
	} else {
		if (isapi)
			t.actions = [url.replace(/\+|-|%|#/g, '').trim()];
		else
			t.actions = url.substring(0, index + 3).replace(/\s{2,}/g, ' ').split(/\s|,/);
	}

	var parent = null;

	if (endpoint) {

		let params = [];
		let arr = endpoint.split('/');

		for (let i = 1; i < arr.length; i++) {
			let param = arr[i].replace(/\{|\}/g, '').trim();
			params.push({ index: i, name: param });
		}

		parent = F.routes.routes.findItem('id', t.id);

		var apiroute = { auth: t.auth, params: params, actions: t.actions.join(',') };

		t.apiendpoint = arr[0];
		if (parent) {
			parent.api[arr[0]] = apiroute;
			t.skip = true;
			t.parent = parent;
		} else {
			if (!t.api)
				t.api = {};
			t.api[arr[0]] = apiroute;
		}

		delete t.actions;

		// Reset auth
		t.auth = 0;

	} else
		t.actions = t.actions.join(',');

	// Max. payload size
	if (!t.size) {
		switch (t.type) {
			case 'websocket':
				t.size = F.config.$wsmaxsize;
				t.connections = [];
				break;
			case 'route':
				t.size = F.config.$httpmaxsize;
				break;
		}
	}

	if (parent && parent.size < t.size)
		parent.size = t.size;

	if (typeof(t.action) === 'string') {
		t.view = t.action;
		t.action = null;
	}

	if (!t.view && !t.action && t.method !== 'FILE' && t.method !== 'SOCKET')
		t.view = t.url[0] && t.url[0] !== '/' ? t.url[0] : 'index';

	if (t.wildcard)
		t.priority -= 50;

}

Route.prototype.compare = function(ctrl) {
	var url = this.url;
	for (var i = 0; i < url.length; i++) {
		let path = url[i];
		if (path[0] !== '{' && path !== ctrl.split2[i])
			return false;
	}
	return true;
};

Route.prototype.remove = function() {

	var self = this;
	var index = -1;

	switch (self.type) {
		case 'websocket':
			index = F.routes.websockets.indexOf(self);
			if (index !== -1)
				F.routes.websockets.splice(index);
			for (let conn of self.connections)
				conn.destroy();
			break;
		case 'file':
			index = F.routes.files.indexOf(self);
			if (index !== -1)
				F.routes.files.splice(index);
			break;
		default:
			if (self.apiendpoint) {
				if (self.parent) {
					delete self.parent.api[self.apiendpoint];
					if (Object.keys(self.parent.api).length == 0) {
						index = F.routes.routes.indexOf(self.parent);
						if (index !== -1)
							F.routes.routes.splice(index);
					}
				} else {
					delete self.api[self.apiendpoint];
					if (Object.keys(self.api).length == 0) {
						index = F.routes.routes.indexOf(self);
						if (index !== -1)
							F.routes.routes.splice(index);
					}
				}
			} else {
				index = F.routes.routes.indexOf(self);
				if (index !== -1)
					F.routes.routes.splice(index, 1);
			}
			break;
	}

	exports.sort();
};

exports.route = function(url, action, size) {
	var route = new Route(url, action, size);
	if (route && !route.skip) {
		switch (route.type) {
			case 'websocket':
				F.routes.websockets.push(route);
				break;
			case 'file':
				F.routes.files.push(route);
				break;
			default:
				F.routes.routes.push(route);
				break;
		}
		F.routes.timeout && clearTimeout(F.routes.timeout);
		F.routes.timeout = setTimeout(exports.sort, 100);
	}
	return route;
};

exports.cors = function(url) {
	F.config.$cors = url;
};

exports.sort = function() {

	var cache = {};
	var tmp;
	var key;

	F.routes.routes.quicksort('priority_desc');
	F.routes.files.quicksort('priority_desc');
	F.routes.websockets.quicksort('priority_desc');

	for (let route of F.routes.routes) {

		key = route.method;
		tmp = cache[key];

		if (!tmp)
			tmp = cache[key] = {};

		var u = [];
		for (let path of route.url)
			u.push(path.replace(/\{.*?\}/g, '{}'));

		if (route.wildcard)
			u.push('*');

		var k = u.join('/').replace(/\/\//g, '/');

		if (k.indexOf('{') !== -1)
			k = 'D';

		if (tmp[k])
			tmp[k].push(route);
		else
			tmp[k] = [route];
	}

	F.routes.routescache = cache;
	cache = {};

	for (let route of F.routes.websockets) {

		tmp = cache;

		var u = [];
		for (let path of route.url)
			u.push(path.replace(/\{.*?\}/g, '{}'));

		if (route.wildcard)
			u.push('*');

		var k = u.join('/').replace(/\/\//g, '/');

		if (k.indexOf('{') !== -1)
			k = 'D';

		if (tmp[k])
			tmp[k].push(route);
		else
			tmp[k] = [route];
	}

	F.routes.websocketscache = cache;
	cache = {};

	for (let route of F.routes.files) {

		if (route.fixed) {
			cache[route.url2] = route;
			continue;
		}

		tmp = cache;
		let key = route.url.join('/');
		if (cache[key])
			cache[key].push(route);
		else
			cache[key] = [route];
	}

	F.routes.filescache = cache;
	DEBUG && F.TSourceMap.refresh();
};

function compareflags(ctrl, routes, auth) {

	for (let route of routes) {

		if (auth && route.auth && route.auth !== auth)
			continue;

		if (route.flags.referrer || route.flags.referer) {
			if (!ctrl.headers.referer || ctrl.headers.referer.indexOf(ctrl.headers.host) === -1)
				continue;
		}

		if (route.flags.json && ctrl.datatype !== 'json')
			continue;

		if (route.flags.xml && ctrl.datatype !== 'xml')
			continue;

		if (route.flags.debug && !DEBUG)
			continue;

		if (route.flags.release && DEBUG)
			continue;

		if (route.flags.xhr && !ctrl.xhr)
			continue;

		if (route.flags.upload && ctrl.datatype !== 'multipart')
			continue;

		if (route.flags.mobile && !ctrl.mobile)
			continue;

		if (route.flags.robot && !ctrl.robot)
			continue;

		return route;
	}
}

exports.lookup = function(ctrl, auth = 0, skip = false) {

	// auth 0: does not matter
	// auth 1: logged
	// auth 2: unlogged

	var key = ctrl.method;
	var tmp = F.routes.routescache[key];
	if (!tmp)
		return null;

	var arr = ctrl.split;
	var length = arr.length;
	var route;
	var item;

	var url = (ctrl.uri.key[ctrl.uri.key.length - 1] === '/' ? ctrl.uri.key.substring(1, ctrl.uri.key.length - 1) : ctrl.uri.key.substring(1));

	// Checks fixed URL
	var routes = tmp[url];
	if (routes) {
		if (skip)
			return routes[0];
		route = compareflags(ctrl, routes, auth);
		if (route)
			return route;
		routes = null;
	}

	// Dynamic routes
	if (tmp.D && !(length === 1 && arr[0] === '/')) {
		for (var i = 0; i < tmp.D.length; i++) {
			var r = tmp.D[i];
			if (r.url.length === length || r.wildcard) {
				if (r.compare(ctrl)) {
					if (!routes)
						routes = [];
					if (skip)
						return r;
					routes.push(r);
				}
			}
		}
		if (routes) {
			if (skip)
				return routes[0];
			route = compareflags(ctrl, routes, auth);
			if (route)
				return route;
		}
		routes = null;
	}

	// Wildcard
	routes = [];
	for (var i = 0; i < length; i++) {
		var url = ctrl.split2.slice(0, length - i).join('/') + '/*';
		item = tmp[url];
		if (item) {
			if (skip)
				return item[0];
			routes.push.apply(routes, item);
		}
	}

	item = tmp['/*'];
	if (item) {
		if (skip)
			return item[0];
		routes.push.apply(routes, item);
	}

	return routes && routes.length ? compareflags(ctrl, routes, auth) : route;
};

exports.split = function(url, lowercase) {

	if (lowercase)
		url = url.toLowerCase();

	if (url[0] === '/')
		url = url.substring(1);

	if (url[url.length - 1] === '/')
		url = url.substring(0, url.length - 1);

	var count = 0;
	var end = 0;
	var arr = [];

	for (var i = 0; i < url.length; i++) {
		switch (url[i]) {
			case '/':
				if (count === 0) {
					arr.push(url.substring(end + (arr.length ? 1 : 0), i));
					end = i;
				}
				break;
			case '{':
				count++;
				break;
			case '}':
				count--;
				break;
		}
	}

	if (!count)
		arr.push(url.substring(end + (arr.length ? 1 : 0), url.length));

	if (arr.length === 1 && !arr[0])
		arr[0] = '/';

	return arr;
};

exports.lookupcors = function(ctrl) {

	// Custom handling
	if (F.def.onCORS) {
		F.def.onCORS(ctrl);
		return false;
	}

	var origin = ctrl.headers.origin;

	if (!origin.endsWith(ctrl.headers.host)) {
		if (!F.config.$cors || (F.config.$cors != '*' && !F.config.$cors.includes(origin))) {
			ctrl.fallback(400, 'Invalid origin (CORS)');
			return false;
		}
	}

	ctrl.response.headers['access-control-allow-origin'] = origin;
	ctrl.response.headers['access-control-allow-credentials'] = 'true';
	ctrl.response.headers['access-control-allow-methods'] = '*';
	ctrl.response.headers['access-control-allow-headers'] = '*';
	ctrl.response.headers['access-control-expose-headers'] = '*';

	if (ctrl.method === 'OPTIONS') {
		ctrl.flush();
		return false;
	}

	// Continue
	return true;

};

exports.lookupfile = function(ctrl, auth = 0) {
	if (F.routes.files.length) {

		// fixed
		let route = F.routes.filescache[ctrl.url];
		if (route)
			return route;

		let key = '';
		for (let i = 0; i < ctrl.split2.length - 1; i++)
			key += (i ? '/' : '') + ctrl.split2[i];

		let routes = F.routes.filescache[key];
		if (routes)
			return compareflags(ctrl, routes, auth);
	}
};

exports.lookupwebsocket = function(ctrl, auth = 0, skip = false) {

	// auth 0: does not matter
	// auth 1: logged
	// auth 2: unlogged

	var tmp = F.routes.websocketscache;
	var arr = ctrl.split2;
	var length = arr.length;
	var route;
	var item;

	var url = (ctrl.uri.key[ctrl.uri.key.length - 1] === '/' ? ctrl.uri.key.substring(1, ctrl.uri.key.length - 1) : ctrl.uri.key.substring(1));

	// Checks fixed URL
	var routes = tmp[url];
	if (routes) {
		if (skip)
			return routes[0];
		route = compareflags(ctrl, routes, auth);
		if (route)
			return route;
		routes = null;
	}

	// Dynamic routes
	if (tmp.D) {
		for (var i = 0; i < tmp.D.length; i++) {
			var r = tmp.D[i];
			if (r.url.length === length || r.wildcard) {
				if (r.compare(ctrl)) {
					if (!routes)
						routes = [];
					routes.push(r);
				}
			}
		}

		if (routes) {
			if (skip)
				return routes[0];
			route = compareflags(ctrl, routes, auth);
			if (route)
				return route;
		}
		routes = null;
	}

	// Wildcard
	routes = [];
	for (var i = 0; i < length; i++) {
		var url = ctrl.split2.slice(0, length - i).join('/') + '/*';
		item = tmp[url];
		if (item) {
			if (skip)
				return item[0];
			routes.push.apply(routes, item);
		}
	}

	item = tmp['/*'];
	if (item) {
		if (skip)
			return item[0];
		routes.push.apply(routes, item);
	}

	return routes && routes.length ? compareflags(ctrl, routes, auth) : null;
};

function Proxy(url, target) {

	var t = this;

	t.url = url.toLowerCase();
	t.copypath = 'none'; // replace|extend|none

	if ((/^(https|http):\/\//).test(target))
		t.target = F.Url.parse(target);
	else
		t.target = { socketPath: target };

	if (t.target.href) {
		let index = t.target.href.indexOf('?');
		if (index !== -1)
			t.query = t.target.href.substring(index + 1);
		t.path = t.target.pathname[t.target.pathname.length - 1] === '/' ? t.target.pathname.substring(0, t.target.pathname.length - 1) : t.target.pathname;
	}

	t.uri = t.target;
}

Proxy.prototype.copy = function(type) {

	// @type {String} none|replace|extend

	var t = this;
	if (type === 'replace' && t.target.pathname.length > 1)
		type = 'extend';
	t.copypath = type;
	return t;
};

Proxy.prototype.after = function(callback) {
	var t = this;
	t.$after = callback;
	return t;
};

Proxy.prototype.timeout = function(timeout) {
	var t = this;
	t.$timeout = timeout ? timeout / 1000 : 0;
	return t;
};

Proxy.prototype.check = function(callback) {
	var t = this;
	t.$check = callback;
	return t;
};

Proxy.prototype.before = function(callback) {
	var t = this;
	t.$before = callback;
	return t;
};

Proxy.prototype.remove = function() {
	var t = this;
	var index = F.routes.proxies.indexOf(t);
	if (index !== -1)
		F.routes.proxies.splice(index, 1);
};

exports.proxy = function(url, target) {

	if (!target) {
		let index = F.routes.proxies.findIndex('url', url.toLowerCase());
		if (index !== -1)
			F.routes.proxies.splice(index, 1);
		return;
	}

	let proxy = new Proxy(url, target);
	F.routes.proxies.push(proxy);
	return proxy;
};

exports.lookupproxy = function(ctrl) {
	for (var proxy of F.routes.proxies) {
		var u = ctrl.uri.key.substring(0, proxy.url.length);
		if (u[u.length - 1] !== '/')
			u += '/';
		if (u === proxy.url && (!proxy.check || proxy.check(ctrl))) {
			F.stats.response.proxy++;
			proxycreate(proxy, ctrl);
			return true;
		}
	}
};

function proxyheadersws(header, headers) {

	var output = [];

	for (let key in headers) {
		var value = headers[key];
		if (value instanceof Array) {
			for (let item of value)
				output.push(key + ': ' + item);
		} else
			output.push(key + ': ' + value);
	}

	output.unshift(header);
	return output.join(NEWLINE) + NEWLINE + NEWLINE;
}

function proxycreate(proxy, ctrl) {

	var secured = proxy.uri.protocol === 'https:';
	var uri = {};

	if (proxy.uri.host) {
		uri.host = proxy.uri.host;
		uri.hostname = proxy.uri.hostname;
	} else
		uri.socketPath = proxy.uri.socketPath;

	var tmp;

	uri.method = ctrl.method;
	uri.headers = ctrl.headers;
	ctrl.$proxy = proxy;

	if (uri.socketPath) {
		uri.path = (proxy.copypath == 'none' || proxy.copypath === 'replace' ? ctrl.url.substring(proxy.url.length - 1) : ctrl.uri.pathname) + (ctrl.uri.search ? ((proxy.uri.search && proxy.uri.search.length > 1 ? '&' : '?') + ctrl.uri.search) : '');
	} else {

		if (proxy.copypath === 'none') {
			uri.path = proxy.uri.path + (ctrl.uri.search ? ((proxy.uri.search && proxy.uri.search.length > 1 ? '&' : '?') + ctrl.uri.search) : '');
		} else if (proxy.copypath === 'replace')
			uri.path = ctrl.url.substring(proxy.url.length - 1);
		else if (proxy.copypath === 'extend') {
			tmp = ctrl.uri.pathname.substring(proxy.url.length) + (ctrl.uri.search ? ('?' + ctrl.uri.search) : '');
			uri.path = proxy.path + (tmp ? ((tmp[0] === '/' ? '' : '/') + tmp) : '') + (proxy.query ? (ctrl.uri.search ? ('&' + proxy.query) : ('?' + proxy.query)) : '');
		} else {
			tmp = ctrl.uri.pathname + (ctrl.uri.search ? ('?' + ctrl.uri.search) : '');
			uri.path = proxy.path + (tmp ? ((tmp[0] === '/' ? '' : '/') + tmp) : '') + (proxy.query ? (ctrl.uri.search ? ('&' + proxy.query) : ('?' + proxy.query)) : '');
		}

		if (proxy.uri.port)
			uri.port = proxy.uri.port;
	}

	if (!ctrl.iswebsocket && uri.headers.connection)
		delete uri.headers.connection;

	uri.headers['x-forwarded-for'] = ctrl.ip;
	uri.headers['x-forwarded-url'] = ctrl.url;
	uri.headers['x-forwarded-host'] = ctrl.headers.host;
	uri.agent = secured ? PROXY_KEEPALIVEHTTPS : PROXY_KEEPALIVE;

	delete uri.headers.host;

	proxy.before && proxy.before(uri, ctrl);
	F.stats.performance.external++;
	F.stats.request.external++;

	// ctrl.res {HttpResponse} or {Socket}
	if (ctrl.res.headersSent || ctrl.destroyed)
		return;

	var get = uri.method === 'GET' || uri.method === 'HEAD' || uri.method === 'OPTIONS';
	var kind = secured ? F.Https : F.Http;
	var request = get && !ctrl.iswebsocket ? kind.get(uri, proxycreatecallback) : kind.request(uri, proxycreatecallback);

	request.on('error', proxyerror);
	request.on('abort', proxyerror);
	request.on('aborted', proxyerror);

	request.$controller = ctrl;
	request.$proxy = proxy;
	request.$timeout = proxy.timeout || F.config.$proxytimeout;
	request.iswebsocket = !!ctrl.iswebsocket;
	request.$destroy = proxyerror;

	if (!ctrl.iswebsocket && proxy.timeout) {
		F.temporary.pending.push(ctrl);
		F.TUtils.onfinished(ctrl.res, function() {
			request.$destroyed = true;
			ctrl.destroyed = true;
		});
	}

	if (ctrl.iswebsocket) {

		ctrl.res.setTimeout(0);
		ctrl.res.setNoDelay(true);
		ctrl.res.setKeepAlive(true, 0);

		ctrl.iswebsocket && ctrl.head && ctrl.res.unshift(ctrl.head);
		request.on('response', function(proxyres) {

			if (request.$destroyed)
				return;

			if (!proxyres.upgrade) {
				ctrl.res.write(proxyheadersws('HTTP/' + proxyres.httpVersion + ' ' + proxyres.statusCode + ' ' + proxyres.statusMessage, proxyres.headers));
				proxyres.pipe(ctrl.res);
			}

		});

		request.on('upgrade', function(proxyres, proxysocket, proxyhead) {

			proxysocket.on('close', function() {
				ctrl.destroy();
				request.destroy();
				proxyres.destroy();
			});

			if (request.$destroyed)
				return;

			if (proxyhead && proxyhead.length)
				proxysocket.unshift(proxyhead);

			ctrl.res.write(proxyheadersws('HTTP/1.1 101 Switching Protocols', proxyres.headers));
			proxysocket.pipe(ctrl.res).pipe(proxysocket);
		});
	}

	if (get)
		request.end();
	else
		ctrl.req.pipe(request, PROXY_OPTIONS);
}

function proxydestroy(self, err) {
	if (!self.$destroyed) {
		self.$destroyed = true;
		if (self.$controller) {
			if (self.$controller.socket)
				self.$controller.destroy();
			else
				self.$controller.fallback(503, err);
		}
		self.destroy();
	}
}

function proxyerror(err) {
	proxydestroy(this, err);
}

function proxycreatecallback(response) {
	var self = this;
	if (!self.$destroyed) {
		let ctrl = self.$controller;
		ctrl.released = true;
		ctrl.destroyed = true;
		ctrl.$proxy.after && self.$proxy.after(response);
		ctrl.res.writeHead && ctrl.res.writeHead(response.statusCode, response.headers);
		response.pipe(ctrl.res, PROXY_OPTIONS);
	}
}
