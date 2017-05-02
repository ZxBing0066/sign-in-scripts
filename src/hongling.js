const phantom = require("phantom");
const Base64 = require('js-base64').Base64;
const honglingConfig = require('../.config.json').hongling;
const wechart = require('./wechat.js');

const { username, password } = honglingConfig;

const platform = '红岭理财';

let _instance, _page;

let loadFinished = null;
let onConsoleMessage = null;

// 创建实例
phantom.create().then((instance) => {
    _instance = instance;
    // 创建页面实例
    return _instance.createPage();
}).then((page) => {
    _page = page;
    // 添加事件监听
    _page.on('onInitialized', function() {
        console.log('onInitialized');
    });
    // 页面加载完成回调
    _page.on('onLoadFinished', function() {
        console.log('onLoadFinished');
        if(loadFinished) {
            loadFinished();
        }
    });
    // 页面console信息回调
    _page.on('onConsoleMessage', function(msg) {
        console.log('onConsoleMessage', msg);
        if(onConsoleMessage) {
            onConsoleMessage(msg);
        }
    });
    // 打开登录页面
    return _page.open('https://sso.my089.com/sso');
}).then((status) => {
    console.log(status);
    // 页面加载失败
    if(status !== 'success') {
        throw {message: 'login page open failed by status: ' + status};
    }
    console.log('登陆页面加载完成，执行登陆');
    // 登录
    return _page.evaluate(function(username, password) { 
        document.getElementById('username').value = username;
        document.getElementById('password').value = password;
        loginSubmit();
    }, username, Base64.decode(password));
}).then(() => {
    console.log('开始监听登陆状态');
    // 监听登录成功跳转
    return new Promise((resolve, reject) => {
        loadFinished = function() {
            console.log('登陆成功');
            resolve();
        }
    }).then(() => {
        loadFinished = null;
    })
}).then(() => {
    console.log('打开bbs页面');
    // 登录成功后打开bbs页面
    return _page.open('https://bbs.my089.com/');
}).then((status) => {
    console.log(status);
    // 页面加载失败
    if(status !== 'success') {
        throw {message: 'bbs page open failed by status: ' + status};
    }
    // 超时没有回应强制退出
    console.log('bbs页面加载完成，准备签到');
    const timer = setTimeout(() => {
        throw {message: 'sign in timeout'};
    }, 30000);
    // 签到
    return new Promise((resolve, reject) => {
        // 添加信息回调来通信
        onConsoleMessage = function(msg) {
            try {
                if(!msg) {
                    return;
                }
                msg = JSON.parse(msg);
                if(msg.length) {
                    return;
                }
                if(msg.resolve) {
                    resolve(msg.message);
                    console.log('签到成功');
                    clearTimeout(timer);
                } else {
                    reject(msg);
                    console.log('签到失败');
                    clearTimeout(timer);
                }
            } catch(e) {
                console.error(e);
                clearTimeout(timer);
                throw e;
            }
        };
        // 页面执行签到
        _page.evaluate(function() {
            var signTime = 0;
            var maxSignTime = 3;
            var sign = function() {
                signTime++;
                $.post( "/userSignByDay", function(res){
                    var message;
                    if(res.flag === '1') {
                        message = '本次签到积分：' + res.score + '，奖励积分：' + res.rewardScore + '，累计获得积分：' + res.allSignScore + '，已经连续签到：' + res.level + '天。';
                    } else {
                        message = res.message;
                    }
                    console.log(JSON.stringify({
                        resolve: true,
                        message: message
                    }));
                }, 'json').fail(function() {
                    console.log('load userSignByDay error');
                    if(signTime < maxSignTime) {
                        sign();
                    } else {
                        console.log('error to many times');
                    }
                });
            };
            sign();
        });
    }).then((message) => {
        onConsoleMessage = null;
        return message;
    });
}).then((message) => {
    // 发送微信通知
    wechart.sendSuccessInfo(platform, '签到成功: ' + message);
    console.log('签到脚本执行成功');
}).catch((e) => {
    // 发送错误通知
    wechart.sendFailedInfo(platform, '签到失败: ' + e && e.message);
    console.error(e);
    console.log('签到脚本执行报错');
}).then(() => {
    // 关闭页面
    return _page.close();
}).then(() => {
    // 关闭实例
    return _instance.exit();
})
