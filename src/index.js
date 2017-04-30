const co = require('co');
const log4js = require('log4js');
const { successInfo, failedInfo } = require('./wechat');
const caifupaiSignin = require('./caifupai').signin;
const exec = require('child_process').exec;

log4js.configure({
  appenders: [
    {
      type: 'file',
      filename: 'signin.log',
      absolute: false,
    },
  ],
});
const logger = log4js.getLogger();

function success(platform, message) { // 成功消息
  const formattedMessage = `${platform}签到成功，${message}。`;
  console.log(formattedMessage);
  logger.info(formattedMessage);
  if (process.env.weixinMessage === 'true') {
    successInfo(platform, message);
  }
}

function failed(platform, message) { // 失败信息
  const formattedMessage = `${platform}签到失败，${message}。`;
  console.log(formattedMessage);
  logger.error(formattedMessage);
  if (process.env.weixinMessage === 'true') {
    failedInfo(platform, message);
  }
}

// 财富派签到
co(caifupaiSignin()).then((point) => {
  success('财富派', point);
  honglingSignin1();
}).catch((errorMessage) => {
  failed('财富派', errorMessage);
  honglingSignin1();
});

function honglingSignin1() {
  exec('npm run hongling_1', (error, stdout, stderr) => {
    if (error) {
      failed('红岭', '胖胖签到失败');
    } else {
      success('红岭', '胖胖签到成功');
    }
    honglingSignin2();
  });
}

function honglingSignin2() {
  exec('npm run hongling_2', (error, stdout, stderr) => {
    if (error) {
      failed('红岭', '屁屁签到失败');
    } else {
      success('红岭', '屁屁签到成功');
    }
  });
}


