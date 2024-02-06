MIDDLEWARE('middleware-success', ($, next) => next());
MIDDLEWARE('middleware-invalid', ($, next) => {
    console.log('MIDDLE')
    $.invalid(400);
});
