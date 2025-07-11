document.getElementById('logInButton').addEventListener('click', logIn)

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('jwtToken')
    if (!token) {
        document.getElementById("logIn").style.display = "block"
        document.getElementById("profileSection").style.display = "none"
    } else {
        document.getElementById("logIn").style.display = "none"
        Profile()
    }
})

async function logIn(e) {
    document.getElementById("errorMessage").textContent = ""
    const token = localStorage.getItem('jwtToken')
    e.preventDefault();
    const form = document.getElementById('logInForm');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const base64 = btoa(`${username}:${password}`);
    try {
        const response = await fetch("https://learn.zone01oujda.ma/api/auth/signin", {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${base64}`,
                'Content-Type': 'application/json',
            }
        })
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const token = (await response.text());
        if (!token) {
            throw new Error("JWT token not found in the response headers");
        }

        console.log('Login successful:');
        const cleanToken = token.replace(/^"(.*)"$/, '$1');
        localStorage.setItem('jwtToken', cleanToken);
        document.getElementById("logIn").style.display = "none";
        Profile()
        form.reset();
    } catch (error) {
        console.error('Error during login:', error);
        document.getElementById("errorMessage").textContent = "failed to log in"
        form.reset();
        return;
    }
}