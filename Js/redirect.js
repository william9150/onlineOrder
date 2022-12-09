//檢查網址參數
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
                return;
            }
        }).catch(function (error) {
            console.log('無此內用桌號', error);
        });
}