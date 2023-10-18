// Total.js Routing
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

const EMPTYREQSPLIT = ['/'];

exports.db = {
	internal: {},
	routes: [],
	routescache: {},
	files: [],
	cors: [],
	websockets: [],
	websocketscache: {},
	timeout: null,
	middleware: {}
};

// Total.js routing
function Route(url, action, length) {

	if (typeof(action) === 'number') {
		length = action;
		action = null;
	}

	var t = this;

	if (url[0] === '#') {
		// internal routing
		t.url = [url[0].substring(1)];
		t.action = action;
		t.internal = true;
		exports.db.internal[t.url[0]] = t;
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
	t.params = [];
	t.action = action;

	for (let path of t.url) {
		if (path[0] === '{') {
			let tmp = path.split(':').trim();
			t.params.push({ name: tmp[0].replace(/\{|\}/g, ''), type: tmp[1] || 'string', index: t.params.length });
		}
	}

	switch (t.method[0]) {
		case '+':
			t.auth = 1;
			break;
		case '-':
			t.auth = 2;
			break;
	}

	t.length = length || 0;
	t.flags = {};
	t.middleware = [];
	t.wildcard = t.url.indexOf('*') != -1;

	if (t.wildcard)
		t.url = t.url.replace(/\*/g, '');

	url = url.replace(/<\d+/g, function(text) {
		t.length = +text.substring(1);
		return '';
	});

	// Parse flags
	url = url.replace(/(@|#)+[a-z0-9]+/gi, function(text) {
		let tmp = text.trim();
		if (tmp[0] === '#')
			t.middleware.push(tmp.substring(1));
		else
			t.flags[tmp.substring(1)] = 1;

		return '';
	}).trim();

	index = url.indexOf('-->');

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

exports.route = function(url, action, length) {
	var route = new Route(url, action, length);
	if (route) {
		switch (route.method) {
			case 'SOCKET':
				exports.db.websockets.push(route);
				break;
			case 'FILE':
				exports.db.files.push(route);
				break;
			default:
				exports.db.routes.push(route);
				break;
		}
		exports.db.timeout && clearTimeout(exports.db.timeout);
		exports.db.timeout = setTimeout(exports.sort, 100);
	}
};

exports.sort = function() {

	var db = exports.db;

	var cache = {};
	var tmp;
	var key;

	for (let route of db.routes) {

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

	db.routescache = cache;
	cache = {};

	for (let route of db.websockets) {

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

	db.websocketscache = cache;
};

function compareflags(ctrl, routes, auth) {

	var status = null;

	for (let route of routes) {

		if (auth && route.auth && route.auth !== auth) {
			status = 0;
			continue;
		}

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

	return status;
}

exports.lookup = function(ctrl, auth, skip) {

	// F.lookup = function(req, membertype, skip) {

	// May returns three responses:
	// {Route} with a route
	// 0 {Number} unauthorized
	// null {Object} 404

	// membertype 0: does not matter
	// membertype 1: logged
	// membertype 2: unlogged

	var key = ctrl.method;
	var tmp = exports.db.routescache[key];
	if (!tmp)
		return null;

	var arr = ctrl.split.length ? ctrl.split : EMPTYREQSPLIT;
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

exports.cors = function(ctrl) {

	return true;

};
