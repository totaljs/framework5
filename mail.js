// Total.js SMTP sender
// The MIT License
// Copyright 2016-2023 (c) Peter Širka <petersirka@gmail.com>

const CRLF = '\r\n';
const REG_ESMTP = /\besmtp\b/i;
const REG_STATE = /\d+/;
const REG_WINLINE = /\r\n/g;
const REG_NEWLINE = /\n/g;
const REG_AUTH = /(AUTH LOGIN|AUTH PLAIN|PLAIN LOGIN|XOAUTH2|XOAUTH)/i;
const REG_TLS = /TLS/;
const REG_STARTTLS = /STARTTLS/;
const ATTACHMENT = { encoding: 'base64' };

var INDEXATTACHMENT = 0;

const CRLF_BUFFER = Buffer.from(CRLF);
const CONCAT = [null, null];

var Mailer = {};
Mailer.debug = false;
Mailer.Message = Message;
Mailer.Mail = Message;
Mailer.connections = {};
Mailer.create = (subject, body) => new Message(subject, body);
F.TUtils.EventEmitter2.extend(Mailer);

function Message(subject, body) {
	var self = this;
	self.subject = subject || '';
	self.body = body || '';
	self.type = 'html';
	self.files;
	self.email_to = [];
	self.email_reply;
	self.email_cc;
	self.email_bcc;
	self.email_from = '';
	self.closed = false;
	self.tls = false;
	self.$callback;

	// t.headers;
	// t.$unsubscribe;
}

Message.prototype.preview = function(val) {
	this.$preview = val;
	return this;
};

Message.prototype.unsubscribe = function(url) {
	var tmp = url.substring(0, 6);
	this.$unsubscribe = url ? (tmp === 'http:/' || tmp === 'https:' ? '<' + url + '>' : '<mailto:' + url + '>') : null;
	return this;
};

Message.prototype.callback = function(fn) {
	this.$callback = fn;
	return this;
};

Message.prototype.sender = Message.prototype.from = function(email) {
	this.email_from = email;
	return this;
};

Message.prototype.high = function() {
	this.$priority = 1;
	return this;
};

Message.prototype.low = function() {
	this.$priority = 5;
	return this;
};

Message.prototype.confidential = function() {
	this.$confidential = true;
	return this;
};

Message.prototype.to = function(value, clear) {
	var self = this;
	if (clear)
		self.email_to.length = 0;
	self.email_to.push(value);
	return self;
};

Message.prototype.cc = function(value, clear) {
	var self = this;
	if (clear || !self.email_cc)
		self.email_cc = [];
	self.email_cc.push(value);
	return self;
};

Message.prototype.bcc = function(value, clear) {
	var self = this;
	if (clear || !self.email_bcc)
		self.email_bcc = [];
	self.email_bcc.push(value);
	return self;
};

Message.prototype.reply = function(value, clear) {
	var self = this;
	if (clear || !self.email_reply)
		self.email_reply = [];
	self.email_reply.push(value);
	return self;
};

Message.prototype.attachment = function(filename, name, contentid) {

	var self = this;
	var type;
	var ext;

	if (name) {
		ext = F.TUtils.getExtension(name);
		type = F.TUtils.contentTypes[ext];
	}

	var obj = {};
	obj.name = name;
	obj.filename = filename;
	obj.type = type;
	obj.ext = ext;

	if (contentid) {
		obj.disposition = 'inline';
		obj.contentid = contentid;
	}

	if (!self.attachments)
		self.attachments = [];

	self.attachments.push(obj);
	return self;
};

Message.prototype.attachmentfs = function(storage, id, name, contentid) {

	var self = this;
	var ext;
	var type;

	if (name) {
		ext = F.TUtils.getExtension(name);
		type = F.TUtils.contentTypes[ext];
	}

	var obj = {};
	obj.storage = storage;
	obj.name = name;
	obj.filename = id;
	obj.type = type;
	obj.ext = ext;

	if (contentid) {
		obj.disposition = 'inline';
		obj.contentid = contentid;
	}

	if (!self.attachments)
		self.attachments = [];

	self.attachments.push(obj);
	return self;
};

