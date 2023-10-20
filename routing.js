// Total.js Routing
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

const EMPTYREQSPLIT = ['/'];

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
		t.internal = true;
		F.routes.internal[t.url[0]] = t;
		return;
	}

	var index = url.indexOf(' ');

	t.method = url.substring(0, index).toUpperCase();
	url = url.substring(index + 1).trim();

	index = url.indexOf(' ');

	if (index === -1)
		index = url.length;

	t.url = exports.split(url.substring(0, index), true);
	url = url.substring(index + 1);

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
		if (types === '*') {
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
		for (let path of t.url) {
			if (path[0] === '{') {
				let tmp = path.split(':').trim();
				t.params.push({ name: tmp[0].replace(/\{|\}/g, ''), type: tmp[1] || 'string', index: t.params.length });
			}
		}
		t.size = size || 0;
	}

	t.flags = {};
	t.middleware = [];

	index = t.url.indexOf('*');
	t.wildcard = index != -1;

	if (index != -1)
		t.url.splice(index, 1);

	url = url.replace(/<\d+/g, function(text) {
		t.size = +text.substring(1);
		return '';
	});

	t.priority = 100;

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

	index = url.indexOf('-->');

	if (t.wildcard)
		t.priority -= 50;

	if (index !== -1)
		t.action = url.replace(/\s{2,}/g, ' ');
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

exports.route = function(url, action, size) {
	var route = new Route(url, action, size);
	if (route) {
		switch (route.method) {
			case 'SOCKET':
				F.routes.websockets.push(route);
				break;
			case 'FILE':
				F.routes.files.push(route);
				break;
			default:
				F.routes.routes.push(route);
				break;
		}
		F.routes.timeout && clearTimeout(F.routes.timeout);
		F.routes.timeout = setTimeout(exports.sort, 100);
	}
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
		tmp = cache;
		let key = route.url.join('/')
		if (cache[key])
			cache[key].push(route);
		else
			cache[key] = [route];
	}

	F.routes.filescache = cache;
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

		if (route.flags.upload && ctrl.datatype !== 'upload')
			continue;

		if (route.flags.mobile && !ctrl.mobile)
			continue;

		if (route.flags.robot && !ctrl.robot)
			continue;

		return route;
	}
}

exports.lookup = function(ctrl, auth, skip) {

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

	var url = (ctrl.uri.pathname[ctrl.uri.pathname.length - 1] === '/' ? ctrl.uri.pathname.substring(1, ctrl.uri.pathname.length - 1) : ctrl.uri.pathname.substring(1)).toLowerCase();

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
		var url = ctrl.split.slice(0, length - i).join('/') + '/*';
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
	if (DEF.onCORS) {
		DEF.onCORS(ctrl);
		return false;
	}

	var origin = ctrl.headers.origin;

	if (!F.config.$cors || (F.config.$cors != '*' && F.config.$cors.indexOf(origin) == -1)) {
		ctrl.system(400, 'Invalid origin (CORS)');
		return false;
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

exports.lookupfiles = function(ctrl, auth) {
	if (F.routes.files.length) {
		let key = '';
		for (let i = 0; i < ctrl.split2.length - 1; i++)
			key += (i ? '/' : '') + ctrl.split2[i];
		let routes = F.routes.filescache[key];
		if (routes)
			return compareflags(ctrl, routes, auth);
	}
};