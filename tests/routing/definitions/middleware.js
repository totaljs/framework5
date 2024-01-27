MIDDLEWARE('testmiddleware', ($, next) => next());
MIDDLEWARE('testmiddleware2', ($, next) => $.invalid(400));