Message.prototype.manually = function() {
	this.$sending && clearImmediate(this.$sending);
	return this;
};

Message.prototype.send2 = function(callback) {

	var self = this;

	if (F.config.$tapi && F.config.$tapimail) {

		var data = {};

		data.to = [];

		for (let m of self.email_to)
			data.to.push(m);

		if (self.email_cc && self.email_cc.length) {
			data.cc = [];
			for (let m of self.email_cc)
				data.cc.push(m);
		}

		if (self.email_bcc && self.email_bcc.length) {
			data.bcc = [];
			for (let m of self.email_bcc)
				data.bcc.push(m);
		}

		if (self.email_reply && self.email_reply.length) {
			data.reply = [];
			for (let m of self.email_reply)
				data.reply.push(m);
		}

		data.from = self.email_from;
		data.subject = self.subject;
		data.type = self.type;
		data.body = self.body;
		data.priority = self.$priotity;
		data.unsubscribe = self.$unsubscribe;
		data.confidential = self.$confidential;

		F.api('TAPI/mail', data).callback(callback || NOOP);
		return;
	}

	for (let key in F.temporary.smtp)
		Mailer.destroy(F.temporary.smtp[key]);

	Mailer.send(F.config.smtp, self, callback);
};

Message.prototype.send = function(smtp, options, callback, cache) {
	var self = this;
	self.$callback2 = callback;
	options.server = smtp;
	Mailer.send(options, self, callback, cache);
	return self;
};

Mailer.tls = function(obj, opt) {

	var self = this;

	obj.tls = true;
	obj.socket.removeAllListeners();

	var tlsoptions = { socket: obj.socket, host: obj.socket.$host, ciphers: 'SSLv3' };

	for (let key in opt.tls)
		tlsoptions[key] = opt.tls[key];

	obj.socket2 = F.Tls.connect(tlsoptions, () => self.$send(obj, opt, true));

	obj.socket2.on('error', function(err) {
		Mailer.destroy(obj);
		self.closed = true;
		self.callback && self.callback(err);
		self.callback = null;
		if (obj.try || err.stack.indexOf('ECONNRESET') !== -1)
			return;
		Mailer.$events.error && Mailer.emit('error', err, obj);
	});

	obj.socket2.on('clientError', function(err) {
		Mailer.destroy(obj);
		self.callback && self.callback(err);
		self.callback = null;
		Mailer.$events.error && !obj.try && Mailer.emit('error', err, obj);
	});

	obj.socket2.on('connect', () => !opt.secure && self.$send(obj, opt));
};

Mailer.destroy = function(obj) {

	var self = this;

	if (obj.destroyed)
		return self;

	obj.destroyed = true;
	obj.closed = true;

	if (obj.socket) {
		obj.socket.removeAllListeners();
		obj.socket.end();
		obj.socket.destroy();
		obj.socket = null;
	}

	if (obj.socket2) {
		obj.socket2.removeAllListeners();
		obj.socket2.end();
		obj.socket2.destroy();
		obj.socket2 = null;
	}

	if (obj === F.temporary.smtp[obj.server])
		delete F.temporary.smtp[obj.server];

	delete self.connections[obj.id];
	return self;
};

Mailer.$writeattachment = function(obj) {

	var attachment = obj.files ? obj.files.shift() : false;
	if (!attachment) {

		Mailer.$writeline(obj, '--' + obj.boundary + '--', '', '.');

		if (obj.callback) {
			obj.callback(null, obj.instance);
			obj.callback = null;
		}

		if (obj.messagecallback) {
			obj.messagecallback(null, obj.instance);
			obj.messagecallback = null;
		}

		if (obj.messagecallback2) {
			obj.messagecallback2(null, obj.instance);
			obj.messagecallback2 = null;
		}

		return this;
	}

	var stream;

	if (attachment.storage) {
		FILESTORAGE(attachment.storage).readbase64(attachment.filename, function(err, meta) {
			if (err) {
				F.error(err, 'Mail.filestorage()', attachment.filename);
				Mailer.$writeattachment(obj);
			} else {

				if (!attachment.name) {
					attachment.name = meta.name;
					attachment.type = meta.type;
					attachment.extension = meta.ext;
				}

				writeattachemnt_stream(attachment, obj, meta.stream);
			}
		});
	} else {
		F.stats.performance.open++;
		stream = F.Fs.createReadStream(attachment.filename, ATTACHMENT);
		writeattachemnt_stream(attachment, obj, stream);
	}

	return this;
};

