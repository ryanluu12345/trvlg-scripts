require("dotenv").config();
const { Pool } = require("pg");
const { seedDb } = require("./seed-db");
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

const createCustomTypesString = `
  DROP TYPE IF EXISTS seasons;
  CREATE TYPE seasons AS ENUM ('summer', 'autumn', 'winter', 'spring');
`;

const createAccountTableString = `
  CREATE TABLE ${tableNames.userTable}
    (user_id serial PRIMARY KEY,
    user_uid TEXT NOT NULL,
    username VARCHAR (50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email VARCHAR (350) UNIQUE NOT NULL,
    phone_number VARCHAR (20) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP);`;
const createLocationTableString = `
  CREATE TABLE ${tableNames.locationTable}
    (location_id serial PRIMARY KEY,
    location_uid TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    iso2 VARCHAR(2) NOT NULL,
    iso3 VARCHAR(3) NOT NULL,
    population NUMERIC NOT NULL,
    location_description TEXT DEFAULT '',
    lat NUMERIC(8, 4)  NOT NULL,
    lng NUMERIC(8, 4) NOT NULL);`;
const createItineraryTableString = `
  CREATE TABLE ${tableNames.itineraryTable}
    (itinerary_id serial PRIMARY KEY,
    itinerary_uid TEXT NOT NULL,
    user_id INTEGER REFERENCES account(user_id),
    location_id INTEGER REFERENCES location(location_id),
    title VARCHAR (200) NOT NULL,
    description TEXT NOT NULL,
    spreadsheet_link TEXT NOT NULL,
    image_link TEXT NOT NULL,
    cost NUMERIC(12, 2) DEFAULT 0,
    likes INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    quick_link TEXT DEFAULT '',
    duration INTEGER NOT NULL DEFAULT 0,
    season SEASONS NOT NULL DEFAULT 'summer',
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);`;
const createCommentTableString = `
  CREATE TABLE ${tableNames.commentTable}
    (comment_id serial PRIMARY KEY,
    comment_uid TEXT NOT NULL,
    user_id INTEGER REFERENCES account(user_id),
    itinerary_id INTEGER REFERENCES itinerary(itinerary_id),
    body TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);`;
const createProfileTableString = `
  CREATE TABLE ${tableNames.profileTable}
    (profile_id serial PRIMARY KEY,
    user_id INTEGER REFERENCES account(user_id) UNIQUE,
    name VARCHAR (50) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    profile_image_link TEXT,
    bio TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE);`;
const createTriggerFunction = `
  CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN IF NEW.body != OLD.body
    THEN NEW.updated_on = now(); END IF;
    return NEW; END ;$$ language 'plpgsql';`;
const setTriggerOnTable = `
  CREATE TRIGGER update_comment_change_timestamp
  BEFORE UPDATE ON ${tableNames.commentTable}
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp();`;
const createLikeFavoriteItineraryTable = `
  CREATE TABLE ${tableNames.likedItineraryTable}
    (
      user_id INTEGER REFERENCES ${tableNames.userTable}(user_id),
      itinerary_id INTEGER REFERENCES ${tableNames.itineraryTable}(itinerary_id),
      is_favorite BOOLEAN DEFAULT FALSE,
      is_liked BOOLEAN DEFAULT FALSE,
      created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      like_updated_on TIMESTAMP,
      favorite_updated_on TIMESTAMP,
      PRIMARY KEY(user_id, itinerary_id, is_favorite)
    );
`;
const createLikeItineraryUpdateTriggerFunction = `
  CREATE OR REPLACE FUNCTION update_liked_itinerary_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
    IF NEW.is_liked = true AND OLD.is_liked = false THEN
      NEW.like_updated_on = now();
    ELSIF NEW.is_favorite = true AND OLD.is_favorite = false THEN
      NEW.favorite_updated_on = now();
    END IF;
    return NEW; END ;$$ language 'plpgsql';`;
const setLikeItineraryUpdateTriggerOnTable = `
  CREATE TRIGGER update_comment_change_timestamp
  BEFORE UPDATE ON ${tableNames.likedItineraryTable}
  FOR EACH ROW EXECUTE PROCEDURE update_liked_itinerary_timestamp();`;
const createModifiedColumnTriggerFunction = `
  CREATE OR REPLACE FUNCTION update_generic_modified_column()
  RETURNS TRIGGER AS $$
  BEGIN
    IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
        NEW.updated_on = now();
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
  END;
  $$ language 'plpgsql';`;
