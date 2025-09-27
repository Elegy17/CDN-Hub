// ==UserScript==
// @name 花园切换上传图床（含星然图床）
// @namespace http://tampermonkey.net/
// @version 0.2
// @description 支持蔷薇/缓存/永久/星然四种图床切换
// @author 1
// @match https://iirose.com/messages.html
// @icon https://www.google.com/s2/favicons?sz=64&domain=iirose.com
// @grant none
// ==/UserScript==

(function () {
    'use strict';

    // 首次使用提示
    if (localStorage.getItem('xc-imageHelp') == null) {
        Utils.sync(0, '上传图片前记得查看右下角的模式，点击可以切换\n缓存上传的内容12h后删除，星然图床为自定义图床');
        localStorage.setItem('xc-imageHelp', "true");
    }

    // 初始化状态：0=蔷薇,1=缓存,2=永久,3=星然（新增）
    let status;
    if (localStorage.getItem('xc-imageStatus') !== null) {
        status = Number(localStorage.getItem('xc-imageStatus'));
    } else {
        status = 1; // 默认缓存模式
    }

    // 创建悬浮球容器
    var windowHtml = `<div id="XcImageBall"></div>`;
    document.body.insertAdjacentHTML('beforeend', windowHtml);

    // 悬浮球样式与初始化
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

    // 核心：初始化图床配置（新增星然图床逻辑）
    function initImageConfig() {
        switch (status) {
            case 0: // 蔷薇图床（原默认）
                window["Constant"].URL.uploadImg = "https://f.iirose.com/lib/php/system/file_upload.php";
                window["Constant"].URL.uploadedPrefixImg = "http://r.iirose.com/";
                ball.textContent = "蔷薇";
                break;
            case 1: // 缓存上传
                window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload_cache";
                window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
                ball.textContent = "缓存";
                break;
            case 2: // 永久上传
                window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload";
                window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
                ball.textContent = "永久";
                break;
            case 3: // 星然图床（新增，你的图床）
                // 拼接完整上传地址（含所有参数，注意参数用&连接，不是?）
                window["Constant"].URL.uploadImg = "https://img.00000106.xyz/upload?authCode=Xeram.imgup&serverCompress=false&returnFormat=full&uploadFolder=/蔷薇";
                // 星然图床返回完整链接，无需前缀，这里留空不影响（关键是下面重写解析逻辑）
                window["Constant"].URL.uploadedPrefixImg = "";
                ball.textContent = "星然";
                break;
        }
    }

    // 初始化当前图床
    initImageConfig();

    // 关键修改：重写图片上传后的链接解析（适配星然图床返回格式）
    // 原逻辑可能直接拼接prefix+返回值，星然需从JSON数组中提取src
    const originalUploadSuccess = window["uploadImageSuccess"]; // 保存原上传成功处理函数
    window["uploadImageSuccess"] = function (response) {
        if (status === 3) { // 只有星然图床需要特殊解析
            try {
                // 解析返回的JSON，提取第一个元素的src（你的图床返回格式）
                const resData = JSON.parse(response);
                const imageUrl = resData[0]?.src || "";
                if (imageUrl) {
                    // 调用原函数，传入提取后的纯链接
                    originalUploadSuccess(imageUrl);
                } else {
                    _alert("星然图床返回格式错误，未找到图片链接");
                }
            } catch (e) {
                _alert("星然图床解析失败：" + e.message);
            }
        } else {
            // 其他图床沿用原逻辑
            originalUploadSuccess(response);
        }
    };

    // 悬浮球点击切换逻辑（新增星然模式循环：0→1→2→3→0）
    ball.addEventListener('click', function () {
        switch (status) {
            case 1: // 缓存 → 永久
                status = 2;
                _alert("已切换到永久上传");
                break;
            case 2: // 永久 → 蔷薇
                status = 0;
                _alert("已切换到蔷薇图床");
                break;
            case 0: // 蔷薇 → 星然（新增切换步骤）
                status = 3;
                _alert("已切换到星然图床");
                break;
            case 3: // 星然 → 缓存（新增循环闭环）
                status = 1;
                _alert("已切换到缓存上传");
                break;
        }
        localStorage.setItem('xc-imageStatus', status.toString());
        initImageConfig(); // 切换后重新初始化图床配置
    });

    // 悬浮球hover显示/隐藏逻辑（保持不变）
    let isExpanded = false;
    let debounceTimer;
    ball.addEventListener('mouseover', function () {
        clearTimeout(debounceTimer);
        ballStyle.right = "-30px";
        debounceTimer = setTimeout(() => { isExpanded = true; }, 400);
    });
    ball.addEventListener('mouseout', function () {
        clearTimeout(debounceTimer);
        ballStyle.right = "-60px";
        isExpanded = false;
    });
})();