function writeattachemnt_stream(attachment, obj, stream) {

	var name = attachment.name;
	var isCalendar = attachment.extension === 'ics';
	var message = [];

	message.push('--' + obj.boundary);

	if (!isCalendar) {
		if (attachment.contentid) {
			message.push('Content-Disposition: inline; filename="' + name + '"');
			message.push('Content-ID: <' + attachment.contentid + '>');
		} else
			message.push('Content-Disposition: attachment; filename="' + name + '"');
	}

	message.push('Content-Type: ' + attachment.type + ';' + (isCalendar ? ' charset="utf-8"; method=REQUEST' : ''));
	message.push('Content-Transfer-Encoding: base64');
	message.push(CRLF);
	Mailer.$writeline(obj, message.join(CRLF));

	stream.$mailerdata = obj;
	stream.on('data', writeattachmentbytes);

	F.cleanup(stream, function() {
		Mailer.$writeline(obj, CRLF);
		Mailer.$writeattachment(obj);
	});
}

function writeattachmentbytes(chunk) {

	var length = chunk.length;
	var count = 0;
	var beg = 0;

	while (count < length) {

		count += 68;

		if (count > length)
			count = length;

		Mailer.$writeline(this.$mailerdata, chunk.slice(beg, count).toString('base64'));
		beg = count;
	}
}

Mailer.try = function(options, callback) {
	var self = this;
	if (callback)
		self.send(options, undefined, callback);
	else
		return new Promise((resolve, reject) => self.send(options, undefined, err => err ? reject(err) : resolve()));
};

Mailer.send2 = function(messages, callback) {

	var opt = F.temporary.mail;

	if (!opt) {
		var config = CONF.mail_smtp_options;
		if (config) {
			if (typeof(config) === 'object')
				opt = config;
			else
				opt = config.toString().parseJSON();
		}

		if (!opt)
			opt = {};

		F.temporary.mail = opt;
	}

	return this.send(CONF.mail_smtp, opt, messages, callback);
};

