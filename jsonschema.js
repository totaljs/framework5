// Total.js JSONSchemas
// The MIT License
// Copyright 2021-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

require('./index');

const REG_NUMBER = /[\d,.]+/;
const REG_COLOR = /^#([A-F0-9]{3}|[A-F0-9]{6}|[A-F0-9]{8})$/i;
const REG_ICON = /^(ti|far|fab|fad|fal|fas|fa)?\s(fa|ti)-[a-z0-9-]+$/;
const REG_WSPACE = /\u00A0/g;

function Value() {}

function check_string(meta, error, value, errplus, path) {

	var type = typeof(value);

	if (type !== 'string')
		value = value ? (value + '') : null;

	if (errplus == null)
		errplus = '';

	if (value) {
		switch (meta.subtype) {
			case 'name':
				value = value.toName();
				break;
		}
	}

	if (meta.$$REQUIRED && !value) {
		error.push2(errplus + meta.$$ID, path);
		return;
	}

	if (value == null)
		return;

	var len = value.length;

	if (meta.maxLength && len > meta.maxLength) {
		error.push2(errplus + meta.$$ID, path);
		return;
	}

	if (meta.minLength && len < meta.minLength) {
		error.push2(errplus + meta.$$ID, path);
		return;
	}

	if (value) {
		value = value.replace(REG_WSPACE, ' ');
		switch (meta.subtype) { 
			case 'text':
				break;
			case 'email':
				value = value.replace(/\s/g, '').toLowerCase();
				if (value && !value.isEmail()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'safestring':
				value = value.trim();
				if (value && (value.isXSS() || value.isSQLInjection())) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'search':
				value = value.trim().toSearch();
				break;
			case 'phone':
				value = value.replace(/\s/g, '').toLowerCase();
				if (value && !value.isPhone()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'url':
				value = value.trim();
				if (value && !value.isURL()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'zip':
				value = value.trim();
				if (value && !value.isZIP()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'guid':
				value = value.trim();
				if (value && !value.isGUID()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				} else if (!value)
					value = null;
				break;
			case 'uid':
				value = value.trim();
				if (value && !value.isUID()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				} else if (!value)
					value = null;
				break;
			case 'ipaddress':
			case 'ip':
				value = value.trim();
				if (value && !F.Net.isIP(value)) {
					error.push2(errplus + meta.$$ID, path);
					return;
				} else if (!value)
					value = null;
				break;
			case 'json':
				value = value.trim();
				if (value && !value.isJSON()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'base64':
				value = value.trim();
				if (value && !value.isBase64()) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'color':
				value = value.trim();
				if (value && !REG_COLOR.test(value)) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'icon':
				value = value.trim();
				if (value && !REG_ICON.test(value)) {
					error.push2(errplus + meta.$$ID, path);
					return;
				}
				break;
			case 'lower':
			case 'lowercase':
				value = value.trim().toLowerCase();
				break;
			case 'upper':
			case 'uppercase':
				value = value.trim().toUpperCase();
				break;
			case 'capitalize':
				value = value.trim().capitalize();
				break;
			case 'capitalize2':
				value = value.trim().capitalize(true);
				break;
			default:
				value = value.trim();
				break;
		}
	}

	if ((value || meta.$$REQUIRED) && meta.enum instanceof Array) {
		if (!meta.enum.includes(value)) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	return value;
}

function check_number(meta, error, value, errplus, path) {

	var type = typeof(value);

	if (errplus == null)
		errplus = '';

	if (type === 'string') {
		if (REG_NUMBER.test(value))
			value = value.parseFloat();
		else
			value = null;

	} else if (type !== 'number')
		value = null;

	if (meta.$$REQUIRED) {
		if (value == null) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	if (value == null)
		return;

	if (meta.multipleOf) {
		if (value % meta.multipleOf !== 0) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	if (meta.maximum) {
		if (value > meta.maximum) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	if (meta.exclusiveMaximum) {
		if (value >= meta.exclusiveMaximum) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	if (meta.minimum) {
		if (value < meta.minimum) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	switch (meta.subtype) {
		case 'smallint':
			if (value < -32767 || value > 32767) {
				error.push2(errplus + meta.$$ID, path);
				return;
			}
			break;
		case 'tinyint':
			if (value < 0 || value > 255) {
				error.push2(errplus + meta.$$ID, path);
				return;
			}
			break;
	}

	if (meta.exclusiveMinimum) {
		if (value <= meta.exclusiveMinimum) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	return value;
}

function check_boolean(meta, error, value, errplus, path) {

	var type = typeof(value);
	if (type !== 'boolean')
		value = value ? (value + '').parseBoolean() : null;

	if (meta.$$REQUIRED) {

		if (errplus == null)
			errplus = '';

		if (value == null) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	if (value != null)
		return value;
}

function check_date(meta, error, value, errplus, path) {

	if (!(value instanceof Date))
		value = value ? (value + '').parseDate() : null;

	if (value && value instanceof Date && !(value.getTime()>0))
		value = null;

	if (meta.$$REQUIRED) {

		if (errplus == null)
			errplus = '';

		if (value == null) {
			error.push2(errplus + meta.$$ID, path);
			return;
		}
	}

	return value;
}

function readdef(ref, definitions) {

	if (ref[0] === '#') {
		var tmp = ref.substring(2).split('/');
		var def = definitions[tmp[0]];
		if (def) {
			var schema = tmp[1];
			var obj = def[schema];
			if (obj) {
				if (!obj.$$ID)
					obj.$$ID = schema;
				return obj;
			}
		}
	} else
		return F.jsonschemas[ref];
}

function check_array(meta, error, value, stop, definitions, path) {

	if (!(value instanceof Array)) {
		if (meta.$$REQUIRED) {
			error.push2(meta.$$ID, path);
		}
		return;
	}

	if (!value.length) {
		if (meta.$$REQUIRED) {
			error.push2(meta.$$ID, path);
			return;
		}
		return value;
	}

	var currentpath = path;
	var response;
	var tmp;

	if (meta.items instanceof Array) {

		for (var i = 0; i < value.length; i++) {
			var val = value[i];
			var type = meta.items[i];
			if (type) {
				switch (type) {
					case '$ref':
						break;
					case 'number':
					case 'integer':
					case 'float':
					case 'decimal':
						tmp = check_number(type, error, val);
						if (tmp != null) {
							response.push(tmp);
							break;
						} else {
							error.push2(meta.$$ID, currentpath);
							return;
						}
					case 'boolean':
					case 'bool':
						tmp = check_boolean(type, error, val);
						if (tmp != null) {
							response.push(tmp);
							break;
						} else {
							error.push2(meta.$$ID, currentpath);
							return;
						}
					case 'date':
						tmp = check_date(type, error, val);
						if (tmp != null) {
							response.push(tmp);
							break;
						} else {
							error.push2(meta.$$ID, currentpath);
							return;
						}
					case 'object':
						tmp = check_object(type, error, val, null, stop, definitions);
						if (tmp != null) {
							response.push(tmp);
							break;
						} else {
							error.push2(meta.$$ID, currentpath);
							return;
						}
					case 'array':
						tmp = check_array(type, error, value, null, definitions);
						if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1)) {
							response.push(tmp);
							break;
						} else {
							error.push2(meta.$$ID, currentpath);
							return;
						}
					case 'string':
					default:
						tmp = check_string(type, error, val, null, currentpath);
						if (tmp != null) {
							if (!tmp && type.subtype === 'uid')
								tmp = null;
							response.push(tmp);
							break;
						} else {
							error.push2(meta.$$ID, currentpath);
							return;
						}
				}
			} else if (!type && !meta.additionalItems) {
				error.push2(meta.$$ID, currentpath, i);
				return;
			}
		}
	} else if (meta.items) {

		response = [];

		for (var i = 0; i < value.length; i++) {
			var val = value[i];

			if (meta.items.$ref) {
				var ref = typeof(meta.items.$ref) === 'object' ? meta.items.$ref :readdef(meta.items.$ref, definitions);
				if (ref) {
					var newerror = new F.ErrorBuilder();
					tmp = transform(ref, newerror, val, false, currentpath + '[' + i + ']');
					if (newerror.items.length) {
						for (var err of newerror.items) {
							error.push2(err.name, err.path, i);
						}
					} else if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1))
						response.push(tmp);
					continue;
				} else
					continue;
			}


			switch (meta.items.type) {
				case 'number':
				case 'integer':
					tmp = check_number(meta.items, error, val, null, currentpath);
					if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1))
						response.push(tmp);
					break;
				case 'boolean':
				case 'bool':
					tmp = check_boolean(meta.items, error, val, null, currentpath);
					if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1))
						response.push(tmp);
					break;
				case 'date':
					tmp = check_date(meta.items, error, val, null, currentpath);
					if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1))
						response.push(tmp);
					break;
				case 'object':
					var newerror = new ErrorBuilder();
					tmp = check_object(meta.items, newerror, val, stop, definitions, currentpath);
					if (newerror.length) {
						for (var err of newerror.items)
							error.push2(meta.$$ID + '.' + err.name, err.error, currentpath, i);
					} else if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1))
						response.push(tmp);
					break;
				case 'array':
					tmp = check_array(meta.items, error, value, stop, definitions, currentpath);
					if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1))
						response.push(tmp);
					break;
				case 'string':
				default:
					tmp = check_string(meta.items, error, val, null, currentpath);
					if (tmp != null && (!meta.uniqueItems || response.indexOf(tmp) === -1)) {
						if (!tmp && meta.items.subtype === 'uid')
							tmp = null;
						response.push(tmp);
					}
					break;
			}
		}
	} else
		response = meta.uniqueItems ? [...new Set(value)] : value;

	if (!response.length && meta.$$REQUIRED) {
		error.push2(meta.$$ID, currentpath);
		return;
	}

	if (meta.minItems && response.length < meta.minItems) {
		error.push2(meta.$$ID, currentpath);
		return;
	}

	if (meta.maxItems && response.length < meta.maxItems) {
		error.push2(meta.$$ID, currentpath);
		return;
	}

	return response;
}

