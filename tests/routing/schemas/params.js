NEWSCHEMA('Params', function(schema) {

	schema.action('alias', {
        name: 'Alias action',
        action: function($) {
            $.callback($.params.id);
        }
    });

	schema.action('params', {
        name: 'Params action',
        action: function($) {
            $.callback($.params.id);
        }
    });

    schema.action('params2', {
        name: 'Params2 action',
        action: function($) {
            $.callback($.params.id2);
        }
    });

    schema.action('params3', {
        name: 'Params3 action',
        action: function($) {
            $.callback($.params.id3);
        }
    });
});