const express = require('express');
const app = express();
const cors = require("cors");
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// Database Connection:
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@bistrodb.ff4mfop.mongodb.net/?retryWrites=true&w=majority&appName=bistroDb`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("bistroDb");
    const menuCollecntion = db.collection("menu");
    const reviewsCollecntion = db.collection("reviews");
    const cartsCollecntion = db.collection("carts");

    // Load Menu:
    app.get("/menu", async(req, res) => {
        const result = await menuCollecntion.find({}).toArray();
        res.send(result);
    })

    // Carts:
    app.delete("/carts/:id", async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cartsCollecntion.deleteOne(query);
      res.send(result);
    })
    app.get("/carts", async(req, res) => {
      const email = req.query.email;
      result = await cartsCollecntion.find({email}).toArray();
      res.send(result);
    })
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollecntion.insertOne(cartItem);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res)=>{
    res.send("Boss is Sitting!!!!!")
})

app.listen(port, () => {
    console.log(`Bistro Boss is Sitting on Port: ${port}`);
})