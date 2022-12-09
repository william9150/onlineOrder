//#region ------------------------------ 全域變數 ------------------------------
let theMenu = []; //存放菜單的陣列(sort by catId)
let theProducts = []; //存放菜單的陣列(sort by productId)
let theUserOrders = []; //客人的歷史訂單
let theFoodAdditions = []; //食物附加選項
const expireMins = 30; //登入過期時間(分鐘)
// const urlDomain = 'http://localhost:3000';
const urlDomain = 'https://json-server-vercel-a.vercel.app';

//#endregion

$(function () {

    init();
    //監聽分類標籤
    $('input[name="分類標籤"]').on('change', filterMenu);
    $("#logo").on("click", function () {
        $("#tag全部").click();
        $('#menu').animate({ scrollTop: 0 }, 'fast');
    })
    $("#productModal").on("change", "#foodAdditionOptions input.foodAdditionOption", function () {
        btnAdditionChange();
    });

})

//#region ------------------------------ 邏輯流程 ------------------------------
//初始化
function init() {
    //檢查網址參數
    const urlParams = new URLSearchParams(window.location.search);
    const isInsider = urlParams.has('insider');
    if (isInsider) {
        login('A3@store.com', 'abc123');
        return;
    }
    //檢查登入狀態
    if (getDataFromLocalStorage('_user')) {
        chkTimer();
    }
    getMenu();
    getFoodAddition();
    renderNavList();
    renderQrCode();
    updateFooterTotalPrice();
    gtag('event', 'screen_view', {
        'app_name': '快取早餐',
        'screen_name': 'Index'
    });
}
//前往後台
function goToBackstage() {
    window.location.href = 'backstage.html';
}
//彈出商品Modal
function showProductModal(catId, productId) {
    renderProductModal(productId);
    $('#productModal').modal('show');
}
//彈出購物車Modal
function showCartModal() {
    renderCartModal();
    $('#cartModal').modal('show');
}
//彈出歷史訂單Modal
function showUserOrderModal() {
    getUserOrders();
}
//彈出loginModal
function showLoginModal() {
    renderLoginModal();
    $('#loginModal').modal('show');
}
//彈出廣告Modal
function showAdModal() {
    $('#adModal').modal('show');
}
//彈出導覽Modal
function showGuideModal() {
    $('#guideModal').modal('show');
}
//篩選菜單
function filterMenu() {
    const cat = $("input[name='分類標籤']:checked").val();
    if (cat == '全部') {
        $('div[name="foodCat"]').show();
    } else {
        $('div[name="foodCat"]').hide();
        $(`div[name="foodCat"][data-cat="${cat}"]`).show();
    }
}
//加入購物車
function addToCart(catId, productId) {
    const products = theMenu.find(x => x.id == catId).products.find(x => x.id == productId);
    const carts = getCarts();
    const qty = parseInt($('#tempProductAmount').text());
    const comment = $('#tempProductComment').val();
    let additems = [];
    $('#foodAdditionOptions input.foodAdditionOption:checked').each(function () {
        additems.push($(this).val());
    });
    const price = parseInt($("#tempProductTotal").text());
    carts.push({
        catId: catId,
        id: products.id,
        name: products.name,
        price: price / qty,
        qty: qty,
        comment: comment,
        additems: additems,
    });
    saveDataToLocalStorage('cart', carts);
    $('#productModal').modal('hide');
    updateFooterTotalPrice();
}
//更新購物車
function updateToCart(productIndex) {
    const carts = getCarts();
    const qty = parseInt($('#tempProductAmount').text());
    const comment = $('#tempProductComment').val();
    const additems = [];
    $('#foodAdditionOptions input.foodAdditionOption:checked').each(function () {
        additems.push($(this).val());
    });
    const price = parseInt($("#tempProductTotal").text());
    carts[productIndex].qty = qty;
    carts[productIndex].comment = comment;
    carts[productIndex].additems = additems;
    carts[productIndex].price = price / qty;
    saveDataToLocalStorage('cart', carts);
    sweetSmallSuccess('已更新購物車');
    $('#productModal').modal('hide');
    showCartModal();
    updateFooterTotalPrice();
}
//送出購物車訂單
function submitCart() {
    const carts = getCarts();
    if (carts.length == 0) {
        sweetError('購物車沒有商品', '請先加入商品');
        return;
    } else if (getDataFromLocalStorage('_token') == null) {
        saveDataToLocalStorage('returnModal', 'cartModal');
        $("#cartModal").modal('hide');
        showLoginModal()
        return;
    }
    const order = {
        id: "OD" + (+new Date()).toString(),
        userId: getDataFromLocalStorage('_user').id,
        name: getDataFromLocalStorage('_user').name,
        phone: getDataFromLocalStorage('_user').phone,
        comment: $('#cartComment').val(),
        price: countCartTotalPrice(),
        orderDate: getTimeNow().split(" ")[0],
        orderTime: getTimeNow().split(" ")[1],
        takeWay: $('#cartTakeWay input:checked').val(),
        isPaid: false,
        isDone: false,
        details: carts,
    }
    postCartOrder(order);
}
//更新footer的訂單小計
function updateFooterTotalPrice() {
    $("#footerTotalPrice").text(countCartTotalPrice());
}
//讀取購物車內容
function getCarts() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    return cart;
}
//調整商品數量
function adjAmount(price, method) {
    let tempProductAmount = parseInt($('#tempProductAmount').text());
    if (method == 'add') {
        tempProductAmount++;
    } else if (method == 'minus' && tempProductAmount > 1) {
        tempProductAmount--;
    }
    $('#tempProductAmount').text(tempProductAmount);
    countCurrentPrice();
    //$('#tempProductTotal').text(`${price * tempProductAmount}`);
}
//附加選項增減
function btnAdditionChange() {
    let addPrice = 0;
    $("#foodAdditionOptions input.foodAdditionOption:checked").each(function () {
        addPrice += parseInt($(this).attr('data-add-price'));
    })
    $('#tempProductTotal').attr('data-add-price', addPrice);
    countCurrentPrice();
}

