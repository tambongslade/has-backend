const { MongoClient } = require('mongodb');

const uri = 'mongodb://stercytambong:w23N0S5Qb6kMUwTi@217.65.144.32:27017/house_service_db?authSource=admin';
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  connectTimeoutMS: 10000, // Connection timeout
  socketTimeoutMS: 0, // Disable socket timeout
});

async function testConnection() {
  console.log('🔄 Testing MongoDB connection...');
  console.log('URI:', uri.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials in log
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database access
    const db = client.db('house_service_db');
    console.log('✅ Database accessed successfully');
    
    // List collections to verify access
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections:`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Test a simple operation
    const testCollection = db.collection('test_connection');
    const testDoc = { message: 'Connection test', timestamp: new Date() };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted successfully');
    
    const foundDoc = await testCollection.findOne({ message: 'Connection test' });
    console.log('✅ Test document retrieved successfully:', foundDoc);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: foundDoc._id });
    console.log('✅ Test document cleaned up');
    
    // Get server status
    const admin = db.admin();
    const serverStatus = await admin.serverStatus();
    console.log('🖥️  Server Info:');
    console.log(`  - MongoDB Version: ${serverStatus.version}`);
    console.log(`  - Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
    console.log(`  - Host: ${serverStatus.host}`);
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    // Provide helpful troubleshooting info
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Check if MongoDB is running on the VPS');
    console.log('2. Verify firewall allows connections on port 27017');
    console.log('3. Ensure MongoDB is configured to accept remote connections');
    console.log('4. Verify username and password are correct');
    console.log('5. Check if IP whitelist includes your current IP');
    
  } finally {
    // Close the connection
    await client.close();
    console.log('🔒 Connection closed');
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT. Closing MongoDB connection...');
  await client.close();
  process.exit(0);
});

// Run the test
testConnection().catch(console.error);