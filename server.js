const express = require('express')
const dotenv = require('dotenv')
const app = express()

app.use(express.json())
dotenv.config()

app.use('/users', require('./controller/users'))

app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`))




