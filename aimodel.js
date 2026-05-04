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
	t.payload.tools = [];
}

// Enables think mode
AI.prototype.think = function () {
	const t = this;
	t.payload.think = true;
	return t;
};

AI.prototype.parser = function(provider) {
	return parseAIStream(provider);
};

// Internal function
// Appends content message
AI.prototype.message = function(role, content, merge) {

	const t = this;

	if (merge) {
		for (let m of t.payload.messages) {
			if (m.role === role) {

				if (typeof(content) === 'object') {
					for (let key in content)
						m[key] = content[key];
				} else
					m.content += merge + content;

				return this;
			}
		}
	}

	const msg = { role: role };

	if (typeof(content) === 'object') {
		for (let key in content)
			msg[key] = content[key];
	} else
		msg.content = content;

	t.payload.messages.push(msg);
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

AI.prototype.prompt = function(content) {
	this.payload.prompt = content;
	return this;
};

AI.prototype.assistant = function(content, merge) {
	return this.message('assistant', content, merge);
};

AI.prototype.tool = function(content) {
	this.payload.tools.push(content);
	return this;
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

function parseJSON(value) {
	if (!value)
		return null;

	if (typeof value === 'object')
		return value;

	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function normalize(value) {

	if (value == null)
		return {};

	if (typeof(value) === 'object')
		return value;

	if (typeof(value) === 'string') {
		try {
			return JSON.parse(value);
		} catch {
			return { _raw: value };
		}
	}

	return { _raw: value };
}

function createTool(id, name) {
	return {
		id: id || null,
		name: name || null,
		arguments: '',
		input: null
	};
}

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

function parseJSON(value) {
	if (!value)
		return null;

	if (typeof value === 'object')
		return value;

	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function normalize(value) {
	if (value == null)
		return {};

	if (typeof value === 'object')
		return value;

	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch {
			return { _raw: value };
		}
	}

	return { _raw: value };
}

function createTool(id, name) {
	return {
		id: id || null,
		name: name || null,
		arguments: '',
		input: null
	};
}

class AIStreamParser {

	constructor(provider) {
		this.provider = provider || 'generic';
		this.content = '';
		this.tools = [];
		this.reasoning = 'content';
		this.buffer = Buffer.alloc(0);
		this.toolmap = Object.create(null);
	}

	write(chunk) {
		if (chunk == null)
			return this.output();

		if (chunk instanceof Buffer || typeof(chunk) === 'string' || chunk instanceof Uint8Array || chunk instanceof ArrayBuffer)
			return this.writeBuffer(chunk);

		if (typeof(chunk) === 'object')
			return this.writeObject(chunk);

		return this.output();
	}

	writeBuffer(chunk) {

		this.appendBuffer(chunk);

		let index;

		while ((index = this.buffer.indexOf(0x0A)) !== -1) { // \n
			let lineBuffer = this.buffer.subarray(0, index);
			this.buffer = this.buffer.subarray(index + 1);

			// CRLF support: remove \r
			if (lineBuffer.length && lineBuffer[lineBuffer.length - 1] === 0x0D)
				lineBuffer = lineBuffer.subarray(0, lineBuffer.length - 1);

			this.processLineBuffer(lineBuffer);
		}

		return this.output();
	}

	appendBuffer(chunk) {

		if (chunk == null)
			return;

		if (Buffer.isBuffer(chunk)) {
			// OK
		} else if (chunk instanceof Uint8Array) {
			chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
		} else if (chunk instanceof ArrayBuffer) {
			chunk = Buffer.from(chunk);
		} else {
			chunk = Buffer.from(String(chunk), 'utf8');
		}

		this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
	}

	processLineBuffer(lineBuffer) {
		let line = lineBuffer.toString('utf8').trim();

		if (!line)
			return;

		// SSE format: data: {...}
		if (line.startsWith('data:'))
			line = line.substring(5).trim();

		if (!line || line === '[DONE]')
			return;

		const json = parseJSON(line);
		if (json)
			this.writeObject(json);
	}

	end() {
		if (this.buffer.length)
			this.processLineBuffer(this.buffer);
		this.buffer = Buffer.alloc(0);
		this.finalizeTools();
		return this.output();
	}

	writeObject(chunk) {
		switch (this.provider) {
			case 'ollama':
				this.parseOllama(chunk);
				break;
			case 'openai_chat':
			case 'openai':
				this.parseOpenAI(chunk);
				break;
			case 'openai_responses':
				this.parseOpenAIresponse(chunk);
				break;
			case 'claude':
			case 'anthropic':
				this.parseClaude(chunk);
				break;
			case 'gemini':
			case 'google':
				this.parseGemini(chunk);
				break;

			default:
				this.parseGeneric(chunk);
				break;
		}
		return this.output();
	}

	addContent(value) {
		if (!value)
			return;
		this.content += value;
		if (!this.tools.length)
			this.reasoning = 'content';
	}

	getTool(key, id, name) {

		key = key || id || name || String(this.tools.length);

		let tool = this.toolmap[key];
		if (!tool) {
			tool = createTool(id, name);
			this.toolmap[key] = tool;
			this.tools.push(tool);
		}

		if (id)
			tool.id = id;

		if (name)
			tool.name = name;

		this.reasoning = 'tool';

		return tool;
	}

	appendToolArguments(tool, value) {

		if (value == null)
			return;

		if (typeof value === 'object') {
			tool.input = value;
			tool.arguments = JSON.stringify(value);
			return;
		}

		tool.arguments += value;
	}

	finalizeTools() {
		for (const tool of this.tools) {
			if (tool.input == null)
				tool.input = normalize(tool.arguments);
		}
	}

	output() {
		this.finalizeTools();
		return {
			content: this.content,
			tools: this.tools.map(tool => ({
				id: tool.id,
				name: tool.name,
				arguments: tool.input || normalize(tool.arguments)
			})),
			reasoning: this.tools.length ? 'tool' : this.reasoning
		};
	}

	// ------------------------------------------------------------
	// Ollama stream
	// ------------------------------------------------------------

	parseOllama(chunk) {

		const message = chunk.message || {};

		if (message.content)
			this.addContent(message.content);

		const calls = message.tool_calls || [];

		for (let i = 0; i < calls.length; i++) {
			const call = calls[i];
			const fn = call.function || {};
			const key = call.id || fn.name || `ollama_${i}`;

			const tool = this.getTool(key, call.id, fn.name);

			if (fn.arguments != null)
				this.appendToolArguments(tool, fn.arguments);
		}
	}

	// ------------------------------------------------------------
	// OpenAI Chat Completions stream
	// ------------------------------------------------------------
	parseOpenAI(chunk) {
		const choices = chunk.choices || [];

		for (const choice of choices) {
			const delta = choice.delta || {};

			if (delta.content)
				this.addContent(delta.content);

			const calls = delta.tool_calls || [];

			for (const call of calls) {
				const index = call.index != null ? call.index : 0;
				const fn = call.function || {};
				const key = call.id || `openai_chat_${index}`;

				const tool = this.getTool(key, call.id, fn.name);

				if (fn.arguments != null)
					this.appendToolArguments(tool, fn.arguments);
			}
		}
	}

	// ------------------------------------------------------------
	// OpenAI Responses API stream
	// ------------------------------------------------------------

	parseOpenAIresponse(chunk) {
		switch (chunk.type) {
			case 'response.output_text.delta':
			case 'response.refusal.delta':
				this.addContent(chunk.delta);
				break;

			case 'response.function_call_arguments.delta': {
				const key = chunk.item_id || chunk.call_id || `openai_response_${chunk.output_index || 0}`;
				const tool = this.getTool(key, chunk.call_id || chunk.item_id, chunk.name);

				this.appendToolArguments(tool, chunk.delta);
				break;
			}

			case 'response.output_item.added': {
				const item = chunk.item || {};

				if (item.type === 'function_call') {
					const key = item.id || item.call_id;
					const tool = this.getTool(key, item.call_id || item.id, item.name);

					if (item.arguments)
						this.appendToolArguments(tool, item.arguments);
				}

				break;
			}

			case 'response.output_item.done': {
				const item = chunk.item || {};

				if (item.type === 'function_call') {
					const key = item.id || item.call_id;
					const tool = this.getTool(key, item.call_id || item.id, item.name);

					if (item.arguments)
						this.appendToolArguments(tool, item.arguments);
				}

				break;
			}
		}
	}

	// ------------------------------------------------------------
	// Claude / Anthropic stream
	// ------------------------------------------------------------

	parseClaude(chunk) {
		switch (chunk.type) {
			case 'content_block_start': {
				const block = chunk.content_block || {};

				if (block.type === 'tool_use') {
					const key = block.id || `claude_${chunk.index || 0}`;
					const tool = this.getTool(key, block.id, block.name);

					if (block.input)
						this.appendToolArguments(tool, block.input);
				}

				break;
			}

			case 'content_block_delta': {
				const delta = chunk.delta || {};

				if (delta.type === 'text_delta')
					this.addContent(delta.text);

				if (delta.type === 'input_json_delta') {
					const key = `claude_${chunk.index || 0}`;
					const tool = this.getTool(key, null, null);

					this.appendToolArguments(tool, delta.partial_json);
				}

				break;
			}

			case 'message_delta': {
				const delta = chunk.delta || {};

				if (delta.stop_reason === 'tool_use')
					this.reasoning = 'tool';

				break;
			}
		}
	}

	// ------------------------------------------------------------
	// Gemini stream
	// ------------------------------------------------------------

	parseGemini(chunk) {
		const candidates = chunk.candidates || [];

		for (const candidate of candidates) {
			const parts = candidate.content?.parts || [];

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];

				if (part.text)
					this.addContent(part.text);

				if (part.functionCall) {
					const fn = part.functionCall;
					const key = `gemini_${i}_${fn.name}`;

					const tool = this.getTool(key, key, fn.name);
					this.appendToolArguments(tool, fn.args || {});
				}
			}
		}
	}

	// ------------------------------------------------------------
	// Fallback parser
	// ------------------------------------------------------------

	parseGeneric(chunk) {
		if (chunk.content)
			this.addContent(chunk.content);

		if (chunk.text)
			this.addContent(chunk.text);

		if (chunk.message?.content)
			this.addContent(chunk.message.content);

		const calls = chunk.tool_calls || chunk.tools || chunk.message?.tool_calls || [];

		for (let i = 0; i < calls.length; i++) {
			const call = calls[i];
			const fn = call.function || call;

			const tool = this.getTool(
				call.id || `generic_${i}`,
				call.id,
				fn.name
			);

			this.appendToolArguments(tool, fn.arguments || fn.args || fn.input || {});
		}
	}

	reset() {
		this.content = '';
		this.tools = [];
		this.reasoning = 'content';
		this.buffer = Buffer.alloc(0);
		this.toolmap = Object.create(null);
		return this;
	}
}

exports.parser = function(provider) {
	return new AIStreamParser(provider);
};