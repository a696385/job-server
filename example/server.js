/**
 * Powered by Andy <andy@away.name>.
 * Date: 02.08.13
 */

var JobServer = require("../")
    , cli = require('../lib/node-cli')
    , usage = require('usage');

var lastError = "";

var jobServer = JobServer.createServer({port: 8080});
jobServer.on('error', function(err){
    lastError = err.toString();
});

var pid = process.pid;

var readableFileSize = function(size) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while(size >= 1024) {
        size /= 1024;
        ++i;
    }
    return size.toFixed(1) + ' ' + units[i];
};

var printInfo = function(){

    usage.lookup(pid, function(err, result) {
        for (var i = 1; i <= process.stdout.rows; i++){
            cli.move(i,0).clearLine();
        }
        cli.move(1,0).color('blue', false).write(new Date().toString()).
            move(2,0).color('magenta').write("Total jobs: ").resetColor().write(jobServer.store.totalJobs.toString()).resetColor().
            move(3,0).color('magenta').write("Completed jobs: ").resetColor().write(jobServer.store.completedJobs.toString()).resetColor();

        var workers = jobServer.getWorkers();
        var workersLines = 0;
        for(var i = 0; i < workers.length; i++){
            var worker = workers[i];
            if (!worker.isExecutable) continue;
            cli.move(5 + workersLines,0).color('cyan').write(worker.id + ': ').resetColor().write('' + worker.workedCount + '-' + worker.workerTotalCount + '   ').color('green').write('' + (worker.workerTotalCount * 100 / jobServer.store.totalJobs).toFixed(2) + '%').resetColor();
            if (worker.isBlocked){
                cli.color('red').write(' [BLOKED]').resetColor();
            } else {
                cli.color('green').write(' [  OK  ]').resetColor();    
            }
            workersLines++;
        }

        if (result == null){
            cli.move(6 + workersLines, 0).color('red').write(err.toString());
            return;
        }
        cli.move(6 + workersLines, 0).color('magenta').write("CPU Usage: ").resetColor().write(result.cpu.toFixed(2) + '%').
            move(7 + workersLines, 0).color('magenta').write("Memory Usage: ").resetColor().write(readableFileSize(result.memory)).resetColor();

        if (lastError !== ""){
            cli.move(8 + workersLines, 0).color('red').write(lastError).resetColor();
            lastError = "";
        } else{
            cli.move(8 + workersLines, 0).clearLine();
        }
    });

};

cli.reset().clear();
setInterval(printInfo, 1000);
printInfo();