Mailer.send = function(opt, messages, callback, cache) {

	var cached = opt.keepalive != false ? F.temporary.smtp[opt.server] : null;

	if (cached) {
		if (messages instanceof Array) {
			var count = messages.length;
			F.stats.performance.mail += count;
			for (var i = 0; i < count; i++)
				cached.messages.push(messages[i]);
		} else if (messages) {
			F.stats.performance.mail++;
			cached.messages.push(messages);
		}
		cached.trytosend();
		return;
	}

	var self = this;
	var id = F.TUtils.guid();

	self.connections[id] = {};
	var obj = self.connections[id];

	obj.id = id;
	obj.buffer = [];
	obj.try = messages === undefined;
	obj.messages = obj.try ? F.EMPTYARRAY : messages instanceof Array ? messages : [messages];

	F.stats.performance.mail += obj.messages.length;

	obj.callback = callback;
	obj.closed = false;
	obj.message = null;
	obj.attachments = null;
	obj.count = 0;
	obj.socket;
	obj.tls = false;
	obj.date = new Date();

	if (opt.secure && !opt.port)
		opt.port = 465;

	if (!opt.server)  {
		var err = new Error('No SMTP server configuration.');
		callback && callback(err);
		F.error(err, 'mail_smtp');
		return self;
	}

	if (opt.secure) {
		let internal = F.TUtils.copy(opt);
		internal.host = opt.server;
		obj.socket = F.Tls.connect(internal, () => Mailer.$send(obj, opt));
	} else
		obj.socket = F.Net.createConnection(opt.port, opt.server);

	if (cache) {
		obj.trytosend = function() {
			if (!obj.sending && obj.messages && obj.messages.length) {
				obj.sending = true;
				obj.buffer = [];
				Mailer.$writemessage(obj, obj.buffer);
				Mailer.$writeline(obj, obj.buffer.shift());
			}
		};
		obj.TS = NOW.add(cache === true ? '10 minutes' : typeof(cache) === 'number' ? (cache + ' minutes') : cache);
		F.temporary.smtp[opt.server] = obj;
	}

	obj.cached = cache;
	obj.smtp = opt;
	obj.socket.$host = opt.server;
	obj.host = opt.server.substring(opt.server.lastIndexOf('.', opt.server.lastIndexOf('.') - 1) + 1);

	obj.socket.on('error', function(err) {

		Mailer.destroy(obj);

		var is = obj.callback ? true : false;

		obj.callback && obj.callback(err);
		obj.callback = null;

		if (obj.try || err.stack.indexOf('ECONNRESET') !== -1)
			return;

		if (!obj.try && !is)
			F.error(err, 'mail_smtp', opt.server);

		if (obj === F.temporary.smtp[opt.server])
			delete F.temporary.smtp[opt.server];

		Mailer.$events.error && Mailer.emit('error', err, obj);
	});

	obj.socket.on('clientError', function(err) {

		Mailer.destroy(obj);

		if (!obj.try && !obj.callback)
			F.error(err, 'mail_smtp', opt.server);

		obj.callback && obj.callback(err);
		obj.callback = null;

		if (obj === F.temporary.smtp[opt.server])
			delete F.temporary.smtp[opt.server];

		if (Mailer.$events.error && !obj.try)
			Mailer.emit('error', err, obj);

	});

	if (!cache) {
		obj.socket.setTimeout(opt.timeout || 60000, function() {
			var err = F.TUtils.httpstatus(408);
			Mailer.destroy(obj);

			if (!obj.try && !obj.callback)
				F.error(err, 'mail_smtp', opt.server);

			obj.callback && obj.callback(err);
			obj.callback = null;

			if (obj === F.temporary.smtp[opt.server])
				delete F.temporary.smtp[opt.server];

			if (Mailer.$events.error && !obj.try)
				Mailer.emit('error', err, obj);
		});
	}

	obj.sending = true;
	obj.socket.on('connect', () => !opt.secure && Mailer.$send(obj, opt));
};

Mailer.$writemessage = function(obj, buffer) {

	var self = this;
	var msg = obj.messages.shift();
	var message = [];

	F.stats.other.mail++;
	F.$events.$mail && F.emit('$mail', msg);

	var dt = obj.date.getTime();

	obj.boundary = '--total5' + dt;
	obj.files = msg.files;
	obj.count++;

	message.push('MIME-Version: 1.0');
	buffer.push('MAIL FROM: <' + msg.email_from + '>');
	message.push('Message-ID: <total5_' + obj.date.toString(36) + '_' + (INDEXATTACHMENT++) + '_' + (INDEXATTACHMENT) + '>');

	self.$priority && message.push('X-Priority: ' + self.$priority);
	self.$confidential && message.push('Sensitivity: Company-Confidential');

	message.push('From: <' + msg.email_from + '>');

	if (msg.headers) {
		for (let key in msg.headers)
			message.push(key + ': ' + msg.headers[key]);
	}

	var builder = '';
	var mail;

	if (msg.email_to.length) {
		for (let item of msg.email_to) {
			mail = '<' + item + '>';
			buffer.push('RCPT TO: ' + mail);
			builder += (builder ? ', ' : '') + mail;
		}
		message.push('To: ' + builder);
		builder = '';
	}

	if (msg.email_cc) {
		for (let item of msg.email_cc) {
			mail = '<' + item + '>';
			buffer.push('RCPT TO: ' + mail);
			builder += (builder ? ', ' : '') + mail;
		}
		message.push('Cc: ' + builder);
		builder = '';
	}

	if (msg.email_bcc) {
		for (let item of msg.email_bcc)
			buffer.push('RCPT TO: <' + item + '>');
	}

	buffer.push('DATA');
	buffer.push('');

	message.push('Date: ' + obj.date.toUTCString());
	message.push('Subject: ' + unicode_encode(msg.subject));

	if (msg.$unsubscribe) {
		message.push('List-Unsubscribe: ' + msg.$unsubscribe);
		message.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
	}

	if (msg.email_reply) {
		for (let item of msg.email_reply)
			builder += (builder !== '' ? ', ' : '') + '<' + item + '>';
		message.push('Reply-To: ' + builder);
		builder = '';
	}

	message.push('Content-Type: multipart/mixed; boundary="' + obj.boundary + '"');
	message.push('');
	message.push('--' + obj.boundary);
	message.push('Content-Type: text/' + msg.type + '; charset="utf-8"');
	message.push('Content-Transfer-Encoding: base64');
	message.push('');
	message.push(prepareBASE64(Buffer.from(msg.body.replace(REG_WINLINE, '\n').replace(REG_NEWLINE, CRLF)).toString('base64')));

	// if (msg.type === 'html' && msg.$preview) {
	// 	message.push('--' + obj.boundary);
	// 	message.push('Content-Type: text/plain; charset="utf-8"; format="fixed"');
	// 	message.push('Content-Transfer-Encoding: base64');
	// 	message.push('');
	// 	message.push(prepareBASE64(Buffer.from(msg.$preview.replace(REG_WINLINE, '\n').replace(REG_NEWLINE, CRLF)).toString('base64')));
	// }

	obj.message = message.join(CRLF);
	obj.messagecallback = msg.$callback;
	obj.messagecallback2 = msg.$callback2;
	obj.instance = msg;

	message = null;
	return self;
};

