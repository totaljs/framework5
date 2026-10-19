/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

CONF.$imprint = false;
CONF.mail_from = 'from@example.com';
CONF.mail_from_name = 'Test';

F.run({ port: 8221, release: true, watcher: false });

// The SMTP settings of the application: the tiny server below
ON('ready', () => F.config.smtp = { server: '127.0.0.1', port: 2529 });

// A tiny SMTP server that records what it receives, standing in for a real one
const net = require('net');
const received = [];

const server = net.createServer(function(socket) {
	let data = false;
	let buffer = '';
	let current = '';
	socket.write('220 localhost ready\r\n');
	socket.on('data', function(chunk) {
		buffer += chunk.toString('utf8');
		let index;
		while ((index = buffer.indexOf('\r\n')) !== -1) {
			const line = buffer.substring(0, index);
			buffer = buffer.substring(index + 2);
			if (data) {
				if (line === '.') {
					data = false;
					received.push(current);
					current = '';
					socket.write('250 queued\r\n');
				} else
					current += line + '\n';
				continue;
			}
			const command = line.substring(0, 4).toUpperCase();
			if (command === 'EHLO' || command === 'HELO')
				socket.write('250 localhost\r\n');
			else if (command === 'DATA') {
				data = true;
				socket.write('354 go on\r\n');
			} else if (command === 'QUIT') {
				socket.write('221 bye\r\n');
				socket.end();
			} else
				socket.write('250 ok\r\n');
		}
	});
});

// The attachment with the name: its Base64 is decoded and the lines of the Base64 must be valid
function attachment(raw, name) {
	const parts = raw.split(/\n--/);
	for (const part of parts) {
		if (part.indexOf('filename="' + name + '"') === -1)
			continue;
		const body = part.split('Content-Transfer-Encoding: base64\n\n')[1];
		const lines = body.split('\n').map(m => m.trim()).filter(m => m && m.indexOf('--') !== 0);
		return { lines: lines, data: Buffer.from(lines.join(''), 'base64'), valid: lines.every((m, i) => /^[A-Za-z0-9+/]*={0,2}$/.test(m) && (i === lines.length - 1 || m.indexOf('=') === -1)) };
	}
	return null;
}

function send(prepare) {
	return new Promise(function(resolve) {
		const before = received.length;
		const message = DEF.onMail('to@example.com', 'Attachment test', '<p>Hello</p>', function(err) {
			setTimeout(function() {
				resolve({ err: err, raw: received[before] || null });
			}, 300);
		});
		prepare(message);
	});
}

ON('ready', function() {

	// All the byte values, a size that is not a multiple of 3 and of 68
	const content = Buffer.alloc(100003);
	for (let i = 0; i < content.length; i++)
		content[i] = (i * 31 + (i >> 8)) & 255;

	Test.push('Mail attachments', function(next) {

		const arr = [];

		arr.push(function(resume) {
			server.listen(2529, '127.0.0.1', resume);
		});

		arr.push(function(resume) {
			send(m => m.attachment(content, 'buffer.bin')).then(function(r) {
				const a = r.raw && attachment(r.raw, 'buffer.bin');
				Test.print('attachment() with a Buffer is valid Base64', a && a.valid ? null : 'The Base64 has padding inside');
				Test.print('attachment() with a Buffer is sent without changes', a && a.data.equals(content) ? null : 'The attachment is corrupted');
				resume();
			});
		});

		arr.push(function(resume) {
			const file = PATH.tmp('mail-attachment.bin');
			require('fs').writeFileSync(file, content);
			send(m => m.attachment(file, 'file.bin')).then(function(r) {
				const a = r.raw && attachment(r.raw, 'file.bin');
				Test.print('attachment() with a file is sent without changes', a && a.valid && a.data.equals(content) ? null : 'The attachment is corrupted');
				resume();
			});
		});

		arr.push(function(resume) {
			FILESTORAGE('mailtest').save('f1', 'stored.bin', content, function(err) {
				send(m => m.attachmentfs('mailtest', 'f1', 'stored.bin')).then(function(r) {
					const a = r.raw && attachment(r.raw, 'stored.bin');
					Test.print('attachmentfs() sends the file of the storage', a && a.valid && a.data.equals(content) ? null : 'The email was not sent with the attachment');
					resume();
				});
			});
		});

		arr.push(function(resume) {
			FILESTORAGE('mailtest').save('f2', 'noname.bin', content, function(err) {
				send(m => m.attachmentfs('mailtest', 'f2')).then(function(r) {
					const a = r.raw && attachment(r.raw, 'noname.bin');
					Test.print('attachmentfs() takes the name of the file when there is no name', a && a.data.equals(content) ? null : 'The name was not taken from the storage');
					resume();
				});
			});
		});

		arr.push(function(resume) {
			send(m => m.attachmentfs('mailtest', 'missing')).then(function(r) {
				Test.print('attachmentfs() with a missing file finishes the message', r.raw && r.raw.indexOf('Attachment test') !== -1 || r.raw ? null : 'The message was not completed');
				resume();
			});
		});

		arr.async(function() {
			server.close();
			require('fs').rmSync(PATH.tmp(), { recursive: true, force: true });
			require('fs').rmSync(PATH.databases('fs-mailtest'), { recursive: true, force: true });
			next();
		});
	});

	Test.run();
});
