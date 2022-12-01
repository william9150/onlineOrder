//#region ---------- 全域變數 ----------
let theCustomerOrders = []; //客戶訂單資料
// const urlDomain = 'http://localhost:3000';
const urlDomain = 'https://json-server-vercel-a.vercel.app';

//#endregion
$(function () {
    if (!getDataFromLocalStorage('_token') || !getDataFromLocalStorage('_user') || getDataFromLocalStorage('_user').role != 'admin') {
        window.location.href = 'index.html';
    }
    GetCustomerOrders();
})
//#region ---------- 邏輯流程 ----------

//#endregion

//#region ---------- API ----------

//取得客戶訂單資訊
function GetCustomerOrders() {
    const userId = getDataFromLocalStorage('_user').id;
    const token = getDataFromLocalStorage('_token');
    const config = { headers: { 'Authorization': `Bearer ${token}` } }
    axios.get(`${urlDomain}/orders?isDone=false`, config)
        .then(function (response) {
            theCustomerOrders = response.data.reverse();
            //顛倒順序theUserOrders.reverse();
            renderCustomerOrders();
        }).catch(function (error) {
            console.log('error', error);
            theUserOrders = [];
            renderCustomerOrders();
        });

}



//#endregion

//#region ---------- 畫面渲染 ----------

//顯示客戶訂單資訊
function renderCustomerOrders() {
    let orderContents = [];
    theCustomerOrders.forEach(function (item, index) {
        let { id, name, phone, comment, price, orderDate, orderTime, takeWay, isPaid, isDone, details } = item;
        let detailContents = details.map(x => {
            return `<div class="餐點內容">
                        <div><span>${x.name}</span></div>
                        <div class="fw-light d-flex justify-content-end"><span>${x.comment}</span></div>
                        <div class="fw-light d-flex justify-content-end"><span>${x.qty}份</span></div>
                    </div>`
        })
        let content = `
        <div class="">
            <div class="foodCard">
                <div class="顧客資訊">
                    <div class="d-flex justify-content-between"><span>編號</span><span>${id}</span></div>
                    <div class="d-flex justify-content-between"><span>狀態</span><span>${isDone ? '已完成' : '處理中'}</span></div>
                    <div class="d-flex justify-content-between"><span>訂購人</span><span>${name}</span></div>
                    <div class="d-flex justify-content-between"><span>電話</span><span>${phone}</span></div>
                    <div class="d-flex justify-content-between"><span>總金額</span><span>$${price}</span></div>
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