Mailer.$writeline = function(obj) {

	if (obj.closed)
		return false;

	var socket = obj.socket2 ? obj.socket2 : obj.socket;

	for (var i = 1; i < arguments.length; i++) {
		var line = arguments[i];
		if (line) {
			Mailer.debug && console.log('SEND', line);
			socket.write(line + CRLF);
		}
	}

	return true;
};

Mailer.$send = function(obj, options, autosend) {

	var self = this;
	var isAuthorized = false;
	var isAuthorization = false;
	var command = '';
	var auth = [];
	var socket = obj.socket2 ? obj.socket2 : obj.socket;
	var host = obj.host;
	var line = null;
	var isAttach = !options.tls || (obj.tls && options.tls);

	isAttach && Mailer.$events.send && Mailer.emit('send', obj);
	socket.setEncoding('utf8');

	socket.on('end', function() {
		Mailer.destroy(obj);
		obj.callback && obj.callback();
		obj.callback = null;
		if (obj.cached)
			delete F.temporary.smtp[obj.server];
		line = null;
	});

	socket.on('data', function(data) {

		if (obj.closed)
			return;

		while (true) {

			var index = data.indexOf(CRLF_BUFFER);
			if (index === -1) {
				if (line) {
					CONCAT[0] = line;
					CONCAT[1] = data;
					line = Buffer.concat(CONCAT);
				} else
					line = data;
				break;
			}

			var tmp = data.slice(0, index).toString('utf8');
			data = data.slice(index + CRLF_BUFFER.length);
			tmp && socket && socket.emit('line', tmp);
		}
	});

	socket.on('line', function(line) {

		line = line.toUpperCase();
		Mailer.debug && console.log('<---', line);

		var code = +line.match(REG_STATE)[0];
		if (code === 250 && !isAuthorization) {
			if (REG_AUTH.test(line) && (options.user && (options.password || options.token))) {
				isAuthorization = true;
				if (options.token && line.indexOf('XOAUTH2') !== -1) {
					auth.push('AUTH XOAUTH2');
					auth.push(Buffer.from('user=' + options.user + '\1auth=Bearer ' + options.token + '\1\1').toString('base64'));
				} else if (line.lastIndexOf('XOAUTH') === -1) {
					auth.push('AUTH LOGIN');
					auth.push(Buffer.from(options.user).toString('base64'));
					auth.push(Buffer.from(options.password).toString('base64'));
				} else
					auth.push('AUTH PLAIN ' + Buffer.from('\0'+ options.user + '\0' + options.password).toString('base64'));
			}
		}

		// help
		if (line.substring(3, 4) === '-')
			return;

		if (!isAuthorized && isAuthorization) {
			isAuthorized = true;
			code = 334;
		}

		switch (code) {
			case 220:

				if (obj.isTLS || REG_TLS.test(line)) {
					Mailer.tls(obj, options);
				} else {
					obj.secured = REG_ESMTP.test(line);
					command = options.heloid ? options.heloid : (obj.isTLS || (options.user && options.password) || obj.secured ? 'EHLO' : 'HELO');
					Mailer.$writeline(obj, command + ' ' + host);
				}

				return;

			case 250: // OPERATION
			case 251: // FORWARD
			case 235: // VERIFY
			case 999: // Total.js again

				if (obj.secured && !obj.isTLS && !obj.logged && obj.smtp.user && obj.smtp.password) {
					// maybe TLS
					obj.isTLS = true;
					Mailer.$writeline(obj, 'STARTTLS');
					return;
				}

				Mailer.$writeline(obj, obj.buffer.shift());

				if (obj.buffer.length)
					return;

				// NEW MESSAGE
				if (obj.messages.length) {
					obj.buffer = [];
					Mailer.$writemessage(obj, obj.buffer);
					Mailer.$writeline(obj, obj.buffer.shift());
				} else {

					obj.sending = false;

					// end
					if (obj.cached)
						obj.trytosend();
					else
						Mailer.$writeline(obj, 'QUIT');
				}

				return;

			case 221: // BYE

				if (!obj.cached)
					Mailer.destroy(obj);

				obj.callback && obj.callback(null, obj.try ? true : obj.count);
				obj.callback = null;

				return;

			case 334: // LOGIN

				if (!self.tls && !obj.isTLS && options.tls) {
					obj.isTLS = true;
					Mailer.$writeline(obj, 'STARTTLS');
					return;
				}

				var value = auth.shift();
				if (value) {
					obj.logged = true;
					Mailer.$writeline(obj, value);
				} else {
					var err = new Error('Forbidden.');
					Mailer.destroy(obj);
					obj.callback && obj.callback(err);
					obj.callback = null;
					Mailer.$events.error && !obj.try && Mailer.emit('error', err, obj);
				}

				return;

			case 354:
				Mailer.$writeline(obj, obj.message);
				Mailer.$writeattachment(obj);
				obj.message = null;
				return;

			default:

				if (code < 400)
					return;

				if (!obj.isTLS && code === 530 && REG_STARTTLS.test(line)) {
					obj.isTLS = true;
					Mailer.$writeline(obj, 'STARTTLS');
					return;
				}

				var err = line;

				Mailer.$events.error && !obj.try && Mailer.emit('error', err, obj);

				if (obj.messagecallback) {
					obj.messagecallback(err, obj.instance);
					obj.messagecallback = null;
				}

				if (obj.messagecallback2) {
					obj.messagecallback2(err, obj.instance);
					obj.messagecallback2 = null;
				}

				if (obj.messages.length) {

					F.error(err, 'SMTP error');

					// a problem
					obj.buffer = [];
					obj.count--;
					socket.emit('line', '999 TRY NEXT MESSAGE');

				} else {
					Mailer.destroy(obj);
					obj.callback && obj.callback(err);
					obj.callback = null;
				}

				return;
		}
	});

	autosend && self.$writeline(obj, 'EHLO ' + host);
};

Mailer.restart = function() {
	var self = this;
	self.off();
	self.debug = false;
	INDEXATTACHMENT = 0;
};

// Split Base64 to lines with 68 characters
function prepareBASE64(value) {

	var index = 0;
	var output = '';
	var length = value.length;

	while (index < length) {
		var max = index + 68;
		if (max > length)
			max = length;
		output += value.substring(index, max) + CRLF;
		index = max;
	}

	return output;
}

function unicode_encode(val) {
	return val ? '=?utf-8?B?' + Buffer.from(val.toString()).toString('base64') + '?=' : '';
}

// ======================================================
// EXPORTS
// ======================================================

exports.Mailer = Mailer;
exports.Message = Message;
exports.refresh = function() {
	for (let key in F.temporary.smtp) {
		let conn = F.temporary.smtp[key];
		if (conn.TS < NOW && (!conn.messages || !conn.messages.length))
			Mailer.destroy(F.temporary.smtp[key]);
	}
};