const setItineraryUpdateTriggerOnTable = `
  CREATE TRIGGER update_itinerary_change_timestamp
  BEFORE UPDATE ON ${tableNames.itineraryTable}
  FOR EACH ROW EXECUTE PROCEDURE update_generic_modified_column();`;

const createTagsTable = `
CREATE TABLE ${tableNames.tagTable}
  (tag_id serial PRIMARY KEY,
  tag_name VARCHAR(300) NOT NULL,
  created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

const createTagsItineraryTable = `
  CREATE TABLE ${tableNames.tagItineraryTable}
  (
    tag_id INTEGER REFERENCES ${tableNames.tagTable}(tag_id),
    itinerary_id INTEGER REFERENCES ${tableNames.itineraryTable}(itinerary_id),
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(tag_id, itinerary_id)
  );
`;

const createTagsFollowersTable = `
  CREATE TABLE ${tableNames.tagFollowTable}
  (
    user_id INTEGER REFERENCES ${tableNames.userTable}(user_id),
    tag_id INTEGER REFERENCES ${tableNames.tagTable}(tag_id),
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, tag_id)
  );
`;
const createFollowerTable = `
  CREATE TABLE ${tableNames.followerTable}
    (follower INTEGER REFERENCES profile(profile_id),
     following INTEGER REFERENCES profile(profile_id),
     accepted BOOLEAN DEFAULT FALSE,
     followed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`;

const createItineraryIndexTable = `
    CREATE TABLE ${tableNames.itineraryIndexTable}
    (
      itinerary_id INTEGER REFERENCES itinerary(itinerary_id) UNIQUE, 
      elasticsearch_id TEXT NOT NULL DEFAULT '',
      created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`;

const dropAllTables = async () => {
  await pool.query(
    `DROP TABLE IF EXISTS ${tableNames.itineraryTable} CASCADE;`
  );
  await pool.query(`DROP TABLE IF EXISTS ${tableNames.locationTable} CASCADE;`);
  await pool.query(`DROP TABLE IF EXISTS ${tableNames.userTable} CASCADE;`);
  await pool.query(`DROP TABLE IF EXISTS ${tableNames.commentTable} CASCADE;`);
  await pool.query(
    `DROP TABLE IF EXISTS ${tableNames.likedItineraryTable} CASCADE;`
  );
  await pool.query(`DROP TABLE IF EXISTS ${tableNames.profileTable} CASCADE;`);
  await pool.query(`DROP TABLE IF EXISTS ${tableNames.followerTable} CASCADE;`);
  await pool.query(`DROP TABLE IF EXISTS ${tableNames.tagTable} CASCADE;`);
  await pool.query(
    `DROP TABLE IF EXISTS ${tableNames.tagFollowTable} CASCADE;`
  );
  await pool.query(
    `DROP TABLE IF EXISTS ${tableNames.tagItineraryTable} CASCADE;`
  );
  await pool.query(
    `DROP TABLE IF EXISTS ${tableNames.itineraryIndexTable} CASCADE;`
  );
};

const updateTriggers = async () => {
  await pool.query(createModifiedColumnTriggerFunction);
  await pool.query(setItineraryUpdateTriggerOnTable);
  await pool.query(createTriggerFunction);
  await pool.query(setTriggerOnTable);
  await pool.query(createLikeItineraryUpdateTriggerFunction);
  await pool.query(setLikeItineraryUpdateTriggerOnTable);
};

const createAllTables = async () => {
  // Creates associated types
  await pool.query(createCustomTypesString);
  await pool.query(createAccountTableString);
  await pool.query(createLocationTableString);
  await pool.query(createItineraryTableString);
  await pool.query(createLikeFavoriteItineraryTable);
  await pool.query(createCommentTableString);
  await pool.query(createProfileTableString);
  await pool.query(createFollowerTable);
  await pool.query(createTagsTable);
  await pool.query(createTagsFollowersTable);
  await pool.query(createTagsItineraryTable);
  await pool.query(createItineraryIndexTable);
};

const main = async () => {
  await dropAllTables();
  await createAllTables();
  await updateTriggers();
  await seedDb();
  await pool.end();
};

if (process.env.ENVIRONMENT === "dev") {
  main();
}
