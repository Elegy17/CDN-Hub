// ==UserScript==
// @name 花园切换上传图床
// @namespace http://tampermonkey.net/
// @version 0.2
// @description 支持蔷薇、缓存、永久、星然四种图床切换
// @author 1
// @match https://iirose.com/messages.html
// @icon https://www.google.com/s2/favicons?sz=64&domain=iirose.com
// @grant none
// ==/UserScript==

(function () {
    'use strict';

    // 首次使用提示
    if (localStorage.getItem('xc-imageHelp') == null) {
        Utils.sync(0, '上传图片前记得查看右下角的模式，点击可以切换\n缓存上传的内容将在12h后删除');
        localStorage.setItem('xc-imageHelp', "true");
    }

    // 初始化图床状态（0=蔷薇，1=缓存，2=永久，3=星然）
    let status;
    if (localStorage.getItem('xc-imageStatus') !== null) {
        status = Number(localStorage.getItem('xc-imageStatus'));
    } else {
        status = 1; // 默认缓存模式
    }

    // 添加悬浮球容器
    var windowHtml = `<div id="XcImageBall"></div>`;
    document.body.insertAdjacentHTML('beforeend', windowHtml);

    // 创建悬浮球并设置样式
    const ball = document.createElement('div');
    const ballStyle = ball.style;
    ballStyle.position = 'absolute';
    ballStyle.width = '100px';
    ballStyle.height = '50px';
    ballStyle.background = `#${namecolor}66`;
    ballStyle.border = `1px solid #${namecolor}cc`;
    ballStyle.borderRadius = '25px';
    ballStyle.cursor = 'pointer';
    ballStyle.zIndex = "9999999999999";
    ballStyle.transition = "0.5s";
    ballStyle.lineHeight = "50px";
    ballStyle.paddingLeft = "12px";
    ballStyle.fontSize = "16px";
    ballStyle.bottom = `80px`;
    ballStyle.right = "-60px";
    document.getElementById('XcImageBall').appendChild(ball);

    // 初始化图床配置（新增星然图床）
    function initImageBed() {
        switch (status) {
            case 0: // 蔷薇图床（原默认）
                window["Constant"].URL.uploadImg = "https://f.iirose.com/lib/php/system/file_upload.php";
                window["Constant"].URL.uploadedPrefixImg = "http://r.iirose.com/";
                ball.textContent = "蔷薇";
                break;
            case 1: // 缓存图床（原第三方）
                window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload_cache";
                window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
                ball.textContent = "缓存";
                break;
            case 2: // 永久图床（原第三方）
                window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload";
                window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
                ball.textContent = "永久";
                break;
            case 3: // 星然图床（新增）
                // 覆盖默认上传方法，适配星然图床的参数和返回格式
                window["Constant"].URL.uploadImg = "https://img.00000106.xyz/upload?authCode=Xeram.imgup&serverCompress=false&returnFormat=full&uploadFolder=/蔷薇";
                // 重写上传逻辑（核心：解析星然返回的src链接）
                window.uploadImage = function (file, callback) {
                    const formData = new FormData();
                    formData.append('file', file); // 匹配星然的file参数

                    fetch(window["Constant"].URL.uploadImg, {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        // 提取返回结果中的src链接（星然格式：数组内对象的src字段）
                        const imgUrl = data[0]?.src || '';
                        if (imgUrl) {
                            callback(imgUrl); // 回调传入纯链接
                        } else {
                            _alert("星然图床上传失败，返回格式异常");
                        }
                    })
                    .catch(error => {
                        _alert("星然图床上传出错：" + error.message);
                    });
                };
                ball.textContent = "星然";
                break;
        }
    }

    // 初始化当前图床
    initImageBed();

    // 悬浮球点击切换逻辑（新增星然循环）
    ball.addEventListener('click', function () {
        switch (status) {
            case 0: // 蔷薇 → 缓存
                status = 1;
                window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload_cache";
                window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
                _alert("已切换到缓存上传");
                break;
            case 1: // 缓存 → 永久
                status = 2;
                window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload";
                window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
                _alert("已切换到永久上传");
                break;
            case 2: // 永久 → 星然
                status = 3;
                _alert("已切换到星然图床");
                break;
            case 3: // 星然 → 蔷薇（循环）
                status = 0;
                window["Constant"].URL.uploadImg = "https://f.iirose.com/lib/php/system/file_upload.php";
                window["Constant"].URL.uploadedPrefixImg = "http://r.iirose.com/";
                _alert("已切换到蔷薇图床");
                break;
        }
        localStorage.setItem('xc-imageStatus', status.toString());
        initImageBed(); // 重新初始化图床配置
    });

    // 悬浮球hover显示/隐藏逻辑（保持不变）
    let debounceTimer;
    ball.addEventListener('mouseover', function () {
        clearTimeout(debounceTimer);
        ballStyle.right = "-30px";
        debounceTimer = setTimeout(() => {}, 400);
    });
    ball.addEventListener('mouseout', function () {
        clearTimeout(debounceTimer);
        ballStyle.right = "-60px";
    });
})();
