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
            var signBtn = document.getElementById('signBut'),
                signOK = document.getElementsByClassName('SignOK')[0];
            // 签到按钮
            if(signBtn) {
                // 点击签到
                signBtn.click();
                var checkTime = 0;
                var maxCheckTime = 10;
                var pass = false;
                // 签到成功检查
                var checkSign = function() {
                    checkTime++;
                    if(document.getElementById('signForDay').style.display === 'block') {
                        pass = true;
                    }
                    if(pass) {
                        console.log(JSON.stringify({resolve: true, message: document.getElementsByClassName('daytime')[0].innerText + ', ' + document.getElementsByClassName('puIntegral_2')[0].innerText}));
                    } else if(checkTime < maxCheckTime) {
                        setTimeout(function() {
                            checkSign();
                        }, 1000);
                    } else {
                        console.log(JSON.stringify({resolve: false, message: 'something went wrong after sign'}));
                    }
                }
                checkSign();
            } else if(signOK) {
                console.log(JSON.stringify('already signed'));
                console.log(JSON.stringify({resolve: true, message: '今天已经签到过了！'}));
            } else {
                console.log(JSON.stringify('something went wrong'));
                console.log(JSON.stringify({resolve: false, message: 'something went wrong when find signBtn'}));
            }
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
