require("dotenv").config();
const bcrypt = require("bcrypt");
const uuidv4 = require("uuid/v4");
const { Pool } = require("pg");
const tableNames = require("../constants/database-table-names");

const pool = new Pool({
  user:
    process.env.ENVIRONMENT === "dev"
      ? process.env.DB_USER
      : process.env.PROD_DB_USER,
  host:
    process.env.ENVIRONMENT === "dev"
      ? process.env.DB_HOST
      : process.env.PROD_DB_HOST,
  database:
    process.env.ENVIRONMENT === "dev"
      ? process.env.DB_NAME
      : process.env.PROD_DB_NAME,
  password:
    process.env.ENVIRONMENT === "dev"
      ? process.env.DB_PASSWORD
      : process.env.PROD_DB_PASSWORD,
  port:
    process.env.ENVIRONMENT === "dev"
      ? process.env.DB_PORT
      : process.env.PROD_DB_PORT,
  ssl: process.env.ENVIRONMENT === "dev" ? false : true
});

const seedDatabase = async () => {
  await seedUser();
  await seedLocation();
  await seedItinerary();
  await seedTag();
};

const seedUser = async () => {
  const results = await pool.query(
    `SELECT count(*) FROM (SELECT 1 FROM ${tableNames.userTable} LIMIT 1) AS t;`
  );
  const numRows = results.rows[0].count;

  if (parseInt(numRows) != 0) {
    console.log(
      `Skipping seeding for table ${tableNames.userTable} because it is not empty!`
    );
    return;
  }

  // Seed users
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD,
    saltRounds
  );
  // Creates admin user
  await pool.query(
    `INSERT INTO ${
      tableNames.userTable
    } (user_uid, username, password, email, phone_number, is_admin) VALUES ('${uuidv4()}', '${
      process.env.ADMIN_USERNAME
    }', '${passwordHash}', '${process.env.ADMIN_EMAIL}', '${
      process.env.ADMIN_PHONE_NUMBER
    }', TRUE);`
  );
  // Creates generic user
  await pool.query(
    `INSERT INTO account (user_uid, username, password, email, phone_number, is_admin) VALUES ('${uuidv4()}', 'generic_user', '${passwordHash}', 'generic@example.com', '6266266260', FALSE);`
  );

  await pool.query(
    `INSERT INTO account (user_uid, username, password, email, phone_number, is_admin) VALUES ('${uuidv4()}', 'generic_user1', '${passwordHash}', 'generic1@example.com', '6266266260', FALSE);`
  );
  console.log(`Finished seeding table ${tableNames.userTable}!`);
};

const seedLocation = async () => {
  const results = await pool.query(
    `SELECT count(*) FROM (SELECT 1 FROM ${tableNames.locationTable} LIMIT 1) AS t;`
  );
  const numRows = results.rows[0].count;

  if (parseInt(numRows) != 0) {
    console.log(
      `Skipping seeding for table ${tableNames.locationTable} because it is not empty!`
    );
    return;
  }
  // Seed location
  await pool.query(
    `INSERT INTO ${
      tableNames.locationTable
    } (location_uid, city, country, iso2, iso3, population, lat, lng) VALUES ('${uuidv4()}', 'Tokyo', 'Japan', 'JP', 'JPN', 35676000, 35.685, 139.7514);`
  );
  await pool.query(
    `INSERT INTO ${
      tableNames.locationTable
    } (location_uid, city, country, iso2, iso3, population, lat, lng) VALUES ('${uuidv4()}', 'Taipei', 'Taiwan', 'TW', 'TWN', 6900273, 25.0358, 121.5683);`
  );

  console.log(`Finished seeding table ${tableNames.locationTable}!`);
};

const seedItinerary = async () => {
  const results = await pool.query(
    `SELECT count(*) FROM (SELECT 1 FROM ${tableNames.itineraryTable} LIMIT 1) AS t;`
  );
  const numRows = results.rows[0].count;

  if (parseInt(numRows) != 0) {
    console.log(
      `Skipping seeding for table ${tableNames.itineraryTable} because it is not empty!`
    );
    return;
  }

  const numDummyItineraries = 20;
  let itineraryQueryString = ``;

  for (let i = 0; i < numDummyItineraries; i++) {
    itineraryQueryString += `INSERT INTO ${
      tableNames.itineraryTable
    } (itinerary_uid, user_id, location_id, title, description, spreadsheet_link, image_link)
      VALUES ('${uuidv4()}', 1, 1, 'title${i}', 'description', 'link.com', 'https://cdn.cnn.com/cnnnext/dam/assets/180719132958-beautiful-taiwan-popumon-hehuanshan-east-peak-full-169.jpg');`;
  }

  await pool.query(itineraryQueryString);

  console.log(`Finished seeding table ${tableNames.itineraryTable}!`);
};

const seedTag = async () => {
  const results = await pool.query(
    `SELECT count(*) FROM (SELECT 1 FROM ${tableNames.tagTable} LIMIT 1) AS t;`
  );
  const numRows = results.rows[0].count;

  if (parseInt(numRows) != 0) {
    console.log(
      `Skipping seeding for table ${tableNames.tagTable} because it is not empty!`
    );
    return;
  }

  const tagQueryString = `INSERT INTO ${tableNames.tagTable} (tag_name) VALUES ('tokyo'), ('honduras'), ('adventure');`;
  const tagFollowerQueryString = `INSERT INTO ${tableNames.tagFollowTable} (user_id, tag_id)  VALUES (1, 1), (2, 1);`;
  const tagItineraryQueryString = `INSERT INTO  ${tableNames.tagItineraryTable} (tag_id, itinerary_id) VALUES (1, 1), (1, 2), (2, 1), (3, 19)`;

  await pool.query(tagQueryString);
  console.log(`Finished seeding table ${tableNames.tagTable}!`);

  await pool.query(tagFollowerQueryString);
  console.log(`Finished seeding table ${tableNames.tagFollowTable}!`);

  await pool.query(tagItineraryQueryString);
  console.log(`Finished seeding table ${tableNames.tagItineraryTable}!`);
};

const main = async () => {
  await seedDatabase();
  await pool.end();
};

module.exports = {
  seedDb: main
};

if (typeof module !== "undefined" && !module.parent) {
  main();
}