//計算產品總價
function countCurrentPrice() {
    const foodPrice = parseInt($('#tempProductTotal').attr('data-food-price'));
    const additionPrice = parseInt($('#tempProductTotal').attr('data-add-price'));
    const qty = parseInt($('#tempProductAmount').text());
    const currentPrice = (foodPrice + additionPrice) * qty;
    $('#tempProductTotal').text(currentPrice);
}
//計算購物車總金額
function countCartTotalPrice() {
    let cartList = getCarts();
    let totalPrice = 0;
    cartList.forEach(productObj => {
        totalPrice += productObj.price * productObj.qty;
    })
    return totalPrice;
}
//刪除購物車商品
function deleteCartProduct(productIndex) {
    let cartList = getCarts();
    cartList.splice(productIndex, 1);
    saveDataToLocalStorage('cart', cartList);
    renderCartModal();
    updateFooterTotalPrice();
}
//編輯購物車商品
function editCartProduct(productId, productIndex) {
    $('#cartModal').modal('hide');
    renderProductModal(productId);
    let cartList = getCarts();
    let productObj = cartList[productIndex];
    $('#tempProductAmount').text(productObj.qty);
    $('#tempProductComment').val(productObj.comment);
    $('#tempProductTotal').text(`${productObj.price * productObj.qty}`);
    $('#btnAddToCart').attr('onclick', `updateToCart(${productIndex})`);
    $('#productModal').modal('show');

}
//demo Input 填入
function demoInput(demoName) {
    switch (demoName) {
        case '小明':
            $('#loginEmail').val('ming@gmail.com');
            $('#loginPassword').val('abc123');
            break;
        case '阿姨':
            $('#loginEmail').val('anti@gmail.com');
            $('#loginPassword').val('iamboss');
            break;
        default:
            $('#loginEmail').val('');
            $('#loginPassword').val('');
            break;
    }
}

