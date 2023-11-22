// Total.js WebSocket
// The MIT License
// Copyright 2016-2023 (c) Peter Širka <petersirka@gmail.com> & Jozef Gula <gula.jozef@gmail.com>

const SOCKET_RESPONSE = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\n\r\n';
const SOCKET_RESPONSE_COMPRESS = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\nSec-WebSocket-Extensions: permessage-deflate\r\n\r\n';
const SOCKET_RESPONSE_PROTOCOL = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\nSec-WebSocket-Protocol: {1}\r\n\r\n';
const SOCKET_RESPONSE_PROTOCOL_COMPRESS = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\nSec-WebSocket-Protocol: {1}\r\nSec-WebSocket-Extensions: permessage-deflate\r\n\r\n';
const SOCKET_HASH = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const SOCKET_ALLOW_VERSION = ['13'];
const SOCKET_COMPRESS = Buffer.from([0x00, 0x00, 0xFF, 0xFF]);
const SOCKET_COMPRESS_OPTIONS = { windowBits: F.Zlib.Z_DEFAULT_WINDOWBITS };

const CACHE_GML1 = [null, null, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
const CACHE_GML2 = [null, null, null, null, null, null, null, null];
const CONCAT = [null, null];

const REG_WEBSOCKET = /websocket/i;
const REG_WEBSOCKET_ERROR = /ECONNRESET|EHOSTUNREACH|EPIPE|is closed/i;
const REG_EMPTYBUFFER = /\0|%00|\\u0000/g;
const REG_EMPTYBUFFER_TEST = /\0|%00|\\u0000/;
const REG_ROBOT = /search|agent|bot|crawler|spider/i;
const REG_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;

var WSCLIENTSID = 0;

// WSClient
var CALLBACKS = {};
var CALLBACKSCOUNTER = 1;

function Controller(req, socket, head) {

	var ctrl = this;

	ctrl.req = req;
	ctrl.res = ctrl.socket = socket;
	ctrl.route = null;
	ctrl.head = head;
	ctrl.uri = F.TUtils.parseURI2(req.url);
	ctrl.headers = req.headers;
	ctrl.query = ctrl.uri.search.parseEncoded();
	ctrl.split = ctrl.uri.split;
	ctrl.split2 = [];
	ctrl.url = ctrl.uri.key;
	ctrl.released = false;
	ctrl.params = {};
	ctrl.current = {};
	ctrl.masking = false;
	ctrl.iswebsocket = true;

	for (let path of ctrl.split)
		ctrl.split2.push(path.toLowerCase());

	ctrl.datatype = 'json'; // json|text|binary
}

Controller.prototype = {

	get mobile() {
		let ua = this.headers['user-agent'];
		return ua ? REG_MOBILE.test(ua) : false;
	},

	get robot() {
		let ua = this.headers['user-agent'];
		return ua ? REG_ROBOT.test(ua) : false;
	},

	get ua() {
		if (this.$ua != null)
			return this.$ua;
		let ua = this.headers['user-agent'];
		this.$ua = ua ? ua.parseUA() : '';
		return this.$ua;
	},

	get ip() {

		if (this.$ip != null)
			return this.$ip;

		// x-forwarded-for: client, proxy1, proxy2, ...
		let proxy = this.headers['x-forwarded-for'];
		if (proxy)
			this.$ip = proxy.split(',', 1)[0] || this.req.connection.remoteAddress;
		else if (!this.$ip)
			this.$ip = this.req.connection.remoteAddress;

		return this.$ip;
	},

	get referrer() {
		return this.headers.referer;
	}

};

Controller.prototype.upgrade = function(websocket) {
	var ctrl = this;
	F.stats.performance.online++;
	ctrl.parent = websocket;
	ctrl.socket.$controller = this;
	ctrl.req.on('abort', websocket_onerror);
	ctrl.req.on('aborted', websocket_onerror);
	ctrl.req.on('error', websocket_onerror);
	ctrl.socket.on('data', websocket_ondata);
	ctrl.socket.on('error', websocket_onerror);
	ctrl.socket.on('close', websocket_close);
	ctrl.socket.on('end', websocket_close);
	ctrl.parent.add(ctrl);
	websocket.online++;
	F.$events.websocket_begin && F.emit('websocket_begin', ctrl.parent, ctrl);
	ctrl.parent.$events.open && ctrl.parent.emit('open', ctrl);
};

// Readonly
Controller.prototype.cookie = function(name) {

	var ctrl = this;
	var arr;

	if (ctrl.cookies)
		return F.TUtils.decodeURIComponent(ctrl.cookies[name] || '');

	var cookie = ctrl.headers.cookie;
	if (!cookie) {
		ctrl.cookies = F.EMPTYOBJECT;
		return '';
	}

	ctrl.cookies = {};

	arr = cookie.split(';');
	for (let i = 0; i < arr.length; i++) {
		let line = arr[i].trim();
		let index = line.indexOf('=');
		if (index !== -1)
			ctrl.cookies[line.substring(0, index)] = line.substring(index + 1);
	}

	return name ? F.TUtils.decodeURIComponent(ctrl.cookies[name] || '') : '';
};

function websocket_ondata(chunk) {
	this.$controller.ondata(chunk);
}

function websocket_onerror(e) {
	this.destroy && this.destroy();
	this.$controller && this.$controller.onerror(e);
}

function websocket_close() {
	this.$controller && this.$controller.onclose();
	this.destroy && this.destroy();
}

Controller.prototype.destroy = function() {
	var ctrl = this;
	ctrl.socket.destroy();
	ctrl.req.destroy();
	F.TUtils.destroystream(ctrl.socket);
	F.TUtils.destroystream(ctrl.req);
};

Controller.prototype.onerror = function(err) {

	var ctrl = this;

	if (ctrl.isclosed)
		return;

	if (REG_WEBSOCKET_ERROR.test(err.stack)) {
		ctrl.isclosed = true;
		ctrl.onclose();
	} else
		ctrl.parent.$events.error && ctrl.parent.emit('error', err, ctrl);
};

Controller.prototype.onclose = function() {

	var ctrl = this;

	if (ctrl.isclosed2)
		return;

	F.stats.performance.online--;

	ctrl.isclosed = true;
	ctrl.isclosed2 = true;

	if (ctrl.inflate) {
		ctrl.inflate.removeAllListeners();
		delete ctrl.inflate;
		delete ctrl.inflatechunks;
	}

	if (ctrl.deflate) {
		ctrl.deflate.removeAllListeners();
		delete ctrl.deflate;
		delete ctrl.deflatechunks;
	}

	delete ctrl.parent.connections[ctrl.ID];
	ctrl.parent.online--;
	ctrl.parent.$events.close && ctrl.parent.emit('close', ctrl, ctrl.closecode, ctrl.closemessage);

	ctrl.socket.removeAllListeners();
	F.$events.websocket_end && EMIT('websocket_end', ctrl.parent, ctrl);

};

Controller.prototype.ondata = function(data) {

	var ctrl = this;
	var current = ctrl.current;

	if (data) {
		if (current.buffer) {
			CONCAT[0] = current.buffer;
			CONCAT[1] = data;
			current.buffer = Buffer.concat(CONCAT);
		} else
			current.buffer = data;
	}

	if (!ctrl.parse())
		return;

	if (!current.final && current.type !== 0x00)
		current.type2 = current.type;

	var decompress = current.compressed && ctrl.inflate;

	switch (current.type === 0x00 ? current.type2 : current.type) {

		case 0x01:

			// text
			if (decompress) {
				current.final && ctrl.parseinflate();
			} else {
				if (current.body) {
					CONCAT[0] = current.body;
					CONCAT[1] = current.data;
					current.body = Buffer.concat(CONCAT);
				} else
					current.body = current.data;
				current.final && ctrl.decode();
			}
			break;

		case 0x02:

			// binary
			if (decompress) {
				current.final && ctrl.parseinflate();
			} else {
				if (current.body) {
					CONCAT[0] = current.body;
					CONCAT[1] = current.data;
					current.body = Buffer.concat(CONCAT);
				} else
					current.body = current.data;
				current.final && ctrl.decode();
			}
			break;

		case 0x08:

			// close
			if (current.data) {
				ctrl.closemessage = current.data.slice(2).toString('utf8');
				ctrl.closecode = current.data[0] << 8 | current.data[1];
			}

			if (ctrl.closemessage && ctrl.parent.encodedecode)
				ctrl.closemessage = F.TUtils.decodeURIComponent(ctrl.closemessage);

			ctrl.close();
			current.buffer = null;
			current.inflatedata = null;
			return;

		case 0x09:
			// ping, response pong
			ctrl.socket.write(getWebSocketFrame(0, 'PONG', 0x0A, false, ctrl.masking));
			current.buffer = null;
			current.inflatedata = null;
			break;

		case 0x0a:
			// pong
			ctrl.latency = Date.now() - ctrl.$ping;
			current.buffer = null;
			current.inflatedata = null;
			break;
	}

	if (current.buffer) {
		current.buffer = current.buffer.slice(current.length, current.buffer.length);
		current.buffer.length && setImmediate(ctrl.ondata2);
	}
};

// MIT
// Written by Jozef Gula
// Optimized by Peter Sirka
Controller.prototype.parse = function() {

	var ctrl = this;
	var current = ctrl.current;

	// Fixed a problem with parsing of long messages, the code bellow 0x80 still returns 0 when the message is longer
	// if (!current.buffer || current.buffer.length <= 2 || ((current.buffer[0] & 0x80) >> 7) !== 1)
	if (!current.buffer || current.buffer.length <= 2)
		return;

	// WebSocket - Opcode
	current.type = current.buffer[0] & 0x0f;

	// Compression
	// Type must be greater than 0
	if (current.type)
		current.compressed = (current.buffer[0] & 0x40) === 0x40;

	// is final message?
	current.final = ((current.buffer[0] & 0x80) >> 7) === 0x01;

	// does frame contain mask?
	current.isMask = ((current.buffer[1] & 0xfe) >> 7) === 0x01;

	// data length
	var length = getMessageLength(current.buffer, F.isLE);
	// index for data

	// Solving a problem with The value "-1" is invalid for option "size"
	if (length <= 0)
		return current.final;

	var index = current.buffer[1] & 0x7f;
	index = ((index === 126) ? 4 : (index === 127 ? 10 : 2)) + (current.isMask ? 4 : 0);

	// total message length (data + header)
	var mlength = index + length;

	if (mlength > ctrl.route.size) {
		ctrl.close(1009, 'Frame is too large');
		return;
	}

	// Check length of data
	if (current.buffer.length < mlength)
		return;

	current.length = mlength;

	// Not Ping & Pong
	if (current.type !== 0x09 && current.type !== 0x0A) {

		// does frame contain mask?
		if (current.isMask) {
			current.mask = Buffer.alloc(4);
			current.buffer.copy(current.mask, 0, index - 4, index);
		}

		if (current.compressed && ctrl.inflate) {

			var buf = Buffer.alloc(length);
			current.buffer.copy(buf, 0, index, mlength);

			// does frame contain mask?
			if (current.isMask) {
				for (var i = 0; i < length; i++)
					buf[i] = buf[i] ^ current.mask[i % 4];
			}

			// Does the buffer continue?
			buf.$continue = current.final === false;
			ctrl.inflatepending.push(buf);

		} else {

			current.data = Buffer.alloc(length);
			current.buffer.copy(current.data, 0, index, mlength);

			if (current.isMask) {
				for (var i = 0; i < length; i++)
					current.data[i] = current.data[i] ^ current.mask[i % 4];
			}
		}
	}

	return true;
};

Controller.prototype.decode = function() {

	var ctrl = this;
	var data = ctrl.current.body;

	F.stats.performance.message++;
	F.stats.performance.download += data.length / 1024 / 1024;

	switch (ctrl.datatype) {

		case 'binary':
			ctrl.parent.$events.message && ctrl.parent.emit('message', ctrl, data);
			break;

		case 'json':

			if (data instanceof Buffer)
				data = data.toString('utf8');

			if (ctrl.parent.encodedecode === true)
				data = F.TUtils.decodeURIComponent(data);

			if (ctrl.parent.encryptdecrypt && F.config.secret_encryption)
				data = F.TUtils.decrypt_data(data, F.config.secret_encryption);

			if (data.isJSON()) {

				let tmp = data.parseJSON(true);

				if (REG_EMPTYBUFFER_TEST.test(tmp))
					tmp = tmp.replace(REG_EMPTYBUFFER, '');

				if (tmp !== undefined && ctrl.parent.$events.message)
					ctrl.parent.emit('message', this, tmp);
			}
			break;

		default: // TEXT

			if (data instanceof Buffer)
				data = data.toString('utf8');

			if (ctrl.parent.encodedecode === true)
				data = F.TUtils.decodeURIComponent(data);

			if (ctrl.parent.encryptdecrypt && F.config.secret_encryption)
				data = F.TUtils.decrypt_data(data, F.config.secret_encryption);

			if (REG_EMPTYBUFFER_TEST.test(data))
				data = data.replace(REG_EMPTYBUFFER, '');

			ctrl.parent.$events.message && ctrl.parent.emit('message', ctrl, data);
			break;
	}

	ctrl.current.body = null;
};

Controller.prototype.parseinflate = function() {

	var ctrl = this;

	if (ctrl.inflatelock)
		return;

	var buf = ctrl.inflatepending.shift();
	if (buf) {
		ctrl.inflatechunks = [];
		ctrl.inflatechunkslength = 0;
		ctrl.inflatelock = true;
		ctrl.inflate.write(buf);

		if (!buf.$continue)
			ctrl.inflate.write(Buffer.from(SOCKET_COMPRESS));

		ctrl.inflate.flush(function() {

			if (!ctrl.inflatechunks)
				return;

			var data = concat(ctrl.inflatechunks, ctrl.inflatechunkslength);

			ctrl.inflatechunks = null;
			ctrl.inflatelock = false;

			if (data.length > ctrl.route.size) {
				ctrl.close(1009, 'Frame is too large');
				return;
			}

			if (ctrl.current.body) {
				CONCAT[0] = ctrl.current.body;
				CONCAT[1] = data;
				ctrl.current.body = Buffer.concat(CONCAT);
			} else
				ctrl.current.body = data;

			!buf.$continue && ctrl.decode();
			ctrl.parseinflate();
		});
	}
};

Controller.prototype.send = function(message, raw, replacer) {

	var ctrl = this;

	if (ctrl.isclosed)
		return ctrl;

	var buffer;

	if (ctrl.datatype !== 'binary') {

		var data = ctrl.datatype === 'text' ? (raw ? message : JSON.stringify(message, replacer == true ? F.TUtils.json2replacer : replacer)) : typeof(message) === 'object' ? JSON.stringify(message, replacer == true ? F.TUtils.json2replacer : replacer) : (message + '');

		if (ctrl.parent.encryptdecrypt && F.config.secret_encryption)
			data = F.TUtils.encrypt_data(data, F.config.secret_encryption);

		if (ctrl.parent.encodedecode === true && data)
			data = encodeURIComponent(data);

		if (ctrl.deflate) {
			buffer = Buffer.from(data, 'utf8');
			ctrl.deflatepending.push(buffer);
			ctrl.senddeflate();
		} else {
			buffer = Buffer.from(data, 'utf8');
			ctrl.socket.write(getWebSocketFrame(0, buffer, 0x01, false, ctrl.masking));
		}

	} else if (message) {
		buffer = message;
		if (ctrl.deflate) {
			ctrl.deflatepending.push(message);
			ctrl.senddeflate();
		} else
			ctrl.socket.write(getWebSocketFrame(0, message, 0x02, false, ctrl.masking));
	}

	if (buffer)
		F.stats.performance.upload += buffer.length / 1024 / 1024;

};

Controller.prototype.senddeflate = function() {

	var ctrl = this;

	if (ctrl.deflatelock)
		return;

	var buf = ctrl.deflatepending.shift();
	if (buf) {
		ctrl.deflatechunks = [];
		ctrl.deflatechunkslength = 0;
		ctrl.deflatelock = true;
		ctrl.deflate.write(buf);
		ctrl.deflate.flush(function() {
			if (ctrl.deflatechunks) {
				var data = concat(ctrl.deflatechunks, ctrl.deflatechunkslength);
				data = data.slice(0, data.length - 4);
				ctrl.deflatelock = false;
				ctrl.deflatechunks = null;
				ctrl.socket.write(getWebSocketFrame(0, data, ctrl.type === 'binary' ? 0x02 : 0x01, true, ctrl.masking));
				ctrl.senddeflate();
			}
		});
	}
};

Controller.prototype.ping = function(ts) {
	var ctrl = this;
	if (!ctrl.isclosed) {
		try {
			ctrl.$ping = ts || Date.now();
			ctrl.socket.write(getWebSocketFrame(0, 'PING', 0x09, false, ctrl.masking));
		} catch (e) {
			// Socket error
			ctrl.onerror(e);
		}
	}
	return ctrl;
};

function websocketclientdestroy(ctrl) {
	ctrl.socket.destroy();
	F.TUtils.destroystream(ctrl.socket);
	F.TUtils.destroystream(ctrl.req);
}

function websocketclientsendfin(ctrl) {
	ctrl.socket.end(getWebSocketFrame(ctrl.closecode, ctrl.closemessage, 0x08, false, ctrl.masking));
	setImmediate(websocketclientdestroy, ctrl);
}

Controller.prototype.close = function(code, message) {

	var ctrl = this;

	if (!ctrl.isclosed) {

		ctrl.isclosed = true;

		if (ctrl.ready) {
			if (message && ctrl.parent && ctrl.parent.encodedecode)
				message = encodeURIComponent(message);

			if (ctrl.closecode) {
				setImmediate(websocketclientdestroy, ctrl);
			} else {
				ctrl.closecode = code || 1000;
				ctrl.closemessage = message || '';
				setTimeout(websocketclientsendfin, 1000, ctrl);
			}

		} else if (!ctrl.closecode) {
			ctrl.socket.end();
			setImmediate(websocketclientdestroy, ctrl);
		}
	}
};

Controller.prototype.sign = function(ctrl) {
	var sha1 = F.Crypto.createHash('sha1');
	sha1.update((ctrl.headers['sec-websocket-key'] || '') + SOCKET_HASH);
	return sha1.digest('base64');
};

function concat(buffers, length) {
	var buffer = Buffer.alloc(length);
	var offset = 0;
	for (var i = 0, n = buffers.length; i < n; i++) {
		buffers[i].copy(buffer, offset);
		offset += buffers[i].length;
	}
	return buffer;
}

function WebSocket(url, route, params) {
	var t = this;
	t.url = url;
	t.online = 0;
	t.connections = {};
	t.route = route;
	t.params = params;
	// t.autocloseid = null;
	F.TUtils.EventEmitter2.extend(t);
}

WebSocket.prototype.encrypt = function(enable) {
	this.encryptdecrypt = enable === true || enable == null;
};

WebSocket.prototype.find = function(fn) {
	var self = this;
	for (var key in self.connections) {
		var ctrl = self.connections[key];
		if (fn(ctrl))
			return ctrl;
	}
};

WebSocket.prototype.send = function(message, comparer, replacer, params) {

	var self = this;

	if (message === undefined)
		return self;

	if (!params && replacer != null && typeof(replacer) !== 'function') {
		params = replacer;
		replacer = null;
	}

	var raw = false;
	var data = null;

	for (var key in self.connections) {
		var ctrl = self.connections[key];
		if (data == null) {
			if (ctrl.datatype === 'json') {
				raw = true;
				data = JSON.stringify(message, replacer == true ? F.TUtils.json2replacer : replacer);
			} else
				data = message;
		}

		if (comparer && !comparer(ctrl, message, params))
			continue;

		ctrl.send(data, raw);
		F.stats.response.websocket++;
	}

	return self;
};

// Ping all connections
WebSocket.prototype.ping = function() {

	var self = this;

	self.$ping = true;
	F.stats.other.websocketping++;

	var ts = Date.now();
	for (var key in self.connections)
		self.connections[key].ping(ts);

	return self;
};

WebSocket.prototype.api = function(api) {
	var self = this;

	if (!api.startsWith('/@')) {
		if (api[0] !== '@')
			api = '@' + api;
		api = '/' + api + '/';
	}

	self.on('message', function(client, msg) {
		if (msg && msg.TYPE === 'api')
			client.exec(api, msg);
	});

	return self;
};

WebSocket.prototype.close = function(code, message) {

	var self = this;

	for (var key in self.connections) {
		self.connections[key].close(code, message);
		delete self.connections[key];
	}

	self.online = 0;
	return self;
};

WebSocket.prototype.error = function(err) {
	var self = this;
	F.error(typeof(err) === 'string' ? new Error(err) : err, self.name, self.url);
};

WebSocket.prototype.destroy = function() {

	var self = this;

	if (!self.connections)
		return self;

	self.close();
	self.$events.destroy && self.emit('destroy');
	delete F.connections[self.url];

	setTimeout(function(self) {

		for (var key in self.connections) {
			var conn = self.connections[key];
			if (conn) {
				conn.isclosed2 = true;
				conn.socket.removeAllListeners();
			}
		}

		var index = self.route.connections.indexOf(self);
		if (index !== -1)
			self.route.connections.splice(index, 1);

	}, 1000, self);

};

WebSocket.prototype.add = function(ctrl) {
	this.connections[ctrl.ID] = ctrl;
};

WebSocket.prototype.check = function() {
	var self = this;
	if (self.$ping) {
		for (var key in self.connections) {
			var ctrl = self.connections[key];
			if (ctrl.$ping && (ctrl.latency == null || ctrl.latency > F.config.$wsmaxlatency)) {
				ctrl.close();
				F.stats.other.websocketcleaner++;
			}
		}
	}
};

function wsdestroy_open() {
	var self = this;
	if (self.autocloseid) {
		clearTimeout(self.autocloseid);
		self.autocloseid = null;
	}
}

function wsdestroy_close(self) {

	// Checks again online state
	if (self.online) {
		self.autocloseid = null;
		return;
	}

	if (self.autodestroyitems) {
		for (var fn of self.autodestroyitems)
			fn.call(self);
		self.autodestroyitems = null;
	}
	self.destroy();
}

WebSocket.prototype.autodestroy = function(callback) {

	var self = this;

	if (self.autodestroyitems) {
		self.autodestroyitems.push(callback);
		return self;
	}

	self.autodestroyitems = [];
	callback && self.autodestroyitems.push(callback);
	self.on('open', wsdestroy_open);
	self.on('close', function() {
		if (!self.online)
			self.autocloseid = setTimeout(wsdestroy_close, 5000, self);
	});

	return self;
};

function authorize(ctrl) {
	if (F.def.onAuthorize) {
		var opt = new F.TBuilders.Options(ctrl);
		opt.TYPE = 'auth'; // important
		opt.query = ctrl.query;
		opt.iswebsocket = true;
		opt.next = opt.callback;
		opt.$callback = function(err, user) {
			let auth = user ? 1 : 2;
			ctrl.user = user;
			if (ctrl.route.auth === auth) {
				execute(ctrl);
			} else {
				ctrl.route = F.TRouting.lookupwebsocket(ctrl, auth);
				if (ctrl.route)
					execute(ctrl);
				else
					ctrl.close(4001);
			}
		};
		F.def.onAuthorize(opt);
	} else {
		ctrl.route = F.TRouting.lookupwebsocket(ctrl, 0);
		if (ctrl.route)
			execute(ctrl);
		else
			ctrl.close(4004);
	}
}

function middleware(ctrl) {
	var run = function(index) {
		var fn = ctrl.route.middleware[index];
		if (fn)
			fn(ctrl, () => run(index + 1));
		else
			prepare(ctrl);
	};
	run(0);
}

function prepare(ctrl) {

	ctrl.ondata2 = () => ctrl.ondata();

	var compress = (F.config.$wscompress && ctrl.headers['sec-websocket-extensions'] || '').indexOf('permessage-deflate') !== -1;
	var header = ctrl.route.protocols && ctrl.route.protocols.length ? (compress ? SOCKET_RESPONSE_PROTOCOL_COMPRESS : SOCKET_RESPONSE_PROTOCOL).format(ctrl.sign(ctrl), ctrl.route.protocols.join(', ')) : (compress ? SOCKET_RESPONSE_COMPRESS : SOCKET_RESPONSE).format(ctrl.sign(ctrl));

	ctrl.socket.write(Buffer.from(header, 'binary'));
	ctrl.ready = true;

	if (compress) {
		ctrl.inflatepending = [];
		ctrl.inflatelock = false;
		ctrl.inflate = F.Zlib.createInflateRaw(SOCKET_COMPRESS_OPTIONS);
		ctrl.inflate.$controller = ctrl;
		ctrl.inflate.on('error', function() {
			if (!ctrl.$uerror) {
				ctrl.$uerror = true;
				ctrl.close(1003, 'Invalid data');
			}
		});

		ctrl.inflate.on('data', inflate);
		ctrl.deflatepending = [];
		ctrl.deflatelock = false;
		ctrl.deflate = F.Zlib.createDeflateRaw(SOCKET_COMPRESS_OPTIONS);
		ctrl.deflate.$controller = ctrl;
		ctrl.deflate.on('error', function() {
			if (!ctrl.$uerror) {
				ctrl.$uerror = true;
				ctrl.close(1003, 'Invalid data');
			}
		});
		ctrl.deflate.on('data', deflate);
	}

	if (WSCLIENTSID++ > 999999999)
		WSCLIENTSID = 1;

	ctrl.ID = F.TUtils.random_text(3) + WSCLIENTSID;
	ctrl.id = ctrl.ID;

	if (F.connections[ctrl.url]) {
		ctrl.upgrade(F.connections[ctrl.url]);
		return;
	}

	var websocket = new WebSocket(ctrl.url, ctrl.route, ctrl.params);
	F.connections[ctrl.url] = websocket;

	websocket.encodedecode = F.config.$wsencodedecode === true;

	if (!ctrl.route.connections)
		ctrl.route.connections = [];

	ctrl.route.connections.push(websocket);
	ctrl.route.action.call(websocket, websocket);

	setImmediate(upgradecontinue, ctrl, websocket);
}

function upgradecontinue(ctrl, websocket) {
	ctrl.upgrade(websocket);
}

function inflate(data) {
	var ctrl = this.$controller;
	if (ctrl && ctrl.inflatechunks) {
		ctrl.inflatechunks.push(data);
		ctrl.inflatechunkslength += data.length;
	}
}

function deflate(data) {
	var ctrl = this.$controller;
	if (ctrl && ctrl.deflatechunks) {
		ctrl.deflatechunks.push(data);
		ctrl.deflatechunkslength += data.length;
	}
}

function execute(ctrl) {

	for (let param of ctrl.route.params) {
		let value = ctrl.split[param.index];
		ctrl.params[param.name] = value;
	}

	if (F.def.onLocalize)
		ctrl.language = F.def.onLocalize(ctrl);

	if (ctrl.route.flags.binary)
		ctrl.datatype = 'binary';
	else if (ctrl.route.flags.text)
		ctrl.datatype = 'text';

	if (ctrl.route.middleware.length)
		middleware(ctrl);
	else
		prepare(ctrl);
}

// MIT
// Written by Jozef Gula <gula.jozef@gmail.com>
function getWebSocketFrame(code, message, type, compress, mask) {

	if (mask)
		mask = ((Math.random() * 214748364) >> 0) + 1;

	var messageBuffer = getWebSocketFrameMessageBytes(code, message);
	var lengthBuffer = getWebSocketFrameLengthBytes(messageBuffer.length);
	var lengthMask = mask ? 4 : 0;
	var frameBuffer = Buffer.alloc(1 + lengthBuffer.length + messageBuffer.length + lengthMask);

	frameBuffer[0] = 0x80 | type;

	if (compress)
		frameBuffer[0] |= 0x40;

	lengthBuffer.copy(frameBuffer, 1, 0, lengthBuffer.length);

	if (mask) {
		var offset = lengthBuffer.length + 1;
		frameBuffer[1] |= 0x80;
		frameBuffer.writeInt32BE(mask, offset);
		for (var i = 0; i < messageBuffer.length; i++)
			messageBuffer[i] = messageBuffer[i] ^ frameBuffer[offset + (i % 4)];
	}

	messageBuffer.copy(frameBuffer, lengthBuffer.length + 1 + lengthMask, 0, messageBuffer.length);
	return frameBuffer;
}

// MIT
// Written by Jozef Gula <gula.jozef@gmail.com>
function getWebSocketFrameMessageBytes(code, message) {

	var index = code ? 2 : 0;
	var binary = message instanceof Int8Array || message instanceof Buffer;
	var length = message.length;

	var messageBuffer = Buffer.alloc(length + index);

	for (var i = 0; i < length; i++)
		messageBuffer[i + index] = binary ? message[i] : message.charCodeAt(i);

	if (code) {
		messageBuffer[0] = code >> 8;
		messageBuffer[1] = code;
	}

	return messageBuffer;
}

// MIT
// Written by Jozef Gula <gula.jozef@gmail.com>
function getWebSocketFrameLengthBytes(length) {
	var lengthBuffer = null;

	if (length <= 125) {
		lengthBuffer = Buffer.alloc(1);
		lengthBuffer[0] = length;
		return lengthBuffer;
	}

	if (length <= 65535) {
		lengthBuffer = Buffer.alloc(3);
		lengthBuffer[0] = 126;
		lengthBuffer[1] = (length >> 8) & 255;
		lengthBuffer[2] = (length) & 255;
		return lengthBuffer;
	}

	lengthBuffer = Buffer.alloc(9);

	lengthBuffer[0] = 127;
	lengthBuffer[1] = 0x00;
	lengthBuffer[2] = 0x00;
	lengthBuffer[3] = 0x00;
	lengthBuffer[4] = 0x00;
	lengthBuffer[5] = (length >> 24) & 255;
	lengthBuffer[6] = (length >> 16) & 255;
	lengthBuffer[7] = (length >> 8) & 255;
	lengthBuffer[8] = (length) & 255;

	return lengthBuffer;
}

// MIT
// Written by Jozef Gula
// Optimized by Peter Sirka
function getMessageLength(data, isLE) {

	var length = data[1] & 0x7f;

	if (length === 126) {
		if (data.length < 4)
			return -1;
		CACHE_GML1[0] = data[3];
		CACHE_GML1[1] = data[2];
		return converBytesToInt64(CACHE_GML1, 0, isLE);
	}

	if (length === 127) {
		if (data.Length < 10)
			return -1;
		CACHE_GML2[0] = data[9];
		CACHE_GML2[1] = data[8];
		CACHE_GML2[2] = data[7];
		CACHE_GML2[3] = data[6];
		CACHE_GML2[4] = data[5];
		CACHE_GML2[5] = data[4];
		CACHE_GML2[6] = data[3];
		CACHE_GML2[7] = data[2];
		return converBytesToInt64(CACHE_GML2, 0, isLE);
	}

	return length;
}

// MIT
// Written by Jozef Gula
function converBytesToInt64(data, startIndex, isLE) {
	return isLE ? (data[startIndex] | (data[startIndex + 1] << 0x08) | (data[startIndex + 2] << 0x10) | (data[startIndex + 3] << 0x18) | (data[startIndex + 4] << 0x20) | (data[startIndex + 5] << 0x28) | (data[startIndex + 6] << 0x30) | (data[startIndex + 7] << 0x38)) : ((data[startIndex + 7] << 0x20) | (data[startIndex + 6] << 0x28) | (data[startIndex + 5] << 0x30) | (data[startIndex + 4] << 0x38) | (data[startIndex + 3]) | (data[startIndex + 2] << 0x08) | (data[startIndex + 1] << 0x10) | (data[startIndex] << 0x18));
}

exports.ping = function() {
	for (let key in F.connections) {
		let socket = F.connections[key];
		socket.check();
		socket.ping();
	}
};

exports.listen = function(req, socket, head) {

	if (!req.headers.upgrade || !F.routes.websockets.length || !REG_WEBSOCKET.test(req.headers.upgrade))
		return;

	var ctrl = new Controller(req, socket, head);

	if (F.paused.length) {
		ctrl.destroy();
		return;
	}

	if (SOCKET_ALLOW_VERSION.indexOf(ctrl.headers['sec-websocket-version'] || '') === -1) {
		ctrl.destroy();
		return;
	}

	if (F.config.$blacklist && F.config.$blacklist.indexOf(ctrl.ip) !== -1) {
		F.stats.request.blocked++;
		ctrl.destroy();
		return;
	}

	if (F.routes.proxies.length && F.TRouting.lookupproxy(ctrl))
		return;

	socket.setTimeout(0);
	socket.on('error', NOOP);

	ctrl.route = F.TRouting.lookupwebsocket(ctrl, 0, true);

	if (!ctrl.route) {
		ctrl.destroy();
		return;
	}

	if (ctrl.route.flags.csrf && !F.def.onCSRFcheck(ctrl)) {
		ctrl.destroy();
		return;
	}

	F.$events.websocket && F.emit('websocket', ctrl);
	F.stats.request.websocket++;
	authorize(ctrl);
};

function WebSocketClient() {

	var t = this;
	t.iswsclient = true;
	t.current = {};
	t.pending = [];
	t.reconnect = 0;
	t.closed = true;

	// type: json, text, binary
	t.headers = {};
	t.options = { type: 'json', size: 0, masking: false, compress: true, reconnect: 3000, encodedecode: false, encryptdecrypt: false, rejectunauthorized: false }; // key: Buffer, cert: Buffer, dhparam: Buffer
	t.cookies = {};

	t.ondata2 = () => t.ondata();
	F.TUtils.EventEmitter2.extend(t);
}

WebSocketClient.prototype.connect = function(url, protocol, origin) {
	setImmediate(this.connectforce, this, url, protocol, origin);
};

WebSocketClient.prototype.connectforce = function(self, url, protocol, origin) {

	var options = {};

	self.url = url;
	self.origin = origin;
	self.protocol = protocol;
	self.secret = F.Crypto.randomBytes(16).toString('base64');

	delete self.isclosed2;
	delete self.isclosed;

	var secured = false;

	if (typeof(url) === 'string') {
		url = F.Url.parse(url);
		options.host = url.hostname;
		options.path = url.path;
		options.query = url.query;
		secured = url.protocol === 'wss:';
		options.port = url.port || (secured ? 443 : 80);
	} else {
		options.socketPath = url.socket;
		options.path = url.path;
		// options.query = url.query;
	}

	options.headers = {};
	options.headers['User-Agent'] = 'Total.js/v' + F.version_header;
	options.headers['Sec-WebSocket-Version'] = '13';
	options.headers['Sec-WebSocket-Key'] = self.secret;
	options.headers['Sec-Websocket-Extensions'] = (self.options.compress ? 'permessage-deflate, ' : '') + 'client_max_window_bits';

	if (protocol)
		options.headers['Sec-WebSocket-Protocol'] = protocol;

	if (origin)
		options.headers['Sec-WebSocket-Origin'] = origin;

	options.headers.Connection = 'Upgrade';
	options.headers.Upgrade = 'websocket';

	// options.agent = options.port === 443 ? KeepAliveHttps : KeepAlive;
	// options.agent = options.port === 443 ? new Https.Agent() : new Http.Agent();
	options.agent = false;

	if (self.options.key)
		options.key = self.options.key;

	if (self.options.cert)
		options.cert = self.options.cert;

	if (self.options.dhparam)
		options.dhparam = self.options.dhparam;

	if (self.options.rejectUnauthorized || self.options.rejectunauthorized)
		options.rejectUnauthorized = true;

	for (let key in self.headers)
		options.headers[key] = self.headers[key];

	var tmp = [];
	for (let key in self.cookies)
		tmp.push(key + '=' + self.cookies[key]);

	options.headers.Cookie = tmp.join(', ');

	F.stats.performance.online++;
	self.req = (secured ? F.Https : F.Http).get(options);
	self.req.$main = self;

	self.req.on('error', function(e) {
		self.$events.error && self.emit('error', e);
		self.onclose();
		self.$api && wsclient_closecallbacks(self, e);
		self.options.reconnectserver && wsclient_reconnect_timer(self);
	});

	self.req.on('response', function(res) {

		print(res.statusCode);
		self.$events.error && self.emit('error', new Error('Unexpected server response (' + res.statusCode + ')'));

		if (self.options.reconnectserver) {
			self.onclose();
			wsclient_reconnect_timer(self);
		}

		self.onclose();

	});

	self.req.on('upgrade', function(response, socket) {

		self.socket = socket;
		self.socket.$controller = self;

		var compress = self.options.compress && (response.headers['sec-websocket-extensions'] || '').indexOf('-deflate') !== -1;
		var digest = F.Crypto.createHash('sha1').update(self.secret + SOCKET_HASH, 'binary').digest('base64');

		if (response.headers['sec-websocket-accept'] !== digest) {
			socket.destroy();
			self.closed = true;
			self.$events.error && self.emit('error', new Error('Invalid server key'), response);
			self.free();
			return;
		}

		self.closed = false;
		self.socket.on('data', websocket_ondata);
		self.socket.on('error', websocket_onerror);
		self.socket.on('close', wsclient_close);
		self.socket.on('end', wsclient_close);

		if (compress) {
			self.inflatepending = [];
			self.inflatelock = false;
			self.inflate = F.Zlib.createInflateRaw(SOCKET_COMPRESS_OPTIONS);
			self.inflate.$controller = self;
			self.inflate.on('error', F.error());
			self.inflate.on('data', inflate);
			self.deflatepending = [];
			self.deflatelock = false;
			self.deflate = F.Zlib.createDeflateRaw(SOCKET_COMPRESS_OPTIONS);
			self.deflate.$controller = self;
			self.deflate.on('error', F.error());
			self.deflate.on('data', deflate);
		}

		self.$events.open && self.emit('open');
	});
};

WebSocketClient.prototype.ping = function(timeout) {
	var self = this;
	if (!self.isclosed && !self.timeout) {
		self.timeout = setTimeout(wsclient_timeout, timeout || 3000);
		self.socket.write(getWebSocketFrame(0, 'PING', 0x09, false, self.options.masking));
		self.$ping = Date.now();
	}
	return self;
};

WebSocketClient.prototype.ondata = function(data) {

	var self = this;

	if (self.isclosed)
		return;

	if (data)
		F.stats.performance.download += data.length / 1024 / 1024;

	var current = self.current;
	if (data) {
		if (current.buffer) {
			CONCAT[0] = current.buffer;
			CONCAT[1] = data;
			current.buffer = Buffer.concat(CONCAT);
		} else
			current.buffer = data;
	}

	if (!self.parse())
		return;

	if (!current.final && current.type !== 0x00)
		current.type2 = current.type;

	var decompress = current.compressed && self.inflate;

	switch (current.type === 0x00 ? current.type2 : current.type) {
		case 0x01:
			// text
			if (decompress) {
				current.final && self.parseinflate();
			} else {
				if (current.body) {
					CONCAT[0] = current.body;
					CONCAT[1] = current.data;
					current.body = Buffer.concat(CONCAT);
				} else
					current.body = current.data;
				current.final && self.decode();
			}

			break;

		case 0x02:

			// binary
			if (decompress) {
				current.final && self.parseinflate();
			} else {
				if (current.body) {
					CONCAT[0] = current.body;
					CONCAT[1] = current.data;
					current.body = Buffer.concat(CONCAT);
				} else
					current.body = current.data;
				current.final && self.decode();
			}

			break;

		case 0x08:
			// close
			self.closemessage = current.data.slice(2).toString('utf8');
			self.closecode = current.data[0] << 8 | current.data[1];
			if (self.closemessage && self.options.encodedecode)
				self.closemessage = F.TUtils.decodeURIComponent(self.closemessage);
			self.$api && wsclient_closecallbacks(self, self.closecode);
			wsclient_closeforce(self);
			break;

		case 0x09:
			// ping, response pong
			self.socket.write(getWebSocketFrame(0, 'PONG', 0x0A, false, self.options.masking));
			current.buffer = null;
			current.inflatedata = null;
			break;

		case 0x0a:
			// pong
			self.timeout && clearTimeout(self.timeout);
			self.timeout = null;
			self.latency = Date.now() - self.$ping;
			current.buffer = null;
			current.inflatedata = null;
			break;
	}

	if (current.buffer) {
		current.buffer = current.buffer.slice(current.length, current.buffer.length);
		current.buffer.length && setImmediate(self.ondata2);
	}

};

// MIT
// Written by Jozef Gula
// Optimized by Peter Sirka
WebSocketClient.prototype.parse = function() {

	var self = this;
	var current = self.current;

	// Fixed a problem with parsing of long messages, the code bellow 0x80 still returns 0 when the message is longer
	// if (!current.buffer || current.buffer.length <= 2 || ((current.buffer[0] & 0x80) >> 7) !== 1)
	if (!current.buffer || current.buffer.length <= 2)
		return;

	// WebSocket - Opcode
	current.type = current.buffer[0] & 0x0f;
	current.compressed = (current.buffer[0] & 0x40) === 0x40;

	// is final message?
	current.final = ((current.buffer[0] & 0x80) >> 7) === 0x01;

	// does frame contain mask?
	current.isMask = ((current.buffer[1] & 0xfe) >> 7) === 0x01;

	// data length
	var length = getMessageLength(current.buffer, F.isLE);
	// index for data

	// Solving a problem with The value "-1" is invalid for option "size"
	if (length <= 0)
		return current.final;

	var index = current.buffer[1] & 0x7f;
	index = ((index === 126) ? 4 : (index === 127 ? 10 : 2)) + (current.isMask ? 4 : 0);

	// total message length (data + header)
	var mlength = index + length;

	if (self.options.length && mlength > self.options.length) {
		self.close('Frame is too large', 1009);
		return;
	}

	// Check length of data
	if (current.buffer.length < mlength)
		return;

	current.length = mlength;

	// Not Ping & Pong
	if (current.type !== 0x09 && current.type !== 0x0A) {

		// does frame contain mask?
		if (current.isMask) {
			current.mask = Buffer.alloc(4);
			current.buffer.copy(current.mask, 0, index - 4, index);
		}

		if (current.compressed && self.inflate) {

			var buf = Buffer.alloc(length);
			current.buffer.copy(buf, 0, index, mlength);

			// does frame contain mask?
			if (current.isMask) {
				for (var i = 0; i < length; i++)
					buf[i] = buf[i] ^ current.mask[i % 4];
			}

			// Does the buffer continue?
			buf.$continue = current.final === false;
			self.inflatepending.push(buf);
		} else {
			current.data = Buffer.alloc(length);
			current.buffer.copy(current.data, 0, index, mlength);
		}
	}

	return true;
};

WebSocketClient.prototype.readbody = function() {
	var self = this;
	var current = self.current;
	var length = current.data.length;
	var buf = Buffer.alloc(length);
	for (var i = 0; i < length; i++) {
		// does frame contain mask?
		if (current.isMask)
			buf[i] = current.data[i] ^ current.mask[i % 4];
		else
			buf[i] = current.data[i];
	}
	return buf;
};

WebSocketClient.prototype.decode = function() {

	var self = this;
	var data = self.current.body;

	F.stats.performance.message++;

	switch (self.options.type) {

		case 'binary':
			self.emit('message', data);
			break;

		case 'json':

			if (data instanceof Buffer)
				data = data.toString('utf8');

			if (self.options.encodedecode === true)
				data = F.TUtils.decodeURIComponent(data);

			if (self.options.encrypt)
				data = F.TUtils.decrypt_data(data, self.options.encrypt);

			if (data.isJSON()) {
				var tmp = data.parseJSON(true);
				if (tmp !== undefined)
					self.emit('message', tmp);
			}
			break;

		default: // TEXT

			if (data instanceof Buffer)
				data = data.toString('utf8');

			if (self.options.encodedecode === true)
				data = F.TUtils.decodeURIComponent(data);

			if (self.options.encrypt)
				data = F.TUtils.decrypt_data(data, self.options.encrypt);

			self.emit('message', data);
			break;
	}

	self.current.body = null;
};

WebSocketClient.prototype.parseinflate = function() {

	var self = this;

	if (self.inflatelock)
		return;

	var buf = self.inflatepending.shift();
	if (buf) {
		self.inflatechunks = [];
		self.inflatechunkslength = 0;
		self.inflatelock = true;
		self.inflate.write(buf);
		!buf.$continue && self.inflate.write(Buffer.from(SOCKET_COMPRESS));
		self.inflate.flush(function() {

			if (!self.inflatechunks)
				return;

			let data = concat(self.inflatechunks, self.inflatechunkslength);

			self.inflatechunks = null;
			self.inflatelock = false;

			if (self.options.size && data.length > self.options.size) {
				self.close(1009, 'Frame is too large');
				return;
			}

			if (self.current.body) {
				CONCAT[0] = self.current.body;
				CONCAT[1] = data;
				self.current.body = Buffer.concat(CONCAT);
			} else
				self.current.body = data;

			if (!buf.$continue)
				self.decode();

			self.parseinflate();
		});
	}
};

WebSocketClient.prototype.onerror = function(err) {

	var self = this;

	self.$events.error && self.emit('error', err);

	if (!self.isclosed) {
		self.$api && wsclient_closecallbacks(self, err);
		self.isclosed = true;
		self.onclose();
	}
};

WebSocketClient.prototype.onclose = function() {

	var self = this;

	if (self.isclosed2)
		return;

	self.isclosed = true;
	self.isclosed2 = true;

	F.stats.performance.online--;

	if (self.inflate) {
		self.inflate.removeAllListeners();
		self.inflate = null;
		self.inflatechunks = null;
	}

	if (self.deflate) {
		self.deflate.removeAllListeners();
		self.deflate = null;
		self.deflatechunks = null;
	}

	self.free();
};

WebSocketClient.prototype.destroy = function() {
	var self = this;

	self.free();
	self.options.reconnect = 0;

	if (self.reconnecting) {
		clearTimeout(self.reconnecting);
		self.reconnecting = null;
	}

	self.$events.destroy && self.emit('destroy');
};

WebSocketClient.prototype.free = function() {

	var self = this;

	if (self.req) {
		self.req.connection && self.req.connection.destroy();
		self.req.removeAllListeners();
		self.req.destroy();
		F.cleanup(self.req);
	}

	if (self.socket) {
		self.socket.removeAllListeners();
		self.socket.destroy();
		F.cleanup(self.socket);
	}

	self.socket = null;
	self.req = null;
	return self;
};

WebSocketClient.prototype.send = function(message, raw, replacer) {

	var self = this;

	if (self.isclosed || self.closed)
		return false;

	var type = self.options.type;

	if (type != 'binary') {

		var data = type === 'json' ? (raw ? message : JSON.stringify(message, replacer == true ? F.TUtils.json2replacer : replacer)) : typeof(message) === 'object' ? JSON.stringify(message, replacer == true ? F.TUtils.json2replacer : replacer) : (message + '');
		var buffer;

		if (self.options.encrypt)
			data = F.TUtils.encrypt_data(data, self.options.encrypt);

		if (self.options.encodedecode === true && data)
			data = encodeURIComponent(data);

		if (self.deflate) {
			buffer = Buffer.from(data, 'utf8');
			self.deflatepending.push(buffer);
			self.senddeflate();
		} else {
			buffer = Buffer.from(data, 'utf8');
			self.socket.write(getWebSocketFrame(0, buffer, 0x01, false, self.options.masking));
		}

		F.stats.performance.upload += buffer.length / 1024 / 1024;

	} else if (message) {

		if (!(message instanceof Buffer))
			message = Buffer.from(message, 'utf8');

		if (self.deflate) {
			self.deflatepending.push(message);
			self.senddeflate();
		} else
			self.socket.write(getWebSocketFrame(0, message, 0x02, false, self.options.masking));

		F.stats.performance.upload += message.length / 1024 / 1024;
	}

	F.stats.response.websocket++;
	return true;
};

WebSocketClient.prototype.sendcustom = function(type, message) {

	var self = this;

	if (self.isclosed || self.closed || !self.socket)
		return false;

	if (type !== 'binary') {
		var data = (message == null ? '' : message) + '';
		if (self.options.encrypt)
			data = F.TUtils.encrypt_data(data, self.options.encrypt);
		if (self.options.encodedecode && data)
			data = encodeURIComponent(data);
		if (self.deflate) {
			self.deflatepending.push(Buffer.from(data));
			self.senddeflate();
		} else
			self.socket.write(getWebSocketFrame(0, data, 0x01, false, self.options.masking));
	} else {

		if (!(message instanceof Buffer))
			message = Buffer.from(message);

		if (self.deflate) {
			self.deflatepending.push(message);
			self.senddeflate();
		} else
			self.socket.write(getWebSocketFrame(0, message, 0x02, false, self.options.masking));
	}

	F.stats.response.websocket++;
	return true;
};

WebSocketClient.prototype.senddeflate = function() {
	var self = this;

	if (self.deflatelock)
		return;

	var buf = self.deflatepending.shift();
	if (buf) {
		self.deflatechunks = [];
		self.deflatechunkslength = 0;
		self.deflatelock = true;
		self.deflate.write(buf);
		self.deflate.flush(function() {
			if (self.deflatechunks) {
				var data = concat(self.deflatechunks, self.deflatechunkslength);
				data = data.slice(0, data.length - 4);
				self.deflatelock = false;
				self.deflatechunks = null;
				if (self.socket) {
					self.socket.write(getWebSocketFrame(0, data, self.options.type === 'binary' ? 0x02 : 0x01, true, self.options.masking));
					self.senddeflate();
				}
			}
		});
	}
};

WebSocketClient.prototype.close = function(code, message) {

	var self = this;

	if (message !== true) {
		self.options.reconnect = 0;
		self.reconnecting && clearTimeout(self.reconnecting);
		self.reconnecting = null;
	} else
		message = undefined;

	if (!self.isclosed && self.socket) {
		self.isclosed = true;
		if (message && self.options.encodedecode)
			message = encodeURIComponent(message);
		self.socket.end(getWebSocketFrame(code || 1000, message || '', 0x08, false, self.options.masking));
	}

	return self;
};

function registerapi(client) {

	if (client.$api)
		return;

	client.$api = true;
	client.on('message', function(msg) {
		if (msg.TYPE === 'api') {
			var obj = CALLBACKS[msg.callbackid];
			if (obj) {
				delete CALLBACKS[msg.callbackid];
				clearTimeout(obj.timeout);
				if (msg.error)
					obj.callback(msg.data instanceof Array ? ErrorBuilder.assign(msg.data) : msg.data);
				else
					obj.callback(null, msg.data);
			}
		}
	});
}

function timeoutapi(id) {
	var obj = CALLBACKS[id];
	if (obj) {
		obj.callback(408);
		delete CALLBACKS[id];
	}
}

WebSocketClient.prototype.api = function(schema, data, callback, timeout) {

	var self = this;

	if (!schema) {
		registerapi(self);
		return self;
	}

	if (!self.$api)
		self.api();

	if (typeof(data) === 'function') {
		timeout = callback;
		callback = data;
		data = null;
	}

	if (callback == null)
		return new Promise((resolve, reject) => self.api(schema, data, (err, response) => err ? reject(err) : resolve(response), timeout));

	var msg = { TYPE: 'api', data: { schema: schema, data: data }};
	msg.callbackid = (CALLBACKSCOUNTER++) + '';

	if (CALLBACKSCOUNTER > 9999999999)
		CALLBACKSCOUNTER = 1;

	var obj = {};
	obj.client = self;
	obj.callback = callback;
	obj.timeout = setTimeout(timeoutapi, timeout || 5000, msg.callbackid);
	CALLBACKS[msg.callbackid] = obj;
	self.send(msg);
};

function wsclient_timeout(self) {
	self.timeout = null;
	self.onerror('Timeout');
}

function wsclient_close() {
	wsclient_closeforce(this.$controller);
}

function wsclient_closeforce(client) {
	if (!client.closed) {
		client.$events.close && client.emit('close', client.closecode, client.closemessage);
		client.closed = true;
		client.onclose();
		wsclient_reconnect_timer(client);
	}
}

function inflate(data) {
	var ctrl = this.$controller;
	if (ctrl && ctrl.inflatechunks) {
		ctrl.inflatechunks.push(data);
		ctrl.inflatechunkslength += data.length;
	}
}

function deflate(data) {
	var ctrl = this.$controller;
	if (ctrl && ctrl.deflatechunks) {
		ctrl.deflatechunks.push(data);
		ctrl.deflatechunkslength += data.length;
	}
}

function wsclient_reconnect_client(client) {
	client.isclosed = false;
	client.isclosed2 = false;
	client.reconnecting = null;
	client.reconnect++;
	client.connect(client.url, client.protocol, client.origin);
}

function wsclient_reconnect_timer(client) {
	if (client.options.reconnect) {
		client.reconnecting && clearTimeout(client.reconnecting);
		client.reconnecting = setTimeout(wsclient_reconnect_client, client.options.reconnect, client);
	}
}

function wsclient_closecallbacks(client, e) {
	for (var key in CALLBACKS) {
		var obj = CALLBACKS[key];
		if (obj.client === client) {
			clearTimeout(obj.timeout);
			obj.callback(e);
			delete CALLBACKS[key];
		}
	}
}

exports.createclient = function(callback) {
	var client = new WebSocketClient();
	callback && callback(client);
	return client;
};