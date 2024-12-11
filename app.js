const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const app = express();

const corsOptions = {
  origin: ["http://localhost:3000", "https://nviri-qmbaebyi9-hemanth-pallapothus-projects.vercel.app"], // Allow both localhost and hosted frontend
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const dbPath = path.join(__dirname, "database.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();


const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { email, password} = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM users WHERE email = '${email}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        users (email, password) 
      VALUES 
        (
          '${email}',
          '${hashedPassword}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

// Login

app.post("/login/", async (request, response) => {
  const { email, password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE email = '${email}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        email: email,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

// Users API

app.get("/users/", async (request, response) => {
    const getUsersQuery = `SELECT
        *
      FROM
        users`;
    const users = await db.all(getUsersQuery);
    response.send(users);
});

//Technicians API

app.get("/featured-technicians", authenticateToken, async (request, response) => {
    const getTechniciansQuery = `SELECT
        *
      FROM
        Technician`;
    const technicians = await db.all(getTechniciansQuery);
    response.send(technicians);
});

//Appliance

app.get("/appliances/", authenticateToken, async (request, response) => {
    const getAppliancesQuery = `SELECT
        *
      FROM
        Appliance`;
    const appliances = await db.all(getAppliancesQuery);
    response.send(appliances);
});

// locations

app.get("/locations/", authenticateToken, async (request, response) => {
  const getLocationQuery = `SELECT
      *
    FROM
      Location`;
  const locations = await db.all(getLocationQuery);
  response.send(locations);
});

module.exports = app;