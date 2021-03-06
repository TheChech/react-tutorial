/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var swig = require('swig');
var strategy = require('react-validatorjs-strategy');
var schemas = require('./components/schemas');

require('node-jsx').install();
var components = require('./components/server');

var app = express();

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.set('view cache', false);

var COMMENTS_FILE = path.join(__dirname, 'comments.json');

app.set('port', (process.env.PORT || 3000));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function(req, res) {
  fs.readFile(COMMENTS_FILE, function(err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    res.render('index', {
      commentBox: components.renderCommentBox({
        comments: JSON.parse(data)
      })
    });
  });
});

// Additional middleware which will set headers that we need on each /api request.
app.use(function(req, res, next) {
    // Set permissive CORS header - this allows the api routes to be used only as
    // an API server in conjunction with something like webpack-dev-server.
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Disable caching so we'll always get the latest comments.
    res.setHeader('Cache-Control', 'no-cache');
    next();
});

app.get('/api/comments', function(req, res) {
  fs.readFile(COMMENTS_FILE, function(err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    res.json(JSON.parse(data));
  });
});

app.post('/api/comments', function(req, res, next) {
  // Validate the request and if it fails, call the error handler
  strategy.validateServer(req.body, schemas.commentForm).then(() => {
    fs.readFile(COMMENTS_FILE, function(err, data) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      var comments = JSON.parse(data);
      // NOTE: In a real implementation, we would likely rely on a database or
      // some other approach (e.g. UUIDs) to ensure a globally unique id. We'll
      // treat Date.now() as unique-enough for our purposes.
      var newComment = {
        id: Date.now(),
        author: req.body.author,
        text: req.body.text,
      };
      comments.push(newComment);
      fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 4), function(err) {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        res.json(comments);
      });
    });
  })
  .catch(next);
});

/**
 * If a validation error, output a 400 JSON response containing the error messages.
 * Otherwise, use the default error handler.
 */
app.use(function(err, req, res, next) {
  if (err instanceof strategy.Error) {
    res.status(400).json(err.errors);
  } else {
    next(err, req, res);
  }
});

app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});
