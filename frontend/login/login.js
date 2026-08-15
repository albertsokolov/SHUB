document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("login-root");
    root.innerHTML = `
    <div style="margin: 100px auto; width: 300px; text-align: center; font-family: sans-serif;">
    <h2>Вход для клиентов</h2>
    <input type="text" id="username" placeholder="Логин" style="margin-bottom:10px; width:100%; padding:5px;"><br>
    <input type="password" id="password" placeholder="Пароль" style="margin-bottom:10px; width:100%; padding:5px;"><br>
    <button id="subBtn" style="width:100%; padding:5px;">Войти</button>
    <p id="err" style="color:red;"></p>
    </div>
    `;

    document.getElementById("subBtn").addEventListener("click", async () => {
        const login = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password })
        });
        const data = await res.json();

        if (data.success) {
            window.location.href = "/"; // Переход на базовый корень клиента
        } else {
            document.getElementById("err").innerText = data.message;
        }
    });
});
