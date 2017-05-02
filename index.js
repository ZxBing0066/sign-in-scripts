const CronJob = require('cron').CronJob;
const exec = require('child_process').exec;

// 7点开始执行任务，时区设置为上海
const job = new CronJob({
    cronTime: '00 00 7 * * *',
    onTick: function() {
        exec('npm run hongling');
    },
    start: true,
    timeZone: 'Asia/Shanghai'
});

job.start();
console.log('jobs start');