function check_object(meta, error, value, response, stop, definitions, path) {

	if (!value || typeof(value) !== 'object') {
		if (meta.$$REQUIRED) {
			error.push(meta.$$ID, path);
		}
		return;
	}

	if (stop && error.items.length)
		return;

	if (!meta.properties)
		return value;

	if (!response)
		response = new Value();

	var count = 0;
	var tmp;

	for (var key in meta.properties) {

		var prop = meta.properties[key];

		if (!prop.ID) {
			prop.$$ID = key;
			prop.$$REQUIRED = meta.required ? meta.required.indexOf(key) !== -1 : false;
		}

		if (stop && error.items.length)
			return;

		if (meta.maxProperties && count > meta.maxProperties) {
			error.push(meta.$$ID, path);
			return;
		}

		var currentpath = (path ? (path + '.') : '') + key;
		var val = value[key];

		switch (prop.type) {
			case 'number':
			case 'integer':
				tmp = check_number(prop, error, val, null, currentpath);
				if (tmp != null) {
					response[key] = tmp;
					count++;
				}
				break;
			case 'boolean':
			case 'bool':
				tmp = check_boolean(prop, error, val, null, currentpath);
				if (tmp != null) {
					response[key] = tmp;
					count++;
				}
				break;
			case 'date':
				tmp = check_date(prop, error, val, null, currentpath);
				response[key] = tmp;
				count++;
				break;
			case 'string':
				tmp = check_string(prop, error, val, null, currentpath);
				if (tmp != null) {

					if (!tmp && prop.subtype === 'uid')
						tmp = null;

					response[key] = tmp;
					count++;
				}
				break;
			case 'object':

				if (prop.properties) {
					tmp = check_object(prop, error, val, null, null, definitions, currentpath);
					if (tmp != null) {
						response[key] = tmp;
						count++;
					}
				} else {

					// check ref
					if (prop.$ref) {
						var ref = typeof(prop.$ref) === 'object' ? prop.$ref : readdef(prop.$ref, definitions);
						if (ref) {
							var newerror = new F.ErrorBuilder();
							tmp = transform(ref, newerror, val, false, currentpath);
							if (newerror.items.length) {
								for (var err of newerror.items) {
									error.push2(err.name, err.path);
								}
							} else
								response[key] = tmp;
							continue;
						} else
							continue;
					}

					response[key] = val;
					count++;
				}
				break;
			case 'array':
				tmp = check_array(prop, error, val, null, definitions, currentpath);
				if (tmp != null) {
					response[key] = tmp;
					count++;
				}
				break;
			default:
				if (prop.$ref) {
					var ref = F.jsonschemas[prop.$ref];
					if (ref) {
						tmp = check_object(ref, error, val, null, null, definitions, currentpath);
						if (tmp != null) {
							response[key] = tmp;
							count++;
						} else if (prop.$$REQUIRED)
							error.push2(prop.ID, currentpath);
					} else
						error.push2(prop.ID, currentpath);
				} else {
					// String
					tmp = check_string(prop, error, val, null, currentpath);
					if (tmp != null) {
						if (!tmp && prop.subtype === 'uid')
							value = null;
						response[key] = tmp;
						count++;
					}
				}
				break;
		}
	}

	if (meta.minProperties && count < meta.minProperties) {
		error.push2(meta.$$ID, path);
		return;
	}

	if (count)
		return response;
}

function transform(meta, error, value, stop, path) {

	var output;

	switch (meta.type) {
		case 'string':
			output = check_string(meta, error, value, null, path);
			break;
		case 'number':
		case 'integer':
		case 'float':
		case 'decimal':
			output = check_number(meta, error, value, null, path);
			break;
		case 'boolean':
		case 'bool':
			output = check_boolean(meta, error, value, null, path);
			break;
		case 'date':
			output = check_date(meta, error, value, null, path);
			break;
		case 'object':
			output = check_object(meta, error, value, null, stop, meta, path);
			break;
		case 'array':
			output = check_array(meta, error, value, stop, meta, path);
			break;
		default:
			error.push2('.type', path);
			return;
	}

	if (stop && error.length)
		return;

	return output || {};
}

function register(schema) {
	if (schema.$id)
		F.jsonschemas[schema.$id] = schema;
}

exports.register = register;
exports.transform = transform;