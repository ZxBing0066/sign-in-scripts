const CronJob = require('cron').CronJob;
const exec = require('child_process').exec;
const wechart = require('./src/wechat.js');

let honglingSignTimes = 0;
const honglingMaxSignTimes = 5;

// 7点开始执行任务，时区设置为上海
const job = new CronJob({
    cronTime: '00 00 7 * * *',
    onTick: function() {
        console.log('红岭理财', '签到开始');
        honglingSignTimes = 0;
        hongling();
    },
    start: true,
    timeZone: 'Asia/Shanghai'
});

console.log('jobs start', job.running);

function hongling() {
    honglingSignTimes++;
    exec('npm run hongling', {}, (error, strout, stderr) => {
        if (error || stderr) {
            console.error(error || stderr);
            if (honglingSignTimes < honglingMaxSignTimes) {
                setTimeout(hongling, 1000 * 60);
                console.log('红岭理财 will restart after', 1000 * 60);
            } else {
                wechart.sendFailedInfo('红岭理财', '多次签到失败: ' + (error || stderr).message);
            }
        } else {
            console.log('红岭理财', '签到成功');
        }
    });
}
