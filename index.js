const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;


const app = express();

//middleware
app.use(cors());
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b9snwll.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const appointmentOptionsCollections = client.db('doctorsPortal').collection('appointOptions')
        const bookingCollections = client.db('doctorsPortal').collection('bookings')
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


        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            console.log(query);
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