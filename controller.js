// Total.js Controller
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

const REG_DOUBLESLASH = /\/{2}/g;
const CHECK_DATA = { POST: 1, PUT: 1, PATCH: 1, DELETE: 1 };

function parseURI(url) {

	let index = url.indexOf('?');
	let search = '';

	if (index !== -1) {
		search = url.substring(index);
		url = url.substring(0, index);
	}

	url = url.replace(REG_DOUBLESLASH, '');
	index = url.lastIndexOf('.', 10); // max. 10 chars for extension

	if (index == -1 && url[url.length - 1] !== '/')
		url += '/';

	let split = null;

	if (url === '/') {
		split = [];
	} else {
		if (index == -1)
			split = url.substring(1, url.length - 1).split('/');
		else
			split = url.split('/').slice(1);
	}

	return { pathname: url, search: search, file: index != -1, ext: index == -1 ? '' : url.substring(index + 1), split: split };
}

function Controller(req, res) {

	var t = this;

	t.req = req;
	t.res = res;
	t.method = t.req.method;
	t.route = null;
	t.isfile = false;
	t.uri = parseURI(req.url);
	t.language = '';
	t.headers = req.headers;
	t.split = t.uri.split;
	t.split2 = [];
	t.released = false;
	t.downloaded = false;

	for (let path of t.split)
		t.split2.push(path.toLowerCase());

	t.params = {};
	t.query = {};
	t.files = [];
	t.body = {};

	// t.payload = null;
	// t.payloadsize = 0;
	// t.user = null;
	t.datatype = ''; // json|xml|multipart|urlencoded

	t.response = {
		status: 200,
		headers: {}
	};

	if (CHECK_DATA[t.method]) {

		if (t.uri.file) {
			t.destroyed = true;
			t.req.destroy();
			return;
		}

		let type = t.headers['content-type'] || '';
		let index = type.indexOf(';', 10);

		if (index != -1)
			type = type.substring(0, index);

		switch (type) {
			case 'application/json':
			case 'text/json':
				t.datatype = 'json';
				break;
			case 'application/x-www-form-urlencoded':
				t.datatype = 'urlencoded';
				break;
			case 'multipart/form-data':
				t.datatype = 'multipart';
				break;
			case 'application/xml':
			case 'text/xml':
				t.datatype = 'xml';
				break;
			case 'text/html':
			case 'text/plain':
				t.datatype = 'text';
				break;
			default:
				t.datatype = 'binary';
				break;
		}
	}
}

Controller.prototype = {

	get mobile() {
		return null;
	},

	get robot() {
		return null;
	},

	get ua() {
		return null;
	},

	get ip() {
		return null;
	},

	get referrer() {
		return null;
	},

	get buffer() {
		return null;
	}

};

Controller.prototype.csrf = function() {
	return DEF.onCSRFcreate(this);
};

Controller.prototype.redirect = function(value, permanent) {

};

Controller.prototype.html = function(value) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'text/html; charset=utf-8';
	if (value != null)
		ctrl.response.value = value;
	ctrl.flush();
};

Controller.prototype.text = function(value) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'text/plain; charset=utf-8';
	if (value != null)
		ctrl.response.value = value;
	ctrl.flush();
};

Controller.prototype.json = function(value, beautify, replacer) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'application/json; charset=utf-8';
	ctrl.response.value = JSON.stringify(value, beautify ? '\t' : null, replacer);
	ctrl.flush();
};

Controller.prototype.jsonstring = function(value) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'application/json; charset=utf-8';
	ctrl.response.value = value;
	ctrl.flush();
};

Controller.prototype.empty = function(value) {

};

Controller.prototype.invalid = function(value) {
	var ctrl = this;
	var err = new F.TBuilders.ErrorBuilder();
	err.push(value);
	ctrl.response.headers['content-type'] = 'application/json; charset=utf-8';
	ctrl.response.value = JSON.stringify(err.output(ctrl.language));
	ctrl.response.status = err.status;
	ctrl.flush();
};

Controller.prototype.flush = function() {
	var ctrl = this;
	if (!ctrl.destroyed) {
		var response = ctrl.response;
		ctrl.res.writeHead(response.status, response.headers);
		ctrl.res.end(response.value);
		ctrl.free();
	}
};

Controller.prototype.system = function(code, error) {
	var t = this;
	t.res.writeHead(code);
	t.res.end();
};

Controller.prototype.view = function(value, model) {

};

Controller.prototype.file = function(path) {

};

Controller.prototype.stream = function(path) {

};

Controller.prototype.filefs = function(id) {

};

Controller.prototype.binary = function() {

};

Controller.prototype.proxy = function() {

};

Controller.prototype.success = function(value) {
	F.TUtils.success.value = value;
	this.json(F.TUtils.success);
};

Controller.prototype.free = function() {

	var t = this;
	if (t.released)
		return;

	t.released = true;
	// Remove files
	// Clear resources
};

Controller.prototype.$route = function() {

	var ctrl = this;

	if (ctrl.uri.file) {
		ctrl.destroyed = true;
		ctrl.system(404);
		return;
	}

	// Check CORS
	if (F.routing.cors.length) {
		if (!F.TRouting.cors(ctrl)) {
			ctrl.destroyed = true;
			ctrl.system(404);
			return;
		}
	}

	let route = F.TRouting.lookup(ctrl);
	if (route) {

		ctrl.route = route;

		// process data
		// call action

		if (ctrl.datatype === 'multipart') {
			multipart(ctrl);
		} else if (ctrl.datatype) {

			ctrl.payload = [];
			ctrl.payloadsize = 0;
			ctrl.downloaded = false;

			ctrl.req.on('data', function(chunk) {
				// @TODO: add a check of the body size
				ctrl.payloadsize += chunk.length;
				ctrl.payload.push(chunk);
			});

			ctrl.req.on('close', () => ctrl.free());
			ctrl.req.on('end', function() {

				ctrl.payload = Buffer.concat(ctrl.payload);

				switch (ctrl.datatype) {
					case 'json':
						ctrl.body = ctrl.payload.toString('utf8').parseJSON(true);
						break;
					case 'urlencoded':
						ctrl.body = ctrl.payload.toString('utf8').parseEncoded();
						break;
				}

				ctrl.downloaded = true;
				authorize(ctrl);
			});

		} else
			authorize(ctrl);

	} else
		ctrl.system(404);

};

function multipart(ctrl) {
	authorize(ctrl);
}

function authorize(ctrl) {
	if (DEF.onAuthorize) {
		var opt = new F.TBuilders.AuthOptions(ctrl);
		opt.$callback = function(user) {
			let auth = user ? 1 : 2;
			ctrl.user = user;
			if (ctrl.route.auth !== auth) {
				ctrl.route = F.TRouting.lookup(ctrl, auth);
				if (ctrl.route)
					execute(ctrl.route);
				else
					ctrl.system(401);
			}
		};
		DEF.onAuthorize(opt);
	} else
		execute(ctrl);
}

function execute(ctrl) {

	ctrl.timeout = ctrl.route.timeout || 5;

	for (let param of ctrl.route.params) {
		let value = ctrl.split[param.index];
		ctrl.params[param.name] = value;
	}

	if (ctrl.route.action) {
		ctrl.route.action(ctrl);
	} else {
		// schema/actions?
		// ctrl.route.action(ctrl);
	}

}

exports.Controller = Controller;