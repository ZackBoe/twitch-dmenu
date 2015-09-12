#!/usr/bin/env node
var spawn = require('child_process').spawn;
var TwitchApi = require('twitch-api');
var program = require('commander');
var chalk = require('chalk');
var open = require('open');
var Configstore = require('configstore');
var updateNotifier = require('update-notifier');
var pkg = require('./package.json');

updateNotifier({pkg: pkg}).notify();

var conf = new Configstore(pkg.name);

var server = require('./authserver');

var clientId =  '3vttpxgfsq0z23l7dgy20hnvql8n00y'
var twitch = new TwitchApi({
	clientId: clientId
});

program
  .version(pkg.version)
  .option('-q, --quality [quality]', 'Stream quality. Passed to livestreamer [best]', 'best')
  .option('-l, --login', 'Authenicate with Twitch to get followed streams')
  .option('-v, --verbose', 'Show debug statements')
  .parse(process.argv);

if(program.verbose) console.log('Verbose output enabled!')

if(program.login){
  var authPort = 7477
  var authUrl  = 'https://api.twitch.tv/kraken/oauth2/authorize?response_type=token&client_id='+clientId+'&redirect_uri=http://localhost:'+authPort+'&scope=user_read'
  conf.del('twitchToken');
  if(program.verbose) console.log('Starting listen server on port '+authPort);
  server.listen(authPort, function(err, token) {
   if (err) {
     console.log(chalk.red(err));
   } else {
    conf.set('twitchToken', token);
    console.log(chalk.green('Login successful!'));
    if(program.verbose) console.log(token)
  }
  server.close();
  return process.exit();
});

  open(authUrl);
  console.log(chalk.cyan('Attempting to open Auth URL:'));
  console.log(chalk.dim.cyan(authUrl));
}

var streams = []

if(conf.get('twitchToken')){
  if(program.verbose) console.log('Getting followed streams')
  twitch.getAuthenticatedUserFollowedStreams(conf.get('twitchToken'), function(err, body){
    for (var i = body.streams.length - 1; i >= 0; i--) {
      if(body.streams[i].game == null) playing = ' ';
      else playing = ' playing '+body.streams[i].game;
      streams.push(body.streams[i].channel.name+playing+': '+body.streams[i].channel.status);
    };
    if(program.verbose) console.log('Added '+body.streams.length+' followed streams');
    streams.push('- TOP STREAMS -');
    getTopStreams();
  });
}

function getTopStreams(){
  if(program.verbose) console.log('Getting top streams')
  twitch.getStreams({limit:10}, function(err, body){
    for (var i = body.streams.length - 1; i >= 0; i--) {
      streams.push(body.streams[i].channel.name+' playing '+body.streams[i].game+' : '+body.streams[i].channel.status);
    };
    if(program.verbose) console.log('Added '+body.streams.length+' top streams');
    menu();
  })
}

function menu(){
	var dmenu = spawn('dmenu', ['-l', streams.length]);

	dmenu.stdout.on('data', function(data){
		reg = /([a-zA-Z\-\_0-9]+)\s/
		string = data.toString().replace(/\n$/, '');
		streamer = reg.exec(string);
            // console.log(streamer)
            if(program.verbose) console.log('Opening stream for \''+streamer[1]+'\' using \''+program.quality+'\' quality')
            var livestreamer = spawn('livestreamer', ['http://twitch.tv/'+streamer[1], program.quality]);

            livestreamer.stdout.on('data', function(data){ if(program.verbose) console.log('[LS]'+data) })
            livestreamer.stdin.end();
          })

	dmenu.on('close', function(code){});

	dmenu.stdin.write(streams.join('\n'));
	dmenu.stdin.end();

}