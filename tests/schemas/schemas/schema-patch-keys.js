NEWSCHEMA('PatchKeys', function(schema) {

    schema.action('exec', {
        name: 'Patch keys operation',
        input: 'valid:String,*valid_required:String',
        action: function($, model) {
            $.success({ keys: $.keys, model: model });
        }
    })
});