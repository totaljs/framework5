// AI
// The MIT License
// Copyright 2026 (c) Peter Širka <petersirka@gmail.com>

function AI(model) {
    const t = this;

	t.options = {};
	t.options.callback = NOOP;
	t.config = {};

	t.payload = {};
	t.payload.model = model;
	t.payload.messages = [];
}

// Enables think mode
AI.prototype.think = function () {
	const t = this;
	t.payload.think = true;
	return t;
};

// Internal function
// Appends content message
AI.prototype.message = function(role, content, merge) {

	const t = this;

	if (merge) {
		for (let m of t.payload.messages) {
			if (m.role === role) {
				m.content += merge + content;
				return this;
			}
		}
	}

	t.payload.messages.push({ role: role, content: content });
	return t;
};

AI.prototype.configure = function(opt) {
	const t = this;
	for (let key in opt)
		t.config[key] = opt[key];
	return t;
};

AI.prototype.system = function(content, merge) {
	return this.message('system', content, merge);
};

AI.prototype.user = function(content, merge) {
	return this.message('user', content, merge);
};

AI.prototype.assistant = function(content, merge) {
	return this.message('assistant', content, merge);
};

AI.prototype.promise = function($) {
	const t = this;
	return new Promise(function(resolve, reject) {
		t.callback(function(err, response) {
			if (err) {
				if ($ && $.invalid)
					$.invalid(err);
				else
					reject(F.TUtils.toError(err));
			} else
				resolve(response);
		});
	});
};

AI.prototype.stream = function(fn) {
	const t = this;
	t.options.stream = fn;
	t.options.$running && clearImmediate(t.options.$running);
	t.options.$running = setImmediate(() => t.run());
	return t;
};

AI.prototype.callback = function(fn) {
	const t = this;
	t.options.callback = fn;
	t.options.$running && clearImmediate(t.options.$running);
	t.options.$running = setImmediate(() => t.run());
	return t;
};

// Internal function
AI.prototype.run = function() {
	const t = this;
	let ai = F.aimodels[t.payload.model];
	if (ai) {
		if (ai.config) {
			for (let key in ai.config) {
				if (t.config[key] === undefined)
					t.config[key] = ai.config[key];
			}
		}
		ai.callback(t, t.options.callback);
	} else
		t.options.callback('AI model not found.');
	return t;
};

exports.exec = function(model) {
	return new AI(model);
};

exports.newai = function(model, config, callback) {

	if (typeof(config) === 'function') {
		callback = config;
		config = null;
	}

	const models = model.split(/,/).trim();
	for (const m of models)
		F.aimodels[m] = { config, callback };
};
