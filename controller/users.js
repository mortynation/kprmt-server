const express = require('express')
const router = express.Router()
const pool = require('../respository/db')
const bcrypt = require('bcryptjs')
const {check, validationResult} = require('express-validator')
const RegisterUser = require('../model/registerUser')
const LoginUser = require('../model/loginUser')

router.post('/register', [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Email is required').not().isEmpty(),
    check('password', 'Password is required').isLength({min: 6})
] ,async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() })
    }
    try{
        const { username, email, password } = req.body
        const newUser = new RegisterUser(username, email, password)
        let userName = await (await pool.query('SELECT username FROM users WHERE username = $1', [newUser.username])).rows[0]
        let userEmail = await (await pool.query('SELECT email FROM users WHERE email = $1', [newUser.email])).rows[0]
        if (userName || userEmail) {
            return res.status(400).json({ message: 'User already exists' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newUser.password, salt)
        newUser.password = hashedPassword

        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
            [newUser.username, newUser.email, newUser.password]
        )

        res.status(201).json(`User: ${newUser.username} has been registered successfully`)

    } catch (err) {
        console.error('Error inserting user:', err)
        res.status(500).json({ message: err.message })
    }
})

router.post('/login', [
    check('email', 'Email is required').not().isEmpty(),
    check('password', 'Password is required').exists()
], async(req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    try {
        const { email, password } = req.body
        const user = new LoginUser(email, password)
        const currUser = (await pool.query('SELECT email FROM users')).rows.find(e => e.email === user.email)
        if (!currUser.email) {
            return res.json(400).json({ message: 'Invalid credentials' })
        }
        const currUserPassword = (await pool.query(`SELECT password FROM users WHERE email = $1`, [currUser.email])).rows[0].password
        const isMatch = await bcrypt.compare(user.password, currUserPassword)
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' })
        }
        res.json({message: `${currUser.email} has been logged in` })

    } catch (error) {
        res.status(400).json({ message: error.message })
    }

})

module.exports = router
