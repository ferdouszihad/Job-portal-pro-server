const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mern-cluster.voqlfwt.mongodb.net/?retryWrites=true&w=majority&appName=mern-cluster`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection

    const db = client.db("job-portal-db");
    const jobsCollection = db.collection("jobs");
    const applicationCollection = db.collection("application");

    //jobs API start

    app.get("/jobs", async (req, res) => {
      try {
        const result = await jobsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });
    app.get("/jobs/details/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (id.length != 24) {
          res.status(500).send({ message: "Id must be 24 character" });
          return;
        }
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.findOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });
    app.get("/jobs/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { hr_email: email };
        const result = await jobsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });
    app.patch("/jobs/increase/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);

        if (id.length != 24) {
          res.status(500).send({ message: "Id must be 24 character" });
          return;
        }
        const query = { _id: new ObjectId(id) };

        const filter = {
          $inc: {
            applicants_count: 1,
          },
        };
        const result = await jobsCollection.updateOne(query, filter);
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    //application api start
    app.get("/application", async (req, res) => {
      try {
        const email = req.query.email;
        const query = { candidate_email: email };
        const result = await applicationCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });
    app.post("/application", async (req, res) => {
      try {
        const data = req.body;
        const isApplied = await applicationCollection.findOne({
          candidate_email: data.candidate_email,
          job_id: data.job_id,
        });

        if (isApplied) {
          res.status(400).send({ status: false, message: "Allready Applied" });
          return;
        }

        const result = await applicationCollection.insertOne(data);
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });
    app.delete("/application/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);

        if (id.length != 24) {
          res.status(500).send({ message: "Id must be 24 character" });
          return;
        }
        const query = { _id: new ObjectId(id) };
        const result = await applicationCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server running on port = ${port}`);
});
