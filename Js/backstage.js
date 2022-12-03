//#region ---------- 全域變數 ----------
let theNotDoneOrders = []; //未完成的 客戶訂單資料
let theAllOrders = []; //全部的 客戶訂單
let theDoneOrders = []; //已完成的 客戶訂單資料
let theMenu = []; //存放菜單的陣列(sort by catId)(cat 底下再放 products)
let theCats = []; //商品類別
let theFoodAdditions = []; //食品附加選項
let theProducts = []; //存放菜單的陣列(sort by productId)
// const urlDomain = 'http://localhost:3000';
const urlDomain = 'https://json-server-vercel-a.vercel.app';

//#endregion
$(function () {
    if (!getDataFromLocalStorage('_token') || !getDataFromLocalStorage('_user') || getDataFromLocalStorage('_user').role != 'admin') {
        window.location.href = 'index.html';
    }
    init();
})
//#region ---------- 邏輯流程 ----------

//初始化
function init() {
    renderNavList(); //渲染nav
    axios.all([getMenu(), getCats(), getFoodAdditions(), getCustomerOrders()])
        .then(() => {
            goToCustomerOrdersPage() //預設顯示出餐管理
        });
}
//完成此訂單
function finishOrder(id) {
    let myOrder = theNotDoneOrders.find(x => x.id == id);
    myOrder.isDone = true;
    updateOrder(id, myOrder);
}
//前往前台頁面
function goToIndex() {
    window.location.href = 'index.html';
}
//切換顯示的訂單類型
function switchOrders(status) {
    renderCustomerOrders(status);
}
//logout
function logout() {
    deleteDataFromLocalStorage('_token');
    deleteDataFromLocalStorage('_user');
    deleteDataFromLocalStorage('returnModal');
    goToIndex();
}
//切換分頁的顯示
function switchPage(page) {
    $('.page').hide();
    $(`.page.${page}`).show();
}

//前往產品管理頁面
function goToProductManagePage() {
    renderProductManageTable();
    switchPage('productManage');
}
//前往出餐管理
function goToCustomerOrdersPage() {
    renderCustomerOrders('notDone');
    switchPage('customerOrders');
}
//編輯商品
function btnEditProduct(id) {
    let myProduct = theProducts.find(x => x.id == id);
    renderProductEditModal(myProduct);
}

//更新產品
function btnSaveEditProduct() {
    let id = $("#productEditModal .modal-body").attr('data-id');
    let name = $("#productEditModal .modal-body input[name='name']").val();
    let catId = $("#productEditModal .modal-body select[name='catId']").val();
    let img = $("#productEditModal .modal-body input[name='img']").val();
    let comment = $("#productEditModal .modal-body input[name='comment']").val();
    let isSoldOut = $("#productEditModal .modal-body input[name='isSoldOut']:checked").val() == 'true';
    let price = parseInt($("#productEditModal .modal-body input[name='price']").val());
    let additionIds = [];
    $("#productEditModal .modal-body input[name='additionIds']:checked").each((index, x) => additionIds.push(x.value));

    let model = { id, name, catId, img, comment, isSoldOut, price, additionIds };
    updateProduct(id, model);
}
//附加選項id轉name
function additionIdToName(additionId) {
    let name = Object.values(theFoodAdditions).reduce((a, b) => [...a, ...b.items], []).find(item => item.id == additionId)?.name
    return name ? name : '';
}
//#endregion

//#region ---------- API ----------

