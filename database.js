require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const filebasename = path.basename(__filename);
const fs = require('fs');
const db = {};

// Get enviroment variables
const { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, DATABASE_SERVICE } = process.env;

// Define database connection
const sequelize = new Sequelize(`${POSTGRES_DB}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, {
    host: `${DATABASE_SERVICE}`,
    dialect: 'postgres',
    logging: false,
});
  
// Gets all files in models folder
fs
    .readdirSync(`${__dirname}/models`)
    .filter((file) => {
        const returnFile = (file.indexOf('.') !== 0)
        && (file !== filebasename)
        && (file.slice(-3) === '.js');
    return returnFile;
})
.forEach((file) => {
    const model = require(path.join(__dirname, `models/${file}`))(sequelize, DataTypes)
    db[model.name] = model;
});

// Maps each file in the model folder with the db
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = { db, sequelize };