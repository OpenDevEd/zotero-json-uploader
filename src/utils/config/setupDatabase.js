#!/usr/bin/env node
const fs = require('fs');
const { input, select } = require('@inquirer/prompts');
const { execSync } = require('child_process');

async function setupDatabase() {
    let env = '';
    let databaseURL = await input({ message: 'Enter your postgres database URL?' });
    const envPath = `${process.cwd()}/.env`;
    
    // check if the .env file exists and update the DATABASE_URL
    if (fs.existsSync(envPath)) {
        env = fs.readFileSync(envPath, 'utf8');
        if (env.includes('DATABASE_URL='))
            env = env.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${databaseURL}`);
        else env += `DATABASE_URL=${databaseURL}\n`;
    }
    // create the .env file if it doesn't exist
    else env = `DATABASE=${database}\nDATABASE_URL=${databaseURL}`;
    fs.writeFileSync(envPath, env);

    // ask the user if they want to migrate the database
    const createDatabase = await select({
        message: 'Do you want to migrate the database?',
        choices: [
            { value: true, name: '- Yes' },
            { value: false, name: '- No' },
        ],
    });
    
    // create the database if the user selects yes
    if (createDatabase)  await migrateDatabase();
}

async function migrateDatabase() {
  try {
    console.log('Running migrations...');
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
    console.log('Database migration completed.');
  } catch (error) {
    console.error('Error during migration: please check the database URL and try again.');
  }
}

module.exports = { setupDatabase };