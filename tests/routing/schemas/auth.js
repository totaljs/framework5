NEWSCHEMA('Auth', function(schema) {
    schema.action('exec', {
        name: 'Execution action',
        action: function($) {

            if ($.user)
                $.success('123');
            else
                $.success();
        }
    });
});
