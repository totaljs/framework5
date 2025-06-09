# Creating a New Plugin

This guide outlines the process of creating a new Total.js plugin within the application. Plugins are self-contained modules that extend the Total.js application's functionality. They typically consist of server-side logic for handling data and API requests, and client-side HTML and JavaScript for the user interface.

## Plugin Structure

A typical plugin resides in its own directory within `app/plugins/`. For a plugin named `todo`, the structure would be:

```
app/
	plugins/
		todo/                   # Root directory for your plugin
			index.js            # Main plugin definition (server-side) with actions
			public/             # Directory for client-side assets
				index.html      # Main view for the plugin (e.g., listing items)
				form.html       # Form for creating/editing items
```

## 1. `index.js` (Server-Side plugin definition)

This file serves as the entry point for your plugin on the server. It defines metadata, registers API routes, and sets up permissions. The plugin identifier is the plugin filename without the `.js` extension.

```javascript
exports.name = '@(Todo)';
// A plugin name. The markup "@(your_text)" is automatically localized. It's the Total.js localization markup.

exports.icon = 'ti ti-check';
// A plugin icon.

exports.position = 1;
 // A position index in the navigation.

exports.hidden = false;
// Although this property "exports.hidden" can hide the plugin in the menu, but it will still be evaluated on the client side.

exports.import = 'extensions.html';
// Optional. This property can contain a file name from the "plugin/todo/public/" folder. The client-side library imports that file while the web app loads. It's intended for very specific cases, and most plugins don't use it.

exports.visible = function(user) {
	// In this handler, we can check the permissions for accessing this plugin on the client side. It's superior to the "exports.hidden" property.
	// IMPORTANT: The "user.sa {Boolean}" or "user.su {Boolean}" sees everything.
	return user.sa || user.permissions.includes('myitems_view');
};

exports.permissions = [{ id: 'myitems_view', name: 'View My Items' }, { id: 'myitems_edit', name: 'Edit My Items' }];
// A custom permissions, It's only targeted for the Total.js OpenPlatform (SSO portal).

exports.install = function() {
	// Some specific routes can be defined here, such as file handlers and uploading.
};
```

__Syntax__:

- **`exports.name`** `String`: The display name of the plugin, we use localization markup in the `@(Plugin name)`.
- **`exports.icon`** `String`: Sets the icon displayed in the UI in the form `ti ti-icon_name`.
- **`exports.position`** `Number`: Determines the order in the navigation menu.
- **`exports.visible`** `Function(user_session)`: A function that returns `true` or `false` to control main visibility based on user properties (e.g., `user.sa` for super admin, `user.permissions`).
- **`exports.permissions`** `Object Array`: (Optional) An array of objects defining new permissions that this plugin introduces. Each object should have an `id` and a `name`.
- **`exports.hidden`** `Boolean`: Hides the plugin in the navigation on the client-side.
- **`exports.install`** `Function()`: This function is crucial for setting up special routes using the `ROUTE()`.

## Plugin example

```javascript
exports.name = '@(Todo)';
exports.icon = 'ti ti-check';
exports.position = 1;
exports.visible = user => user.permissions.includes('todo');
exports.permissions = [{ id: 'todo', name: 'ToDo' }];

// Action example
NEWACTION('Todo|list', {
	name: 'List of tasks',
	route: '+API ?',
	action: async function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		// It creates a list with pagination and filtering and sorting of the fields defined in the .autoquery() method.
		let response = await DATA.list('tbl_todo').autoquery($.query, 'id:String, name:String, body:String, iscompleted:Boolean, createdby:String, updatedby:String, completedby:String, dtcompleted:Date, dtcreated:Date, dtupdated:Date', 'dtcreated_desc', 100).promise($);

		$.callback(response);

	}
});
```