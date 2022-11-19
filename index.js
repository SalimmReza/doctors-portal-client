const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


const app = express();

//middleware
app.use(cors());
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b9snwll.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const appointmentOptionsCollections = client.db('doctorsPortal').collection('appointOptions')
        const bookingCollections = client.db('doctorsPortal').collection('bookings')
        const usersCollections = client.db('doctorsPortal').collection('users')
        //use aggregate to query multiple collection merge data
        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date
            const query = {};
            const cursor = appointmentOptionsCollections.find(query);
            const options = await cursor.toArray();
            const bookingQuery = { appointmentDate: date }
            const alreadyBooked = await bookingCollections.find(bookingQuery).toArray();


            options.forEach(options => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === options.name);
                // console.log(optionBooked);
                const bookedSlots = optionBooked.map(book => book.slot)
                const remainingSlots = options.slots.filter(slot => !bookedSlots.includes(slot));
                options.slots = remainingSlots;
                // console.log(remainingSlots.length);
            })

            res.send(options);
        })




        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = { email: email }
            // console.log(query);
            const bookings = await bookingCollections.find(query).toArray();
            res.send(bookings)
        })

        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const query = {
                appointmentDate: bookings.appointmentDate,
                treatment: bookings.treatment,
                email: bookings.email
            }
            const alreadyBooked = await bookingCollections.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `YOU ALREADY HAVE A BOOKING AT ${bookings.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }


            const result = await bookingCollections.insertOne(bookings);
            res.send(result)
        })

        //users

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.TOKEN, { expiresIn: '1d' });
                return res.send({ accessToken: token })
            }

            res.status(403).send({ accessToken: '' })
        })

        app.get('/users', async (re, res) => {
            const query = {};
            const cursor = await usersCollections.find(query).toArray();
            res.send(cursor);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollections.insertOne(user);
            res.send(result);
        })
    }
    finally {

    }

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('doctors portal');
})

app.listen(port, () => {
    console.log(`server running ${port}`);
})