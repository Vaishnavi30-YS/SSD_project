
require('dotenv').config()

async function testAdminLogin() {
    try {
        const response = await fetch(
            'http://localhost:5000/api/v1/auth/login',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    university_roll_no: process.env.ADMIN_ROLL_NO,
                    password: process.env.ADMIN_PASSWORD
                })
            }
        )

        const result = await response.json()

        console.log('HTTP Status:', response.status)
        console.log('Login successful:', result.success)
        console.log('Message:', result.message)

        if (result.success) {
            console.log('User:', result.user)
            console.log('JWT token generated:', Boolean(result.token))
        }
    } catch (error) {
        console.error('Test failed:', error.message)
    }
}

testAdminLogin()
