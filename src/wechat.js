const WechatAPI = require('wechat-api');
const log4js = require('log4js');
const config = require('../.config.json');
const wechatConfig = config.wechat;

const {
  appId,
  appSecret,
  openId,
  successTemplateId,
  errorTemplateId
} = wechatConfig;

const api = new WechatAPI(appId, appSecret);

log4js.configure({
  appenders: [{
    type: 'file',
    filename: 'wechat.log',
    absolute: false,
  }, ],
});
const logger = log4js.getLogger();

exports.sendSuccessInfo = function(platform, message) {
  api.sendTemplate(openId, successTemplateId, '', {
    platform: {
      value: platform,
      color: '#44b549',
    },
    message: {
      value: message,
      color: '#0099CC',
    },
  }, (err) => {
    if (err) {
      logger.error(err);
    }
  });
};

exports.sendFailedInfo = function(platform, message) {
  api.sendTemplate(openId, errorTemplateId, '', {
    platform: {
      value: platform,
      color: '#44b549',
    },
    message: {
      value: message,
      color: '#FF6666',
    },
  }, (err) => {
    if (err) {
      logger.error(err);
    }
  });
};