//check login info
function btnLogin(callbackModal = "") {
    const email = $("#loginEmail").val();
    const password = $("#loginPassword").val();
    login(email, password)
}
//btnRegister
function btnRegister() {
    const name = $('#loginName').val();
    const phone = $('#loginPhone').val();
    const email = $('#loginEmail').val();
    const password = $('#loginPassword').val();
    if (name == '' || phone == '' || email == '' || password == '') {
        sweetError('請輸入完整資料');
        return;
    }
    let model = {
        password: password,
        name: name,
        email: email,
        phone: phone,
        role: 'customer'
    }
    register(model);
}

//switch modal 關閉現在的modal，開啟前一次的modal
function switchModal() {
    const returnModal = getDataFromLocalStorage('returnModal');
    $(".modal").modal('hide');
    switch (returnModal) {
        case 'cartModal':
            showCartModal();
            break;
        // case 'productModal':
        //     $('#productModal').modal('show');
        //     break;
        case 'orderModal':
            showUserOrderModal();
            break;
    }
    deleteDataFromLocalStorage('returnModal');
}
//附加選項id轉name
function additionIdToName(additionId) {
    let name = Object.values(theFoodAdditions).reduce((a, b) => [...a, ...b.items], []).find(item => item.id == additionId)?.name
    return name ? name : '';
}

//catIdToCatName
function catIdToCatName(catId) {
    let catName = Object.values(theMenu).find(item => item.id == catId)?.name;
    return catName ? catName : '';
}
//#endregion


//#region ------------------------------ API ------------------------------

//取得菜單資料
function getMenu() {
    axios.get(`${urlDomain}/cats?_embed=products`).then(function (response) {
        theMenu = response.data;
        theProducts = theMenu.reduce((a, b) => [...a, ...b.products], [])
        renderMenu();
    }).catch(function (error) {
        console.log('error', error);
    });
}
//取得食品附加項目
function getFoodAddition() {
    axios.get(`${urlDomain}/additions`)
        .then(function (response) {
            theFoodAdditions = response.data;
        }).catch(function (error) {
            console.log('error', error);
        });
}
//取得用戶歷史訂單
function getUserOrders() {
    const userId = getDataFromLocalStorage('_user').id;
    const token = getDataFromLocalStorage('_token');
    const config = { headers: { 'Authorization': `Bearer ${token}` } }
    axios.get(`${urlDomain}/600/orders?userId=${userId}`, config)
        .then(function (response) {
            theUserOrders = response.data.reverse();
            console.log('theUserOrders', theUserOrders);
            renderUserOrdersModal();
        }).catch(function (error) {
            console.log('error', error);
            theUserOrders = [];
            renderUserOrdersModal();
        });
}
//login
function login(email, password) {
    axios.post(`${urlDomain}/login`, { email: email, password: password })
        .then(function (response) {
            gtag("event", "login", {
                method: "login:" + `(${email})(${response.data.user.name})`
            });
            saveDataToLocalStorage('_token', response.data.accessToken);
            saveDataToLocalStorage('_user', response.data.user);
            saveDataToLocalStorage('_expire', { time: new Date().getTime(), expire: expireMins * 60 * 1000 });
            chkTimer();
            if (response.data.user.role == 'admin') {
                deleteDataFromLocalStorage('returnModal');
                window.location.href = 'backstage.html';
                return;
            }
            if (response.data.user.role == 'insider') {
                window.location.href = window.location.origin + window.location.pathname;
                return;
            }

            $('#loginModal').modal('hide');
            renderNavList();
            switchModal();
            if (response.data.user.role == 'insider') {
                sweetSmallSuccess(`桌號 ${response.data.user.name}，歡迎光臨`);
            } else {
                sweetSmallSuccess(`早安😀 ${response.data.user.name}，登入成功`);
            }

        }).catch(function (error) {
            sweetError('登入失敗', '帳號或密碼錯誤');
        });
}
//logout
function logout() {
    deleteDataFromLocalStorage('_token');
    deleteDataFromLocalStorage('_user');
    deleteDataFromLocalStorage('_expire');
    deleteDataFromLocalStorage('returnModal');
    renderNavList();
}
//register
function register(model) {
    axios.post(`${urlDomain}/register`, model)
        .then(function (response) {
            gtag("event", "sign_up", {
                method: "sign_up:" + `(${model.name})(${model.email})`
            });
            saveDataToLocalStorage('_token', response.data.accessToken);
            saveDataToLocalStorage('_user', response.data.user);
            $('#loginModal').modal('hide');
            renderNavList();
            switchModal();
            sweetSmallSuccess('註冊成功');
        }).catch(function (error) {
            console.log('error', error);
        });
}
//post cart order with token
function postCartOrder(order) {
    const token = getDataFromLocalStorage('_token');
    axios.post(`${urlDomain}/600/orders`, order, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }).then(function (response) {
        gaPurchase(order);
        sweetSuccess('訂單送出成功', '將盡快為您備餐', 2500);
        switchModal();
        deleteDataFromLocalStorage('cart');
        updateFooterTotalPrice();
    }).catch(function (error) {
        sweetError('訂單送出失敗', '請重新嘗試');
        console.log('error', error);
    });
}

