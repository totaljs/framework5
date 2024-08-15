MERGE('/merge1.js', '/file1.js', '/file2.js');
MERGE('/merge2.js', 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js', '/file3.js');
// MERGE('/merge3.js', '/*.js');  @TODO: Merge from wildcard oes not work
MERGE('/merge1.css', '/style.css', '/style2.css');
MERGE('/merge2.css', 'https://cdn.componentator.com/spa.min@19.css', '/style.css');
