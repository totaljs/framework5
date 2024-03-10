NEWACTION('Actions/query', {
    name: 'Query action',
    action: function($) {
        $.success();
    }
});

NEWACTION('Actions/read', {
    name: 'Read action',
    params: 'id:UID',
    action: function ($) {
        $.success(true);
    }
});


NEWACTION('Actions/insert', {
    name: 'Insert action',
    input: 'name:String,email:Email,age:Number',
    action: function($, model) {
        $.success(model);
    }
});

NEWACTION('Actions/update', {
    name: 'Update action',
    input: 'name:String,email:Email,age:Number',
    params: 'id:UID',
    action: function($, model) {
        $.success(model);
    }
});



NEWACTION('Actions/remove', {
    name: 'Remove action',
    params: 'id:UID',
    action: function($) {
        $.success();
    }
});