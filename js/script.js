document.getElementById('logInButton').addEventListener('click', logIn)

async function logIn(e) {
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
        window.location.href = 'profile.html';
        form.reset();
    } catch (error) {
        console.error('Error during login:', error);
        form.reset();
        return;
    }
}