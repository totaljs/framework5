// Total.js SourceMap generator
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

var timeout = null;

function stringify(schema) {

	if (typeof(schema) === 'string') {
		if (schema[0] !== '@')
			return schema;
		schema = F.jsonschemas[schema.substring(1)];
	}

	if (!schema)
		return undefined;

	var builder = [];
	for (let key in schema.properties) {
		let name = key;
		let meta = schema.properties[key];
		if (schema.required && schema.required.includes(key))
			name = '*' + name;

		let type = '';
		if (meta.type === 'array')
			type = '[' + meta.items.subtype + (meta.items.maxLength ? ('(' + meta.items.maxLength + ')') : '') + ']';
		else
			type = (meta.subtype || meta.type) + (meta.maxLength ? ('(' + meta.maxLength + ')') : '');

		builder.push(name + ':' + type);
	}

	return builder.join(',');
}

exports.create = function() {

	var actions = [];
	var routes = [];
	var items = [];

	for (let key in F.actions) {
		let action = F.actions[key];
		let permissions = action.permissions instanceof Array ? action.permissions.join(',') : action.permissions;
		items.push({ action: key, name: action.name, summary: action.summary, params: stringify(action.params), input: stringify(action.input), output: stringify(action.output), query: stringify(action.query), permissions: permissions, owner: action.$owner });
		actions.push({ name: key, params: stringify(action.params), input: stringify(action.input), output: stringify(action.output), query: stringify(action.query), user: action.user, permissions: permissions, public: action.public, publish: action.publish, owner: action.$owner });
	}

	for (let route of F.routes.routes) {

		let m = {};
		m.method = route.method;
		m.url = route.url2;
		m.auth = route.auth;

		if (route.params && route.params.length) {
			m.params = [];
			for (let param of route.params)
				m.params.push(param.name + ':' + param.type);
			m.params = m.params.join(',');
		}

		if (route.timeout)
			m.timeout = route.timeout;

		if (route.flags.upload) {
			m.upload = true;
			m.limit = route.size / 1024;
		}

		if (route.api) {

			for (let key in route.api) {

				let tmp = CLONE(m);
				let api = route.api[key];

				tmp.id = key;
				tmp.method = 'API';
				tmp.auth = api.auth;
				tmp.params = undefined;

				let name = (api.actions.split(',')[0] || '').replaceAll('(response)', '').trim();
				if (name) {
					let action = F.actions[name];
					if (action) {
						tmp.input = action.input;

						if (tmp.input && tmp.input[0] === '@')
							tmp.input = stringify(F.jsonschemas[tmp.input.substring(1)]);

						tmp.query = action.query;
						if (tmp.query && tmp.query[0] === '@')
							tmp.query = stringify(F.jsonschemas[tmp.query.substring(1)]);

						if (api.params && api.params.length) {
							m.params = [];
							for (let param of api.params)
								m.params.push(param.name + ':' + (param.type || 'string'));
							tmp.params = m.params.join(',');
						}
					} else
						tmp.error = 'Action not found';
				} else
					tmp.error = 'Action not found';
				routes.push(tmp);
			}

			continue;
		}

		routes.push(m);
	}

	for (let route of F.routes.websockets) {

		let m = {};

		m.method = 'SOCKET';
		m.url = route.url2;
		m.auth = route.auth;

		if (route.params && route.params.length) {
			m.params = [];
			for (let param of route.params)
				m.params.push(param.name + ':' + param.type);
			m.params = m.params.join(',');
		}

		routes.push(m);
	}

	var output = {};

	output.routes = routes;
	output.plugins = [];
	output.actions = actions;

	for (let key in F.plugins) {
		let plugin = F.plugins[key];
		let permissions = [];
		if (plugin.permissions instanceof Array) {
			for (let permission of plugin.permissions)
				permissions.push(permission.id || permission);
		}
		output.plugins.push({ id: key, name: plugin.name, permissions: permissions.join(',') });
	}

	return output;
};

exports.refresh = function() {

	if (!F.isloaded || !F.config.$sourcemap || F.id)
		return;

	timeout && clearTimeout(timeout);
	timeout = setTimeout(() => F.Fs.writeFile(process.mainModule.filename + '.map', JSON.stringify(F.sourcemap(), (key, value) => value == '' || value == null ? undefined : value, '\t'), NOOP), 1000);
};
