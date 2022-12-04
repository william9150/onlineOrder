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
    $("#selectCat").on('change', function () {
        let catId = $(this).val();
        renderSingleProductAnalysis(catId);
    });
})
//#region ---------- 邏輯流程 ----------

//初始化
function init() {
    //檢查登入狀態
    if (getDataFromLocalStorage('_user')) {
        chkTimer();
    }
    renderNavList(); //渲染nav
    axios.all([getMenu(), getCats(), getFoodAdditions(), getCustomerOrders()])
        .then(() => {
            goToCustomerOrdersPage() //預設顯示出餐管理
        });
    gtag('event', 'screen_view', {
        'app_name': '快取早餐',
        'screen_name': 'backstage'
    });
}
//完成此訂單
function finishOrder(id) {
    let myOrder = theNotDoneOrders.find(x => x.id == id);
    myOrder.isDone = true;
    updateOrder(id, myOrder);
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
//前往營收分析
function goToRevenueAnalysisPage() {
    renderRevenueAnalysis();
    switchPage('revenueAnalysis');
}
//前往前台頁面
function goToIndex() {
    window.location.href = 'index.html';
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
//新增產品
function btnAddProduct() {
    let myProduct = {
        "name": "",
        "catId": "",
        "img": "",
        "comment": "",
        "isSoldOut": false,
        "price": 0,
        "additionIds": []
    }
    renderProductEditModal(myProduct);
}
//儲存新產品
function btnSaveNewProduct() {
    let name = $("#productEditModal .modal-body input[name='name']").val();
    if (!name) {
        sweetWarning('請填寫商品名稱');
        return;
    }
    let catId = $("#productEditModal .modal-body select[name='catId']").val();
    let img = $("#productEditModal .modal-body input[name='img']").val();
    let comment = $("#productEditModal .modal-body input[name='comment']").val();
    let isSoldOut = $("#productEditModal .modal-body input[name='isSoldOut']:checked").val() == 'true';
    let price = parseInt($("#productEditModal .modal-body input[name='price']").val());
    if (price < 1) {
        sweetWarning('請填寫商品價格', '價格太低啦!!');
        return;
    }
    let additionIds = [];
    $("#productEditModal .modal-body input[name='additionIds']:checked").each((index, x) => additionIds.push(x.value));

    let model = { name, catId, img, comment, isSoldOut, price, additionIds };
    addNewProduct(model);
}

//附加選項id轉name
function additionIdToName(additionId) {
    let name = Object.values(theFoodAdditions).reduce((a, b) => [...a, ...b.items], []).find(item => item.id == additionId)?.name
    return name ? name : '';
}

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
//sweetAlert 警告
function sweetWarning(title, text) {
    Swal.fire({
        icon: 'warning',
        title: title,
        text: text,
        showConfirmButton: false,
        timer: 1500
    })
}
//檢查localStorage是否過期
function chkTimer() {
    var timer = setInterval(function () {
        if (localStorage.getItem('_expire')) {
            let expireTime = getDataFromLocalStorage('_expire');
            if (new Date().getTime() - expireTime.time > expireTime.expire) {
                logout()
                clearInterval(timer);
            }
        } else {
            console.log('帳號已登出，localStorage已失效');
            clearInterval(timer);
        }
    }, 1000);
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
            sweetSmallSuccess('更新成功');
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
            sweetSuccess('更新成功', '商品已更新');
        }).catch(function (error) {
            console.log('error', error);
        });
}
//新增產品資料
function addNewProduct(model) {
    const token = getDataFromLocalStorage('_token');
    const config = { headers: { 'Authorization': `Bearer ${token}` } }
    axios.post(`${urlDomain}/products`, model, config)
        .then(function (response) {
            getMenu();
            $("#productEditModal").modal("hide")
            sweetSuccess('新增成功', '商品已新增');
        }).catch(function (error) {
            console.log('error', error);
        });
}
//取得食品附加項目
function getFoodAdditions() {
    axios.get(`${urlDomain}/additions`)
        .then(function (response) {
            theFoodAdditions = response.data;
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
        <span class="nav-link finger" onclick="goToRevenueAnalysisPage()">營收分析</span>
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
//渲染營收分析
function renderRevenueAnalysis() {
    let selectOptions = [`<option value="all">全品項</option>`];
    theCats.forEach(cat => selectOptions.push(`<option value="${cat.id}">${cat.name}</option>`));
    $("#selectCat").html(selectOptions.join(""));
    renderSingleProductAnalysis('all');
    let allSoldProducts = Object.values(theAllOrders).reduce((a, b) => [...a, ...b.details], [])
    let catAnalysisPrice = []
    let catAnalysisCount = []
    theCats.forEach(cat => {
        let soldProducts = allSoldProducts.filter(x => x.catId == cat.id);
        let soldCount = soldProducts.reduce((a, b) => a + b.qty, 0);
        let soldPrice = soldProducts.reduce((a, b) => a + (b.price * b.qty), 0);
        catAnalysisPrice.push([cat.name, soldPrice])
        catAnalysisCount.push([cat.name, soldCount])
    })
    var chart2 = c3.generate({
        bindto: "#chart2", // 綁定的 HTML 元素
        data: {
            columns: catAnalysisCount,
            type: 'donut',
        },
        donut: {
            title: "銷售數量"
        },
        size: {
            width: 350,
        }
    });
    var chart3 = c3.generate({
        bindto: "#chart3", // 綁定的 HTML 元素
        data: {
            columns: catAnalysisPrice,
            type: 'donut',
        },
        donut: {
            title: "銷售金額"
        },
        size: {
            width: 350,
        }
    });
}
//渲染單品銷售概況(sort by cat)(chart1)
function renderSingleProductAnalysis(catOption = 'all') {
    let allSoldProducts = Object.values(theAllOrders).reduce((a, b) => [...a, ...b.details], [])
    let productMenu = ["品項"];
    let productAnalysisPrice = ["金額"];
    let productAnalysisCount = ["銷量"];
    theMenu.forEach(menu => {
        if (catOption == 'all' || menu.id == catOption) {
            menu.products.forEach(product => {
                let soldProducts = allSoldProducts.filter(x => x.id == product.id);
                let soldCount = soldProducts.reduce((a, b) => a + b.qty, 0);
                let soldPrice = soldProducts.reduce((a, b) => a + (b.price * b.qty), 0);
                if (catOption != 'all' || soldCount > 0) {
                    productMenu.push(product.name);
                    productAnalysisPrice.push(soldPrice)
                    productAnalysisCount.push(soldCount)
                }
            })
        }
    })

    let q1 = [productMenu, productAnalysisCount, productAnalysisPrice];

    var chart1 = c3.generate({
        bindto: "#chart1", // 綁定的 HTML 元素
        data: {
            x: "品項",
            columns: q1,
            axes: {
                "銷量": "y",
                "金額": "y2"
            },
            type: 'bar',
            selection: {
                enabled: true,
                grouped: true
            },
            labels: {
                format: {
                    "金額": d3.format("$"),
                    "銷量": d3.format(",")
                }
            },
            order: 'asc'
        },
        bar: {
            width: {
                ratio: 0.85 // this makes bar width 50% of length between ticks
            }
        },
        axis: {
            x: { type: 'category' },
            y: {
                label: {
                    text: 'Count',
                    position: 'outer-middle'
                }
            },
            y2: {
                show: true,
                tick: {
                    format: d3.format("$")
                },
                label: {
                    text: 'Price',
                    position: 'outer-middle'
                }
            }
        },
    });
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
    $("#productEditModal .modal-footer button").attr('onclick', `${model?.id ? 'btnSaveEditProduct()' : 'btnSaveNewProduct()'}`);
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