//取得全部 客戶訂單資訊
function getCustomerOrders() {
    const userId = getDataFromLocalStorage('_user').id;
    const token = getDataFromLocalStorage('_token');
    const config = { headers: { 'Authorization': `Bearer ${token}` } }
    axios.get(`${urlDomain}/orders`, config)
        .then(function (response) {
            theAllOrders = response.data;
            theNotDoneOrders = response.data.filter(x => x.isDone == false);
            theDoneOrders = response.data.filter(x => x.isDone == true);
            renderCustomerOrders();
            renderFooter();
        }).catch(function (error) {
            console.log('error', error);
            theUserOrders = [];
            renderCustomerOrders();
        });

}
//更新部分訂單資訊
function updateOrder(id, data) {
    const token = getDataFromLocalStorage('_token');
    const config = { headers: { 'Authorization': `Bearer ${token}` } }
    axios.put(`${urlDomain}/orders/${id}`, data, config)
        .then(function (response) {
            getCustomerOrders();
        }).catch(function (error) {
            console.log('error', error);
        });
}
//取得菜單資料
function getMenu() {
    axios.get(`${urlDomain}/cats?_embed=products`).then(function (response) {
        theMenu = response.data;
        theProducts = theMenu.reduce((a, b) => [...a, ...b.products], [])
        renderProductManageTable()
    }).catch(function (error) {
        console.log('error', error);
    });
}
//取得商品類別
function getCats() {
    return new Promise((resolve, reject) => {
        axios.get(`${urlDomain}/cats`).then(function (response) {
            theCats = response.data;
            resolve(response.data);
        }).catch(function (error) {
            console.log('error', error);
            reject(error);
        });
    })
}
//更新產品資料
function updateProduct(id, model) {
    const token = getDataFromLocalStorage('_token');
    const config = { headers: { 'Authorization': `Bearer ${token}` } }
    axios.put(`${urlDomain}/products/${id}`, model, config)
        .then(function (response) {
            getMenu();
            $("#productEditModal").modal("hide")
        }).catch(function (error) {
            console.log('error', error);
        });
}
//取得食品附加項目
function getFoodAdditions() {
    axios.get(`${urlDomain}/additions`)
        .then(function (response) {
            theFoodAdditions = response.data;
            console.log('theFoodAdditions', theFoodAdditions);
            // renderFoodAddition();
        }).catch(function (error) {
            console.log('error', error);
        });
}
//#endregion

//#region ---------- 畫面渲染 ----------

