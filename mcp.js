require('./index');

const ADMIN = { id: 'ai', name: 'AI', sa: true };

// MCP router
// The MIT License
// Copyright 2026 (c) Peter Širka <petersirka@gmail.com> | Total.js
// Version: 2

/*
	// Supports: input, query, params, output
	// Field comments (// ...) are used as tool argument descriptions and as validation messages
	NEWACTION('Name', {
		mcp: true,
		input: '*name:String // User name',
		action: function($, model) {

		}
	});

	// tools/call arguments: { input: {}, query: {}, params: {} }
*/

Total.mcp = {};
Total.mcp.tools = [];
Total.mcp.map = {};
Total.mcp.versions = ['2025-11-25', '2025-06-18', '2025-03-26'];

Total.mcp.auth = function($) {
	$.success(ADMIN);
};

// Total.js schema types that are not valid JSON Schema types
function jstype(type) {
	return type === 'date' ? 'string' : (type || 'string');
}

// MCP tool names are limited to [A-Za-z0-9_.-] (clients such as Claude accept up to 64 chars: [A-Za-z0-9_-]),
// so "Notes|create" is exposed as "Notes_create"
function toolname(key) {
	return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
}

// Converts a parsed Total.js schema (jsinput, jsquery, jsparams, jsoutput) into JSON Schema
function convert(schema, forceString) {

	let properties = {};

	for (let key in schema.properties || {}) {

		let prop = schema.properties[key];
		let tmp = {};

		tmp.type = forceString ? 'string' : jstype(prop.type);

		if (!forceString) {
			if (prop.type === 'date')
				tmp.format = 'date-time';
			else if (prop.subtype === 'email')
				tmp.format = 'email';
		}

		if (prop.type === 'array' && prop.items && !forceString)
			tmp.items = { type: jstype(prop.items.type) };

		if (prop.enum)
			tmp.enum = prop.enum;

		if (prop.nullable && !forceString)
			tmp.type = [tmp.type, 'null'];

		let description = (schema.errors && schema.errors[key]) || prop.summary || prop.description;
		if (description)
			tmp.description = description;

		properties[key] = tmp;
	}

	return properties;
}

function section(properties, required, name, schema, description, forceString) {
	properties[name] = {
		type: 'object',
		description: description,
		properties: convert(schema, forceString)
	};
	if (schema.required && schema.required.length) {
		properties[name].required = schema.required;
		required.push(name);
	}
}

function rpcerror($, response, code, message) {
	response.error = { code: code, message: message };
	$.json(response);
}

function toolerror(response, message) {

	if (typeof(message) !== 'string')
		message = message == null ? 'Tool execution failed' : String(message);

	response.result = {
		content: [{ type: 'text', text: message }],
		isError: true
	};
}

