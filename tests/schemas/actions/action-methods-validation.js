NEWACTION('Validation/exec', {
    name: 'Exec action',
    input: '*email:Email',
    action: function($, email) {
        $.success();
    }
});