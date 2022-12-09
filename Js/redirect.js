//檢查網址參數
const expireMins = 30; //登入過期時間(分鐘)
// const urlDomain = 'http://localhost:3000';
const urlDomain = 'https://json-server-vercel-a.vercel.app';
const indexUrl = 'https://coldingpotato.github.io/onlineOrder';
const urlParams = new URLSearchParams(window.location.search);
const isInsider = urlParams.has('insider');
if (isInsider) {
    login('A3@store.com', 'abc123');
} else {
    window.location.href = indexUrl
}

function login(email, password) {
    axios.post(`${urlDomain}/login`, { email: email, password: password })
        .then(function (response) {
            gtag("event", "login", {
                method: "內用"
            });
            saveDataToLocalStorage('_token', response.data.accessToken);
            saveDataToLocalStorage('_user', response.data.user);
            saveDataToLocalStorage('_expire', { time: new Date().getTime(), expire: expireMins * 60 * 1000 });
            if (response.data.user.role == 'insider') {
                window.location.href = indexUrl
                console.log('check point B')
                return;
            }
        }).catch(function (error) {
            console.log('無此內用桌號', error);
        });
}

//save data in local storage
function saveDataToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}