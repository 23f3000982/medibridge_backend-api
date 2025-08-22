import { Sequelize } from "sequelize";

export const sequelize = new Sequelize('medibridge', 'medibridge', 'Medi@8053', {
    host: 'localhost',
    dialect: 'postgres',
    port: 9999,
    logging: false,
    pool: {
        min: 0,
        max: 100,
        acquire: 3000,
        idle: 10000
    }
});

export const psqlConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection to the database has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}