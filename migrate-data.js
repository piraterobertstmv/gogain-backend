require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { BSON } = require('bson');

const BACKUP_DIR = path.join(__dirname, '..', 'gogain-backup', 'gogain');
const collections = ['clients', 'centers', 'services', 'transactions', 'users', 'costs'];

async function readBsonFile(collection) {
    try {
        const filePath = path.join(BACKUP_DIR, `${collection}.bson`);
        const bsonData = fs.readFileSync(filePath);
        
        // Parse BSON data
        const documents = [];
        let offset = 0;
        
        while (offset < bsonData.length) {
            try {
                // Get document size (first 4 bytes)
                const docSize = bsonData.readInt32LE(offset);
                
                // Extract document bytes
                const docBytes = bsonData.slice(offset, offset + docSize);
                
                // Deserialize document
                const doc = BSON.deserialize(docBytes);
                documents.push(doc);
                
                // Move to next document
                offset += docSize;
            } catch (e) {
                console.warn(`Error parsing document in ${collection}:`, e.message);
                break;
            }
        }
        
        return documents;
    } catch (error) {
        console.error(`Error reading ${collection}.bson:`, error);
        return [];
    }
}

async function migrateCollection(client, collection) {
    try {
        console.log(`\nMigrating ${collection}...`);
        
        // Read and parse the BSON file
        const documents = await readBsonFile(collection);
        
        if (documents.length === 0) {
            console.log(`No documents found for ${collection}`);
            return;
        }
        
        // Get the database and collection
        const db = client.db();
        const coll = db.collection(collection);
        
        // Clear existing data
        const deleteResult = await coll.deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} existing documents`);
        
        // Insert the data
        const result = await coll.insertMany(documents);
        console.log(`Successfully migrated ${result.insertedCount} documents to ${collection}`);
        
    } catch (error) {
        console.error(`Error migrating ${collection}:`, error);
    }
}

async function migrateAllData() {
    const client = new MongoClient(process.env.MONGO_URL);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        for (const collection of collections) {
            await migrateCollection(client, collection);
        }
        
        console.log('\nMigration completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

migrateAllData(); 