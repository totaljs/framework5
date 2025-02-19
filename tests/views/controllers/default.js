exports.install = function() {
    ROUTE('GET /view/basic/', basic_page);
    ROUTE('GET /view/common/', common_page);
};

function basic_page($) {
	var view;
	var cmd = $.query.cmd || 'basic';
	var model = {};

	switch (cmd) {
		case 'basic':
			view = 'index';
			break;
		case 'nested':
			view = 'nested/index';
			break;
		case 'layout':
			view = 'index';
			break;
		case 'partial':
			view = 'index';
			break;
		case 'layout-custom':
			$.layout('layout-custom');
			view = 'index';
			break;
		case 'repository':
			view = 'repository';
			$.view(view).repository.name = 'Peter Sirka';
			return;
			break;
		case 'model':
			model.name = 'Louis Bertson';
			view = 'model';
			break;
		case 'view':
			view = 'view';
			break;
		case 'view-multiline':
			view = 'view-multiline';
			break;

	}

	if (model)
    	$.view(view, model);
	else
		$.view(view);
}



function common_page($) {
	var view;
	var cmd = $.query.cmd || 'common';
	var model = {};

	switch (cmd) {
		case 'escaping':
			view = 'escaping';
			break;
		case 'conditions':
			view = 'conditions';
			break;
		case 'looping-array':
			view = 'looping-array';
			break;
		case 'looping-object':
			view = 'looping-object';
			break;
		case 'static':
			view = 'static';
			break;
		case 'import':
			view = 'import';
			break;
		case 'assignment':
			view = 'assignment';
			break;
		case 'config':
			view = 'config';
			break;
		case 'text':
			view = 'text';
			break;
		case 'sections':
			$.layout('sections-layout');
			view = 'sections';
			break;
		case 'layout-custom':
			$.layout('layout-custom');
			view = 'index';
			break;
		case 'repository':
			view = 'repository';
			$.view(view).repository.name = 'Peter Sirka';
			return;
			break;
		case 'model':
			model.name = 'Louis Bertson';
			view = 'model';
			break;
		case 'view':
			view = 'view';
			break;
		case 'view-multiline':
			view = 'view-multiline';
			break;

	}

	if (model)
    	$.view(view, model);
	else
		$.view(view);
}
