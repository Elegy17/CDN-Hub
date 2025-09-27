// ==UserScript==
// @name         花园切换上传图床
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  添加了星然图床支持
// @author       1 & 豆包
// @match        https://iirose.com/messages.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=iirose.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (localStorage.getItem('xc-imageHelp') == null) {
        Utils.sync(0, '上传图片前记得查看右下角的模式，点击可以切换\n缓存上传的任何东西将会在上传成功后12h删除');
        localStorage.setItem('xc-imageHelp', "true");
    }

    let status;
    if (localStorage.getItem('xc-imageStatus') !== null) {
        status = Number(localStorage.getItem('xc-imageStatus'))
    } else {
        status = 1; // 默认缓存
    }

    // 保存原始的上传函数引用
    const originalUploadFile = window["FileUtils"].uploadFile;

    var windowHtml = `
        <div id="XcImageBall">
            <!--# 既不能回忆往事，同样也不应该对未来悲观，只需要活在当下 #-->
        </div>
    `
    document.body.insertAdjacentHTML('beforeend', windowHtml);

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

    // 设置初始显示的图床名称
    if (status === 0) ball.textContent = "蔷薇";
    else if (status === 1) ball.textContent = "缓存";
    else if (status === 2) ball.textContent = "永久";
    else if (status === 3) ball.textContent = "星然";

    ballStyle.bottom = `80px`;
    ballStyle.right = "-60px";
    document.getElementById('XcImageBall').appendChild(ball)

    // 重写上传函数
    window["FileUtils"].uploadFile = function (file, callback, progressCallback) {
        if (status === 3) { // 星然图床
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://img.00000106.xyz/upload?authCode=Xeram.imgup&serverCompress=false&returnFormat=full&uploadFolder=/蔷薇', true);
            
            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable && progressCallback) {
                    progressCallback(e.loaded / e.total);
                }
            });

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response && response[0] && response[0].src) {
                            callback(response[0].src); // 只返回图片URL
                        } else {
                            callback(null, 'Invalid response from server');
                        }
                    } catch (error) {
                        callback(null, 'Failed to parse response: ' + error.message);
                    }
                } else {
                    callback(null, 'Request failed with status: ' + xhr.status);
                }
            };

            xhr.onerror = function() {
                callback(null, 'Network error occurred');
            };

            xhr.send(formData);
        } else { // 其他图床，使用原逻辑
            originalUploadFile(file, callback, progressCallback);
        }
    };

    ball.addEventListener('click', function () {
        if (status === 1) { // 缓存 -> 永久
            window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload";
            window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
            _alert("已切换到永久上传");
            status = 2;
            ball.textContent = "永久";
        } else if (status === 0) { // 蔷薇 -> 缓存
            window["Constant"].URL.uploadImg = "https://xc.null.red:8043/XCimg/upload_cache";
            window["Constant"].URL.uploadedPrefixImg = "https://xc.null.red:8043/XCimg/img/";
            _alert("已切换到缓存上传");
            status = 1;
            ball.textContent = "缓存";
        } else if (status === 2) { // 永久 -> 星然
            _alert("已切换到星然图床");
            status = 3;
            ball.textContent = "星然";
        } else if (status === 3) { // 星然 -> 蔷薇
            window["Constant"].URL.uploadImg = "https://f.iirose.com/lib/php/system/file_upload.php";
            window["Constant"].URL.uploadedPrefixImg = "http://r.iirose.com/";
            _alert("已切换到蔷薇图床");
            status = 0;
            ball.textContent = "蔷薇";
        }
        localStorage.setItem('xc-imageStatus', status.toString());
    });

    let isExpanded = false;
    let debounceTimer;
    ball.addEventListener('mouseover', function () {
        clearTimeout(debounceTimer);
        ballStyle.right = "-30px";
        debounceTimer = setTimeout(() => {
            isExpanded = true;
        }, 400);
    });
    ball.addEventListener('mouseout', function () {
        clearTimeout(debounceTimer);
        ballStyle.right = "-60px";
        isExpanded = false;
    });
})();
