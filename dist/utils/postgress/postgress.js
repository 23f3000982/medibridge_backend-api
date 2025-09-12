import { Sequelize } from "sequelize";
const DB_NAME = 'medibridge';
const DB_USERNAME = 'medibridge';
const DB_PASSWORD = 'Medi@8053';
const DB_HOST = 'localhost';
const DB_PORT = 9999;
const DB_APPLICATION_NAME = 'medibridge-backend';
export const sequelize = new Sequelize({
    port: DB_PORT,
    database: DB_NAME,
    host: 'localhost',
    username: DB_USERNAME,
    password: DB_PASSWORD,
    dialect: 'postgres',
    logging: false,
    pool: {
        min: 5,
        max: 200,
        acquire: 10000,
        idle: 30000
    },
    dialectOptions: {
        application_name: DB_APPLICATION_NAME
    }
});
// ✅ Function to test DB connection
export const psqlConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connection to the database has been established successfully.");
    }
    catch (error) {
        console.error("❌ Unable to connect to the database:", error);
    }
};
