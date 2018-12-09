"use strict";

const
    http = require('http'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

var contentTypesByExtension = {
    '.html': "text/html",
    '.css': "text/css",
    '.js': "text/javascript",
    '.jpg': "image/jpeg",
    '.png': "image/png",
    '.gif': "image/gif"
};

var server = http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);
    fs.stat(filename, function(err, stats) {
        if (err) {
            response.writeHead(404);
            response.write("Can't find " + uri);
            response.end();
        } else {
            if (stats.isDirectory()) {
                filename += "/index.html";
            }
            fs.readFile(filename, 'binary', function(err, file) {
                if (err) {
                    response.writeHead(404);
                    response.write("Can't find " + uri);
                    response.end();
                } else {
                    response.writeHead(200, {'Content-Type': contentTypesByExtension[path.extname(filename)]});
                    response.write(file, 'binary');
                    response.end();
                }
            });
        }
    });
});

server.listen(process.env.PORT || 5000, function(){
    console.log('ready captain!');
});