var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var qs = require('querystring');

server = null;

module.exports = {
  listen: function(port, cb) {
    return server = http.createServer(function(req, res) {
      var parsedUrl, queries, resError;
      resError = function(error) {
        res.writeHead(500);
        res.end('Error');
        if (error != null) {
          return cb(error);
        }
      };
      parsedUrl = url.parse(req.url);
      if (parsedUrl.path === '/') {
        return fs.readFile(path.resolve(__dirname, 'auth.html'), function(err, data) {
          if (err) {
            return resError(err);
          }
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': data.length
          });
          res.write(data);
          return res.end('Success');
        });
      } else if (parsedUrl.query != null) {
        queries = qs.parse(parsedUrl.query);
        if (queries.access_token == null) {
          return resError(new Error('Unexpected parameter'));
        }
        res.writeHead(200);
        res.end('Success');
        return cb(null, queries.access_token);
      } else {
        return resError();
      }
    }).listen(port);
  },
  close: function() {
    return server != null ? server.close() : void 0;
  }
};
