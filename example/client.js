/**
 * Powered by Andy <andy@away.name>.
 * Date: 03.08.13
 */

var JobServer = require("../");

var jobClient = JobServer.createClient({port: 8080});
jobClient.on('error', function(err){
	console.error("Client: ", err);
});

jobClient.registerFunction("wait");
setInterval(function(){
	jobClient.wait(function(err, result){
		if (err){
			console.error(err);
		} else {
			console.log(result);
		}
	});
}, 100);