//#endregion

//#region ------------------------------ 渲染畫面 ------------------------------

//渲染菜單
function renderMenu() {
    let contents = [];
    theMenu.forEach(catObj => {
        const catOutline1 = `<div name="foodCat" data-cat='${catObj.name}' >`;
        let catTitle = `<div class="catTitle my-3" data-cat='${catObj.name}'><span class="h4 fw-bolder">${catObj.name}</span></div>`;
        let catContent1 = `<div class="menu-cards row g-3" data-cat='${catObj.name}'>`;
        let catProducts = catObj.products.map(productObj => {
            return `<div class="col-12 col-md-6 col-xl-4 position-relative" >
                        <div class="foodCard ${productObj.isSoldOut ? 'soldout' : ''}" onclick="showProductModal('${productObj.catId}', '${productObj.id}')">
                            <div class="d-flex flex-column w-60">
                                <p class="h5">${productObj.name}</p>
                                <p class="h6">${productObj.comment}</p>
                                <p class="h5 mt-auto">$${productObj.price}</p>
                            </div>
                            <div class="d-inline-block ms-auto">
                                <img class="menuCardImg" src="${productObj.img}" alt="" />
                            </div>
                        </div>
                        <div class="soldoutMask ${productObj.isSoldOut ? '' : 'd-none'}">已售完</div>
                    </div>                                
                    `;
        }).join('');
        let catContent2 = `</div>`;
        const catOutline2 = `</div>`;
        contents.push(catOutline1 + catTitle + catContent1 + catProducts + catContent2 + catOutline2);
    })
    $('#menu').html(contents.join(''));
    filterMenu();
}
//渲染產品Modal
function renderProductModal(productId) {
    const myProductObj = theProducts.find(productObj => productObj.id == productId);
    const { catId, id, name, comment, price, img, isSoldOut, additionIds } = myProductObj;
    //食物的附加選項
    let additionContents = additionIds.map(additionId => {
        let addObj = theFoodAdditions.find(x => x.id == additionId);
        let str = `<div class="" data-addtion-id="${addObj.id}">
                        <label>${addObj.name}</label>
                        <hr class="my-1"/>
                        ${addObj.items.map(item => {
            return `<input type="${addObj.isMulti ? 'checkbox' : 'radio'}" class="btn-check foodAdditionOption" name="${addObj.name}" id="add-${item.id}" value="${item.id}" data-add-price="${item.price}">
                                    <label class="btn btn-pill-primary" for="add-${item.id}" >${item.name} +$${item.price}</label>`;
        }).join('')}
                    </div>`;
        return str;
    })
    let content = `<div class="modal-content">
    <div class="modal-header d-block pb-1" style="border-width: 0;">             
    <button type="button" class="btn-close float-end float" data-bs-dismiss="modal"></button>
        <h5 class="text-center fw-bolder">${name}</h5>   
    </div>
    
    <div class="modal-body pt-1">
        <!-- 介紹 -->
        <div>
            <img src="${img}" class="modalFoodImg mb-3" alt="" />
            <p class="h6 fw-light">${comment}</p>
            <p class="h6 fw-light"></p>
            <p class="h5">$${price}</p>
        </div>
        <!-- 選項 -->
        <div id="foodAdditionOptions">
            ${additionContents.join("")}            
        </div>

        <br />
        <!-- 備註 -->
        <div>
            <p class="h6">餐點備註</p>
            <textarea class="form-control" id="tempProductComment" rows="2"></textarea>
        </div>
    </div>
    <div class="modal-footer flex-column">
        <!-- 數量 -->

        <div class="d-flex align-items-center">
            <button class="btn rounded-circle btn-sm btn-minus" onclick="adjAmount('${price}','minus')"><i class="fa-solid fa-minus small"></i></button>
            <span class="mx-4" id="tempProductAmount">1</span>
            <button class="btn rounded-circle btn-sm btn-add" onclick="adjAmount('${price}','add')"><i class="fa-solid fa-plus small"></i></button>
        </div>

        <!-- 加入購物車 -->
        <button type="button" class="btn btn-addToCart my-1" id="btnAddToCart" onclick="addToCart('${catId}','${id}')" >
            <span class=""> 加入購物車($</span>
            <span class="" id="tempProductTotal" data-food-price="${price}" data-add-price="0" data-total-price="${price}">${price}</span>
            <span class="">)</span>
        </button>
    </div>
</div>`;
    $('#productModal div.modal-content').html(content);
}
//渲染購物車Modal
function renderCartModal() {
    let cartList = getCarts()
    let contentCartList = [];
    if (cartList.length > 0) {
        contentCartList = cartList.map((productObj, index) => {
            const { id, name, price, qty, comment, additems } = productObj;
            return `
        <div class="cartfoodCard d-block mb-2" data-id="${id}" data-price="${price}">
            <div class="d-flex justify-content-between mb-2">
                <span class="h6 fw-bolder">${name}</span>
                <div class="">
                    <button class="btn rounded-circle btn-sm cartEdit" onclick="editCartProduct('${id}','${index}')"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn rounded-circle btn-sm cartDelete" onclick="deleteCartProduct('${index}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
            
            <span class="h6 fw-light d-block">${comment ? (comment) : ""}</span>
            <span class="h6 fw-light d-block">${additems.map(x => additionIdToName(x)).join("/")}</span>
            <div class="d-flex justify-content-between">
                
                <span class="fw-light">$${price} / ${qty}份</span>
                <div class="text-danger fw-bold">$${price * qty}</div>
            </div>
        </div>
        `
        })
    } else {
        contentCartList.push(`<div class="text-center">購物車內沒有商品</div>`)
    }

    let content = `<div name="商品明細" class="mb-3">
    <h5 class="fw-bolder">商品明細</h5>
    <hr class="my-2" />
    ${contentCartList.join("")}
</div>
<div name="取餐方式" class="mb-3" id="cartTakeWay">
    <h5 class="fw-bolder">取餐方式</h5>
    <hr class="my-2"/>
    <input type="radio" class="btn-check" name="取餐方式" id="tag外帶" value="外帶" autocomplete="off" checked />
    <label class="btn btn-cat-tag" for="tag外帶">外帶</label>

    <input type="radio" class="btn-check" name="取餐方式" id="tag內用" value="內用" autocomplete="off" />
    <label class="btn btn-cat-tag" for="tag內用">內用</label>
</div>
<div name="訂單備註" class="mb-3">
    <h5 class="fw-bolder">訂單備註</h5>
    <hr class="my-2" />
    <textarea class="form-control" id="cartComment" rows="2"></textarea>
</div>`

    $("#cartModal .modal-body").html(content);
    $("#tempCartTotalPrice").html(`($${countCartTotalPrice()})`);
}
//渲染歷史訂單Modal //todo
function renderUserOrdersModal() {
    let contents = [];
    if (theUserOrders.length > 0) {
        theUserOrders.forEach(orderObj => {
            let { id, userId, name, phone, comment, price, orderDate, orderTime, isPaid, isDone, details } = orderObj;
            let detailContent = details.map(foodObj => {
                let str = `
            <div class="cartfoodCard d-block mb-2" data-id="${foodObj.id}" data-price="${foodObj.price}">
                <span class="h6 fw-bolder text-start">${foodObj.name}</span>
                <br/>
                <span class="fw-light">${foodObj.comment ? (foodObj.comment + " / ") : ''}</span>
                <span class="fw-light">${foodObj.additems.length > 0 ? foodObj.additems.map(x => additionIdToName(x)).join("/") : ''}</span>
                <div class="d-flex justify-content-between">
                    <span class="fw-light">${foodObj.qty}份</span>
                    <div class="text-danger fw-bold">$${foodObj.price * foodObj.qty}</div>
                </div>
            </div>`
                return str;
            })
            let content = `
        <div
            class="cartfoodCard d-flex mb-2"
            data-order-id="${id}"
            data-bs-toggle="collapse"
            data-bs-target="#collapseOrder-${id}"
        >
            <div>
                <div class="">
                    <span class="h6 fw-bolder">訂單日期</span>
                    <span class="fw-light">${orderDate} ${orderTime}</span>
                </div>
                <div>
                    <span class="h6 fw-bolder">訂單編號</span>
                    <span class="fw-light">${id}</span>
                </div>
            </div>
            <div class="d-flex flex-column ms-auto">
                <span>${isDone ? '已完成' : '製作中'}</span>
                <span class="text-danger fw-bold ms-auto">$${price}</span>
            </div>
        </div>
        <div class="collapse px-3 pt-0 pb-3" id="collapseOrder-${id}">
            ${detailContent.join("")}
        </div>`
            contents.push(content);
        })
    } else {
        contents.push(`<div class="text-center">沒有訂單</div>`)
    }
    $("#userOrdersModal .modal-body").html(contents.join(""));
    $('#userOrdersModal').modal('show');
}
//渲染NAV清單
function renderNavList() {
    let isLogin = getDataFromLocalStorage('_token') ? true : false;
    let isAdmin = getDataFromLocalStorage('_user') ? getDataFromLocalStorage('_user').role == 'admin' : false;
    let userNameContent = "";
    let loginoutContent = `<span class="nav-link finger" href="" onclick="showLoginModal('login')">登入/註冊</span>`;
    if (isLogin) {
        let helloStr = getDataFromLocalStorage('_user').role == 'insider' ? '桌號 ' : '早安!';
        userNameContent = `
        <li class="nav-item" id="navLoginArea">
            <span class="nav-link" href="" id="">${helloStr}  <b>${getDataFromLocalStorage('_user').name}</b></span>
        </li>
        ` ;
        loginoutContent = `<span class="nav-link finger" href="" onclick=
        "logout()">登出</span>`
    }

    let content = `
    ${userNameContent}
    <li class="nav-item">
        <span class="nav-link finger" onclick="showAdModal()">活動快訊</span>
    </li>
    <li class="nav-item">
        <span class="nav-link finger" onclick="showGuideModal()">功能介紹</span>
    </li>
    <li class="nav-item">
        ${isLogin ? '<span class="nav-link finger" onclick="showUserOrderModal()">訂單查詢</span>' : ''}
    </li>
    <li class="nav-item">
        ${isAdmin ? '<span class="nav-link finger" onclick="goToBackstage()">切換至後台</span>' : ''}
    </li>
    <li class="nav-item" id="">
        ${loginoutContent}
    </li>
    `;
    $("#navList").html(content);
}
//渲染loginModal
function renderLoginModal(method = 'login') {
    let content = '';
    if (method == 'login') {
        content = `
    <div class="d-flex flex-column align-items-center gap-3">
        <p class="h4 fw-bold">會員</p>
        <input type="email" class="login-input" placeholder="Email" id="loginEmail" />
        <input type="password" class="login-input" placeholder="Password" id="loginPassword" />
        <button class="btn btn-login" onclick="btnLogin()">登入</button>

        <p>還沒成為會員? <span class="color-primary border-bottom finger" onclick="renderLoginModal('register')">註冊</span></p>
        <p class="fw-light">
            <span>Demo: </span>
            <span class="ms-2 finger" onclick="demoInput('小明')">顧客-小明</span>
            <span class="ms-2 finger" onclick="demoInput('阿姨')">老闆-阿姨</span>
        </p>
    </div>
    `
        //註冊
    } else if (method == 'register') {
        content = `
    <div class="d-flex flex-column align-items-center gap-3">
        <p class="h4 fw-bold">會員</p>
        <input type="text" class="login-input" placeholder="Name" id="loginName" />
        <input type="phone" class="login-input" placeholder="phone" id="loginPhone" />
        <input type="email" class="login-input" placeholder="Email" id="loginEmail" />
        <input type="password" class="login-input" placeholder="Password" id="loginPassword" />
        <button class="btn btn-login" onclick="btnRegister()">註冊</button>

        <p>已經是會員? <span class="color-primary border-bottom finger" onclick="renderLoginModal('login')">登入</span></p>
    </div>
    `
    }
    $("#loginModal .modal-body").html(content);
    //$('#loginModal').modal('show');
}
//渲染qr code
function renderQrCode() {

    // let str = "https://coldingpotato.github.io/onlineOrder/" + "?insider=A3"

    //let str = window.location.origin + window.location.pathname + "?insider=A3"
    let str = "https://coldingpotato.github.io/onlineOrder/redirect.html?insider=A3"
    $("#qrCode").qrcode({ width: 135, height: 135, text: str });
    $("#qrCode").attr('onclick', `window.open('${str}', '_self')`)
}