function initroute() {

	if (Total.mcp.route) {
		Total.mcp.route.remove();
		Total.mcp.route = null;
	}

	if (!CONF.$mcp)
		return;

	Total.mcp.route = ROUTE('POST /$mcp/ <10MB', function($) {

		let data = $.body;
		let response = {};

		if (token) {
			let auth = ($.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
			if (auth !== token) {
				let opt = new F.TBuilders.Options($);
				opt.TYPE = 'auth';
				opt.query = $.query;
				opt.next = opt.callback;
				opt.token = opt.auth = auth;
				opt.$callback = function(err, response) {
					if (err) {
						$.response.status = 401;
						$.json({
							jsonrpc: '2.0',
							id: data && data.id !== undefined ? data.id : null,
							error: { code: -32001, message: 'Unauthorized' }
						});
					} else {
						$.user = response;
						Total.mcp.exec($);
					}
				};
				Total.mcp.auth(opt);
				return;
			}
		}

		Total.mcp.exec($);
	});
};

Total.mcp.exec = async function($) {

	let data = $.body;

	if (!data || data instanceof Array || typeof(data) !== 'object') {
		$.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' }});
		return;
	}

	// Notifications do not have an id and MUST NOT receive a response.
	if (data.id === undefined) {
		$.response.status = 202;
		$.plain('');
		return;
	}

	response.jsonrpc = '2.0';
	response.id = data.id;

	if (data.jsonrpc !== '2.0' || typeof(data.method) !== 'string') {
		rpcerror($, response, -32600, 'Invalid Request');
		return;
	}

	if (data.method === 'initialize') {
		let requested = data.params && data.params.protocolVersion;
		response.result = {
			protocolVersion: Total.mcp.versions.includes(requested) ? requested : Total.mcp.versions[0],
			capabilities: {
				tools: {}
			},
			serverInfo: {
				name: CONF.name,
				version: CONF.version
			}
		};
		$.json(response);
		return;
	}

	if (data.method === 'server/discover') {
		response.result = {
			supportedVersions: ['2026-07-28'],
			capabilities: {
				tools: {}
			},
			_meta: {
				"io.modelcontextprotocol/serverInfo": {
					name: CONF.name,
					version: CONF.version
				}
			}
		};
		$.json(response);
		return;
	}

	if (data.method === 'ping') {
		response.result = {};
		$.json(response);
		return;
	}

	if (data.method === 'tools/list') {
		response.result = {
			tools: Total.mcp.tools
		};
		$.json(response);
		return;
	}

	if (data.method === 'tools/call') {

		let params = data.params || {};

		if (!params || typeof(params) !== 'object' || typeof(params.name) !== 'string') {
			rpcerror($, response, -32602, 'Invalid tools/call parameters');
			return;
		}

		let args = params.arguments || {};
		let key = Total.mcp.map[params.name];
		let action = key && Total.actions[key];

		if (!action || !action.mcp) {
			rpcerror($, response, -32602, 'Unknown tool: ' + params.name);
			return;
		}

		if (args == null || typeof(args) !== 'object' || Array.isArray(args)) {
			rpcerror($, response, -32602, 'Tool arguments must be an object');
			return;
		}

		let input = Object.prototype.hasOwnProperty.call(args, 'input') ? args.input : args.data;
		let builder = ACTION(key, input);

		if (args.query)
			builder.query(args.query);

		if (args.params)
			builder.params(args.params);

		builder.user({ sa: true, name: 'AI' });

		let errors = null;

		try {
			builder.options.error = err => errors = err.output();
			let output = await builder.promise();

			let text = typeof(output) === 'string' ? output : JSON.stringify(output);
			if (text == null)
				text = String(output);

			response.result = {
				content: [{ type: 'text', text: text }]
			};

			// In protocol version 2025-11-25 structuredContent must be a JSON object.
			// Keep the text representation for scalars, arrays and null values.
			if (output && typeof(output) === 'object' && !Array.isArray(output))
				response.result.structuredContent = output;

		} catch (e) {
			// Tool errors (validation, $.invalid) are reported inside the result so the model can react to them
			toolerror(response, errors ? JSON.stringify(errors) : e.toString());
		}

		$.json(response);
		return;
	}

	rpcerror($, response, -32601, 'Method not found: ' + data.method);
};

Total.mcp.refreshforce = function() {

	Total.mcp.timeout = null;
	Total.mcp.tools.length = 0;
	Total.mcp.map = {};

	for (let key in Total.actions) {

		let action = Total.actions[key];
		if (!action.mcp)
			continue;

		let obj = {};
		obj.name = toolname(key);
		Total.mcp.map[obj.name] = key;
		obj.description = action.summary || action.name;

		let properties = {};
		let required = [];

		if (action.jsinput)
			section(properties, required, 'input', action.jsinput, 'Payload (request body) passed to this action.');

		if (action.jsquery)
			section(properties, required, 'query', action.jsquery, 'URL query parameters passed to this action.');

		if (action.jsparams)
			section(properties, required, 'params', action.jsparams, 'URL params passed to this action.', true);

		obj.inputSchema = {
			type: 'object',
			properties: properties,
			required: required
		};

		if (action.jsoutput) {
			obj.outputSchema = {
				type: 'object',
				properties: convert(action.jsoutput),
				required: action.jsoutput.required || EMPTYARRAY
			};
		}

		Total.mcp.tools.push(obj);
	}

};

Total.mcp.refresh = function() {
	Total.mcp.timeout && clearTimeout(Total.mcp.timeout);
	Total.mcp.timeout = setTimeout(Total.mcp.refreshforce, 200);
};

ON('ready', initroute);
ON('configure', initroute);