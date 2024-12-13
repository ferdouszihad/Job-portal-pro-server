const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cookieParser());
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://career-portal-ph.web.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { config } = require("dotenv");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mern-cluster.voqlfwt.mongodb.net/?retryWrites=true&w=majority&appName=mern-cluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log(token);
  if (!token) {
    res.status(401).send({ message: "unauthorized access" });
    return;
  }
  jwt.verify(token, process.env.ADMIN_TOKEN, (err, decoded) => {
    if (err) {
      res.status(403).send({ message: "Forbidden access" });
      return;
    } else {
      req.user = decoded;
      next();
    }
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const db = client.db("job-portal-db");
    const jobsCollection = db.collection("jobs");
    const applicationCollection = db.collection("application");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ADMIN_TOKEN, {
        expiresIn: "24h",
      });
      // console.log(token);
      res.cookie("token", token, cookieOptions).send({ status: true });
    });

    app.post("/logOut", async (req, res) => {
      res
        .clearCookie("token", cookieOptions)
        .send({ success: true, message: "data cleared" });
    });

    //jobs API start

    app.get("/jobs", async (req, res) => {
      try {
        const result = await jobsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.get("/jobs/available", async (req, res) => {
      try {
        const date = new Date().toISOString().split("T")[0];
        const query = { applicationDeadline: { $gte: date } }; //will do lexicographic comparison
        const result = await jobsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });
    app.post("/jobs", verifyToken, async (req, res) => {
      try {
        const result = await jobsCollection.insertOne(req.body);
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
    app.get("/jobs/user/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { hr_email: email };
        const result = await jobsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });
    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);

        if (id.length != 24) {
          res.status(500).send({ message: "Id must be 24 character" });
          return;
        }
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.put("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const newData = req.body;
        console.log(id, newData);

        if (id.length != 24) {
          res.status(500).send({ message: "Id must be 24 character" });
          return;
        }
        const query = { _id: new ObjectId(id) };

        const filter = {
          $set: {
            ...newData,
          },
        };
        const result = await jobsCollection.updateOne(query, filter, {
          upsert: true,
        });
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
    app.get("/application", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const query = { candidate_email: email };
        const result = await applicationCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.get("/application/jobs/:id", async (req, res) => {
      try {
        const email = req.query.email;
        const id = req.params.id;
        const query = { hr_email: email, job_id: id };
        console.log(query);
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

    app.patch("/application/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        console.log(id);
        if (id.length != 24) {
          res.status(500).send({ message: "Id must be 24 character" });
          return;
        }
        const query = { _id: new ObjectId(id) };

        const filter = {
          $set: {
            status,
          },
        };
        const result = await applicationCollection.updateOne(query, filter);
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