//#endregion

//#region ------------------------------ 其他 ------------------------------

//save data in local storage
function saveDataToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}
//get data from local storage
function getDataFromLocalStorage(key) {
    return JSON.parse(localStorage.getItem(key));
}
//delete data from local storage
function deleteDataFromLocalStorage(key) {
    localStorage.removeItem(key);
}
// 取得當前時間(2022-01-01 00:00:00)
function getTimeNow() {
    let d = new Date();
    const theTime = d.getFullYear() + "-" + (d.getMonth() + 1).AddZero() + "-" + d.getDate().AddZero() + " " + d.getHours().AddZero() + ":" + d.getMinutes().AddZero() + ":" + d.getSeconds().AddZero();
    return theTime;
};
// 小於10的數字補0
Number.prototype.AddZero = function (b, c) {
    var l = (String(b || 10).length - String(this).length) + 1;
    return l > 0 ? new Array(l).join(c || '0') + this : this;
};
//sweetAlert 右上角 小成功
function sweetSmallSuccess(title, timer = 1500) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    })

    Toast.fire({
        icon: 'success',
        title: title
    })
}
//sweetAlert 成功
function sweetSuccess(title, text, timer = 1500) {
    Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        showConfirmButton: false,
        timer: timer
    })
}
//sweetAlert 失敗
function sweetError(title, text) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: text,
        showConfirmButton: false,
        timer: 1500
    })
}
//sweetAlert 資訊
function sweetInfo(title, timer = 3000) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    })

    Toast.fire({
        icon: 'info',
        title: title
    })
}
//檢查localStorage是否過期
function chkTimer() {
    var timer = setInterval(function () {
        if (localStorage.getItem('_expire')) {
            let expireTime = getDataFromLocalStorage('_expire');
            if (new Date().getTime() - expireTime.time > expireTime.expire) {
                sweetInfo('登入逾時，請重新登入', 3000);
                logout()
                clearInterval(timer);
            }
        } else {
            console.log('帳號已登出，localStorage已失效');
            clearInterval(timer);
        }
    }, 1000);
}
//gaPurchase
function gaPurchase(order) {
    gtag("event", "purchase", {
        transaction_id: order.id,
        affiliation: "快取早餐",
        value: order.price,
        currency: "TWD",
        items: order.details.map(item => {
            let itemObj = {
                item_id: item.id,
                item_name: item.name,
                currency: "TWD",
                item_category: catIdToCatName(item.catId),
                price: item.price,
                quantity: item.qty,
                item_variant: item.comment,
            }
            return itemObj;
        })
    });
}
//#endregion