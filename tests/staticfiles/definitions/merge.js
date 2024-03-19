MERGE('/merge1.js', '/file1.js', '/file2.js');
MERGE('/merge2.js', 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js', '/file3.js');
// MERGE('/merge3.js', '/*.js');  @TODO: Merge from wildcard oes not work 
MERGE('/merge4.js', '=/modern/file1.js', '=modern/file2.js');
MERGE('/merge5.js', 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js', '=modern/file3.js');