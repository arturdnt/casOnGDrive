/**
 * By H.
 */

var express = require('express');
var app = express();
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');


// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/drive'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/credentials/';
var TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json';
var oauth2Client;
// Load client secrets from a local file.
fs.readFile(__dirname + '/client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Drive API.
    authorize(JSON.parse(content));
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            //callback(oauth2Client);
        }
    });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.post('/save', function (req, res) {
    var drive = google.drive({ version: 'v3', auth: oauth2Client });
    if (!req.folderID) {
        var fileMetadata = {
            'name': 'newsletters-' + (new Date()).getFullYear(),
            'mimeType': 'application/vnd.google-apps.folder'
        };
        drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        }, function (err, file) {
            if (err) {
                // Handle error
                console.log(err);
            } else {
                console.log('Folder Id: ', file.id);
                uploadNewHtml(req, res, drive, file.id)
            }
        });
    } else {
        uploadNewHtml(req, res, drive, req.folderID)
    }
});

function uploadNewHtml(req, res, drive, folderId) {
    var fileName = req.fileName || "testHtml.html";
    var fileContent = req.fileContent || '<!DOCTYPE html><html><head><title>TEST FILE</title></head><body>This is a test file</body></html>';
    var file = drive.files.create({
        resource: {
            name: fileName,
            mimeType: 'text/html',
            parents: [folderId]
        },
        media: {
            mimeType: 'text/html',
            body: fileContent
        }
    }, function (err, result, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else {
            console.log('HTML result: ' + JSON.stringify(result));
            console.log('HTML response: ' + JSON.stringify(response));
            console.log("{'fileID': " + response.body.id + ",'folderID':" + folderId + "}");
            res.send({ 'fileID': response.body.id, 'folderID': folderId });
        }
    });
}

app.put('/save', function (req, res) {
    var drive = google.drive({ version: 'v3', auth: oauth2Client });
    var fileName = req.fileName || "testHtml.html";
    var fileContent = req.fileContent || '<!DOCTYPE html><html><head><title>TEST FILE</title></head><body>This is a test file</body></html>';
    var file = drive.files.update({
        fileId: '0B0ziosBFY0PSYkNMZGdmaVVxbms',
        resource: {
            name: fileName,
            mimeType: 'text/html'
        },
        media: {
            mimeType: 'text/html',
            body: fileContent
        }
    }, function (err, result, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else {
            console.log('HTML result: ' + JSON.stringify(result));
            console.log('HTML response: ' + JSON.stringify(response));
            console.log("{'fileID': " + response.body.id + ",'folderID':" + folderId + "}");
            res.send({ 'fileID': response.body.id, 'folderID': folderId });
        }
    });
});

app.delete('/save', function (req, res) {
    var drive = google.drive({ version: 'v3', auth: oauth2Client });

    var file = drive.files.delete({
        fileId: '0B0ziosBFY0PSYkNMZGdmaVVxbms'
    }, function (err, result, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else {
            console.log('HTML result: ' + JSON.stringify(result));
            console.log('HTML response: ' + JSON.stringify(response));
            res.send('done');
        };
    });
});

app.listen(8080, function () {
    console.log("listening on port 8080");
});