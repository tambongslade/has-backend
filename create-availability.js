const mongoose = require('mongoose');

async function createAvailability() {
  try {
    await mongoose.connect('mongodb://localhost:27017/house_service_db');
    
    const availabilityData = {
      providerId: new mongoose.Types.ObjectId('68926a550cb23cd5adf7cdd5'),
      dayOfWeek: 'tuesday', // For Tuesday availability
      timeSlots: [
        {
          startTime: '08:00',
          endTime: '18:00',
          isAvailable: true
        }
      ],
      isActive: true,
      notes: 'Standard working hours',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await mongoose.connection.db.collection('availabilities').insertOne(availabilityData);
    console.log('Availability created:', result.insertedId.toString());
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

createAvailability();