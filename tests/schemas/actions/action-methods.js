NEWACTION('Methods/query',  {
	name: 'Query action',
	action: function($) {
		$.success([]);
	}
});
NEWACTION('Methods/query', {
	name: 'Read action',
	params: 'id:UID',
	action: function($) {
		$.success([]);
	}
});

NEWACTION('Methods/insert', {
    name: 'Insert action',
    action: function($, model) {
        $.success(model);
    }
});


NEWACTION('Methods/patch', {
    name: 'Patch action',
    input: 'value:String',
    params: 'id:UID',
    action: function($, model, id) {
        $.success(model);
    }
});

NEWACTION('Methods/update', {
    name: 'Patch action',
    input: 'value:String',
    params: 'id:UID',
    action: function($, model, id) {
        $.success(model);
    }
});


NEWACTION('Methods/remove', {
	name: 'Remove action',
	params: 'id:UID',
	action: function($, id) {
		$.success();
	}
});