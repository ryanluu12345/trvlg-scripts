////////////////////////////////////////////////////////
// Data source: https://simplemaps.com/data/world-cities
////////////////////////////////////////////////////////

require("dotenv").config();
const csv = require("csv-parser");
const fs = require("fs");
const { Pool } = require("pg");
const uuidv4 = require("uuid/v4");
const { locationTable } = require("../constants/database-table-names");

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

const readFromCSV = async csvFile => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on("data", data => results.push(data))
      .on("end", () => {
        resolve(results);
      });
  });
};

const insertDataIntoDb = async data => {
  let errCount = 0;
  let successCount = 0;
  try {
    await data.map(async location => {
      try {
        await pool.query(
          `INSERT INTO ${locationTable} 
            (location_uid, 
              city, 
              country, 
              iso2, 
              iso3, 
              population, 
              lat, 
              lng) 
          VALUES (
            '${uuidv4()}', 
            $1, $2, $3, $4, 
            $5, $6, $7);`,
          [
            location.city_ascii,
            location.country,
            location.iso2,
            location.iso3,
            location.population ? location.population : 0,
            location.lat ? location.lat : 0.0,
            location.lng ? location.lng : 0.0
          ]
        );
        successCount += 1;
        console.log(
          `${successCount} out of ${data.length} records succeeded in inserting!`
        );

        // Kills the pool at the end
        if (successCount + errCount == data.length) {
          await pool.end();
          console.log("Finished inserting all locations into the database!");
        }
      } catch (err) {
        errCount += 1;
        console.log(
          `${errCount} out of ${data.length} records failed to insert!`
        );
      }
    });
  } catch (err) {
    console.log(err);
  }
};

const main = async () => {
  const results = await readFromCSV(
    "/Users/ryanluu/Documents/trvlg/trvlg_source/server/scripts/worldcities.csv"
  );
  await insertDataIntoDb(results);
};

if (typeof module !== "undefined" && !module.parent) {
  main();
}
