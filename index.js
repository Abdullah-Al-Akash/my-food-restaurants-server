const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_KEY, {
  apiVersion: "2025-04-30.basil",
});
// middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Database Connection:
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@bistrodb.ff4mfop.mongodb.net/?retryWrites=true&w=majority&appName=bistroDb`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("bistroDb");
    const menuCollecntion = db.collection("menu");
    const reviewsCollection = db.collection("reviews");
    const cartsCollecntion = db.collection("carts");
    const userCollecntion = db.collection("users");
    const paymentCollecntion = db.collection("payments");

    // Token Related API:
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // Verify Token Middleware:
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbidden Access!" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Verify Admin Middleware:
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollecntion.findOne(query);
      const isAmin = user?.role === "admin";
      if (!isAmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // Check Admin:
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req?.params?.email;
      if (!req.decoded || email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized Access!" });
      }

      const query = { email: email };
      const user = await userCollecntion.findOne(query);
      let isAdmin = false;
      if (user) {
        isAdmin = user.role === "admin" ? true : false;
      }
      res.send({ isAdmin });
    });

    // Order Status Update API:
    app.patch(
      "/update-status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const status = req.body;
        console.log(status.status);
        const query = {_id : new ObjectId(id)};
        const updateStatus = {
          $set: {
            status: status.status
          }
        }
        const result = await paymentCollecntion.updateOne(query, updateStatus);
        res.send(result);
      }
    );

    // User Related API:
    app.patch("/user/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateToAdmin = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollecntion.updateOne(query, updateToAdmin);
      res.send(result);
    });
    app.delete("users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollecntion.deleteOne(query);
      res.send(result);
    });
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollecntion.find({}).toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollecntion.insertOne(user);
      res.send(result);
    });
    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const result = await userCollecntion.find({ email: email }).toArray();
      console.log(result);
      res.send(result[0]);
    });

    app.patch("/user/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { photo } = req.body;
      console.log(req.body);

      try {
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            photo: photo,
          },
        };

        const result = await userCollecntion.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Menu Item API:
    app.get("/menu", async (req, res) => {
      const result = await menuCollecntion.find({}).toArray();
      res.send(result);
    });

    app.delete("/item/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollecntion.deleteOne(query);
      res.send(result);
    });

    app.patch("/item/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { name, category, price, recipe } = req.body;
      console.log(req.body);

      try {
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            name,
            category,
            price,
            recipe,
          },
        };

        const result = await menuCollecntion.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Carts:
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollecntion.deleteOne(query);
      res.send(result);
    });
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      result = await cartsCollecntion.find({ email }).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollecntion.insertOne(cartItem);
      res.send(result);
    });

    // Payment Create and Intent:
    app.post("/create-payment", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // After Payment Done:
    app.post("/payment-done", async (req, res) => {
      const paymentInfo = req.body;
      const paymentResult = await paymentCollecntion.insertOne(paymentInfo);

      // After Payment Card Will be deleted:
      const query = {
        _id: {
          $in: paymentInfo.cartIds.map((id) => new ObjectId(id)),
        },
      };
      console.log(query);
      const deletedResult = await cartsCollecntion.deleteMany(query);
      res.send(paymentResult, deletedResult);
    });

    // Payment History:
    app.get("/payment", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await paymentCollecntion.find(query).toArray();
      res.send(result);
    });

    // After Payment Food Details:
    app.get("/food-details/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const queryForPayment = { _id: new ObjectId(id) };
      const paymentInfo = await paymentCollecntion
        .find(queryForPayment)
        .toArray();

      // Now Get The Item:
      const foodIds = paymentInfo[0].foodIds;
      const queryForFood = {
        _id: {
          $in: foodIds.map((id) => new ObjectId(id)),
        },
      };
      const result = await menuCollecntion.find(queryForFood).toArray();
      res.send(result);
    });

    // Admin Manage Order Details:
    app.get("/orders", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollecntion.find().toArray();
      res.send(result);
    });

    // Admin Stats:
    app.get("/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollecntion.estimatedDocumentCount();
      const menuItems = await menuCollecntion.estimatedDocumentCount();
      const orders = await paymentCollecntion.estimatedDocumentCount();
      const result = await paymentCollecntion
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$price",
              },
            },
          },
        ])
        .toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItems,
        orders,
        revenue,
      });
    });

    // Order Stats:
    app.get("/order-stats", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollecntion
        .aggregate([
          { $unwind: "$foodIds" },
          {
            $addFields: {
              foodObjectId: { $toObjectId: "$foodIds" }, // ✅ ObjectId বানানো
            },
          },
          {
            $lookup: {
              from: "menu",
              localField: "foodObjectId",
              foreignField: "_id",
              as: "menuItems",
            },
          },
          {
            $unwind: "$menuItems",
          },
          {
            $group: {
              _id: "$menuItems.category",
              quantity: {
                $sum: 1,
              },
              revenue: {
                $sum: "$menuItems.price",
              },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              quantity: "$quantity",
              revenue: "$revenue",
            },
          },
        ])
        .toArray();

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Boss is Sitting!!!!!");
});

app.listen(port, () => {
  console.log(`Bistro Boss is Sitting on Port: ${port}`);
});
