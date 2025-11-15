// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// const port = process.env.PORT || 5000;
// const app = express();

// app.use(cors());
// app.use(express.json());

// // MongoDB connection setup
// const uri = `mongodb+srv://${(process.env.DB_user)}:${(process.env.DB_pass)}@cluster0.khtuk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });

// async function connectMongoDB() {
//     try {
//         await client.connect(); // ✅ MUST CONNECT FIRST
//         console.log("✅ Connected to MongoDB");






//         app.get('/', (req, res) => {
//             res.send('Server is running');
//         });

//         // Start the server
//         app.listen(port, () => {
//             console.log(`Server is running on port ${port}`);
//         });
//     } catch (error) {
//         console.error('Error connecting to MongoDB:', error);
//         process.exit(1);  // Exit process if the connection fails
//     }
// }

// connectMongoDB();


// server.js (or index.js) — modify your existing file
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.khtuk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, },
});

async function connectMongoDB() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");

        const db = client.db('formybaby'); // choose DB name
        const countersCol = db.collection('counters');
        const messagesCol = db.collection('messages');

        // Ensure there's a single counters doc
        async function ensureCountersDoc() {
            const doc = await countersCol.findOne({});
            if (!doc) {
                await countersCol.insertOne({
                    hugs: 0,
                    kisses: 0,
                    sorrys: 0,
                    roses: 0,
                    createdAt: new Date(),
                });
            }
        }
        await ensureCountersDoc();

        app.get('/', (req, res) => res.send('Server is running'));

        // GET counts
        app.get('/counts', async (req, res) => {
            try {
                const doc = await countersCol.findOne({});
                if (!doc) return res.json({ hugs: 0, kisses: 0, sorrys: 0, roses: 0 });
                const { _id, createdAt, ...counts } = doc;
                res.json(counts);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // POST increment counts
        app.post('/counts/increment', async (req, res) => {
            try {
                const { key, delta } = req.body;
                const allowed = ['hugs', 'kisses', 'sorrys', 'roses'];
                if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid key' });
                const inc = parseInt(delta, 10) || 0;
                // find and update single doc
                const update = await countersCol.findOneAndUpdate({}, { $inc: { [key]: inc } }, { returnDocument: 'after' });
                const doc = update.value;
                // ensure non-negative
                if (doc[key] < 0) {
                    await countersCol.updateOne({}, { $set: { [key]: 0 } });
                    doc[key] = 0;
                }
                res.json({ success: true, counts: doc });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // POST message
        app.post('/messages', async (req, res) => {
            try {
                const { text, category } = req.body;
                const allowed = ['happy', 'sorry', 'sad', 'mind'];
                const cat = allowed.includes(category) ? category : 'happy';
                const doc = {
                    text: String(text || '').trim(),
                    category: cat,
                    createdAt: new Date(),
                };
                if (!doc.text) return res.status(400).json({ error: 'Empty message' });
                const result = await messagesCol.insertOne(doc);
                res.json({ success: true, id: result.insertedId });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // GET messages (optional category filter)
        app.get('/messages', async (req, res) => {
            try {
                const { category } = req.query;
                const q = {};
                if (category) q.category = category;
                const docs = await messagesCol.find(q).sort({ createdAt: -1 }).limit(200).toArray();
                res.json(docs);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        app.listen(port, () => console.log(`Server running on port ${port}`));
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

connectMongoDB();
