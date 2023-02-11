// const properties = require('./json/properties.json');
// const users = require('./json/users.json');

//connect to database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
 const getUserWithEmail = function(email) {
  return pool.query(`
    SELECT *
    FROM users
    WHERE email = $1
  `,[email]).then(resp => resp.rows[0]);
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
 const getUserWithId = function(id) {
  return pool.query(`
  SELECT *
  FROM users
  WHERE id = $1
`,[id]).then(resp => resp.rows[0]);
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
 const addUser =  function(user) {
  return pool.query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `,[user.name, user.email, user.password]).then(resp => resp.rows[0]);
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool.query(`
    SELECT
      properties.id AS id, title, cost_per_night, start_date, end_date, avg(rating) as rating, cover_photo_url, thumbnail_photo_url
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON property_reviews.property_id = properties.id
    WHERE end_date < NOW()::DATE AND
      reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    limit $2;
  `,[guest_id, limit])
    .then((res) => res.rows)
    .catch((err) => console.error("query error", err.stack));
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = function(options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) AS average_rating
    FROM properties
    LEFT OUTER JOIN property_reviews ON property_id = properties.id`;
  if (Object.keys(options).length > 1) {
    let queriesAdded = false;
    if (options.city) {
      if (!queriesAdded) {
        queryString += `
        WHERE `;
        queriesAdded = true;
      }
      queryParams.push(`%${options.city}%`);
      queryString += ` properties.city LIKE $${queryParams.length} AND `;
    }

    if (options.owner_id) {
      if (!queriesAdded) {
        queryString += `
        WHERE `;
        queriesAdded = true;
      }
      queryParams.push(Number(options.owner_id));
      queryString += ` properties.owner_id = $${queryParams.length} AND `;
    }

    if (options.minimum_price_per_night) {
      if (!queriesAdded) {
        queryString += `
        WHERE `;
        queriesAdded = true;
      }
      queryParams.push(Number(options.minimum_price_per_night) * 100);
      queryString += ` properties.cost_per_night >= $${queryParams.length} AND `;
    }

    if (options.maximum_price_per_night) {
      if (!queriesAdded) {
        queryString += `
        WHERE `;
        queriesAdded = true;
      }
      queryParams.push(Number(options.maximum_price_per_night) * 100);
      queryString += ` properties.cost_per_night <= $${queryParams.length} AND `;
    }

    if (queriesAdded) {
      queryString = queryString.slice(0, -4);
    }
  }
  queryString += `
    GROUP BY properties.id`;
  if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += `
    HAVING avg(rating) >= $${queryParams.length}`;
  }
  
  queryParams.push(limit);
  queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};`;

  return pool.query(queryString, queryParams).then(res => res.rows);
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