//顯示客戶訂單資訊
function renderCustomerOrders(status = 'false') {

    let targetArr = theNotDoneOrders;
    switch (status) {
        case 'true':
            targetArr = theDoneOrders;
            break;
        case 'all':
            targetArr = theAllOrders;
            break;
        case 'false':
            targetArr = theNotDoneOrders;
            break;
        default:
            targetArr = theNotDoneOrders;
            break;
    }
    let orderContents = [];
    targetArr.forEach(function (item, index) {
        let { id, name, phone, comment, price, orderDate, orderTime, takeWay, isPaid, isDone, details } = item;
        let detailContents = details.map(x => {
            return `<div class="餐點內容">
                        <div><span>${x.name}</span></div>
                        <div class="fw-light d-flex justify-content-end"><span>${x.comment}</span></div>
                        <div class="fw-light d-flex justify-content-end"><span>${x.additems.map(addi => additionIdToName(addi)).join("/")}</span></div>
                        <div class="fw-light d-flex justify-content-end"><span>${x.qty}份</span></div>
                    </div>`
        })
        let content = `
        <div class="">
            <div class="foodCard">
                <div class="顧客資訊">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="py-1"><u>${isDone ? '已完成' : '處理中'}</u></span>
                        ${isDone ? '' : `<div class="d-flex justify-content-end"><button class="btn btn-my-primary" onclick="finishOrder('${id}')">完成此訂單</button></div>`}    
                    </div>                                    
                    <div class="d-flex justify-content-between"><span>編號</span><span>${id}</span></div>                    
                    <div class="d-flex justify-content-between"><span>訂購人</span><span>${name}</span></div>
                    <div class="d-flex justify-content-between"><span>電話</span><span>${phone}</span></div>
                    <div class="d-flex justify-content-between"><span>總金額</span><span class="text-danger">$${price}</span></div>
                </div>
                <hr class="m-1" />
                ${detailContents.join('')}
            </div>
        </div>
        `
        orderContents.push(content);
    });
    document.querySelector('#customerOrders').innerHTML = orderContents.join('');
}
//渲染NAV清單
function renderNavList() {
    let isLogin = getDataFromLocalStorage('_token') ? true : false;
    let userNameContent = "";
    let loginoutContent = `<span class="nav-link finger" href="" onclick="showLoginModal('login')">登入/註冊</span>`;
    if (isLogin) {
        userNameContent = `
        <li class="nav-item" id="navLoginArea">
            <span class="nav-link" href="" id="">早安!  <b>${getDataFromLocalStorage('_user').name}</b></span>
        </li>
        ` ;
        loginoutContent = `<span class="nav-link finger" href="" onclick=
        "logout()">登出</span>`
    }

    let content = `
    ${userNameContent}
    <li class="nav-item">
        <span class="nav-link finger" onclick="goToCustomerOrdersPage()">出餐管理</span>
    </li>
    <li class="nav-item">
        <span class="nav-link finger" onclick="goToProductManagePage()">菜單管理</span>
    </li>
    <li class="nav-item">
        <span class="nav-link finger" onclick="">營收分析</span>
    </li>
    <li class="nav-item">
        <span class="nav-link finger" onclick="goToIndex()">切換至前台</span>
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
            <span class="ms-2 finger" onclick="demoInput('')">老闆-阿姨</span>
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
//渲染footer
function renderFooter() {

    $("#allOrdersCount").html(theAllOrders.length);
    $("#doneOrdersCount").html(theDoneOrders.length);
    $("#notDoneOrdersCount").html(theNotDoneOrders.length);
}
//渲染產品管理
function renderProductManageTable() {

    let contents = [];
    theProducts.forEach((product, index) => {
        let { id, name, price, catId, comment, img, isSoldOut, additionIds } = product;
        let content = `
        <tr class="text-center">
            <td>${name}</td>
            <td>${theCats.find(x => x.id == catId)?.name || catId}</td>
            <td>
                <img src="${img}" alt="" class="tableFoodImg">
            </td>
            <td width="25%">${comment}</td>            
            <td>${additionIds.map(myadd => theFoodAdditions.find(theAdd => theAdd.id == myadd)?.name)}</td>
            <td class="${isSoldOut ? 'text-danger' : ''}">${isSoldOut ? '已售完' : '販售中'}</td>          
            <td>$${price}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="btnEditProduct('${id}')">編輯</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${id}')" hidden>刪除</button>
            </td>
        </tr>
        `
        contents.push(content);
    });
    // console.log(contents);
    $("#productManageList").html(contents.join(''));
    // $("#productManage table ").html('abcdddd');
}
//渲染產品編輯Modal
function renderProductEditModal(model) {
    let additionContents = theFoodAdditions.map(addition => {
        return `
        <input type="checkbox" class="btn-check" name="additionIds" id="edit-add-${addition.id}" value="${addition.id}" ${model.additionIds.includes(addition.id) ? 'checked' : ''}>
        <label class="btn btn-pill-primary" for="edit-add-${addition.id}" >${addition.name}</label>
        `
    })
    $("#productEditModal .modal-body").attr('data-id', model.id);
    $("#productEditModal .modal-body input[name='name']").val(model.name);
    let catContents = theCats.map(x => `<option value="${x.id}" ${model.catId == x.id ? 'selected' : ''}>${x.name}</option>`);
    $("#productEditModal .modal-body select[name='catId']").html(catContents);
    $("#productEditModal .modal-body input[name='img']").val(model.img);
    $("#productEditModal .modal-body input[name='comment']").val(model.comment);
    $("#productEditModal .modal-body div[name='additionIds']").html(additionContents.join(""));
    $(`#productEditModal .modal-body input[name='isSoldOut']`).prop('checked', false);
    $(`#productEditModal .modal-body input[name='isSoldOut'][value='${model.isSoldOut}']`).prop('checked', true);
    $("#productEditModal .modal-body input[name='price']").val(model.price);
    $("#productEditModal").modal("show")
}

//#endregion

//#region ---------- 其他 ----------

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

//#endregion